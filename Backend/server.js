const app = require('./src/app');
const db = require('./config/databaseconnect');



db();

app.listen(5000, () => {
  console.log('server is running on port 5000');
});