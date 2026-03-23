const mongoose = require("mongoose");

const otpbasedloginSchema = new mongoose.Schema(
{
  email: {
    type: String,
    required: [true, "Email is required"]
  },

  otp: {
    type: String,
    required: [true, "OTP is required"]
  },

  expiresAt: {
    type: Date,
    default: () => Date.now() + 5 * 60 * 1000 
  }

},
{
  timestamps: true
}
);

otpbasedloginSchema.methods.compareOtp = function(userOtp){
  return this.otp === userOtp;
};

otpbasedloginSchema.methods.isExpired = function(){
  return Date.now() > this.expiresAt;
};

const OtpModel = mongoose.model("OtpLogin", otpbasedloginSchema);

module.exports = OtpModel;