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
const jwt=require('jsonwebtoken');
const { generateAccessJwt, generateRefreshJwt,generateTempJwt } = require('../utils/generateJwt');
const authSchema = Joi.object({
  name: Joi.string().required(),
  email: Joi.string().email({ tlds: { allow: false } }) .required()
    .messages({
      'string.empty': 'Email is required',
      'string.email': 'Email must be a valid email address'
    }),
  // password: Joi.string()
  // .min(8)
  // .pattern(new RegExp('^(?=.*[a-z])(?=.*[A-Z])(?=.*\\d)(?=.*[@$!%*?&])[A-Za-z\\d@$!%*?&]{8,}$'))
  // .message('Password must be at least 8 characters long and include uppercase, lowercase, number, and special character.')
  // .required()  // It will be applied after development 
  password: Joi.string().min(8).required()
    .messages({
      'string.empty': 'Password is required',
      'string.min': 'Password must be at least 8 characters',
    }),

     phone: Joi.string()
    .pattern(/^[0-9+\-\s()]{7,20}$/)
    .required()
    .messages({
      'string.empty':'Phone number is required',
      default:'Phone number must be a valid phone number'
    }),

    gender:Joi.string()
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
        Phone:value.phone,
        Gender:value.gender
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
  res
  .cookie('refreshToken',refreshToken,{
    httpOnly:true,
    secure:true,
    sameSite:'strict',
    maxAge: 1000 * 60 * 60 * 24 * 7 
  })
  .status(201).json({Message:'New user created successfully',newUser,accessToken:accessToken});
    
})

//refresh-token
app.post('/refresh-token',async(req,res)=>{
  const refreshToken=req.cookies.refreshToken;
  if(!refreshToken)
  {
    const err=appError.create('No Refresh Token Was Provided',400,httpStatusText.ERROR);
    res.status(400).json(err);
  }
  const userRefreshToken=await prisma.refreshToken.findFirst({
    where:{
      Token:refreshToken
    }
  })
  const decoded = jwt.verify(refreshToken, process.env.JWT_SECRET_KEY);
  const UserId = decoded.id;
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
  const newRefreshToken=await generateRefreshJwt({email:myUserData.Email,role:myUserData.Role})
  await prisma.refreshToken.update({
    where:{
      Token:userRefreshToken
    },
    data:{
      Token:newRefreshToken
    }
  })

  res
  .cookie('refreshToken',newRefreshToken,{
    httpOnly:true,
    secure:true,
    sameSite:'strict',
    maxAge: 1000 * 60 * 60 * 24 * 7 
  })
  .status(200).json({accessToken:accessToken});
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
    const accessToken=await generateAccessJwt({email:userExist.Email,role:userExist.Role})
    const refreshToken=await generateRefreshJwt({email:userExist.Email,role:userExist.Role});
    
    const now = new Date();
    const sixMonthsFromNow = new Date(now.setMonth(now.getMonth() + 6));
    await prisma.refreshToken.create({
      data:{
        Token:refreshToken,
        ExpiresAt:sixMonthsFromNow,
        Revoked:false,
        UserId:userExist.Id
      }
    })

    res
    .cookie('refreshToken',refreshToken,{
      httpOnly:true,
      secure:false,
      sameSite:'strict',
      maxAge: 1000 * 60 * 60 * 24 * 7 
    })
    .status(200).json({Message:"Logged in successfully!!",token:accessToken,accessToken:accessToken});
})


//LOGOUT -> POST
app.post('/logout',async(req,res)=>{
  const refreshToken=req.cookies.refreshToken;

  if(!refreshToken)
  {
    const err=appError.create('No refresh token was provided',404,httpStatusText.ERROR);
    res.status(404).json(err);
    return;
  }
  await prisma.refreshToken.update({
    where:{
      Token:refreshToken
    },
    data:{
      Revoked:true
    }
  })
  res.clearCookie('refreshToken', {
  httpOnly: true,
  secure: true,
  sameSite: 'strict',
  })
  .status(200).json({ message: 'Logged out successfully' });
})

//Change password - POST
app.post('/change-password',verifyToken,async(req,res)=>{
const {currentPassword,newPassword}=req.body;
const user=req.currentUser
let userSavedPassword=await prisma.users.findUnique({
  where:{
    Id:user.id
  },
  select:{
    PasswordHash:true
  }
})
userSavedPassword=userSavedPassword.PasswordHash;
// console.log(userSavedPassword);
const passwordCompare=await bcrypt.compare(currentPassword,userSavedPassword);
  if(!passwordCompare)
  {
        const failure=appError.create('Current Password Is Not Correct',404,httpStatusText.FAILED);
        res.json(failure);
        return;
  }
  const passwordSchema=authSchema.extract('password');
  const {error,value}=passwordSchema.validate(newPassword);
  if(error)
  {
    const failure=appError.create('Pleas provide stronger password',400,httpStatusText.FAILED);
    res.status(400).json(failure);
    return;
  }
  const hashedNewPassword=await bcrypt.hash(value,8)
  try {
    await prisma.users.update({
      where:{Id:user.id},
      data:{PasswordHash:hashedNewPassword}
    })
    res.status(200).json({Status:"Success",Message:'Password changed successfully'});
  } catch (err) {
    const error=appError.create(err.message,400,'Error');
    res.status(400).json(error);
  }
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
        const accessToken=await generateAccessJwt({id:user.Id,email:user.Email,role:user.Role})
        const refreshToken=await generateRefreshJwt({email:user.Email,role:user.Role});
        const now = new Date();
        const sixMonthsFromNow = new Date(now.setMonth(now.getMonth() + 6));
        const addUserRefreshToken=await prisma.refreshToken.create({
              data:{
                Token:refreshToken,
                ExpiresAt:sixMonthsFromNow,
                Revoked:false,
                UserId:userId
              }
        })
    res
    .cookie('refreshToken',refreshToken,{
      httpOnly:true,
      secure:false,
      sameSite:'strict',
      maxAge: 1000 * 60 * 60 * 24 * 7 
    })
    .status(200).json({Status:httpStatusText.SUCCESS,Verified:true,Message:"Logged in successfully!!",accessToken})
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
    res.render('redirect');
})
app.post('/oauth-data',async(req,res)=>{
  const{email,password,phone,gender}=req.body;
  const hashedPassword=await bcrypt.hash(password,8);
  try {
      await prisma.users.update({
      where:{Email:email},
      data:{
        PasswordHash:hashedPassword,
        Phone:phone,
        Gender:gender
      }
    })
    res.status(200).json({Status:'Success',Message:'Registration done successfully'})
  } catch (err) {
    const failure=appError.create(err.message,400,httpStatusText.ERROR);
    res.status(400).json(failure);
  }
})

module.exports=app