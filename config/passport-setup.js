require('dotenv').config()
const passport=require('passport');
const GoogleStrategy=require('passport-google-oauth20');
const { PrismaClient } = require('@prisma/client');
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
        
        const oldUser=await prisma.users.findFirst({
            where:{GoogleID:profile.id}    
        });
        if(oldUser)
        {
            console.log('user is:',oldUser);
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
                done(null,newUser);
            }
            catch(err){
                console.log(err);
            } 

        }
  })
);