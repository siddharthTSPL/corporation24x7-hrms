const jwt=require('jsonwebtoken');
const adminmodel=require("../../Models/Admin.model");


const adminauth=async (req,res,next)=>{
     const token=req.cookies.token;
     if(!token){
        return res.status(401).json({message:"Unauthorized"});
     }
     try{
        const decode=jwt.verify(token,process.env.JWT_SECRET);
        if(!decode){
            return res.status(401).json({message:"Unauthorized"});
        }
        
   const admin=await adminmodel.findOne({username:decode.username,email:decode.email});
        if(!admin){
            return res.status(401).json({message:"Unauthorized"});
        }
        req.admin=admin;
        next();
     }catch(error){
        res.status(500).json({error:error.message});
     }
}

module.exports=adminauth;