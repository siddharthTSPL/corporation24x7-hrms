const mongoose = require("mongoose");
const imagekit = require("./imagekit.utils");

// Any Mongoose model whose schema has this field is treated as
// organisation-scoped data for the purposes of the storage report.
const ORG_FIELD = "organisation_id";

// SuperAdmin IS the organisation record, but its own `organisation_id`
// field is an unrelated business code (not a reference to itself), so it
// has to be matched by _id instead of like every other org-scoped model.
const SUPERADMIN_MODEL = "SuperAdmin";

const buildOrgFilter = (modelName, schema, organisationId) => {
  if (modelName === SUPERADMIN_MODEL) {
    return { _id: new mongoose.Types.ObjectId(organisationId) };
  }
  const path = schema.path(ORG_FIELD);
  const isStringId = path && path.instance === "String";
  return {
    [ORG_FIELD]: isStringId
      ? String(organisationId)
      : new mongoose.Types.ObjectId(organisationId),
  };
};

/**
 * Walks every registered Mongoose model and, for the ones scoped to an
 * organisation (i.e. they have an `organisation_id` field, or are the
 * SuperAdmin/organisation record itself), sums the real on-disk BSON size
 * of that organisation's documents using MongoDB's own $bsonSize operator.
 * This reflects actual bytes stored — not an estimate.
 */
const getDatabaseStorageUsage = async (organisationId) => {
  const collections = [];
  let totalBytes = 0;
  let totalDocuments = 0;

  for (const modelName of mongoose.modelNames()) {
    const model = mongoose.model(modelName);
    const schema = model.schema;
    if (modelName !== SUPERADMIN_MODEL && !schema.path(ORG_FIELD)) continue;

    const filter = buildOrgFilter(modelName, schema, organisationId);

    try {
      const [result] = await model.aggregate([
        { $match: filter },
        {
          $group: {
            _id: null,
            documents: { $sum: 1 },
            bytes: { $sum: { $bsonSize: "$$ROOT" } },
          },
        },
      ]);

      if (result && result.documents > 0) {
        collections.push({
          model: modelName,
          collection: model.collection.name,
          documents: result.documents,
          bytes: result.bytes,
        });
        totalBytes += result.bytes;
        totalDocuments += result.documents;
      }
    } catch (error) {
      // $bsonSize requires MongoDB 4.4+ — degrade gracefully instead of
      // failing the whole report if one collection can't be measured.
      console.error(`[storageUsage] failed to measure ${modelName}:`, error.message);
    }
  }

  collections.sort((a, b) => b.bytes - a.bytes);
  return { totalBytes, totalDocuments, collections };
};

/**
 * Sums the actual file size ImageKit reports for every file tagged with
 * this organisation's id. Every upload path in the app tags new files with
 * the uploading organisation's id (see the imagekit.upload() call sites in
 * uploaddocument/policy/reimbursement/fieldOperations controllers), so this
 * reflects real, current ImageKit usage rather than a value cached in Mongo.
 *
 * Files uploaded before this tagging was added won't carry the tag until
 * scripts/BackfillImagekitOrgTags.js has been run for them once.
 */
const getImageKitStorageUsage = async (organisationId) => {
  const tag = String(organisationId);
  const byFolder = {};
  let totalBytes = 0;
  let totalFiles = 0;
  let skip = 0;
  const limit = 1000;

  // Paginate through every file tagged with this org. The page-count cap
  // is just a safety net against an infinite loop if the API misbehaves.
  for (let page = 0; page < 50; page++) {
    const files = await imagekit.listFiles({
      searchQuery: `tags IN ["${tag}"]`,
      limit,
      skip,
    });
    if (!files || files.length === 0) break;

    for (const file of files) {
      const size = file.size || 0;
      totalBytes += size;
      totalFiles += 1;
      const parts = (file.filePath || "/").split("/");
      const folder = parts.slice(0, -1).join("/") || "/";
      if (!byFolder[folder]) byFolder[folder] = { files: 0, bytes: 0 };
      byFolder[folder].files += 1;
      byFolder[folder].bytes += size;
    }

    if (files.length < limit) break;
    skip += limit;
  }

  const folders = Object.entries(byFolder)
    .map(([folder, stats]) => ({ folder, ...stats }))
    .sort((a, b) => b.bytes - a.bytes);

  return { totalBytes, totalFiles, folders };
};

const getOrganisationStorageUsage = async (organisationId) => {
  const [database, files] = await Promise.all([
    getDatabaseStorageUsage(organisationId),
    getImageKitStorageUsage(organisationId).catch((error) => {
      console.error("[storageUsage] ImageKit usage fetch failed:", error.message);
      return {
        totalBytes: 0,
        totalFiles: 0,
        folders: [],
        error: "Could not reach ImageKit right now",
      };
    }),
  ]);

  return {
    database,
    files,
    totalBytes: database.totalBytes + files.totalBytes,
  };
};

module.exports = {
  getDatabaseStorageUsage,
  getImageKitStorageUsage,
  getOrganisationStorageUsage,
};
