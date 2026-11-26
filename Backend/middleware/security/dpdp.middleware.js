const { maskTree, stripMaskedWrites, getActor, isUnlocked, getSettings, MODEL_BY_ROLE } = require("../../utils/dpdp.utils");
const { logAudit } = require("../../utils/auditLog.utils");

// Mounted once, app-wide, BEFORE the routers. When the org has DPDP switched
// on, every JSON response is scrubbed of personal identifiers that belong to
// someone other than the caller, unless the caller has entered the PIN.
// It also blocks masked placeholders from being written back on edits.
function dpdpMask(req, res, next) {
  req.dpdpMaskInstalled = true; // lets /dpdp/selftest prove this middleware is registered in app.js
  if (["POST", "PUT", "PATCH"].includes(req.method)) stripMaskedWrites(req.body);

  const original = res.json.bind(res);
  res.json = (body) => {
    if (res.statusCode >= 400 || !body || typeof body !== "object") return original(body);
    const actor = getActor(req);
    if (!actor) return original(body);
    getSettings(actor.orgId)
      .then((s) => {
        if (!s || isUnlocked(req, actor, s)) return original(body);
        res.set('X-Dpdp-Masked', '1'); // visible in DevTools > Network: proves masking ran
        return original(maskTree(JSON.parse(JSON.stringify(body)), actor.id, false, !!s.unlockRoles?.includes(actor.role)));
      })
      .catch((err) => {
        // Fail closed: if we cannot read the policy, do not leak.
        console.error("[dpdp] mask failed:", err.message);
        original(maskTree(JSON.parse(JSON.stringify(body)), actor.id, false, true));
      });
    return res;
  };
  next();
}

// Route guard for anything that shows a document. Put it AFTER the route's
// normal auth + permission middleware.
async function requireDpdpPin(req, res, next) {
  try {
    const actor = getActor(req);
    if (!actor) return res.status(401).json({ message: "Unauthorized" });
    const s = await getSettings(actor.orgId);
    if (!s) return next();
    const isEmployeeEdit =
      req.method === "PUT" && /\/edit(?:employee|manager)\//i.test(req.path);

    if (!isUnlocked(req, actor, s)) {
      return res.status(423).json({
        code: isEmployeeEdit ? "DPDP_EDIT_UNLOCK_REQUIRED" : "DPDP_PIN_REQUIRED",
        message: isEmployeeEdit
          ? "Employee details are locked. Unlock them in Settings > Privacy before editing."
          : "Enter the organisation access PIN to view documents.",
        pinConfigured: !!s.pinVersion,
      });
    }
    logAudit({
      organisation_id: actor.orgId,
      module: "dpdp",
      action: isEmployeeEdit ? "employee.edit.access" : "document.view",
      actor: { id: actor.id, model: MODEL_BY_ROLE[actor.role] || "User", name: req.user?.name || req.user?.first_name || "" },
      meta: { method: req.method, path: req.originalUrl.split("?")[0], documentId: req.params.documentId || req.params.id || null, ip: req.ip },
    });
    next();
  } catch (err) {
    console.error("[dpdp] gate failed:", err.message);
    return res.status(503).json({ message: "Could not verify access policy. Try again." });
  }
}

module.exports = { dpdpMask, requireDpdpPin };
