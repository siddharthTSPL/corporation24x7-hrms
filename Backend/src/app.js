const express = require('express');
const cookieparser = require('cookie-parser');
const morgan = require('morgan');
const cors = require('cors');
const compression = require('compression');

require('../automatic/autoelcredit');
require('../automatic/timerautopause');
require('../automatic/Timesheetescalation');

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
const errorhandler = require('../middleware/errorhandling/errorhandling.middleware');

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

app.get("/favicon.ico", (req, res) => res.status(204).end());

app.use((req, res, next) => {
  const err = new Error(`Cannot find ${req.originalUrl}`);
  err.statusCode = 404;
  next(err);
});

app.use(errorhandler);

module.exports = app;