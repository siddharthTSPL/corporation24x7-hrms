const jwt=require('jsonwebtoken');

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
        req.managerid=decode.managerid;
        req.role=decode.role;
        next();
     }catch(error){
        res.status(500).json({error:error.message});
     }
}



