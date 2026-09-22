const AuditLog = require("../Models/auditLog.model");

// Same "never crash the caller" pattern used by Notification.utils.js —
// an audit entry is a side effect of the real action and must never be the
// reason that action fails.
async function logAudit({
  organisation_id,
  module,
  action,
  actor,
  target = null,
  meta = {},
}) {
  try {
    if (!organisation_id || !module || !action || !actor?.id || !actor?.model)
      return null;
    return await AuditLog.create({
      organisation_id,
      module,
      action,
      actor: {
        id: actor.id,
        model: actor.model,
        name: actor.name || "",
      },
      target: target
        ? {
            id: target.id || null,
            model: target.model || "",
            name: target.name || "",
          }
        : undefined,
      meta,
    });
  } catch (err) {
    console.error(
      `[audit-log] failed to write ${module}.${action}:`,
      err && err.stack ? err.stack : err,
    );
    return null;
  }
}

module.exports = { logAudit };
