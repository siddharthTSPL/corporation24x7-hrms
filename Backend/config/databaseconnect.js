const mongoose = require('mongoose');
const dns = require('dns');
require('dotenv').config();

dns.setServers(['8.8.8.8', '8.8.4.4', '1.1.1.1']);

mongoose.set("strictQuery", false);

const dbconnect = async () => {
  try {
    await mongoose.connect(process.env.LINK, {
      maxPoolSize: 10,
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
      family: 4, 
    });
    console.log("Database connected successfully");
  } catch (error) {
    console.error('❌ DB ERROR:', error);
    process.exit(1);
  }
};

module.exports = dbconnect;