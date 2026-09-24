const crypto = require("crypto");

const Policy = require("../Models/policy.model");
const PolicyVersion = require("../Models/policyVersion.model");
const PolicyAcknowledgement = require("../Models/policyAcknowledgement.model");
const Usermodel = require("../Models/user.model");
const Managermodel = require("../Models/manager.model");
const AdminModel = require("../Models/Admin.model");

const imagekit = require("../utils/imagekit.utils");
const { logAudit } = require("../utils/auditLog.utils");
const { createNotification } = require("../utils/Notification.utils");
const { resolveAssignmentMatch } = require("../utils/policyAssignment.utils");

const MODEL_BY_GROUP = { employee: Usermodel, manager: Managermodel, admin: AdminModel };

// ── small shared helpers ────────────────────────────────────────────────

const getManagementActor = (req) => {
  // adminOrSuperAdminAuth shims req.admin for a SuperAdmin caller too, but
  // we still need the *real* model name for createdByModel/publishedByModel.
  const actorModel = req.actorModel || (req.superAdmin ? "SuperAdmin" : "Admin");
  const account = req.superAdmin || req.admin;
  return { account, actorModel };
};

const uploadBufferToImageKit = async (file, folder) => {
  const fileBase64 = file.buffer.toString("base64");
  return imagekit.upload({
    file: fileBase64,
    fileName: file.originalname,
    folder,
    useUniqueFileName: true,
  });
};

const hashBuffer = (buffer) => crypto.createHash("sha256").update(buffer).digest("hex");

const nextVersionNumber = (current) => {
  if (!current) return "1.0";
  const n = parseFloat(current);
  if (Number.isNaN(n)) return "1.0";
  return (Math.floor(n) + 1).toFixed(1);
};

const parseAssignment = (body) => {
  let assignment = body.assignment;
  if (typeof assignment === "string") {
    try {
      assignment = JSON.parse(assignment);
    } catch {
      assignment = null;
    }
  }
  if (!assignment || typeof assignment !== "object") {
    return { type: "ALL", roles: ["employee", "manager", "admin"], departments: [], locations: [], employees: [] };
  }
  return {
    type: Policy.ASSIGNMENT_TYPES.includes(assignment.type) ? assignment.type : "ALL",
    roles: Array.isArray(assignment.roles) && assignment.roles.length
      ? assignment.roles.filter((r) => Policy.TARGET_ROLE_GROUPS.includes(r))
      : ["employee", "manager", "admin"],
    departments: Array.isArray(assignment.departments) ? assignment.departments.filter(Boolean) : [],
    locations: Array.isArray(assignment.locations) ? assignment.locations.filter(Boolean) : [],
    employees: Array.isArray(assignment.employees)
      ? assignment.employees.filter((e) => e && e.id && e.model)
      : [],
  };
};

// Every account (User/Manager/Admin) in the org whose role-group/department/
// location/explicit-id currently matches a policy's assignment rules —
// used for the admin-facing acknowledgement report and for the
// "who does this apply to" preview.
const resolveAudienceForPolicy = async (policy) => {
  const audience = [];
  const roles = policy.assignment?.roles?.length ? policy.assignment.roles : ["employee", "manager", "admin"];

  for (const roleGroup of roles) {
    const Model = MODEL_BY_GROUP[roleGroup];
    if (!Model) continue; // super_admin isn't materialized as a list here

    const query = { organisation_id: policy.organisation_id, working_status: "working" };
    const docs = await Model.find(query).select("f_name l_name empid department office_location work_email").lean();

    for (const doc of docs) {
      const actor = {
        id: doc._id,
        model: roleGroup === "employee" ? "User" : roleGroup === "manager" ? "Manager" : "Admin",
        roleGroup,
        department: doc.department,
        office_location: doc.office_location,
      };
      if (resolveAssignmentMatch(policy, actor)) {
        audience.push({ ...doc, roleGroup, model: actor.model });
      }
    }
  }
  return audience;
};

