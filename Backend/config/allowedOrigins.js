// Single source of truth for browser origins that may talk to this server.
// Used by both Express CORS (src/app.js) and Socket.IO (config/socket.js).
module.exports = [
  "http://localhost:5173",
  "http://localhost:5174",
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
];
