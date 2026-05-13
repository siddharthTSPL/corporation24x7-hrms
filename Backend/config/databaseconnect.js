const mongoose = require('mongoose');
require('dotenv').config();

mongoose.set("strictQuery", false);

const dbconnect = async () => {
  try {
    await mongoose.connect(process.env.LINK, {
      maxPoolSize: 10,
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
    });
    console.log("Database connected successfully");
  } catch (error) {
    console.error('❌ DB ERROR:', error);
    process.exit(1);
  }
};

module.exports = dbconnect;