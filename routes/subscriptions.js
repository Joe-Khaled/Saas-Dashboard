const express=require('express');
const router=express.Router();
const stripe=require('stripe')(process.env.STRIPE_PRIVATE_KEY);
const verifyToken=require('../middlewares/verifyToken');
const { PrismaClient }=require('@prisma/client');
const prisma=new PrismaClient()
const bodyParser=require('body-parser');
const appError = require('../utils/appError');
const httpStatusText = require('../utils/httpStatusText');
const subscriptionControllers=require('../controllers/subscriptions')

router.post('/create-checkout-session',verifyToken,subscriptionControllers.createCheckoutSession)
router.get('/success',subscriptionControllers.success)
router.get('/cancel',subscriptionControllers.cancel)
// router.post("/webhook",bodyParser.raw({ type: "application/json" }),subscriptionControllers.webhook) -> Implemented in app direct got it from controllers 
router.get('/checkout-session/:id',subscriptionControllers.checkoutSessionById)

module.exports=router;