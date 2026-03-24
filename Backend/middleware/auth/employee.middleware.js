const jwt=require('jsonwebtoken');
const usermodel=require("../../Models/user.model");

const authemployee=async(req,res,next)=>{
     const token=req.cookies.token;
     if(!token){
        return res.status(401).json({message:"Unauthorized"});
     }
     try{
        const decode=jwt.verify(token,process.env.JWT_SECRET);
        if(!decode){
            return res.status(401).json({message:"Unauthorized"});
        }
        const employee=await usermodel.findOne({work_email:decode.work_email});
        if(!employee){
            return res.status(401).json({message:"Unauthorized"});
        }
        req.employee=employee;
        next();
     }catch(error){
        res.status(500).json({error:error.message});
     }
}

