// Single source of truth for browser origins that may talk to this server.
// Used by both Express CORS (src/app.js) and Socket.IO (config/socket.js).
module.exports = [
  "http://localhost:5173",
  "http://localhost:5174",
  "http://localhost:5175",
  "http://localhost:5176",
  "https://torchx-talent.techtorch.solutions",
  "http://torchx-talent.techtorch.solutions",
  "https://www.torchx-talent.techtorch.solutions",
  "http://talent.techtorch.solutions",
  "https://talent.techtorch.solutions",
  "https://corporation24x7-hrms.onrender.com",
  "https://torchxsuite.com",
  "https://www.torchxsuite.com",
  "https://torchxsuite.com/talent",
  "http://torchxsuite.com/talent/",
  "http://torchxsuite.com",
  "http://160.187.87.80",
  "https://160.187.87.80",
  "http://160.187.87.80:62379",
  "http://10.10.175.180",
];
