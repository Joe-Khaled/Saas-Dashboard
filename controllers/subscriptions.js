const express=require('express');
const router=express.Router();
const stripe=require('stripe')(process.env.STRIPE_PRIVATE_KEY);

const storeItems=new Map([
    [1,{priceInCents:10000,plan :"Weekly"}],
    [2,{priceInCents:60000,plan: "Monthly"}],
    [3,{priceInCents:680000,plan:"Annualy"}]
])

router.post('/create-checkout-session', async (req, res) => {
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
      success_url: `${process.env.SERVER_URL}/success.html`,
      cancel_url: `${process.env.SERVER_URL}/cancel.html`,
    });
    res.json({ url: session.url });
  } catch (e) {
    console.error("Stripe error:", e); // log the actual error
    res.status(500).json({ error: e.message });
  }
});

router.get('/checkout-session/:id',async(req,res)=>{
    const session=await stripe.checkout.sessions.retrieve(req.params.id,{
        expand:['line_items']
    })
})

module.exports=router;