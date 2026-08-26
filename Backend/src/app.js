const express = require('express');
const cookieparser = require('cookie-parser');
const morgan = require('morgan');
const cors = require('cors');
const compression = require('compression');

require('../automatic/autoelcredit');
require('../automatic/timerautopause');
require('../automatic/Timesheetescalation');
require('../automatic/Birthdaynotify');
require('../automatic/Noticeperiodautoexit');
const { catchUpMissedRuns } = require('../automatic/Marknoshowabsent');
catchUpMissedRuns().catch((err) =>
  console.error('[Startup] catchUpMissedRuns failed:', err.message)
);

// Same reasoning as catchUpMissedRuns above: if the nightly 2 AM reconcile
// cron was missed (server asleep/restarting), also do one recompute pass
// on boot so a missed night doesn't leave stale numbers until the next
// scheduled run.
const { recomputeSummaries } = require('../automatic/Nightlyreconcile');
recomputeSummaries(true).catch((err) =>
  console.error('[Startup] recomputeSummaries failed:', err.message)
);

const app = express();

app.enable("trust proxy");

app.use((req, res, next) => {
  if (
    req.hostname === "localhost" ||
    req.hostname === "146.101.46.205" ||
    req.method === "OPTIONS" ||
    
    req.secure
  ) {
    return next();
  }
  res.redirect(`https://${req.headers.host}${req.url}`);
});

app.use(morgan("dev"));
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(cookieparser());
app.use(compression());

const corsOptions = {
  origin: [
    "http://localhost:5173",
    "http://localhost:5174",
    "https://torchx-talent.techtorch.solutions",
    "http://torchx-talent.techtorch.solutions",
    "https://www.torchx-talent.techtorch.solutions",
    "http://talent.techtorch.solutions",
    "https://talent.techtorch.solutions",
    "https://corporation24x7-hrms.onrender.com",
    "https://torchxsuite.com/talent",
    "http://torchxsuite.com/talent/",
  ],
  credentials: true,
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
};

app.use(cors(corsOptions));

const adminrouter = require('../routes/adminroutes');
const managerrouter = require('../routes/managerroutes');
const userrouter = require('../routes/userroutes');
const attendancerouter = require('../routes/attendanceroutes');
const superadminrouter = require('../routes/superadmin.route');
const ticketroute = require('../routes/ticket.routes');
const recruitmentroute = require('../routes/Recruitment.route');
const wfhroute = require('../routes/wfh.routes');
const permissionroute = require('../routes/permission.route');
const timesheetroute = require('../routes/timesheet.route');
const kioskrouter = require('../routes/kiosk.routes');
const faceattendancerouter = require('../routes/faceattendance.routes');
const shiftrouter = require('../routes/shift.routes');
const holidaypolicyrouter = require('../routes/holidaypolicy.route');
const unifiedauthrouter = require('../routes/Unified.auth.route');
const payrollrouter = require('../routes/payroll.route');
const payrollpolicyrouter = require('../routes/payrollpolicy.route');
const fnfrouter = require('../routes/Fnf.route');
const reimbursementrouter = require('../routes/reimbursement.route');
const notificationrouter = require('../routes/Notification.routes');
const reviewrouter = require('../routes/review.route');
const errorhandler = require('../middleware/errorhandling/errorhandling.middleware');

app.use('/auth', unifiedauthrouter);
app.use('/admin', adminrouter);
app.use('/manager', managerrouter);
app.use('/user', userrouter);
app.use('/attendance', attendancerouter);
app.use('/superadmin', superadminrouter);
app.use('/ticket', ticketroute);
app.use('/recruitment', recruitmentroute);
app.use('/wfh', wfhroute);
app.use('/permission', permissionroute);
app.use('/timesheet', timesheetroute);
app.use('/kiosk', kioskrouter);
app.use('/faceattendance', faceattendancerouter);
app.use('/admin', shiftrouter);
app.use('/admin/holiday-policy', holidaypolicyrouter);   // was: app.use('/admin', holidaypolicyrouter);
app.use('/superadmin', shiftrouter);
app.use('/superadmin/', holidaypolicyrouter); // was: app.use('/superadmin', holidaypolicyrouter);
app.use('/admin/payroll', payrollrouter);
app.use('/admin/payroll', payrollpolicyrouter);
app.use('/superadmin/payroll', payrollrouter);
app.use('/superadmin/payroll', payrollpolicyrouter);
app.use('/admin/payroll/fnf', fnfrouter);
app.use('/superadmin/payroll/fnf', fnfrouter);
app.use('/reimbursement', reimbursementrouter);
app.use('/notifications', notificationrouter);
app.use('/review', reviewrouter);

app.get("/favicon.ico", (req, res) => res.status(204).end());

app.use((req, res, next) => {
  const err = new Error(`Cannot find ${req.originalUrl}`);
  err.statusCode = 404;
  next(err);
});

app.use(errorhandler);

module.exports = app;