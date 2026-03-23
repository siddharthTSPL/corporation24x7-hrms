const mongoose=require('mongoose');
const admingenerate=require('../automatic/admingenarete');
require('dotenv').config();
mongoose.set("strictQuery", false);
const dbconnect=async()=>{
  try {
     await mongoose.connect(process.env.LINK);
     await admingenerate();
     console.log('database connected');
  } catch (error) {
     console.log(error);
  }
}

module.exports=dbconnect