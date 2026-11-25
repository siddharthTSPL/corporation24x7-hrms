const crypto = require("crypto");
const BiometricOrgKey = require("../../Models/biometricorgkey.model");

const sha256 = (s) => crypto.createHash("sha256").update(s).digest("hex");

// Agent header:  x-agent-key: <organisationObjectId>.<secret>
const biometricAgentAuth = async (req, res, next) => {
  try {
    const raw = String(req.headers["x-agent-key"] || "");
    const dot = raw.indexOf(".");
    if (dot < 1) return res.status(401).json({ message: "Missing or malformed agent key" });
    const orgId = raw.slice(0, dot);
    const secret = raw.slice(dot + 1);
    if (!/^[a-f0-9]{24}$/i.test(orgId)) return res.status(401).json({ message: "Invalid agent key" });

    const rec = await BiometricOrgKey.findOne({ organisation_id: orgId }).select("+keyHash");
    if (!rec) return res.status(401).json({ message: "Invalid agent key" });
    const a = Buffer.from(rec.keyHash);
    const b = Buffer.from(sha256(secret));
    if (a.length !== b.length || !crypto.timingSafeEqual(a, b))
      return res.status(401).json({ message: "Invalid agent key" });

    req.agentOrg = rec.organisation_id;
    BiometricOrgKey.updateOne({ _id: rec._id }, { lastUsedAt: new Date() }).catch(() => {});
    next();
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
};

module.exports = biometricAgentAuth;
module.exports.sha256 = sha256;
