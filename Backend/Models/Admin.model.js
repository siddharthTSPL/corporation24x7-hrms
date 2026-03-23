const moongose=require('mongoose');
const bcrypt=require('bcrypt');

const adminSchema=new moongose.Schema({
     username:{
          type:String,
          required:[true,'Username is required']
     },
     password:{
          type:String,
          required:[true,'Password is required']
     },
     status:{
          type:String,
          enum:['active','inactive'],
          default:'active'
     },
     role:{
          type:String,
          default:'admin'
     },
     email:{
          type:String,
          required:[true,'Email is required'],
          unique:[true,'Email already exists']
     }
})
adminSchema.pre('save',async function(next){
     if(!this.isModified('password')) return next();
     this.password=await bcrypt.hash(this.password,10);
     next();
})

adminSchema.methods.isValidPassword=async function(password){
     return await bcrypt.compare(password,this.password);
}
const Adminmodel=moongose.model('Admin',adminSchema);
module.exports=Adminmodel