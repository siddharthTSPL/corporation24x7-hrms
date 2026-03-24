const jwt=require('jsonwebtoken');
const managermodel=require("../../Models/manager.model");

const authmanager=async(req,res,next)=>{
     const token=req.cookies.token;
     if(!token){
        return res.status(401).json({message:"Unauthorized"});
     }
     try{
        const decode=jwt.verify(token,process.env.JWT_SECRET);
        if(!decode){
            return res.status(401).json({message:"Unauthorized"});
        }
        const manager=await managermodel.findOne({work_email:decode.work_email});
        if(!manager){
            return res.status(401).json({message:"Unauthorized"});
        }
        req.manager=manager;
      
        next();
     }catch(error){
        res.status(500).json({error:error.message});
     }
}



