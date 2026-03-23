const mongoose = require("mongoose");

const summarySchema = new mongoose.Schema({

 employee:{
  type:mongoose.Schema.Types.ObjectId
 },

 role:{
  type:String
 },

 month:Number,
 year:Number,

 presentDays:{
  type:Number,
  default:0
 }

});

module.exports = mongoose.model("AttendanceSummary",summarySchema);