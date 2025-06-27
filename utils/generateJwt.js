const jwt=require('jsonwebtoken');

const generateAccessJwt=async(payload)=>{
    const token=await jwt.sign(payload,process.env.JWT_SECRET_KEY,{expiresIn:'15m'});
    return token;
}
const generateRefreshJwt=async(payload)=>{
    const token=await jwt.sign(payload,process.env.JWT_SECRET_KEY,{expiresIn:'180d'});
    return token;
}

const generateTempJwt=async(payload)=>{
    const token=await jwt.sign(payload,process.env.JWT_SECRET_KEY,{expiresIn:'4m'});
    return token;
}

module.exports={
    generateAccessJwt,
    generateRefreshJwt,
    generateTempJwt
}