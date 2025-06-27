const express=require('express');
const passport = require('passport');
const app=express.Router();
const Joi=require('joi');
const { PrismaClient } = require('@prisma/client');
const appError = require('../utils/appError');
const httpStatusText = require('../utils/httpStatusText');
const prisma=new PrismaClient()
const bcrypt=require('bcrypt');
const speakeasy=require('speakeasy');
const verifyToken=require('../middlewares/verifyToken')
const { generateAccessJwt, generateRefreshJwt,generateTempJwt } = require('../utils/generateJwt');
const authSchema = Joi.object({
  name: Joi.string().required(),
  email: Joi.string()
    .email({ tlds: { allow: false } }) 
    .required()
    .messages({
      'string.empty': 'Email is required',
      'string.email': 'Email must be a valid email address'
    }),

  password: Joi.string()
    .min(8)
    .required()
    .messages({
      'string.empty': 'Password is required',
      'string.min': 'Password must be at least 8 characters',
    }),
});

//Register - Sign up -> post
app.post('/register',async(req,res)=>{
    const {error,value}=authSchema.validate(req.body);
    if(error)
    {
      const err=appError.create(error.details[0].message,400,httpStatusText.ERROR);
      res.json(err);
      return
    }
    const isOldUser=await prisma.users.findFirst({
      where:{
        Email:value.email
      }
    });
    if(isOldUser)
    {
      const failure=appError.create('Invalid credentials',403,httpStatusText.FAILED);
      res.json(failure);
    }
    const PasswordHash=await bcrypt.hash(value.password,8);

    const newUser=await prisma.users.create({
      data:{
        Name:value.name,
        Email:value.email,
        PasswordHash:PasswordHash,
        IsVerified:false,
        Role:req.query.role||'User',
      }
    })
    const accessToken=await generateAccessJwt({email:newUser.Email,role:newUser.Role})
    const refreshToken=await generateRefreshJwt({email:newUser.Email,role:newUser.Role})
    const now = new Date();
    const sixMonthsFromNow = new Date(now.setMonth(now.getMonth() + 6));
    const addUserRefreshToken=await prisma.refreshToken.create({
      data:{
        Token:refreshToken,
        ExpiresAt:sixMonthsFromNow,
        Revoked:false,
        UserId:newUser.Id
      }
    })
    res.status(201).json({Message:'New user created successfully',newUser,accessToken,refreshToken});
})

//refresh-token
app.post('/refresh-token',async(req,res)=>{
  const UserId=req.body.userId;
  const userRefreshToken=await prisma.refreshToken.findFirst({
    where:{
      UserId:UserId
    }
  })
  const now=new Date();
  if(userRefreshToken.Revoked)
  {
    const failure=appError.create('Please log in again',401,httpStatusText.FAILED);
    res.status(401).json(failure);
    return;
  }
  else if(userRefreshToken.ExpiresAt<now)
  {
      try{
        await prisma.refreshToken.update({
          data:{
            Revoked:true
          }
        })
      }catch(err){
        console.log(err);
      }

      const failure=appError.create('Please log in again',401,httpStatusText.FAILED);
      res.status(401).json(failure);
      return;
  }

  const myUserData=await prisma.users.findFirst({
    where:{
      Id:UserId
    },
    select:{
      Email:true,
      Role:true
    }
  })
  const accessToken=await generateAccessJwt({email:myUserData.Email,role:myUserData.Role});
  res.status(200).json({accessToken:accessToken});
})

//Login -> post
app.post('/login',async(req,res)=>{
    const {email,password}=req.body;
    const userExist=await prisma.users.findFirst({
      where:{
        Email:email
      }
    })
    if(!userExist)
    {
      const failure=appError.create('invalid credentials',404,httpStatusText.FAILED);
      res.json(failure);
      return;
    }
    const correctPassword=await bcrypt.compare(password,userExist.PasswordHash);
    if(!correctPassword)
    {
      const failure=appError.create('Something wrong, please try again',404,httpStatusText.FAILED);
      res.json(failure);
      return;
    }
    if(userExist.twofaEnabled)
    {
        const token=await generateTempJwt({id:userExist.Id,email:userExist.Email,role:userExist.Role});
        res.status(200).json({mfaRequired:true,token})
        return;
    }
    const token=await generateAccessJwt({email:userExist.Email,role:userExist.Role})
    res.status(200).json({Status:httpStatusText.SUCCESS,Message:"Logged in successfully!!",token})

})
//setup mfa
app.post('/setup-mfa',async(req,res)=>{
    const userId=req.body.userId;
    const temp_secret=speakeasy.generateSecret();
    try {
        await prisma.users.update({
          where:{Id:userId},
          data:{
            twofaEnabled:true,
            ascii:temp_secret.ascii,
            base32:temp_secret.base32,
            hex:temp_secret.hex,
            otpUrl:temp_secret.otpauth_url
          }
        })
        res.json({userId,secret:temp_secret.base32});
    } catch (err) {
        console.log(err);
        res.status(500).json({message:'Error generating the secret'})   
    }
})

app.post('/confirm-mfa',async(req,res)=>{
    const {userId,token}=req.body;
    const user=await prisma.users.findFirst({
      where:{Id:userId}, 
    })
    const secret=user.base32
    const verified=speakeasy.totp.verify({secret,encoding:"base32",token});
    if(verified)
    {
      await prisma.users.update({
        where:{Id:userId},
        data:{twofaEnabled:true}
      })
      res.status(200).json({Status:httpStatusText.SUCCESS,Verified:true,Message:'2FA enabled successfully'})
    }
    else{
      res.json({Status:httpStatusText.FAILED,Verified:false,Message:'Failed to login'})
    }
})



//verify mfa
app.post('/verify-mfa',verifyToken,async(req,res)=>{
    const token=req.body.token;
    const userId=req.currentUser.id;
    const user=await prisma.users.findFirst({
      where:{Id:userId}
    })
    // console.log(userId);
    // console.log(token);
    // console.log(user.base32);
    // return;
    try {
      const secret=user.base32;
      const verified=speakeasy.totp.verify({secret,encoding:'base32',token})
      if(verified){
        await prisma.users.update({
          where:{Id:userId},
          data:{
            permanent:true
          }
        })
        const accessToken=await generateAccessJwt({email:user.Email,role:user.Role})
        res.status(200).json({Status:httpStatusText.SUCCESS,Verified:true,Message:"Logged in successfully!!",accessToken})
      }
      else{
        res.json({Status:httpStatusText.FAILED,Verified:false,Message:'Failed to login'})
      }
      

    } catch (err) {
        console.log(err);
        res.status(500).json({message:'Error finding the user'})   
    }
})

//Login using google -> post
app.get('/google',passport.authenticate('google',{
    scope:['profile','email']
}))

//Redirect url -> get
app.get('/google/redirect',passport.authenticate('google'),(req,res)=>{
    res.send('redirect page');
})

module.exports=app