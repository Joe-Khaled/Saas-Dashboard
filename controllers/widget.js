const express=require('express');
const {PrismaClient}=require('@prisma/client')
const prisma=new PrismaClient();
const router=express.Router();
const appError=require('../utils/appError')
const httpStatusText=require('../utils/httpStatusText')

//Make new widget
router.post('/',async(req,res)=>{
    let {userId,title,type,config,position}=req.body;
    const checkUser=await prisma.users.findFirst({
        where:{Id:userId}
    })
    if(!checkUser)
    {
        const failure=appError.create('Sign up first',401,httpStatusText.FAILED)
        res.status(401).json(failure);
        return;
    }
    config=JSON.stringify(config);
    if(position.x==undefined||position.y==undefined||position.h==undefined||position.w==undefined)
    {
        const failure=appError.create('Please review your position',400,httpStatusText.FAILED)
        res.status(400).json(failure);
        return;
    }
    position=JSON.stringify(position);
    if(!type)
    {
        const failure=appError.create(`Please send me your widget's type`,400,httpStatusText.FAILED)
        res.status(400).json(failure);
        return;
    }
    try {
        const widget=await prisma.widgets.create({
            data:{UserId:userId,Title:title,Position:position,Type:type,Config:config}
        })
        const parsedPosition=JSON.parse(widget.Position)
        const parsedConfig=JSON.parse(widget.Config)
        widget.Position=parsedPosition;
        widget.Config=parsedConfig;
        res.status(200).json({Status:httpStatusText.SUCCESS,Message:'New widget created successfully',widget});
    } catch (err) {
        const error=appError.create(`Can't create widget`,400,httpStatusText.ERROR)
        res.status(400).json(error);
        return;
    }
    
})

//Retrieve all widgets 
router.get('/',async(req,res)=>{
     const {page,limit,type}=req.query;
     const userId=Number(req.body.userId);

     const skip=(page-1)*limit

     try {         
         const widgets=await prisma.widgets.findMany({
            take:Number(limit)||undefined,
            skip:skip||undefined,
            where:{
                Type:type||undefined,
                UserId:userId||undefined
            }
         })
         res.status(200).json(widgets);
     } catch (err) {
        const error=appError.create(`Can't retrive widgets`,400,httpStatusText.FAILED)
        res.status(400).json(error);
        return;
     }
})

//Retrieve single widget using id 
router.get('/:id',async(req,res)=>{
    const widgetId=Number(req.params.id);
    try {
        const widget=await prisma.widgets.findFirst({
            where:{Id:widgetId}
        })
        if(!widget)
        {
            const failure=appError.create('Not found',404,httpStatusText.FAILED);
            res.status(404).json(failure);
            return;
        }
        res.status(200).json({Status:httpStatusText.SUCCESS,widget});
    } catch (err) {
        const error=appError.create(`Check your data`,400,httpStatusText.ERROR)
        res.status(400).json(error);
        console.log(err);
    }
})

//update single widget using id 
router.put('/:id',async(req,res)=>{
    const widgetId=Number(req.params.id);
    let {type,config,position,visibility}=req.body;
    if(config){config=JSON.stringify(config);}
    if(position){config=JSON.stringify(position);}
    try {
        const newWidgetVersion=await prisma.widgets.update({
            where:{Id:widgetId},
            data:{
                Type:type,Config:config,Position:position,IsVisible:visibility
            }
        })
        res.status(200).json({Status:httpStatusText.SUCCESS,Message:'Widget updated successfully',newWidgetVersion});
    } catch (err) {
        const error=appError.create('Check your data',400,httpStatusText.ERROR);
        res.status(400).json(error);
        console.log(err);
    }
})

//Delete widget using id 
router.delete('/:id',async(req,res)=>{
    const widgetId=Number(req.params.id);
    try {
        const deletedWidget=await prisma.widgets.delete({
            where:{Id:widgetId}
        })
        res.status(200).json({Status:httpStatusText.SUCCESS,Message:'Widget deleted successfully',deletedWidget});
    } catch (err) {
        const error=appError.create('Check your data',400,httpStatusText,httpStatusText.ERROR);
        res.status(400).json(error);
        console.log(error)
    }
})

module.exports=router;
