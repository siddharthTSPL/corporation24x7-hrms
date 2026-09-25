const mongoose = require("mongoose");
require("dotenv").config();

const Document = require("../Models/document.model");
const Reimbursement = require("../Models/reimbursement.model");
const PolicyVersion = require("../Models/policyVersion.model");
const imagekit = require("../utils/imagekit.utils");

// ─────────────────────────────────────────────────────────────────────────
// One-time backfill for the superadmin "Storage" tab.
//
// /superadmin/storage-usage sums ImageKit storage per organisation by
// calling imagekit.listFiles({ searchQuery: 'tags IN ["<orgId>"]' }). New
// uploads are tagged with their org at upload time (see the imagekit.upload
// call sites in uploaddocument/policy/reimbursement/fieldOperations
// controllers), but files uploaded BEFORE that change has no such tag and
// so won't be counted until this script tags them retroactively.
//
// Only covers models that already store a fileId: Document, Reimbursement
// (receipts + supportingDocuments), PolicyVersion (pdf + images). FieldVisit
// attachments only ever stored the URL, not the fileId, so those can't be
// retroactively tagged this way — they simply won't appear in the ImageKit
// portion of old organisations' totals until re-uploaded.
//
// Safe to re-run: adding a tag that's already present is a no-op on
// ImageKit's side.
//
// Usage:
//   node scripts/BackfillImagekitOrgTags.js
// ─────────────────────────────────────────────────────────────────────────

const CONCURRENCY = 5;

// Naive concurrency-limited map — avoids hammering ImageKit's API with
// hundreds of simultaneous requests on a large org.
const mapWithConcurrency = async (items, limit, fn) => {
  const results = [];
  let index = 0;
  const workers = new Array(Math.min(limit, items.length)).fill(null).map(async () => {
    while (index < items.length) {
      const current = index++;
      results[current] = await fn(items[current], current);
    }
  });
  await Promise.all(workers);
  return results;
};

// Adds `tag` to a file's existing tags (fetched fresh so we don't clobber
// tags applied elsewhere) and returns whether an update was actually made.
const addOrgTag = async (fileId, tag) => {
  if (!fileId) return { fileId, skipped: true, reason: "no fileId" };
  try {
    const details = await imagekit.getFileDetails(fileId);
    const existingTags = Array.isArray(details.tags) ? details.tags : [];
    if (existingTags.includes(tag)) return { fileId, skipped: true, reason: "already tagged" };

    await imagekit.updateFileDetails(fileId, { tags: [...existingTags, tag] });
    return { fileId, skipped: false };
  } catch (error) {
    return { fileId, skipped: true, reason: error.message };
  }
};

const summarize = (label, results) => {
  const updated = results.filter((r) => r && !r.skipped).length;
  const failed = results.filter((r) => r && r.skipped && r.reason && r.reason !== "already tagged").length;
  const alreadyTagged = results.filter((r) => r && r.reason === "already tagged").length;
  console.log(
    `${label}: ${results.length} candidate file(s) — ${updated} tagged, ${alreadyTagged} already tagged, ${failed} failed`,
  );
};

const backfillDocuments = async () => {
  const docs = await Document.find({ fileId: { $exists: true, $ne: null } })
    .select("fileId organisation_id")
    .lean();
  const results = await mapWithConcurrency(docs, CONCURRENCY, (doc) =>
    addOrgTag(doc.fileId, String(doc.organisation_id)),
  );
  summarize("Document", results);
};

const backfillReimbursements = async () => {
  const claims = await Reimbursement.find({})
    .select("organisation_id receipts.fileId supportingDocuments.fileId")
    .lean();

  const tasks = [];
  for (const claim of claims) {
    const orgTag = String(claim.organisation_id);
    for (const receipt of claim.receipts || []) {
      if (receipt.fileId) tasks.push({ fileId: receipt.fileId, orgTag });
    }
    for (const doc of claim.supportingDocuments || []) {
      if (doc.fileId) tasks.push({ fileId: doc.fileId, orgTag });
    }
  }

  const results = await mapWithConcurrency(tasks, CONCURRENCY, (task) =>
    addOrgTag(task.fileId, task.orgTag),
  );
  summarize("Reimbursement attachments", results);
};

const backfillPolicyVersions = async () => {
  const versions = await PolicyVersion.find({})
    .select("organisation_id pdfFileId images.fileId")
    .lean();

  const tasks = [];
  for (const version of versions) {
    const orgTag = String(version.organisation_id);
    if (version.pdfFileId) tasks.push({ fileId: version.pdfFileId, orgTag });
    for (const image of version.images || []) {
      if (image.fileId) tasks.push({ fileId: image.fileId, orgTag });
    }
  }

  const results = await mapWithConcurrency(tasks, CONCURRENCY, (task) =>
    addOrgTag(task.fileId, task.orgTag),
  );
  summarize("PolicyVersion files", results);
};

const run = async () => {
  await mongoose.connect(process.env.LINK);
  console.log("Connected. Backfilling ImageKit org tags...\n");

  await backfillDocuments();
  await backfillReimbursements();
  await backfillPolicyVersions();

  console.log("\nDone. FieldVisit attachments were NOT covered (no fileId stored for them).");
  await mongoose.disconnect();
};

run().catch((error) => {
  console.error("Backfill failed:", error);
  process.exit(1);
});
