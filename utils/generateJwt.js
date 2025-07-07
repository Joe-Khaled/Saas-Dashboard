const jwt=require('jsonwebtoken');

const generateAccessJwt=async(payload)=>{
    const token=await jwt.sign(payload,process.env.JWT_SECRET_KEY,{expiresIn:'60m'});
    return token;
}
const generateRefreshJwt=async(payload)=>{
    const token=await jwt.sign(payload,process.env.JWT_SECRET_KEY,{expiresIn:'180d'});
    return token;
}

const generateTempJwt=async(payload)=>{
    const token=await jwt.sign(payload,process.env.JWT_SECRET_KEY,{expiresIn:'1m'});
    return token;
}

module.exports={
    generateAccessJwt,
    generateRefreshJwt,
    generateTempJwt
}