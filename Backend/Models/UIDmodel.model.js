const mongoose = require("mongoose");

const uidCounterSchema = new mongoose.Schema({
     department:{
          type:String,
          enum:["MGMT","OPR","BPO","HR","ENG"],
          required:true,
          unique:true
     },
     lastNumber:{
          type:Number,
          default:0
     }
});

module.exports = mongoose.model("UidCounter", uidCounterSchema);