// ─────────────────────────────────────────────────────────────────────────
// CREATE
// ─────────────────────────────────────────────────────────────────────────

const createPolicy = async (req, res) => {
  try {
    const { account, actorModel } = getManagementActor(req);
    if (!account) return res.status(401).json({ success: false, message: "Unauthorized" });

    const { title, code, category, description, effectiveFrom, releaseNotes } = req.body;

    if (!title || !title.trim()) {
      return res.status(400).json({ success: false, message: "Policy title is required" });
    }

    const pdfFile = req.files?.pdf?.[0] || null;
    const imageFiles = req.files?.images || [];

    if (!pdfFile && imageFiles.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Attach a PDF and/or at least one photo for employees to view.",
      });
    }

    const organisation_id = account.organisation_id || account._id;

    const policy = await Policy.create({
      organisation_id,
      title: title.trim(),
      code: code && code.trim() ? code.trim().toUpperCase() : null,
      category: category?.trim() || "General",
      description: description?.trim() || "",
      assignment: parseAssignment(req.body),
      effectiveFrom: effectiveFrom ? new Date(effectiveFrom) : new Date(),
      createdBy: account._id,
      createdByModel: actorModel,
      status: "draft",
    });

    const version = await createVersionForPolicy(policy, { pdfFile, imageFiles, releaseNotes, account, actorModel, versionNumber: "1.0" });

    policy.currentVersion = version._id;
    policy.versionCount = 1;
    await policy.save();

    await logAudit({
      organisation_id,
      module: "policy",
      action: "CREATED",
      actor: { id: account._id, model: actorModel, name: account.f_name ? `${account.f_name} ${account.l_name || ""}`.trim() : account.organisation_name },
      target: { id: policy._id, model: "Policy", name: policy.title },
    });

    return res.status(201).json({ success: true, message: "Policy created as draft", policy, version });
  } catch (error) {
    console.error("[policy] createPolicy error:", error);
    if (error.code === 11000) {
      return res.status(409).json({ success: false, message: "A policy with this code already exists" });
    }
    return res.status(500).json({ success: false, message: error.message });
  }
};

const createVersionForPolicy = async (policy, { pdfFile, imageFiles, releaseNotes, account, actorModel, versionNumber }) => {
  let pdfUrl = null, pdfFileId = null, pdfFileName = null, documentHash = null;
  const images = [];

  if (pdfFile) {
    const uploaded = await uploadBufferToImageKit(pdfFile, "/policies/documents");
    pdfUrl = uploaded.url;
    pdfFileId = uploaded.fileId;
    pdfFileName = pdfFile.originalname;
    documentHash = hashBuffer(pdfFile.buffer);
  }

  for (const img of imageFiles || []) {
    const uploaded = await uploadBufferToImageKit(img, "/policies/photos");
    images.push({ url: uploaded.url, fileId: uploaded.fileId, caption: img.originalname });
  }

  const contentType = pdfUrl && images.length ? "pdf_and_images" : pdfUrl ? "pdf" : "images";

  return PolicyVersion.create({
    organisation_id: policy.organisation_id,
    policyId: policy._id,
    versionNumber,
    contentType,
    pdfUrl,
    pdfFileId,
    pdfFileName,
    images,
    documentHash,
    releaseNotes: releaseNotes?.trim() || "",
    createdBy: account._id,
    createdByModel: actorModel,
  });
};

// ─────────────────────────────────────────────────────────────────────────
// NEW VERSION (revision) on an existing policy
// ─────────────────────────────────────────────────────────────────────────

