const express=require('express');
const router=express.Router();
const passport = require('passport');
const controllers=require('../controllers/auth');
const verifyToken=require('../middlewares/verifyToken')

router.post('/register',controllers.register)
router.post('/refresh-token',controllers.refreshToken)
router.post('/login',controllers.login)
router.post('/logout',controllers.logout)
router.post('/change-password',verifyToken,controllers.changePassword)
router.post('/setup-mfa',controllers.setupMfa)
router.post('/confirm-mfa',controllers.confirmMfa)
router.post('/verify-mfa',verifyToken,controllers.verifyMfa)
router.get('/google',passport.authenticate('google',{scope:['profile','email']}))
router.get('/google/redirect',passport.authenticate('google'),(req,res)=>{res.render('redirect');})
router.post('/oauth-data',controllers.oauthData);

module.exports=router;