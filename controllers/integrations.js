
const express=require('express');
const router=express.Router();
const { PrismaClient }=require('@prisma/client');
const prisma=new PrismaClient()
const jwt=require('jsonwebtoken');
const verifyToken = require('../middlewares/verifyToken');
router.get('',(req,res)=>{
    res.render('crm.ejs');
})
router.get('/oauth/callback',async(req,res)=>{
    const code=req.query.code;
    const response= await fetch('https://api.hubapi.com/oauth/v1/token',{
        method:'POST',
        headers:{
            'Content-Type':'application/x-www-form-urlencoded',
        },
        body:new URLSearchParams({
            grant_type:'authorization_code',
            client_id:process.env.HUBSPOT_CLIENT_ID,
            client_secret:process.env.HUBSPOT_CLIENT_SECRET,
            redirect_uri:'http://localhost:5000/api/crm/oauth/callback',
            code,
        })
    })
    if(!response.ok)
    {
        const error = await response.text();
        console.error('HubSpot error:', error);
        return res.status(500).json('OAuth token exchange failed');
    }
    const tokens=await response.json();
    const token=req.query.state;
    const tokenData=jwt.verify(token,process.env.JWT_SECRET_KEY)
    // console.log(tokenData);
    // console.log(tokens);
    const now=new Date();
    let unixTimeStamp=Math.floor(now.getTime()/1000)
    unixTimeStamp+=tokens.expires_in;
    let ExpiresIn=new Date(unixTimeStamp * 1000).toISOString()
    ExpiresIn=new Date(ExpiresIn);

    // console.log(ExpiresIn);
    try{
        const savedIntegration=await prisma.integrations.findFirst({
            where:{UserId:tokenData.id,Provider:'hubspot'}
        })
        if(!savedIntegration){
            await prisma.integrations.create({
                data:{
                    UserId:tokenData.id,
                    Provider:'hubspot',
                    AccessToken:tokens.access_token,
                    RefreshToken:tokens.refresh_token,
                    ExpiresIn       
                }
            })
        }
        res.status(200).json('Connected to CRM successfully');
    }
    catch (err) {
        console.log(err);
        res.status(400).json('Failed to connect to CRM',err);
    }
})

async function refreshAccessToken(refreshToken) {
    const response=await fetch('https://api.hubapi.com/oauth/v1/token',{
        method:'POST',
        headers:{
            'Content-Type':'application/x-www-form-urlencoded'
        },
        body:new URLSearchParams({
            grant_type:'refresh_token',
            client_id:process.env.HUBSPOT_CLIENT_ID,
            client_secret:process.env.HUBSPOT_CLIENT_SECRET,
            refresh_token:refreshToken
        })
    })
    if(!response.ok){
        const error= await response.text();
        console.error('Token refresh failed:',error);
        throw new Error('Token refresh failed');
    }

    return await response.json();
}
router.get('/contacts',verifyToken,async(req,res)=>{
    const userId=req.currentUser.id;
    const integrationData=await prisma.integrations.findFirst({
        where:{UserId:userId,Provider:'hubspot'}
    })
    if(!integrationData)throw new Error('CRM not connected.');
    let accessToken='';
    if(integrationData.ExpiresIn<new Date())
    {
        const response=await refreshAccessToken(integrationData.RefreshToken);
        // console.log(response);
        await prisma.integrations.update({
            where:{Id:integrationData.Id},
            data:{
                AccessToken:response.access_token,
                RefreshToken:response.refresh_token,
                ExpiresIn:new Date(Date.now() + response.expires_in * 1000)
            }
        })
         accessToken=response.access_token;
    }
        accessToken=integrationData.AccessToken;
        let contacts = [];
        let after = undefined;

        while (true) {
        const url = new URL('https://api.hubapi.com/crm/v3/objects/contacts');
        url.searchParams.append('limit', '100');
        url.searchParams.append('properties', 'firstname,lastname,email,phone');
        if (after) url.searchParams.append('after', after);

        const response = await fetch(url.href, {
        headers: {
            Authorization: `Bearer ${accessToken}`,
        },
        });

        if (!response.ok) {
        const error = await response.text();
        console.error('Failed to fetch contacts:', error.message);
        throw new Error('Failed to fetch contacts');
        }

        const data = await response.json();
        contacts = contacts.concat(data.results);

        if (!data.paging?.next?.after) break;
        after = data.paging.next.after;
    }
    contacts=contacts.map((contact)=>{
        const props=contact.properties;
        return {
            id:contact.id,
            firstName:props.firstname || '',
            lastName:props.lastname || '',
            email: props.email || '',
            phone: props.phone || '',
            source:'hubspot'
        }
    })
    res.status(200).json({contacts})
})



router.delete('/:id',async(req,res)=>{
    await prisma.integrations.delete({
        where:{Id:Number(req.params.id)}
    })
    res.status(200).json({Message:"Deleted Successully"});
})

module.exports=router;