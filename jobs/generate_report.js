const {PrismaClient}=require('@prisma/client');
const prisma=new PrismaClient();
const cron=require('node-cron')
const {generateAndSendReport , generateUserActivityReport ,
    generateBillingReport,generateIntegrationReport
}=require('../controllers/report');

function checkReportsJobsNextRun(){
    const today=new Date();
    cron.schedule('0 0 */1 * *',async()=>{
        const todayReportJobs=await prisma.jobs.findMany({
            where:{
                NextRun:today
            }
        })
        for(let i=0;i<todayReportJobs.length;i++){
            const data=todayReportJobs[i];
            let config=data.Config,userId=data.UserId;
            config=JSON.parse(config);
            switch (config.type) {
                case "user-activity":
                reportData = await generateUserActivityReport(config);
                break;
                case "billing-summary":
                reportData = await generateBillingReport(config);
                break;
                case "integration-status":
                reportData = await generateIntegrationReport(config);
                break;
                default:
                throw new Error("Unknown report type");
            }
            generateAndSendReport(userId,config,reportData);
            const nextRun=new Date(now.getTime() + data.Period * 24 * 60 * 60 * 1000);
            await prisma.jobs.update({
                where:{Id:data.Id},
                data:{
                    NextRun:nextRun
                }
            })
        }

        })
    
}
module.exports={
    checkReportsJobsNextRun
}