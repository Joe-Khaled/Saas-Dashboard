const express=require('express');
const fs=require('fs');
const { PrismaClient }=require('@prisma/client');
const appError = require('../utils/appError');
const httpStatusText = require('../utils/httpStatusText');
const { Parser }=require('json2csv');
const exceljs=require('exceljs');
const path = require('path');
const prisma=new PrismaClient()
const pdfPrinter=require('pdfmake');
const sendEmailWithAttachment=require('../utils/email');
const userNotExist=async(userId)=>{
    if(userId)
    {
        const userExist=await prisma.users.findFirst({
            where:{Id:userId}
        })
        if(!userExist)
        {
            const failure=appError.create('User not found',404,httpStatusText.FAILED);
            return failure; 
        }
    }
}

//Generate and send report function
const generateAndSendReport=async(userId,config,data)=>{
    let reportPath='';
    switch (config.format) {
        case "CSV":{
            const parser=new Parser()
            const csv=parser.parse(data);
            fs.writeFileSync(path.join(__dirname,'../uploads/tmp/csv/report.csv'),csv);
            reportPath=path.join(__dirname,'../uploads/tmp/csv/report.csv');
        }
        break;
        case "PDF":{
            // console.log(data[0].CreatedAt.toISOString());
            // return;
            let fonts = {
                    Roboto: {
                        normal: 'node_modules/roboto-font/fonts/Roboto/roboto-regular-webfont.ttf',
                        bold: 'node_modules/roboto-font/fonts/Roboto/roboto-bold-webfont.ttf',
                        italics: 'node_modules/roboto-font/fonts/Roboto/roboto-italic-webfont.ttf',
                        bolditalics: 'node_modules/roboto-font/fonts/Roboto/roboto-bolditalic-webfont.ttf'
                    }
                };
            const printer=new pdfPrinter(fonts);
            let tableBody=[];
            switch (config.type) {
                case "user-activity":
                tableBody=[
                ["Name","Email","Role","CreatedAt"],
                ...data.map(item=>[item.Name,item.Email,item.Role,item.CreatedAt.toISOString()])
                ]
                break;
                case "billing-summary":
                tableBody=[
                ["User Id","Amount","Status","Paid At","Invoice URL"],
                ...data.map(item=>[item.UserId,item.Amount,item.Status,item.PaidAt.toISOString(),item.invoiceUrl])
                ]
                break;
                case "integration-status":
                reportData = await generateIntegrationReport(config);
                break;
                case "crm-engagement":
                tableBody=[
                    ["id","portalId","active","lastUpdated","createdBy","type"
                    ],
                    ...data.map(item=>[item.id,item.portalId,item.active,item.lastUpdated,item.createdBy,item.type ])
                ]
                break;
                default:
                throw new Error("Unknown report type");
            }    

            const docDefinition={
                content:[
                    {text:`${config.type.toUpperCase()}`,style:'header'},
                    {
                        table:{
                            body:tableBody
                        }
                    },
                ],
                styles:{
                    header:{
                        fontSize:18,
                        bold:true
                    }
                }
            }
            const pdfDoc=printer.createPdfKitDocument(docDefinition);
            pdfDoc.pipe(fs.createWriteStream(path.join(__dirname,'../uploads/tmp/pdf/report.pdf')));
            pdfDoc.end()
            reportPath=path.join(__dirname,'../uploads/tmp/pdf/report.pdf');
        }
        break;
        case "EXCEL":{
            const workbook=new exceljs.Workbook()
            const workSheet=workbook.addWorksheet('Sheet 1');
            const columns= Object.keys(data[0]).map((key) =>({
                header:key.charAt(0).toUpperCase() + key.slice(1),
                key:key,
                width:20
            }))

        workSheet.columns=columns
        data.forEach((record)=>{
            workSheet.addRow(record);
        })

        await workbook.xlsx.writeFile(path.join(__dirname,'../uploads/tmp/excel/report.xlsx'))
        reportPath=path.join(__dirname,'../uploads/tmp/excel/report.xlsx');

        }
        break;
        default:
        throw new Error("Unknown report format");
    }
    const user=await prisma.users.findFirst({where:{Id:userId}})
    const email=user.Email;
    try{
        await sendEmailWithAttachment(email,`${config.type} Report`,`Look the ${config.format} file below:`,reportPath)
        return {Status:httpStatusText.SUCCESS,Message:'Report was sent to email successfully',statusCode:200};
    }
    catch(err){
        const error=appError.create(`Failed to send email`,400,httpStatusText.ERROR);
        return error;
    }
}

const generateUserActivityReport=async(config)=>{
    const {type,format,filters}=config;
    const userId=Number(filters.userId)
    userNotExist(userId)
    try {
        const reportData=await prisma.users.findMany({
           where:{
                Id:userId || undefined,
                Role:filters.role || undefined,
                CreatedAt:{
                    lte:filters.to_date || undefined,
                    gte:filters.from_date || undefined
                }
           },
           select:{
            Name:true,Email:true,Role:true,CreatedAt:true,AuditLogs:filters.auditLogs || undefined
           }
        })
        return reportData;
    } catch (err) {
        const error=appError.create('Not found',404,httpStatusText.ERROR);
        return error;
    }
}

const generateBillingReport=async(config)=>{
    const {type,format,filters}=config;
    const userId=Number(filters.userId);
    userNotExist(userId)
    try {
        const reportData=await prisma.payments.findMany({
           where:{
                Id:userId || undefined,
                Status:filters.Status,
                PaidAt:{
                    lte:filters.to_date || undefined,
                    gte:filters.from_date || undefined
                },
                Amount:{
                    lte:filters.max_amount || undefined,
                    gte:filters.min_amount || undefined
                },
                Users:{
                    Subscriptions:{
                        some:{
                            Plan:filters.plan || undefined
                        }
                    }
                }
           }
        })
        return reportData;
    } catch (err) {
        const error=appError.create('Not found',404,httpStatusText.ERROR);
        return error;
    }
}
const generateIntegrationReport=async(config)=>{
    const {type,format,filters}=config;
    const userId=Number(filters.userId);
    userNotExist(userId)
    try {
        const reportData=await prisma.integrations.findMany({
            where:{
                UserId:userId || undefined,
                Provider:filters.Provider || undefined,
                ConnectedAt:{
                    gte:filters.from_date || undefined,
                    lte:filters.to_date || undefined
                }
            }
        })
        return reportData;
    } catch (err) {
        const error=appError.create('Not found',404,httpStatusText.ERROR);
        return error;
    }
}
//Generating new report endpoint
const generateNewReport=async(req,res)=>{
    const {userId,name,config,periodic_report,period_in_weeks}=req.body;
     let reportData;
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
    const generatingAndSending=await generateAndSendReport(userId,config,reportData)
    if(generatingAndSending.statusCode==200){
        res.status(200).json(generatingAndSending);
    }
    else{
        res.status(400).json(generatingAndSending);
        return;
    }
    if(periodic_report){
        const period_in_days=period_in_weeks*7;
        let now=new Date();
        const nextRun=new Date(now.getTime() + period_in_days * 24 * 60 * 60 * 1000);
        const stringifiedConfig=JSON.stringify(config);
        const newJob=await prisma.jobs.create({
            data:{
                UserId:userId,Config:stringifiedConfig,JobName:'generate_report',Period:period_in_days,NextRun:nextRun
            }
        })  
        console.log('job created successfully')
    }
}

module.exports={
    generateNewReport,
    generateAndSendReport,
    generateUserActivityReport,
    generateBillingReport,
    generateIntegrationReport
}