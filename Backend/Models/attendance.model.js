const mongoose = require("mongoose");

const attendanceSchema = new mongoose.Schema({

 employee:{
  type:mongoose.Schema.Types.ObjectId,
  required:true
 },

 role:{
  type:String,
  enum:["employee","manager"],
  required:true
 },

 date:{
  type:Date,
  required:true
 },

 checkIn:Date,
 checkOut:Date,

 latitude:Number,
 longitude:Number,

 selfie:String,

 activeMinutes:{
  type:Number,
  default:0
 },

 idleMinutes:{
  type:Number,
  default:0
 },

 status:{
  type:String,
  enum:["present","half_day","absent"],
  default:"absent"
 }

},{timestamps:true});

module.exports = mongoose.model("Attendance",attendanceSchema);