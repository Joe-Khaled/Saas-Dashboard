const express=require('express');
const router=express.Router();
const stripe=require('stripe')(process.env.STRIPE_PRIVATE_KEY);
const verifyToken=require('../middlewares/verifyToken');
const { PrismaClient }=require('@prisma/client');
const prisma=new PrismaClient()
const bodyParser=require('body-parser');
const appError = require('../utils/appError');
const httpStatusText = require('../utils/httpStatusText');


const storeItems=new Map([
    [1,{priceInCents:10000,plan :"Weekly"}],
    [2,{priceInCents:60000,plan: "Monthly"}],
    [3,{priceInCents:680000,plan:"Annualy"}]
])

const createCheckoutSession=async(req, res)=>{

  let userId=await prisma.users.findFirst({
    select:{
      Id:true
    },
    where:{
      Email:req.currentUser.email
    }
  })
  console.log(req.currentUser.email);
  userId=userId.Id;
  try {
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      mode: 'subscription',
      line_items: req.body.items.map(item => {
        const storeItem = storeItems.get(item.id);
        return {
          price_data: {
            currency: 'usd',
            product_data: {
              name: storeItem.plan,
            },
            unit_amount: storeItem.priceInCents,
            recurring: {
              interval: storeItem.plan == 'Weekly' ? 'week' : (storeItem.plan == 'Monthly' ? 'month':'year' ),
            }
          },
          quantity: item.quantity,
        };
      }),
      success_url: `${process.env.SERVER_URL}/api/subscriptions/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.SERVER_URL}/api/subscriptions/cancel`,
      metadata:{
      userId:userId,
      plan:String(storeItems.get(req.body.items[0].id).plan),
      quantity:String(req.body.items[0].quantity)
    },
    });
    res.json({ url: session.url });
  } catch (e) {
    console.error("Stripe error:", e); 
    res.status(500).json({ error: e.message });
  }
};

const success=async(req,res)=>{
  const result=Promise.all([
    stripe.checkout.sessions.retrieve(req.query.session_id,{expand:['payment_intent.payment_method']}),
    stripe.checkout.sessions.listLineItems(req.query.session_id)
  ])
  // console.log(JSON.stringify(await result))

  res.send('Payment was successful')
}

const cancel=async(req,res)=>{
    res.send('Payment was canceled')
}

const webhook=async(req, res)=>{
    const sig = req.headers["stripe-signature"];
    let event;

    try {
      event = stripe.webhooks.constructEvent(req.body,sig,process.env.STRIPE_WEBHOOK_SECRET);

      let userId,amount,status,invoiceUrl,invoiceId;
      if(event.type==="checkout.session.completed")
      {
            const subscription=event.data.object        
            const metadata=subscription.metadata;
            userId=Number(metadata.userId);
            amount=subscription.amount_total;
            invoiceId=subscription.invoice
            const oldSubsctiption=await prisma.subscriptions.findFirst({
              where:{
                UserId:userId
              }
            })
            if(oldSubsctiption)
            {
                const plan = metadata.plan;
                const quantity =Number(metadata.quantity); 
                const created = subscription.created;

                let renewed = created;
                if (plan === "Weekly") {
                  renewed = created + 604800 * quantity;
                } else if (plan === "Monthly") {
                  renewed = created + 2592000 * quantity; 
                } else {
                  renewed = created + 31536000 * quantity;
                }
                try {
                  const subscriptionsRenewal = await prisma.subscriptions.update({
                    data: {
                      Plan: plan,
                      IsActive: true,
                      StartedAt: new Date(created * 1000),   
                      RenewedAt: new Date(renewed * 1000), 
                    },
                    where:{
                      UserId:userId
                    }
                  });
                  res.status(200).json({Message:"Subscription Updated Successfully",StatusCode:200, Subscription: subscriptionsRenewal });
                } catch (err) {
                  console.error("Error", err.message);
                  const failure = appError.create(err.message, 400, httpStatusText.ERROR);
                  res.status(400).json(failure);
                }
            }
          else{
            const plan = metadata.plan;
            const quantity =Number(metadata.quantity); 
            const created = subscription.created;

            let renewed = created;
            if (plan === "Weekly") {
              renewed = created + 604800 * quantity;
            } else if (plan === "Monthly") {
              renewed = created + 2592000 * quantity; 
            } else {
              renewed = created + 31536000 * quantity;
            }
            try {
              const newSubscriptions = await prisma.subscriptions.create({
                data: {
                  UserId: userId,
                  Plan: plan,
                  IsActive: true,
                  StartedAt: new Date(created * 1000),   
                  RenewedAt: new Date(renewed * 1000), 
                }
              });
              res.status(200).json({ Subscription: newSubscriptions });
            } catch (err) {
              console.error("Error", err.message);
              const failure = appError.create(err.message, 400, httpStatusText.ERROR);
              res.status(400).json(failure);
            }
          }
            try {
              payment=await prisma.payments.create({
                data:{
                  UserId:userId,
                  Amount:amount,
                  InvoiceId:invoiceId,
                }
              })
            } catch (err) {
              console.error(err.message);
            }
      }
      if(event.type==="invoice.paid")
        {
          const data=event.data.object;
          const invoiceUrl=data.hosted_invoice_url;
          let payment;
          try {
            payment=await prisma.payments.update({
              where:{
                InvoiceId:data.id
              },
              data:{
                InvoiceUrl:invoiceUrl,
                PaidAt:new Date(data.created*1000),
                Status:"Success"
              }
            })
          } catch (err) {
              console.error(err.message);
          }
          console.log(payment);
        }

        if(event.type==="payment_intent.payment_failed")
        {
          const paymentFailure=appError.create("Your funds is insufficient",400,httpStatusText.FAILED);
          res.status(400).json(paymentFailure);
        }
    } catch (err) {
      console.error("Webhook signature verification failed:", err.message);
      return res.sendStatus(400);
    }
  }

const checkoutSessionById=async(req,res)=>{
    const session=await stripe.checkout.sessions.retrieve(req.params.id,{
        expand:['line_items']
    })
}

module.exports={
  createCheckoutSession,
  success,
  cancel,
  webhook,
  checkoutSessionById
};