const express=require('express');
const router=express.Router();
const { PrismaClient }=require('@prisma/client');
const prisma=new PrismaClient()
const verifyToken = require('../middlewares/verifyToken');
const baseCrm=require('../services/crm/baseCrm');
const { generateAndSendReport } = require('./report');
router.get('',(req,res)=>{
    res.render('crm.ejs');
})
router.get('/oauth/callback',async(req,res)=>{
    const code=req.query.code;
    const stateToken=req.query.state;
    
    const tokens=await baseCrm.getTokens('https://api.hubapi.com/oauth/v1/token',code)
    if(tokens.error){
        res.status(500).json(tokens.error);
        return;
    }
    
    const integrationSaving=await baseCrm.integrationSaving(tokens,stateToken,'hubspot')

    if(integrationSaving.statusCode==200)res.status(200).json(integrationSaving)
    else res.status(400).json(integrationSaving)
})


router.get('/contacts',verifyToken,async(req,res)=>{
    const userId=req.currentUser.id;

    const accessToken=await baseCrm.checkingIntegrationData(userId,'hubspot')
    
    const contacts=await baseCrm.pullData(accessToken,'https://api.hubapi.com/crm/v3/objects/contacts',100
            ,'firstname,lastname,email,phone')

    // const mappedContacts=baseCrm.mappingElements(elements,'contacts')
    
    res.status(200).json({contacts})
})


router.get('/engagements',verifyToken,async(req,res)=>{
    const userId=req.currentUser.id;

    const accessToken=await baseCrm.checkingIntegrationData(userId,'hubspot')
    
    const engagements=await baseCrm.pullData(accessToken,'https://api.hubapi.com/engagements/v1/engagements/paged',100)

    const createdBy=req.query.createdBy || undefined;
    const type=req.query.type || undefined;
    
    const filteredEngagements=engagements.filter((engagement)=>{
        return (createdBy ? engagement.engagement.createdBy == createdBy : true) && ( type ? engagement.engagement.type == type : true)
    })

    

    if(req.query.topPerformers)
    {
        const topPerformers=new Map();

        for(let i=0;i<filteredEngagements.length;i++)
        {
            // console.log(filteredEngagements[i].engagement.createdBy);
            // return;
            const lastCount=topPerformers.get(filteredEngagements[i].engagement.createdBy)
            if(lastCount)
            {
                topPerformers.set(filteredEngagements[i].engagement.createdBy,lastCount+1)
            }
            else{
                topPerformers.set(filteredEngagements[i].engagement.createdBy,1)

            }
        }
        const sortedMap = new Map(
            [...topPerformers.entries()]
                .sort((a, b) => b[1] - a[1])
            );
        const jsonTopPerformers=Object.fromEntries(sortedMap);
        res.status(200).json(jsonTopPerformers)
        return;
        // console.log(filteredEngagements);
    }
    const mappedEngagements=baseCrm.mappingElements(filteredEngagements,'engagements')
    // console.log(createdBy);
    // res.status(200).json({engagements:mappedEngagements})
     const generatingAndSending=await generateAndSendReport(1018,req.body.config,mappedEngagements);
    if(generatingAndSending.statusCode==200){
        res.status(200).json(generatingAndSending);
    }
    else{
        res.status(400).json(generatingAndSending);
        return;
    }
})




router.get('/engagements/tasks',verifyToken,async(req,res)=>{
    const userId=req.currentUser.id;

    const accessToken=await baseCrm.checkingIntegrationData(userId,'hubspot')
    
    const engagements=await baseCrm.pullData(accessToken,'https://api.hubapi.com/engagements/v1/engagements/paged',100)

    const {status,createdBy,dateRange}=req.query;
    const from=dateRange == 'week' ? Number(new Date())-604800000 : dateRange =='day' ? Number(new Date())-86400000 
    : dateRange == 'month' ? Number(new Date())-2592000000 : false;
    const filteredEngagements=engagements.filter((engagement)=>{
        return (createdBy ? engagement.engagement.createdBy == createdBy : true) && ( status ? engagement.metadata.status == status : true)
        && (from ? engagement.engagement.timestamp >= from : true)
    })

    const mappedEngagements=baseCrm.mappingElements(filteredEngagements,'engagements')
    // console.log(createdBy);
    // console.log(new Date().getMonth());
    res.status(200).json({engagements:mappedEngagements})
    // console.log(new Date());
})


router.get('/engagements/report',verifyToken,async(req,res)=>{
      const userId=req.currentUser.id;

    const accessToken=await baseCrm.checkingIntegrationData(userId,'hubspot')
    
    const engagements=await baseCrm.pullData(accessToken,'https://api.hubapi.com/engagements/v1/engagements/paged',100)

    const createdBy=req.query.createdBy || undefined;
    const type=req.query.type || undefined;
    
    const filteredEngagements=engagements.filter((engagement)=>{
        return (createdBy ? engagement.engagement.createdBy == createdBy : true) && ( type ? engagement.engagement.type == type : true)
    })

    

    if(req.query.topPerformers)
    {
        const topPerformers=new Map();

        for(let i=0;i<filteredEngagements.length;i++)
        {
            // console.log(filteredEngagements[i].engagement.createdBy);
            // return;
            const lastCount=topPerformers.get(filteredEngagements[i].engagement.createdBy)
            if(lastCount)
            {
                topPerformers.set(filteredEngagements[i].engagement.createdBy,lastCount+1)
            }
            else{
                topPerformers.set(filteredEngagements[i].engagement.createdBy,1)

            }
        }
        const sortedMap = new Map(
            [...topPerformers.entries()]
                .sort((a, b) => b[1] - a[1])
            );
        const jsonTopPerformers=Object.fromEntries(sortedMap);
        res.status(200).json(jsonTopPerformers)
        return;
        // console.log(filteredEngagements);
    }
    const mappedEngagements=baseCrm.mappingElements(filteredEngagements,'engagements')
})


router.get('/deals',verifyToken,async(req,res)=>{
    const userId=req.currentUser.id;                                                                                                                

    const accessToken=await baseCrm.checkingIntegrationData(userId,'hubspot')
    
    const deals=await baseCrm.pullData(accessToken,'https://api.hubapi.com/crm/v3/objects/deals',100
            ,'dealname,amount,dealstage,pipeline')

    // const mappedDeals=baseCrm.mappingElements(elements,'deals')
    
    res.status(200).json({deals})
})


router.delete('/:id',async(req,res)=>{
    await prisma.integrations.delete({
        where:{Id:Number(req.params.id)}
    })
    res.status(200).json({Message:"Deleted Successully"});
})


module.exports=router;