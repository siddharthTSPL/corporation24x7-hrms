const jwt = require("jsonwebtoken");
const SessionModel = require("../Models/Session.model");
const SuperAdminModel = require("../Models/superadmin.model");
const AdminModel = require("../Models/Admin.model");
const Managermodel = require("../Models/manager.model");
const Usermodel = require("../Models/user.model");
const {
  ROLE_TO_ACCOUNT_MODEL,
  CHALLENGE_TTL_MS,
  isSingleSignInActive,
} = require("../utils/singleSignIn.utils");

const cookieOpts = () => {
  const isProduction = process.env.NODE_ENV === "production";
  return {
    httpOnly: true,
    secure: isProduction,
    sameSite: isProduction ? "none" : "lax",
    path: "/",
    maxAge: 15 * 24 * 60 * 60 * 1000,
  };
};

// account_model -> (account, sid) -> the same JWT shape buildLoginToken
// uses for that role, so the finalized session behaves exactly like a
// normal login once approved.
const signTokenForAccount = (accountModel, account, sid) => {
  const payload = { sid };
  if (accountModel === "SuperAdmin") {
    return jwt.sign(
      { ...payload, superadminid: account._id, role: account.role, email: account.email, company_domain: account.company_domain },
      process.env.JWT_SECRET,
      { expiresIn: "15d" }
    );
  }
  if (accountModel === "Admin") {
    return jwt.sign(
      { ...payload, adminid: account._id, role: account.role, email: account.work_email, created_by: account.created_by, organisation_id: account.organisation_id },
      process.env.JWT_SECRET,
      { expiresIn: "15d" }
    );
  }
  if (accountModel === "Manager") {
    return jwt.sign(
      { ...payload, managerid: account._id, work_email: account.work_email, role: account.role, organisation_id: account.organisation_id },
      process.env.JWT_SECRET,
      { expiresIn: "15d" }
    );
  }
  // User (employee)
  return jwt.sign(
    {
      ...payload,
      _id: account._id, id: account._id, userId: account._id,
      work_email: account.work_email, role: account.role,
      organisation_id: account.organisation_id,
      department: account.department ?? null,
      designation: account.designation ?? null,
      Under_manager: account.Under_manager ?? null,
    },
    process.env.JWT_SECRET,
    { expiresIn: "15d" }
  );
};

const MODEL_LOOKUP = { SuperAdmin: SuperAdminModel, Admin: AdminModel, Manager: Managermodel, User: Usermodel };
const MODEL_TO_ACCOUNT_TYPE = { SuperAdmin: "superadmin", Admin: "admin", Manager: "manager", User: "employee" };

// Routes here sit behind anyRoleAuth, which sets req.actor.recipientModel
// (SuperAdmin/Admin/Manager/User — same values Session.account_model uses)
// and req.actor.id, plus req.tokenPayload for the raw JWT (sid lives there).
const getAccountModelForActor = (req) => ({
  accountModel: req.actor?.recipientModel || null,
  accountId: req.actor?.id || null,
});

// Polled by the "waiting for approval on your other device" screen.
const pollChallengeStatus = async (req, res, next) => {
  try {
    const { sessionId } = req.params;
    const session = await SessionModel.findById(sessionId);
    if (!session) return res.status(404).json({ success: false, message: "Session not found." });

    if (session.isChallengeExpired()) {
      session.challenge = { status: "none" };
      await session.save();
      return res.status(200).json({ success: true, status: "denied", reason: "expired" });
    }

    return res.status(200).json({ success: true, status: session.challenge.status });
  } catch (err) {
    next(err);
  }
};

// Polled by the ALREADY-logged-in device to check if a new sign-in attempt
// is waiting on ITS session for approve/deny.
const getMyPendingChallenge = async (req, res, next) => {
  try {
    const { accountModel, accountId } = getAccountModelForActor(req);
    if (!accountId) return res.status(401).json({ success: false, message: "Unauthorized" });

    const session = await SessionModel.findOne({
      account_id: accountId,
      account_model: accountModel,
      status: "active",
    });

    if (!session || session.challenge?.status !== "pending" || session.isChallengeExpired()) {
      if (session?.isChallengeExpired()) {
        session.challenge = { status: "none" };
        await session.save();
      }
      return res.status(200).json({ success: true, pending: false });
    }

    return res.status(200).json({
      success: true,
      pending: true,
      deviceInfo: session.challenge.device_info,
      expiresAt: session.challenge.expires_at,
    });
  } catch (err) {
    next(err);
  }
};

