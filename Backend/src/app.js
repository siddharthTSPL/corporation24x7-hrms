const express=require('express');
const cookieparser=require('cookie-parser');
const cors=require('cors');
require('../automatic/autoelcredit');
const app=express();
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(cookieparser());
app.use(cors({
     origin:'http://localhost:3000',
     credentials:true
}));
const adminrouter=require('../routes/adminroutes');
const managerrouter=require('../routes/managerroutes');
const userrouter=require('../routes/userroutes');
const documentroute=require('../routes/documentroute');
const attendancerouter=require('../routes/attendanceroutes');
app.use('/admin',adminrouter);
app.use('/manager',managerrouter);
app.use('/user',userrouter);
app.use('/document',documentroute);
app.use('/attendance',attendancerouter);
module.exports=app;



