module.exports=(...roles)=>{
    return (req,res,next)=>{
        if(!roles.includes(req.currentUser.role))
        {
            return next('this role is not authorized to make this operation');
        }
        next();
    }
}