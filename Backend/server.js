const app = require('./src/app');
const db = require('./config/databaseconnect');
const https = require('https');
const http = require('http');
const { initSocket } = require('./config/socket');

db();

const server = http.createServer(app);
initSocket(server);

server.listen(5000, '0.0.0.0', () => {
  console.log('server is running on port 5000');
});

if (process.env.NODE_ENV === 'production') {
  setInterval(() => {
    https
      .get('https://corporation24x7-hrms.onrender.com')
      .on('error', () => {});
  }, 14 * 60 * 1000);
}
