const { PrismaClient } = require('@prisma/client');
const express=require('express');
const appError = require('../utils/appError');
const httpStatusText = require('../utils/httpStatusText');
const router=express.Router();
const prisma=new PrismaClient();

router.get('/',async(req,res)=>{
    const {page,limit}=req.query;
    const skip=(page-1)*limit
    try {
        const users=await prisma.users.findMany({
            skip:skip||undefined,
            take:Number(limit)||undefined
        });
        res.status(200).json(users);
    } catch (err) {
        const error=appError.create(`Check your data`,400,httpStatusText.ERROR)
    }
})

router.get('/:id',async(req,res)=>{
    const id=Number(req.params.id);
    try {
        const users=await prisma.users.findFirst({
            where:{Id:id}
        });
        res.status(200).json(users);        
    } catch (err) {
        const failure=appError.create('User not found',404,httpStatusText.ERROR)
        res.status(404).json(failure);
    }
})


module.exports=router;