require('dotenv').config();
const { installProcessGuard } = require('./utils/Processguard');
installProcessGuard(); // crash / unhandled-rejection / DB-disconnect alert mails

const app = require('./src/app');
const db = require('./config/databaseconnect');
const https = require('https');
const http = require('http');
const { initSocket } = require('./config/socket');

db();

const server = http.createServer(app);
initSocket(server);

const PORT = Number(process.env.PORT) || 5001;
// 127.0.0.1 -> only IIS (ARR on this machine) can reach Node. Set HOST=0.0.0.0 in .env only if needed.
const HOST = process.env.HOST || '127.0.0.1';

server.listen(PORT, HOST, () => {
  console.log(`server is running on http://${HOST}:${PORT}`);
});

if (process.env.NODE_ENV === 'production') {
  setInterval(() => {
    https
      .get('https://corporation24x7-hrms.onrender.com')
      .on('error', () => {});
  }, 14 * 60 * 1000);
}