// Called from the ALREADY-logged-in device when the person taps Approve/Deny
// on the "new sign-in attempt" banner.
const respondToChallenge = async (req, res, next) => {
  try {
    const { decision } = req.body; // "approve" | "deny"
    if (!["approve", "deny"].includes(decision)) {
      return res.status(400).json({ success: false, message: "decision must be approve or deny." });
    }

    const { accountModel, accountId } = getAccountModelForActor(req);
    if (!accountId) return res.status(401).json({ success: false, message: "Unauthorized" });

    const session = await SessionModel.findOne({
      account_id: accountId,
      account_model: accountModel,
      status: "active",
    });
    if (!session || session.challenge?.status !== "pending") {
      return res.status(404).json({ success: false, message: "No pending sign-in request." });
    }
    if (session.isChallengeExpired()) {
      session.challenge = { status: "none" };
      await session.save();
      return res.status(410).json({ success: false, message: "This request has expired." });
    }

    if (decision === "approve") {
      // The new device takes over as the active session; this (old) device
      // gets revoked so it stops passing the sid check on its next request.
      session.status = "revoked";
      session.challenge = { status: "approved" };
      await session.save();
    } else {
      session.challenge = { status: "denied" };
      await session.save();
    }

    return res.status(200).json({ success: true, decision });
  } catch (err) {
    next(err);
  }
};

// After the new device sees status:"approved", it finalizes here — creates
// its own active Session row and gets a real, sid-bearing login token+cookie
// (password was already verified back when the challenge was raised).
const finalizeApprovedLogin = async (req, res, next) => {
  try {
    const { sessionId } = req.body;
    const oldSession = await SessionModel.findById(sessionId);
    if (!oldSession || oldSession.challenge?.status !== "approved") {
      return res.status(409).json({ success: false, message: "Request was not approved." });
    }

    const Model = MODEL_LOOKUP[oldSession.account_model];
    const account = Model && (await Model.findById(oldSession.account_id).select("-password"));
    if (!account) {
      return res.status(404).json({ success: false, message: "Account not found." });
    }

    const newSession = await SessionModel.create({
      organisation_id: oldSession.organisation_id,
      account_id: oldSession.account_id,
      account_model: oldSession.account_model,
      status: "active",
      device_info: oldSession.challenge.device_info,
      last_seen_at: new Date(),
    });

    const token = signTokenForAccount(oldSession.account_model, account, newSession._id);
    res.cookie("token", token, cookieOpts());

    return res.status(200).json({
      success: true,
      token,
      role: account.role,
      accountType: MODEL_TO_ACCOUNT_TYPE[oldSession.account_model],
    });
  } catch (err) {
    next(err);
  }
};

// Self-service escape hatch: "Sign out of all other sessions" from Settings.
const signOutAllOtherSessions = async (req, res, next) => {
  try {
    const { accountModel, accountId } = getAccountModelForActor(req);
    if (!accountId) return res.status(401).json({ success: false, message: "Unauthorized" });

    const currentSessionId = req.tokenPayload?.sid || null;

    await SessionModel.updateMany(
      {
        account_id: accountId,
        account_model: accountModel,
        status: "active",
        ...(currentSessionId ? { _id: { $ne: currentSessionId } } : {}),
      },
      { $set: { status: "revoked" } }
    );

    return res.status(200).json({ success: true, message: "Signed out of all other sessions." });
  } catch (err) {
    next(err);
  }
};

// SuperAdmin-only: view active sessions across the org (audit-style list).
const listOrgSessions = async (req, res, next) => {
  try {
    const sessions = await SessionModel.find({
      organisation_id: req.superAdmin._id,
      status: "active",
    })
      .sort({ last_seen_at: -1 })
      .lean();

    return res.status(200).json({ success: true, sessions });
  } catch (err) {
    next(err);
  }
};

// SuperAdmin-only: on/off + strict/approval toggle. Gated to Advance/enterprise
// by the restrictPlanFeature("single_sign_in") middleware on the route.
const updateSingleSignInSettings = async (req, res, next) => {
  try {
    const { enabled, mode } = req.body;
    const organisation = req.superAdmin;

    if (typeof enabled === "boolean") organisation.singleSignIn.enabled = enabled;
    if (mode && ["strict", "approval"].includes(mode)) organisation.singleSignIn.mode = mode;

    await organisation.save();

    // Turning it off shouldn't leave stray rows enforcing anything later.
    if (organisation.singleSignIn.enabled === false) {
      await SessionModel.updateMany(
        { organisation_id: organisation._id, status: "active" },
        { $set: { status: "revoked" } }
      );
    }

    return res.status(200).json({
      success: true,
      singleSignIn: organisation.singleSignIn,
    });
  } catch (err) {
    next(err);
  }
};

const getSingleSignInSettings = async (req, res, next) => {
  try {
    const organisation = req.superAdmin;
    return res.status(200).json({
      success: true,
      singleSignIn: organisation.singleSignIn,
      planUnlocked: isSingleSignInActive({
        ...organisation.toObject(),
        singleSignIn: { enabled: true }, // check plan only, ignore current toggle
        isTrialValid: organisation.isTrialValid.bind(organisation),
      }),
    });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  getMyPendingChallenge,
  pollChallengeStatus,
  respondToChallenge,
  finalizeApprovedLogin,
  signOutAllOtherSessions,
  listOrgSessions,
  updateSingleSignInSettings,
  getSingleSignInSettings,
};