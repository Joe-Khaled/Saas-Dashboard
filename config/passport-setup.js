require('dotenv').config()
const passport=require('passport');
const GoogleStrategy=require('passport-google-oauth20');
const { PrismaClient } = require('@prisma/client');
const { generateAccessJwt } = require('../utils/generateJwt');
const prisma=new PrismaClient();


passport.serializeUser((user,done)=>{
    done(null,user);
 })

 passport.deserializeUser(async (user, done) => {
   try {
      const myUser = await prisma.users.findUnique({
      where: { Id: user.Id } 
    });
    
    if (!user) return done(null, false); 
    
    done(null, user);  
  } catch (err) {
    done(err, null);
  }
});


passport.use(
  new GoogleStrategy({
    callbackURL: '/api/auth/google/redirect',
    clientID: process.env.CLIENT_ID,
    clientSecret: process.env.CLIENT_SECRET,
  },
  async (accessToken, refreshToken, profile, done) => {
        console.log(profile);
        const oldUser=await prisma.users.findFirst({
            where:{GoogleID:profile.id}    
        });
        if(oldUser)
        {
            // console.log('user is:',oldUser);
            const token=await generateAccessJwt({id:oldUser.Id,email:oldUser.Email,role:oldUser.Role})
            console.log(token)
            done(null,oldUser);
        }
        else
        {
            try{
                const newUser=await prisma.users.create({
                    data:{
                        GoogleID:profile.id,
                        Name:profile.displayName,
                        Email:profile._json.email,
                        ProfilePic:profile._json.picture
                    }
                })
                  const token=await generateAccessJwt({id:newUser.Id,email:newUser.Email,role:newUser.Role})
                  // console.log(token)
                done(null,newUser);
            }
            catch(err){
                console.log(err);
            } 

        }
  })
);