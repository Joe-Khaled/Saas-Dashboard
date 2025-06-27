module.exports=(...roles)=>{
    return (req,res,next)=>{
        if(!roles.includes(req.currentUser.roles[0]))
        {
            return next('this role is not authorized to make this operation');
        }
        next();
    }
}