const { PDFDocument, StandardFonts, rgb } = require("pdf-lib");

const Policy = require("../Models/policy.model");
const PolicyAcknowledgement = require("../Models/policyAcknowledgement.model");
const { logAudit } = require("../utils/auditLog.utils");
const {
  buildActorFromReq,
  getPolicyStatusListForActor,
  getPendingMandatoryPolicies,
  ensureAcknowledgementRecord,
} = require("../utils/policyAssignment.utils");

const getClientIp = (req) =>
  (req.headers["x-forwarded-for"] || "").split(",")[0].trim() || req.socket?.remoteAddress || req.ip || null;

const serializeEntry = (entry) => ({
  policy: {
    _id: entry.policy._id,
    title: entry.policy.title,
    code: entry.policy.code,
    category: entry.policy.category,
    description: entry.policy.description,
    priority: entry.policy.priority,
    acknowledgementRequired: entry.policy.acknowledgementRequired,
    effectiveFrom: entry.policy.effectiveFrom,
    publishedAt: entry.policy.publishedAt,
  },
  version: entry.policy.currentVersion
    ? {
        _id: entry.policy.currentVersion._id,
        versionNumber: entry.policy.currentVersion.versionNumber,
        pdfUrl: entry.policy.currentVersion.pdfUrl,
        pdfFileName: entry.policy.currentVersion.pdfFileName,
        images: entry.policy.currentVersion.images,
      }
    : null,
  acknowledgement: entry.acknowledgement
    ? {
        _id: entry.acknowledgement._id,
        status: entry.acknowledgement.status,
        assignedAt: entry.acknowledgement.assignedAt,
        viewedAt: entry.acknowledgement.viewedAt,
        acknowledgedAt: entry.acknowledgement.acknowledgedAt,
      }
    : null,
});

// ── GET /policy/me/gate-status ──────────────────────────────────────────
// Lightweight, called by the frontend PolicyGate right after login and on
// every route change. Kept intentionally small/fast.
const getGateStatus = async (req, res) => {
  try {
    const actor = buildActorFromReq(req);
    if (!actor) return res.status(401).json({ success: false, message: "Unauthorized" });

    const pending = await getPendingMandatoryPolicies(actor);
    return res.status(200).json({
      success: true,
      blocked: pending.length > 0,
      pendingCount: pending.length,
      policies: pending.map((p) => ({
        _id: p.policy._id,
        title: p.policy.title,
        category: p.policy.category,
        priority: p.policy.priority,
        acknowledgementId: p.acknowledgement?._id || null,
      })),
    });
  } catch (error) {
    console.error("[policy] getGateStatus error:", error);
    // Fail open — never let a bug here hard-lock the app for every user.
    return res.status(200).json({ success: true, blocked: false, pendingCount: 0, policies: [] });
  }
};

