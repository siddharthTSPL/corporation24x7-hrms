const express=require('express');
const managerrouter=express.Router();
const managercontroller=require('../controllers/manager.controller');

managerrouter.get("/verify/:token", managercontroller.verifyManagerEmail);
managerrouter.post('/login',managercontroller.managerlogin);
managerrouter.post('/logout',managercontroller.managerlogout);
managerrouter.get( "/change-password", managercontroller.showPasswordPage);
managerrouter.post('/firstloginpasswordchange',managercontroller.managerFirstLoginPasswordChange);

managerrouter.put('/updatepassword',managercontroller.managerUpdatePassword);
managerrouter.get('/userunderme',managercontroller.userunderme);

managerrouter.post('/updatepassword',managercontroller.managerupdatepassword);

managerrouter.get('/viewallleaves',managercontroller.viewallleaves);
managerrouter.post('/acceptleaverequest',managercontroller.acceptleaverequest);
managerrouter.post('/rejectleaverequest',managercontroller.rejectleaverequest);
managerrouter.post('/forwardtoadmin',managercontroller.forwardedtoadmin);
managerrouter.get("/employeedocuments/:employeeId", managercontroller.viewEmployeeDocuments);

managerrouter.get('/showannouncements',managercontroller.showannouncements);


managerrouter.get("/allemployeewhounderme", managercontroller.viewallemployeewhounderme); 

managerrouter.post('/forgetpassword',managercontroller.forgetpasswordloginbyotp);
managerrouter.post('/verifyMotp',managercontroller.verifyManagerOtp);
managerrouter.get('/showPasswordPageotp',managercontroller.showPasswordPageotp);
managerrouter.post('/resetManagerPassword',managercontroller.resetManagerPassword);

managerrouter.get('/getmyleaves',managercontroller.getmyleaves);


managerrouter.post('/applyleavem',managercontroller.applyleavem);

managerrouter.post('/reviewtoemployee',managercontroller.reviewtoemployee);



module.exports=managerrouter;