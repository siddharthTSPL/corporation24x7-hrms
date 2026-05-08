const express = require('express');
const cookieparser = require('cookie-parser');
const morgan = require('morgan');
const cors = require('cors');
require('../automatic/autoelcredit');

const app = express();

app.use(morgan("dev"));
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(cookieparser());

const corsOptions = {
  origin: [
    "http://localhost:5173",
    "https://torchx-talent.techtorch.solutions",
    "http://torchx-talent.techtorch.solutions",
    "https://www.torchx-talent.techtorch.solutions",
    "http://talent.techtorch.solutions",
    "https://talent.techtorch.solutions",
    "https://corporation24x7-hrms.onrender.com",
  ],
  credentials: true,
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
};

app.use(cors(corsOptions)); 

const adminrouter = require('../routes/adminroutes');
const managerrouter = require('../routes/managerroutes');
const userrouter = require('../routes/userroutes');
const documentroute = require('../routes/documentroute');
const attendancerouter = require('../routes/attendanceroutes');
const errorhandler = require('../middleware/errorhandling/errorhandling.middleware');

app.use('/admin', adminrouter);
app.use('/manager', managerrouter);
app.use('/user', userrouter);
app.use('/document', documentroute);
app.use('/attendance', attendancerouter);

app.get("/favicon.ico", (req, res) => res.status(204).end());

app.use((req, res, next) => {
  const err = new Error(`Cannot find ${req.originalUrl}`);
  err.statusCode = 404;
  next(err);
});

app.use(errorhandler);

module.exports = app;