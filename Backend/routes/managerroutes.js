const express=require('express');
const managerrouter=express.Router();
const managercontroller=require('../controllers/manager.controller');
const managermiddleware=require('../middleware/auth/manager.middleware');

managerrouter.get("/verify/:token", managercontroller.verifyManagerEmail);
managerrouter.post('/login',managercontroller.managerlogin);

managerrouter.post('/logout',managermiddleware,managercontroller.managerlogout);

managerrouter.get( "/change-password", managercontroller.showPasswordPage);
managerrouter.post('/firstloginpasswordchange',managercontroller.managerFirstLoginPasswordChange);

managerrouter.put('/updatepassword', managermiddleware,managercontroller.managerUpdatePassword);
managerrouter.get('/userunderme', managermiddleware,managercontroller.userunderme);
managerrouter.get('/viewallleaves',managermiddleware,managercontroller.viewallleaves);

managerrouter.post('/acceptleaverequest',managermiddleware,managercontroller.acceptleaverequest);
managerrouter.post('/rejectleaverequest',managermiddleware,managercontroller.rejectleaverequest);

managerrouter.post('/forwardtoadmin', managermiddleware,managercontroller.forwardedtoadmin);

managerrouter.get("/employeedocuments/:employeeId", managermiddleware, managercontroller.viewEmployeeDocuments);


managerrouter.get('/showannouncements',managermiddleware,managercontroller.showannouncements);


managerrouter.get("/allemployeewhounderme", managermiddleware, managercontroller.viewallemployeewhounderme); 

managerrouter.post('/forgetpassword',managercontroller.forgetpasswordloginbyotp);
managerrouter.post('/verifyMotp',managercontroller.verifyManagerOtp);
managerrouter.get('/showPasswordPageotp',managercontroller.showPasswordPageotp);
managerrouter.post('/resetManagerPassword',managercontroller.resetManagerPassword);
managerrouter.get('/getmyleaves',managermiddleware,managercontroller.getmyleaves);
managerrouter.post('/applyleavem',managermiddleware,managercontroller.applyleavem);
managerrouter.post('/reviewtoemployee',managermiddleware,managercontroller.reviewtoemployee);
managerrouter.get('/getme',managermiddleware,managercontroller.getme);



module.exports=managerrouter;