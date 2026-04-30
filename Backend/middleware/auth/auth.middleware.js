const jwt = require("jsonwebtoken"); // ← MISSING

const authMiddleware = (req, res, next) => {
  let token = req.cookies?.token;

  if (!token) {
    const authHeader = req.headers["authorization"];
    if (authHeader?.startsWith("Bearer ")) {
      token = authHeader.slice(7);
    }
  }

  if (!token) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    console.log("[Auth] Decoded token fields:", Object.keys(decoded));

    const rawId =
      decoded._id       ||
      decoded.id        ||
      decoded.userId    ||
      decoded.managerid ||
      decoded.user?._id ||
      null;

    console.log("[Auth] Resolved user id:", rawId, "role:", decoded.role);

    req.user = {
      ...decoded,
      id: rawId,
      _id: rawId,
    };

    next();
  } catch (err) {
    console.log("[Auth] JWT error:", err.message);
    return res.status(401).json({ message: "Invalid token" });
  }
};

module.exports = authMiddleware; 