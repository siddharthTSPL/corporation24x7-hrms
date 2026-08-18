const ImageKit = require("imagekit");
const path = require("path");
require("dotenv").config({ path: path.resolve(__dirname, "../.env") });

const imagekit = new ImageKit({
  publicKey: process.env.IMAGEKIT_PUBLIC_KEY,
  privateKey: process.env.IMAGEKIT_PRIVATE_KEY,
  urlEndpoint: process.env.IMAGEKIT_URL_ENDPOINT
});

module.exports = imagekit;