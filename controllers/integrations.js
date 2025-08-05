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

    const integrationData=await baseCrm.checkingIntegrationData(userId,'hubspot')
    const accessToken=integrationData.accessToken

    
    const contacts=await baseCrm.pullData(accessToken,'https://api.hubapi.com/crm/v3/objects/contacts',2
            ,'firstname,lastname,email,phone')

    // const mappedContacts=baseCrm.mappingElements(elements,'contacts')
    
    res.status(200).json({contacts})
})


router.get('/engagements',verifyToken,async(req,res)=>{
    const userId=req.currentUser.id;

    const integrationData=await baseCrm.checkingIntegrationData(userId,'hubspot')
    const accessToken=integrationData.accessToken

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
            const data=await baseCrm.getSingleUserData(filteredEngagements[i].engagement.createdBy)
            const name=data.FirstName+' '+data.LastName
            const lastCount=topPerformers.get(name)
            if(lastCount)
            {
                topPerformers.set(name,lastCount+1)
            }
            else{
                topPerformers.set(name,1)

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
    if(req.query.report){
        const generatingAndSending=await generateAndSendReport(userId,req.body.config,mappedEngagements);
       if(generatingAndSending.statusCode==200){
           res.status(200).json(generatingAndSending);
       }
       else{
           res.status(400).json(generatingAndSending);
           return;
       }
    }
    else{
        res.status(200).json({engagements:mappedEngagements,totalEngagements:filteredEngagements.length})
    }
})

router.get('/engagements/tasks',verifyToken,async(req,res)=>{
    const userId=req.currentUser.id;

    const integrationData=await baseCrm.checkingIntegrationData(userId,'hubspot')
    const accessToken=integrationData.accessToken
    
    
    
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

router.post('/users',verifyToken,async(req,res)=>{
      const userId=req.currentUser.id;

      const integrationData=await baseCrm.checkingIntegrationData(userId,'hubspot')
      const accessToken=integrationData.accessToken
      const integrationId=integrationData.integrationId  
      const users=await baseCrm.pullData(accessToken,'https://api.hubapi.com/settings/v3/users',100)
    //   console.log(users);  
      users.forEach(async(user) => {
            let roleIds=user.roleIds
            roleIds=JSON.stringify(roleIds);
            const userExist=await prisma.integration_Users.findUnique({where:{Id:user.id}})
            if(!userExist){
                await prisma.integration_Users.create({
                    data:{
                        Id:user.id,
                        Email:user.email,
                        FirstName:user.firstName,
                        LastName:user.lastName,
                        RoleIds:roleIds,
                        SuperAdmin:user.superAdmin,
                        IntegrationId:integrationId
                    }
                })
            }
           else{
            await prisma.integration_Users.update({
                data:{
                    RoleIds:roleIds,
                    SuperAdmin:user.superAdmin,
                    IntegrationId:integrationId
                },
                where:{
                    Id:user.id
                }
            })
           } 
      });
    
      res.status(200).json({Status:200,Message:"Users added successfully"})
      
})
router.get('/user/:id',async(req,res)=>{
    const userId=req.params.id;
    
    const user=await baseCrm.getSingleUserData(userId);
    res.status(200).json(user);
})


// router.post('/webhooks/hubspot',async(req,res)=>{
//     const event=req.body
// })

router.delete('/:id',async(req,res)=>{
    await prisma.integrations.delete({
        where:{Id:Number(req.params.id)}
    })
    res.status(200).json({Message:"Deleted Successully"});
})

// router.get('/test',verifyToken,async(req,res)=>{
//     const userId=req.currentUser.id;

//     const integrationData=await baseCrm.checkingIntegrationData(userId,'hubspot')
//     const accessToken=integrationData.accessToken
    
//     const engagements=await baseCrm.pullData(accessToken,'https://api.hubapi.com/engagements/v1/engagements/paged',100)
//     for(let i=0;i<engagements.length;i++){
//         let details={
//         "id": engagements[i].engagement.id,
//         "portalId": engagements[i].engagement.portalId,
//         "active": engagements[i].engagement.active,
//         "createdAt": engagements[i].engagement.createdAt,
//         "lastUpdated": engagements[i].engagement.lastUpdated,
//         "ownerId":engagements[i].engagement.ownerId,
//         "contactIds":engagements[i].associations.contactIds,
//         "status":engagements[i].metadata.status
//     }
//     details=JSON.stringify(details);
//     await prisma.engagement.create({
//         data:{
//             IntegrationId:integrationData.integrationId,
//             Details:details,
//             Timestamp:new Date(engagements[i].engagement.timestamp),
//             Type:engagements[i].engagement.type,
//             Subject:engagements[i].engagement.bodyPreview
//         }
//     })
// }
//     res.status(200).json('saved successfully');
// })
module.exports=router;



/*
maintainances here :
1-make a job that pull data from hubspot each determined period 
and make the logic that you get data from your database     

2- 6. Engagements by Type (Pie Chart)
Count how many of each type exist (CALL, TASK, EMAIL, MEETING)
Add this KPI


*/