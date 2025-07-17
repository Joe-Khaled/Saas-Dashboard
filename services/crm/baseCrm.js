const appError = require("../../utils/appError");
const httpStatusText = require("../../utils/httpStatusText");
const jwt=require('jsonwebtoken');
const { PrismaClient }=require('@prisma/client');
const prisma=new PrismaClient()

async function getTokens(api,code){
    const response= await fetch(api,{
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
        const err=appError.create('OAuth token exchange failed',500,httpStatusText.ERROR)
        console.error('HubSpot error:', error.message);
        return {error:err};
    }
    const tokens=await response.json();
    return tokens;
}

async function integrationSaving(tokens,stateToken,provider) {
    const stateTokenData=jwt.verify(stateToken,process.env.JWT_SECRET_KEY)
    const now=new Date();
    let unixTimeStamp=Math.floor(now.getTime()/1000)
    unixTimeStamp+=tokens.expires_in;
    let ExpiresIn=new Date(unixTimeStamp * 1000).toISOString()
    ExpiresIn=new Date(ExpiresIn);
    
    try{
        const savedIntegration=await prisma.integrations.findFirst({
            where:{UserId:stateTokenData.id,Provider:provider}
        })
        if(!savedIntegration){
            await prisma.integrations.create({
                data:{
                    UserId:stateTokenData.id,
                    Provider:provider,
                    AccessToken:tokens.access_token,
                    RefreshToken:tokens.refresh_token,
                    ExpiresIn       
                }
            })
        }
        return {message:'Connected to CRM successfully',statusCode:200,statusText:httpStatusText.SUCCESS}
    }
    catch (err) {
        console.log(err);
        const error=appError.create('Failed to connect to CRM',400,httpStatusText.ERROR)
        return error;
    }
}

async function hubspotRefreshAccessToken(refreshToken) {
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

async function checkingIntegrationData(userId,provider) {
        const integrationData=await prisma.integrations.findFirst({
            where:{UserId:userId,Provider:provider}
        })
        if(!integrationData)throw new Error('CRM not connected.');
        let accessToken='';
        if(integrationData.ExpiresIn<new Date())
        {
            const response=await hubspotRefreshAccessToken(integrationData.RefreshToken);
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
        else accessToken=integrationData.AccessToken;
        return accessToken;
}

async function pullData(accessToken,api,limit,properties,entity) {

    let elements = [];
    let after = undefined;
    while (true) {
        const url = new URL(api);
        limit=String(limit);
        url.searchParams.append('limit', limit);
        if(properties)url.searchParams.append('properties', properties);
        if (after) url.searchParams.append('after', after);
        const response = await fetch(url.href, {
        headers: {
            Authorization: `Bearer ${accessToken}`,
        },
        });
        
        if (!response.ok) {
        const error = await response.text();
        console.error(`Failed to fetch ${entity}:`, error.message);
        throw new Error(`Failed to fetch ${entity}`);
        }

        const data = await response.json();
        elements = elements.concat(data.results);

        if (!data.paging?.next?.after) break;
        after = data.paging.next.after;
    }
    return elements;
}

 function mappingElements(elements,entity) {
    switch (entity){
        case 'contacts':{
            elements=elements.map((contact)=>{
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
            break;
        }
        case 'engagements':{
            elements=elements.map((engagement)=>{
                // const props=engagement.properties;
                return{
                    id:engagement.engagement.id,
                    portalId:engagement.engagement.portalId,
                    active:engagement.engagement.active,
                    createdAt: engagement.engagement.createdAt,
                    lastUpdated: engagement.engagement.lastUpdated,
                    createdBy: engagement.engagement.createdBy,
                    modifiedBy: engagement.engagement.modifiedBy,
                    ownerId:engagement.engagement.ownerId,
                    type: engagement.engagement.type,
                    status:engagement.metadata.status
                }
            })
            break;
        }
        default:break;
    }
    return elements;
}
async function generateAnalyticsReport(config){
    const{format,filters} = config;
    
}

module.exports={
    getTokens,
    integrationSaving,
    checkingIntegrationData,
    pullData,
    mappingElements
}