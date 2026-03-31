const mongoose=require('mongoose');
require('dotenv').config();
mongoose.set("strictQuery", false);
const dbconnect=async()=>{
  try {
     await mongoose.connect(process.env.LINK);
       console.log("Database connected successfully");
  } catch (error) {
     console.log(error);
  }
}

module.exports=dbconnect