const addPolicyVersion = async (req, res) => {
  try {
    const { account, actorModel } = getManagementActor(req);
    if (!account) return res.status(401).json({ success: false, message: "Unauthorized" });

    const organisation_id = account.organisation_id || account._id;
    const policy = await Policy.findOne({ _id: req.params.id, organisation_id });
    if (!policy) return res.status(404).json({ success: false, message: "Policy not found" });
    if (policy.status === "archived") {
      return res.status(400).json({ success: false, message: "Cannot add a version to an archived policy" });
    }

    const pdfFile = req.files?.pdf?.[0] || null;
    const imageFiles = req.files?.images || [];
    if (!pdfFile && imageFiles.length === 0) {
      return res.status(400).json({ success: false, message: "Attach a PDF and/or at least one photo" });
    }

    const latest = await PolicyVersion.findOne({ policyId: policy._id }).sort({ createdAt: -1 });
    const versionNumber = nextVersionNumber(latest?.versionNumber);

    const version = await createVersionForPolicy(policy, {
      pdfFile,
      imageFiles,
      releaseNotes: req.body.releaseNotes,
      account,
      actorModel,
      versionNumber,
    });

    // A new version isn't live until explicitly published — keeps the
    // "published content is immutable" guarantee intact while a draft
    // revision is being prepared.
    await logAudit({
      organisation_id,
      module: "policy",
      action: "VERSION_CREATED",
      actor: { id: account._id, model: actorModel },
      target: { id: policy._id, model: "Policy", name: policy.title },
      meta: { versionNumber },
    });

    return res.status(201).json({ success: true, message: `Draft version ${versionNumber} created. Publish it to make it live.`, version });
  } catch (error) {
    console.error("[policy] addPolicyVersion error:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

// ─────────────────────────────────────────────────────────────────────────
// PUBLISH — makes a version the live/current one, notifies the audience
// ─────────────────────────────────────────────────────────────────────────

const publishPolicyVersion = async (req, res) => {
  try {
    const { account, actorModel } = getManagementActor(req);
    if (!account) return res.status(401).json({ success: false, message: "Unauthorized" });

    const organisation_id = account.organisation_id || account._id;
    const policy = await Policy.findOne({ _id: req.params.id, organisation_id });
    if (!policy) return res.status(404).json({ success: false, message: "Policy not found" });

    const { versionId } = req.body;
    const version = versionId
      ? await PolicyVersion.findOne({ _id: versionId, policyId: policy._id })
      : await PolicyVersion.findOne({ policyId: policy._id }).sort({ createdAt: -1 });

    if (!version) return res.status(404).json({ success: false, message: "No version found to publish" });

    await PolicyVersion.updateMany({ policyId: policy._id, _id: { $ne: version._id } }, { isCurrent: false });
    version.isCurrent = true;
    version.publishedAt = new Date();
    await version.save();

    policy.currentVersion = version._id;
    policy.versionCount = await PolicyVersion.countDocuments({ policyId: policy._id });
    policy.status = "published";
    policy.publishedBy = account._id;
    policy.publishedByModel = actorModel;
    policy.publishedAt = new Date();
    await policy.save();

    await logAudit({
      organisation_id,
      module: "policy",
      action: "PUBLISHED",
      actor: { id: account._id, model: actorModel },
      target: { id: policy._id, model: "Policy", name: policy.title },
      meta: { versionNumber: version.versionNumber },
    });

    // Fire-and-forget bell notifications to the matched audience. Kept
    // best-effort (never fails the publish action) and capped so a huge
    // org doesn't stall the response — resolveAudienceForPolicy already
    // filters to "working" accounts that actually match the rule.
    notifyAudienceOfPublish(policy, version, account, actorModel).catch((err) =>
      console.error("[policy] notifyAudienceOfPublish failed:", err.message)
    );

    return res.status(200).json({ success: true, message: "Policy published", policy, version });
  } catch (error) {
    console.error("[policy] publishPolicyVersion error:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

const notifyAudienceOfPublish = async (policy, version, account, actorModel) => {
  const audience = await resolveAudienceForPolicy(policy);
  const title = "Action Required: New Policy";
  const message = `${policy.title} (v${version.versionNumber}) has been published and requires your acknowledgement.`;

  await Promise.allSettled(
    audience.map((person) =>
      createNotification({
        recipientModel: person.model,
        recipientId: person._id,
        organisation_id: policy.organisation_id,
        type: "policy",
        title,
        message,
        priority: "high",
        link: "/my-policies",
        createdBy: account._id,
        createdByModel: actorModel,
        meta: { policyId: policy._id, versionId: version._id },
      })
    )
  );
};

// ─────────────────────────────────────────────────────────────────────────
// READ / LIST (management side)
// ─────────────────────────────────────────────────────────────────────────

const listPolicies = async (req, res) => {
  try {
    const { account } = getManagementActor(req);
    if (!account) return res.status(401).json({ success: false, message: "Unauthorized" });
    const organisation_id = account.organisation_id || account._id;

    const { status, category, search } = req.query;
    const filter = { organisation_id };
    if (status) filter.status = status;
    if (category) filter.category = category;
    if (search) filter.title = { $regex: search, $options: "i" };

    const policies = await Policy.find(filter).populate("currentVersion").sort({ createdAt: -1 }).lean();

    // Lightweight ack-count summary per policy for the list view.
    const policyIds = policies.map((p) => p._id);
    const counts = await PolicyAcknowledgement.aggregate([
      { $match: { policyId: { $in: policyIds } } },
      { $group: { _id: { policyId: "$policyId", status: "$status" }, count: { $sum: 1 } } },
    ]);
    const countMap = {};
    for (const c of counts) {
      const key = String(c._id.policyId);
      countMap[key] = countMap[key] || {};
      countMap[key][c._id.status] = c.count;
    }

    const enriched = policies.map((p) => ({
      ...p,
      ackSummary: countMap[String(p._id)] || {},
    }));

    return res.status(200).json({ success: true, policies: enriched });
  } catch (error) {
    console.error("[policy] listPolicies error:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

const getPolicyDetail = async (req, res) => {
  try {
    const { account } = getManagementActor(req);
    if (!account) return res.status(401).json({ success: false, message: "Unauthorized" });
    const organisation_id = account.organisation_id || account._id;

    const policy = await Policy.findOne({ _id: req.params.id, organisation_id }).populate("currentVersion").lean();
    if (!policy) return res.status(404).json({ success: false, message: "Policy not found" });

    const versions = await PolicyVersion.find({ policyId: policy._id }).sort({ createdAt: -1 }).lean();

    return res.status(200).json({ success: true, policy, versions });
  } catch (error) {
    console.error("[policy] getPolicyDetail error:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

const updatePolicyMeta = async (req, res) => {
  try {
    const { account } = getManagementActor(req);
    if (!account) return res.status(401).json({ success: false, message: "Unauthorized" });
    const organisation_id = account.organisation_id || account._id;

    const policy = await Policy.findOne({ _id: req.params.id, organisation_id });
    if (!policy) return res.status(404).json({ success: false, message: "Policy not found" });

    const { title, category, description, effectiveFrom } = req.body;

    if (title !== undefined) policy.title = title.trim();
    if (category !== undefined) policy.category = category.trim();
    if (description !== undefined) policy.description = description.trim();
    if (effectiveFrom !== undefined) policy.effectiveFrom = new Date(effectiveFrom);
    if (req.body.assignment !== undefined) policy.assignment = parseAssignment(req.body);

    await policy.save();

    await logAudit({
      organisation_id,
      module: "policy",
      action: "UPDATED",
      actor: { id: account._id, model: getManagementActor(req).actorModel },
      target: { id: policy._id, model: "Policy", name: policy.title },
    });

    return res.status(200).json({ success: true, message: "Policy updated", policy });
  } catch (error) {
    console.error("[policy] updatePolicyMeta error:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

const archivePolicy = async (req, res) => {
  try {
    const { account, actorModel } = getManagementActor(req);
    if (!account) return res.status(401).json({ success: false, message: "Unauthorized" });
    const organisation_id = account.organisation_id || account._id;

    const policy = await Policy.findOneAndUpdate(
      { _id: req.params.id, organisation_id },
      { status: "archived", archivedAt: new Date() },
      { new: true }
    );
    if (!policy) return res.status(404).json({ success: false, message: "Policy not found" });

    await logAudit({
      organisation_id,
      module: "policy",
      action: "ARCHIVED",
      actor: { id: account._id, model: actorModel },
      target: { id: policy._id, model: "Policy", name: policy.title },
    });

    return res.status(200).json({ success: true, message: "Policy archived", policy });
  } catch (error) {
    console.error("[policy] archivePolicy error:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

const deletePolicy = async (req, res) => {
  try {
    const { account } = getManagementActor(req);
    if (!account) return res.status(401).json({ success: false, message: "Unauthorized" });
    const organisation_id = account.organisation_id || account._id;

    const policy = await Policy.findOne({ _id: req.params.id, organisation_id });
    if (!policy) return res.status(404).json({ success: false, message: "Policy not found" });
    if (policy.status !== "draft") {
      return res.status(400).json({ success: false, message: "Only draft policies can be deleted. Archive it instead." });
    }
    const ackCount = await PolicyAcknowledgement.countDocuments({ policyId: policy._id });
    if (ackCount > 0) {
      return res.status(400).json({ success: false, message: "Cannot delete a policy that already has acknowledgement records" });
    }

    await PolicyVersion.deleteMany({ policyId: policy._id });
    await policy.deleteOne();

    return res.status(200).json({ success: true, message: "Draft policy deleted" });
  } catch (error) {
    console.error("[policy] deletePolicy error:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

// ─────────────────────────────────────────────────────────────────────────
// ACKNOWLEDGEMENT REPORT — "who has acknowledged this policy" for
// SuperAdmin/Admin, per item requested: acknowledgement data must be
// visible to the people managing the policy.
// ─────────────────────────────────────────────────────────────────────────

const getAcknowledgementReport = async (req, res) => {
  try {
    const { account } = getManagementActor(req);
    if (!account) return res.status(401).json({ success: false, message: "Unauthorized" });
    const organisation_id = account.organisation_id || account._id;

    const policy = await Policy.findOne({ _id: req.params.id, organisation_id }).populate("currentVersion").lean();
    if (!policy) return res.status(404).json({ success: false, message: "Policy not found" });

    const audience = await resolveAudienceForPolicy(policy);
    const versionId = policy.currentVersion?._id;

    const acks = versionId
      ? await PolicyAcknowledgement.find({ policyVersionId: versionId }).lean()
      : [];
    const ackByPerson = {};
    for (const a of acks) ackByPerson[`${a.employeeModel}:${a.employee}`] = a;

    const rows = audience.map((person) => {
      const ack = ackByPerson[`${person.model}:${person._id}`];
      const status = ack?.status || "PENDING";
      return {
        employeeId: person._id,
        employeeModel: person.model,
        empid: person.empid,
        name: `${person.f_name || ""} ${person.l_name || ""}`.trim(),
        department: person.department,
        email: person.work_email,
        status,
        assignedAt: ack?.assignedAt || null,
        viewedAt: ack?.viewedAt || null,
        acknowledgedAt: ack?.acknowledgedAt || null,
        ipAddress: ack?.ipAddress || null,
      };
    });

    const summary = rows.reduce(
      (acc, r) => {
        acc.total += 1;
        if (r.status === "ACKNOWLEDGED") acc.acknowledged += 1;
        else acc.pending += 1;
        return acc;
      },
      { total: 0, acknowledged: 0, pending: 0 }
    );
    summary.acknowledgementRate = summary.total ? Math.round((summary.acknowledged / summary.total) * 1000) / 10 : 0;

    return res.status(200).json({ success: true, policy: { _id: policy._id, title: policy.title }, summary, rows });
  } catch (error) {
    console.error("[policy] getAcknowledgementReport error:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

const exportAcknowledgementReportCsv = async (req, res) => {
  try {
    // Reuse the same computation by calling the report logic inline.
    const { account } = getManagementActor(req);
    if (!account) return res.status(401).json({ success: false, message: "Unauthorized" });
    const organisation_id = account.organisation_id || account._id;

    const policy = await Policy.findOne({ _id: req.params.id, organisation_id }).populate("currentVersion").lean();
    if (!policy) return res.status(404).json({ success: false, message: "Policy not found" });

    const audience = await resolveAudienceForPolicy(policy);
    const versionId = policy.currentVersion?._id;
    const acks = versionId ? await PolicyAcknowledgement.find({ policyVersionId: versionId }).lean() : [];
    const ackByPerson = {};
    for (const a of acks) ackByPerson[`${a.employeeModel}:${a.employee}`] = a;

    const header = ["Employee ID", "Name", "Department", "Role", "Status", "Assigned At", "Acknowledged At", "IP Address"];
    const lines = [header.join(",")];

    for (const person of audience) {
      const ack = ackByPerson[`${person.model}:${person._id}`];
      const row = [
        person.empid || "",
        `"${(`${person.f_name || ""} ${person.l_name || ""}`).trim()}"`,
        person.department || "",
        person.roleGroup,
        ack?.status || "PENDING",
        ack?.assignedAt ? new Date(ack.assignedAt).toISOString() : "",
        ack?.acknowledgedAt ? new Date(ack.acknowledgedAt).toISOString() : "",
        ack?.ipAddress || "",
      ];
      lines.push(row.join(","));
    }

    const csv = lines.join("\n");
    res.setHeader("Content-Type", "text/csv");
    res.setHeader("Content-Disposition", `attachment; filename="${policy.title.replace(/[^a-z0-9]+/gi, "_")}_acknowledgements.csv"`);
    return res.status(200).send(csv);
  } catch (error) {
    console.error("[policy] exportAcknowledgementReportCsv error:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

const getDashboardSummary = async (req, res) => {
  try {
    const { account } = getManagementActor(req);
    if (!account) return res.status(401).json({ success: false, message: "Unauthorized" });
    const organisation_id = account.organisation_id || account._id;

    const [total, published, draft, archived] = await Promise.all([
      Policy.countDocuments({ organisation_id }),
      Policy.countDocuments({ organisation_id, status: "published" }),
      Policy.countDocuments({ organisation_id, status: "draft" }),
      Policy.countDocuments({ organisation_id, status: "archived" }),
    ]);

    const ackAgg = await PolicyAcknowledgement.aggregate([
      { $match: { organisation_id: policyIdToObjectId(organisation_id) } },
      { $group: { _id: "$status", count: { $sum: 1 } } },
    ]);
    const ackCounts = { PENDING: 0, VIEWED: 0, ACKNOWLEDGED: 0 };
    for (const a of ackAgg) ackCounts[a._id] = a.count;

    return res.status(200).json({
      success: true,
      summary: {
        totalPolicies: total,
        published,
        draft,
        archived,
        pendingAcknowledgements: ackCounts.PENDING + ackCounts.VIEWED,
        acknowledged: ackCounts.ACKNOWLEDGED,
      },
    });
  } catch (error) {
    console.error("[policy] getDashboardSummary error:", error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

// aggregate() needs a real ObjectId, not a populated doc / string — this
// mirrors how organisation_id can arrive here either way.
const policyIdToObjectId = (id) => {
  const mongoose = require("mongoose");
  return typeof id === "string" ? new mongoose.Types.ObjectId(id) : id;
};

module.exports = {
  createPolicy,
  addPolicyVersion,
  publishPolicyVersion,
  listPolicies,
  getPolicyDetail,
  updatePolicyMeta,
  archivePolicy,
  deletePolicy,
  getAcknowledgementReport,
  exportAcknowledgementReportCsv,
  getDashboardSummary,
  resolveAudienceForPolicy,
  getManagementActor,
};