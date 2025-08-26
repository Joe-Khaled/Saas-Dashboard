const { PrismaClient } = require('@prisma/client');
const appError = require('../utils/appError');
const httpStatusText = require('../utils/httpStatusText');
const prisma=new PrismaClient();
const { date } = require('joi');

const getUsers=async(req,res)=>{
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
        res.status(404).json(error);
    }
}

const getUserById=async(req,res)=>{
    const id=Number(req.params.id);
    const user=await prisma.users.findFirst({
        select:{Id:true},where:{Email:req.currentUser.email}})
    
    
    if(id!=user.Id && (req.currentUser.role!='ADMIN'&&req.currentUser.role!="MANAGER"))
    {
        const failure=appError.create('Not Authorized ',401,httpStatusText.ERROR)
        res.status(404).json(failure);
    }
    try {
        const users=await prisma.users.findFirst({
            where:{Id:id}
        });
        res.status(200).json(users);        
    } catch (err) {
        const failure=appError.create('User not found',404,httpStatusText.ERROR)
        res.status(404).json(failure);
    }
}

//Update Profile Picture
const updateProfilePic=async(req,res)=>{
    const newProfilePic=req.file
    try {
        await prisma.users.update({
            where:{Email:req.currentUser.email},
            data:{
                ProfilePic:newProfilePic.filename
            }
        })
        res.json({Status:httpStatusText.SUCCESS,Message:"Profile Picture Updated Successfully",})
    } catch (err) {
        
    }
}


module.exports={
    getUsers,getUserById,updateProfilePic
};