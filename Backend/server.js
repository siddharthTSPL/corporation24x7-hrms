const app = require('./src/app');
const db = require('./config/databaseconnect');
const https = require('https');

db();

app.listen(5000, () => {
  console.log('server is running on port 5000');
});

if (process.env.NODE_ENV === 'production') {
  setInterval(() => {
    https
      .get('https://corporation24x7-hrms.onrender.com')
      .on('error', () => {});
  }, 14 * 60 * 1000);
}