// ── GET /policy/me/list ──────────────────────────────────────────────────
const getMyPolicies = async (req, res) => {
  try {
    const actor = buildActorFromReq(req);
    if (!actor) return res.status(401).json({ success: false, message: "Unauthorized" });

    const list = await getPolicyStatusListForActor(actor);
    return res.status(200).json({ success: true, policies: list.map(serializeEntry) });
  } catch (error) {
    console.error("[policy] getMyPolicies error:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

// ── GET /policy/me/pending ───────────────────────────────────────────────
const getMyPendingPolicies = async (req, res) => {
  try {
    const actor = buildActorFromReq(req);
    if (!actor) return res.status(401).json({ success: false, message: "Unauthorized" });

    const pending = await getPendingMandatoryPolicies(actor);
    return res.status(200).json({ success: true, hasPendingPolicies: pending.length > 0, policies: pending.map(serializeEntry) });
  } catch (error) {
    console.error("[policy] getMyPendingPolicies error:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

// ── GET /policy/me/:policyId ─────────────────────────────────────────────
// Fetch one policy for viewing; marks the acknowledgement PENDING -> VIEWED.
const viewPolicy = async (req, res) => {
  try {
    const actor = buildActorFromReq(req);
    if (!actor) return res.status(401).json({ success: false, message: "Unauthorized" });

    const policy = await Policy.findOne({
      _id: req.params.policyId,
      organisation_id: actor.organisation_id,
      status: "published",
    }).populate("currentVersion");
    if (!policy) return res.status(404).json({ success: false, message: "Policy not found" });

    const acknowledgement = await ensureAcknowledgementRecord(policy, actor);
    if (acknowledgement && acknowledgement.status === "PENDING") {
      acknowledgement.status = "VIEWED";
      acknowledgement.viewedAt = new Date();
      await acknowledgement.save();
    }

    return res.status(200).json({ success: true, ...serializeEntry({ policy, acknowledgement }) });
  } catch (error) {
    console.error("[policy] viewPolicy error:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

// ── POST /policy/me/:policyId/acknowledge ────────────────────────────────
const acknowledgePolicy = async (req, res) => {
  try {
    const actor = buildActorFromReq(req);
    if (!actor) return res.status(401).json({ success: false, message: "Unauthorized" });

    const policy = await Policy.findOne({
      _id: req.params.policyId,
      organisation_id: actor.organisation_id,
      status: "published",
    }).populate("currentVersion");
    if (!policy) return res.status(404).json({ success: false, message: "Policy not found" });

    if (!req.body.confirm) {
      return res.status(400).json({
        success: false,
        message: 'Please confirm: "I have read and understood this policy."',
      });
    }

    const acknowledgement = await ensureAcknowledgementRecord(policy, actor);
    if (!acknowledgement) {
      return res.status(400).json({ success: false, message: "This policy does not require acknowledgement" });
    }

    if (acknowledgement.status !== "ACKNOWLEDGED") {
      acknowledgement.status = "ACKNOWLEDGED";
      acknowledgement.acknowledgedAt = new Date();
      acknowledgement.ipAddress = getClientIp(req);
      acknowledgement.userAgent = req.headers["user-agent"] || null;
      if (!acknowledgement.viewedAt) acknowledgement.viewedAt = acknowledgement.acknowledgedAt;
      await acknowledgement.save();

      await logAudit({
        organisation_id: actor.organisation_id,
        module: "policy",
        action: "ACKNOWLEDGED",
        actor: { id: actor.id, model: actor.model, name: actor.name },
        target: { id: policy._id, model: "Policy", name: policy.title },
        meta: { versionNumber: policy.currentVersion?.versionNumber, ip: acknowledgement.ipAddress },
      });
    }

    return res.status(200).json({
      success: true,
      message: "Policy acknowledged. Thank you.",
      acknowledgement,
    });
  } catch (error) {
    console.error("[policy] acknowledgePolicy error:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

// ── GET /policy/me/acknowledgements ──────────────────────────────────────
const getMyAcknowledgementHistory = async (req, res) => {
  try {
    const actor = buildActorFromReq(req);
    if (!actor) return res.status(401).json({ success: false, message: "Unauthorized" });

    const acks = await PolicyAcknowledgement.find({
      employee: actor.id,
      employeeModel: actor.model,
      status: "ACKNOWLEDGED",
    })
      .populate("policyId", "title category code")
      .populate("policyVersionId", "versionNumber")
      .sort({ acknowledgedAt: -1 })
      .lean();

    return res.status(200).json({
      success: true,
      acknowledgements: acks.map((a) => ({
        _id: a._id,
        policy: a.policyId,
        version: a.policyVersionId,
        acknowledgedAt: a.acknowledgedAt,
      })),
    });
  } catch (error) {
    console.error("[policy] getMyAcknowledgementHistory error:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

// ── GET /policy/me/:policyId/certificate ─────────────────────────────────
// A simple, dependency-light acknowledgement certificate PDF (item #39 in
// the spec) using pdf-lib, which is already a project dependency.
const downloadCertificate = async (req, res) => {
  try {
    const actor = buildActorFromReq(req);
    if (!actor) return res.status(401).json({ success: false, message: "Unauthorized" });

    const policy = await Policy.findOne({ _id: req.params.policyId, organisation_id: actor.organisation_id }).populate("currentVersion");
    if (!policy) return res.status(404).json({ success: false, message: "Policy not found" });

    const ack = await PolicyAcknowledgement.findOne({
      policyVersionId: policy.currentVersion?._id,
      employee: actor.id,
      employeeModel: actor.model,
      status: "ACKNOWLEDGED",
    });
    if (!ack) return res.status(404).json({ success: false, message: "No acknowledgement on record for this policy" });

    const pdfDoc = await PDFDocument.create();
    const page = pdfDoc.addPage([595, 420]);
    const font = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
    const regular = await pdfDoc.embedFont(StandardFonts.Helvetica);

    const draw = (text, x, y, size, useFont = regular, color = rgb(0.1, 0.1, 0.1)) =>
      page.drawText(text, { x, y, size, font: useFont, color });

    draw("ACKNOWLEDGEMENT CERTIFICATE", 60, 360, 20, font, rgb(0.45, 0, 0.26));
    draw("TorchX Policy", 60, 338, 11, regular, rgb(0.4, 0.4, 0.4));

    let y = 290;
    const line = (label, value) => {
      draw(label, 60, y, 11, font);
      draw(String(value ?? "-"), 230, y, 11, regular);
      y -= 26;
    };

    line("Employee:", actor.name);
    line("Employee ID:", actor.empid);
    line("Policy:", policy.title);
    line("Version:", policy.currentVersion?.versionNumber);
    line("Acknowledged On:", new Date(ack.acknowledgedAt).toLocaleString("en-IN"));
    line("Acknowledgement ID:", ack._id.toString());
    if (policy.currentVersion?.documentHash) {
      line("Document Hash:", policy.currentVersion.documentHash.slice(0, 32) + "...");
    }

    draw(
      "This certifies that the above person confirmed they read and understood this policy.",
      60,
      70,
      9,
      regular,
      rgb(0.4, 0.4, 0.4)
    );

    const bytes = await pdfDoc.save();
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename="acknowledgement-${ack._id}.pdf"`);
    return res.status(200).send(Buffer.from(bytes));
  } catch (error) {
    console.error("[policy] downloadCertificate error:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = {
  getGateStatus,
  getMyPolicies,
  getMyPendingPolicies,
  viewPolicy,
  acknowledgePolicy,
  getMyAcknowledgementHistory,
  downloadCertificate,
};