const { buildActorFromReq, getPendingMandatoryPolicies } = require("../../utils/policyAssignment.utils");

// ─────────────────────────────────────────────────────────────────────────
// TorchX Policy — Access Gate.
//
// Attach this AFTER a role's own auth middleware (employee/manager/admin/
// superadmin/Anyrole) on any route you want blocked until the person has
// acknowledged every MANDATORY policy assigned to them. It intentionally
// fails OPEN on unexpected errors (DB hiccup, etc.) — a bug here should
// never be able to lock an entire organisation out of the product.
//
// Usage:
//   const { requirePolicyAcknowledged } = require("../middleware/auth/policyGate.middleware");
//   userrouter.post("/apply-leave", employeemiddleware, requirePolicyAcknowledged, asyncHandler(applyleave));
//
// Real, permanent enforcement of "don't let them open anything else" lives
// on the frontend (see PolicyGate.jsx, which replaces the entire app shell
// with the acknowledgement screen the moment it's rendered post-login).
// This middleware is the server-side backstop for state-changing business
// actions specifically — it does not, and should not, try to block every
// GET request in the app (that would also block the policy screens
// themselves, notifications, /me, and logout).
// ─────────────────────────────────────────────────────────────────────────

const requirePolicyAcknowledged = async (req, res, next) => {
  try {
    const actor = buildActorFromReq(req);
    if (!actor) return next();

    const pending = await getPendingMandatoryPolicies(actor);
    if (pending.length === 0) return next();

    return res.status(423).json({
      success: false,
      code: "POLICY_ACKNOWLEDGEMENT_REQUIRED",
      message: "Please acknowledge the pending mandatory policy/policies before continuing.",
      pendingCount: pending.length,
      pendingPolicies: pending.map((p) => ({ id: p.policy._id, title: p.policy.title })),
    });
  } catch (err) {
    console.error("[policyGate] check failed, failing open:", err && err.stack ? err.stack : err);
    return next();
  }
};

module.exports = { requirePolicyAcknowledged };