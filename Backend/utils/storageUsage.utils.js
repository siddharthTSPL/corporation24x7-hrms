const mongoose = require("mongoose");
const imagekit = require("./imagekit.utils");

const KB = 1024;
const MB = KB * 1024;
const GB = MB * 1024;

const formatBytes = (bytes) => {
  if (!bytes) return "0 B";
  if (bytes >= GB) return `${(bytes / GB).toFixed(2)} GB`;
  if (bytes >= MB) return `${(bytes / MB).toFixed(2)} MB`;
  if (bytes >= KB) return `${(bytes / KB).toFixed(2)} KB`;
  return `${bytes} B`;
};

const GROUP_DEFS = [
  { key: "recruitment", label: "Recruitment", collections: ["hiringrequisitions", "candidates"] },
  {
    key: "attendance",
    label: "Attendance & Shifts",
    collections: [
      "attendances", "attendancesummaries", "noshowlogs", "shifts", "shiftassignments",
      "weeklyoffschedules", "weekoffgroups", "employeeweekoffoverrides", "wfhs",
      "activetimers", "faceprofiles", "kiosks",
    ],
  },
  {
    key: "leave",
    label: "Leave & Holidays",
    collections: [
      "leaves", "adminleaves", "managerleaves", "leavebalances", "leavepolicies",
      "holidays", "holidaypolicies",
    ],
  },
  {
    key: "payroll",
    label: "Payroll & Finance",
    collections: [
      "payrolls", "payrollpolicies", "salarystructures", "fnfs", "reimbursements",
      "payments", "autopays", "razorpayplans",
    ],
  },
  {
    key: "field",
    label: "Field Operations",
    collections: ["fieldassignments", "fielddutysessions", "fieldlocations", "fieldteams", "fieldvisits"],
  },
  {
    key: "timesheet",
    label: "Timesheets",
    collections: ["timesheets", "timelogs", "tsclients", "tsjobs", "tsprojects"],
  },
  {
    key: "docs",
    label: "Documents & Policies",
    collections: ["documents", "policies", "policyversions", "policyacknowledgements"],
  },
  { key: "assets", label: "Assets", collections: ["assets"] },
  { key: "support", label: "Support Tickets", collections: ["tickets"] },
  {
    key: "core",
    label: "Accounts & Core",
    collections: [
      "superadmins", "admins", "managers", "users", "departments", "permissions",
      "uidcounters", "announcements", "notifications", "auditlogs", "reviews",
      "sessions", "otps", "otplogins",
    ],
  },
];
const OTHER_GROUP = { key: "other", label: "Other" };

const GROUP_BY_COLLECTION = new Map();
for (const g of GROUP_DEFS) for (const c of g.collections) GROUP_BY_COLLECTION.set(c, g);
const groupOf = (name) => GROUP_BY_COLLECTION.get(name) || OTHER_GROUP;

const MODULE_DEFS = [
  { key: "employee_documents", label: "Employee Documents" },
  { key: "policy_pdfs", label: "Policy PDFs" },
  { key: "policy_images", label: "Policy Images" },
  { key: "reimbursement_receipts", label: "Reimbursement Receipts" },
  { key: "reimbursement_supporting", label: "Reimbursement Supporting Docs" },
  { key: "ticket_attachments", label: "Support Ticket Attachments" },
  { key: "field_visit_photos", label: "Field Visit Photos" },
  { key: "profile_photos", label: "Profile Photos" },
  { key: "notice_images", label: "Announcement / Notice Images" },
  { key: "face_enrollment_photos", label: "Face Enrollment Photos" },
  { key: "attendance_selfies", label: "Attendance Selfies" },
  { key: "recruitment_resumes", label: "Recruitment Resumes" },
];
const MODULE_LABEL = Object.fromEntries(MODULE_DEFS.map((m) => [m.key, m.label]));

const ORG_FIELD_CANDIDATES = ["organisation_id", "organisation", "organization_id", "org_id"];
const ORG_FIELD_OVERRIDES = { superadmins: "_id" };

const STRING_FILE_SOURCES = [
  { collection: "users", field: "profile_image", module: "profile_photos" },
  { collection: "managers", field: "profile_image", module: "profile_photos" },
  { collection: "admins", field: "profile_image", module: "profile_photos" },
  { collection: "superadmins", field: "profile_image", module: "profile_photos" },
  { collection: "announcements", field: "notice_image", module: "notice_images" },
  { collection: "attendances", field: "selfie", module: "attendance_selfies" },
  { collection: "faceprofiles", field: "photoSample", module: "face_enrollment_photos" },
  { collection: "candidates", field: "resume_url", module: "recruitment_resumes" },
];

const att = (module, a) => ({
  module,
  url: a?.url,
  fileId: a?.fileId,
  dbBytes: a?.sizeKb ? a.sizeKb * KB : 0,
  name: a?.originalName,
  uploadedAt: a?.uploadedAt,
});

const OBJECT_FILE_SOURCES = [
  {
    collection: "documents",
    projection: { organisation_id: 1, fileUrl: 1, fileId: 1, size: 1, title: 1, fileType: 1, uploadedAt: 1 },
    extract: (d) => [
      {
        module: "employee_documents",
        url: d.fileUrl,
        fileId: d.fileId,
        dbBytes: d.size || 0,
        name: d.title,
        uploadedAt: d.uploadedAt,
      },
    ],
  },
  {
    collection: "policyversions",
    projection: { organisation_id: 1, pdfUrl: 1, pdfFileId: 1, pdfFileName: 1, images: 1, createdAt: 1 },
    extract: (d) => [
      ...(d.pdfUrl || d.pdfFileId
        ? [{
            module: "policy_pdfs",
            url: d.pdfUrl,
            fileId: d.pdfFileId,
            name: d.pdfFileName,
            uploadedAt: d.createdAt,
          }]
        : []),
      ...(d.images || []).map((i) => ({
        module: "policy_images",
        url: i?.url,
        fileId: i?.fileId,
        name: i?.caption,
        uploadedAt: d.createdAt,
      })),
    ],
  },
  {
    collection: "reimbursements",
    projection: { organisation_id: 1, receipts: 1, supportingDocuments: 1 },
    extract: (d) => [
      ...(d.receipts || []).map((a) => att("reimbursement_receipts", a)),
      ...(d.supportingDocuments || []).map((a) => att("reimbursement_supporting", a)),
    ],
  },
  {
    collection: "tickets",
    projection: { organisation_id: 1, attachments: 1 },
    extract: (d) => (d.attachments || []).map((a) => att("ticket_attachments", a)),
  },
  {
    collection: "fieldvisits",
    projection: { organisation_id: 1, attachments: 1, createdAt: 1 },
    extract: (d) =>
      (d.attachments || []).map((url) => ({
        module: "field_visit_photos",
        url,
        uploadedAt: d.createdAt,
      })),
  },
];

const mapLimit = async (items, limit, fn) => {
  const out = new Array(items.length);
  let next = 0;
  const workers = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (next < items.length) {
      const i = next++;
      out[i] = await fn(items[i], i);
    }
  });
  await Promise.all(workers);
  return out;
};

const pathOf = (u) => {
  if (!u || typeof u !== "string") return null;
  try {
    return decodeURIComponent(new URL(u).pathname);
  } catch {
    return null;
  }
};

const baseName = (p) => (p ? String(p).split("/").filter(Boolean).pop() : "");

const TTL_MS = 10 * 60 * 1000;
const META_TTL_MS = 30 * 60 * 1000;

let ikCache = null;
let ikInFlight = null;

const fetchAllImageKitFiles = async () => {
  const files = [];
  const limit = 1000;
  let skip = 0;
  for (let page = 0; page < 200; page++) {
    const batch = await imagekit.listFiles({ limit, skip, type: "file" });
    if (!batch || batch.length === 0) break;
    for (const f of batch) {
      if (f.type === "folder") continue;
      files.push({
        fileId: f.fileId,
        name: f.name,
        filePath: f.filePath,
        url: f.url,
        size: f.size || 0,
        mime: f.mime || "",
        fileType: f.fileType || "",
        createdAt: f.createdAt,
      });
    }
    if (batch.length < limit) break;
    skip += limit;
  }
  return files;
};

const getImageKitIndex = async (force) => {
  if (!force && ikCache && Date.now() - ikCache.builtAt < TTL_MS) return ikCache;
  if (!ikInFlight) {
    ikInFlight = fetchAllImageKitFiles()
      .then((files) => {
        const byFileId = new Map();
        const byPath = new Map();
        for (const f of files) {
          if (f.fileId) byFileId.set(f.fileId, f);
          const p = pathOf(f.url);
          if (p) byPath.set(p, f);
        }
        ikCache = { builtAt: Date.now(), files, byFileId, byPath, error: null };
        return ikCache;
      })
      .catch((err) => {
        if (ikCache) return { ...ikCache, error: err?.message || "ImageKit unavailable" };
        return {
          builtAt: Date.now(),
          files: [],
          byFileId: new Map(),
          byPath: new Map(),
          error: err?.message || "ImageKit unavailable",
        };
      })
      .finally(() => {
        ikInFlight = null;
      });
  }
  return ikInFlight;
};

let metaCache = null;

const detectOrgField = async (coll, name) => {
  if (ORG_FIELD_OVERRIDES[name]) return ORG_FIELD_OVERRIDES[name];
  try {
    const sample = await coll
      .aggregate([
        { $limit: 25 },
        { $project: { _id: 0, keys: { $map: { input: { $objectToArray: "$$ROOT" }, as: "kv", in: "$$kv.k" } } } },
      ])
      .toArray();
    const present = new Set(sample.flatMap((s) => s.keys || []));
    return ORG_FIELD_CANDIDATES.find((c) => present.has(c)) || null;
  } catch {
    return null;
  }
};

const getOverhead = async (db, coll, name) => {
  try {
    const [r] = await coll.aggregate([{ $collStats: { storageStats: {} } }]).toArray();
    const s = r?.storageStats;
    if (s && s.size) return (s.storageSize + (s.totalIndexSize || 0)) / s.size;
  } catch {}
  try {
    const s = await db.command({ collStats: name });
    if (s && s.size) return (s.storageSize + (s.totalIndexSize || 0)) / s.size;
  } catch {}
  return 1;
};

const getCollectionMeta = async (db) => {
  if (metaCache && Date.now() - metaCache.builtAt < META_TTL_MS) return metaCache.data;
  const infos = await db.listCollections({}, { nameOnly: false }).toArray();
  const names = infos
    .filter((c) => (c.type || "collection") === "collection" && !c.name.startsWith("system."))
    .map((c) => c.name)
    .sort();
  const data = new Map();
  await mapLimit(names, 4, async (name) => {
    const coll = db.collection(name);
    const orgField = await detectOrgField(coll, name);
    if (!orgField) return;
    const overhead = await getOverhead(db, coll, name);
    data.set(name, { orgField, overhead });
  });
  metaCache = { builtAt: Date.now(), data };
  return data;
};

const buildOrgMatch = (field, ids) => {
  if (field === "_id") return { _id: ids.oid };
  return { [field]: { $in: ids.all } };
};

const scanCollection = async (db, name, meta, ids) => {
  const coll = db.collection(name);
  const match = buildOrgMatch(meta.orgField, ids);
  let row;
  try {
    [row] = await coll
      .aggregate(
        [{ $match: match }, { $group: { _id: null, docs: { $sum: 1 }, bytes: { $sum: { $bsonSize: "$$ROOT" } } } }],
        { allowDiskUse: true }
      )
      .toArray();
  } catch {
    try {
      const docs = await coll.countDocuments(match);
      if (!docs) return null;
      const [s] = await coll.aggregate([{ $collStats: { storageStats: {} } }]).toArray();
      row = { docs, bytes: Math.round(docs * (s?.storageStats?.avgObjSize || 0)) };
    } catch {
      return null;
    }
  }
  if (!row || !row.docs) return null;
  return {
    name,
    docs: row.docs,
    bytes: row.bytes,
    estimatedDiskBytes: Math.round(row.bytes * meta.overhead),
  };
};

const scanFileRefs = async (db, metaMap, ids) => {
  const refs = [];
  const inline = [];

  await mapLimit(OBJECT_FILE_SOURCES, 3, async (src) => {
    const meta = metaMap.get(src.collection);
    if (!meta) return;
    try {
      const cursor = db
        .collection(src.collection)
        .find(buildOrgMatch(meta.orgField, ids), { projection: src.projection });
      for await (const d of cursor) {
        for (const r of src.extract(d)) {
          if (r.url || r.fileId) refs.push(r);
        }
      }
    } catch {}
  });

  await mapLimit(STRING_FILE_SOURCES, 3, async (src) => {
    const meta = metaMap.get(src.collection);
    if (!meta) return;
    const coll = db.collection(src.collection);
    const base = buildOrgMatch(meta.orgField, ids);
    const f = `$${src.field}`;
    try {
      const urlCursor = coll.aggregate(
        [
          { $match: { ...base, [src.field]: { $type: "string", $regex: /^https?:\/\//i } } },
          { $project: { _id: 0, url: f } },
        ],
        { allowDiskUse: true }
      );
      for await (const d of urlCursor) {
        refs.push({ module: src.module, url: d.url, name: baseName(pathOf(d.url)) });
      }

      const [r] = await coll
        .aggregate(
          [
            { $match: { ...base, [src.field]: { $type: "string", $not: /^https?:\/\//i } } },
            { $match: { $expr: { $gt: [{ $strLenBytes: f }, 200] } } },
            { $group: { _id: null, count: { $sum: 1 }, bytes: { $sum: { $strLenBytes: f } } } },
          ],
          { allowDiskUse: true }
        )
        .toArray();
      if (r && r.count) {
        inline.push({
          module: src.module,
          label: MODULE_LABEL[src.module] || src.module,
          collection: src.collection,
          field: src.field,
          count: r.count,
          bytes: r.bytes,
          formatted: formatBytes(r.bytes),
        });
      }
    } catch {}
  });

  return { refs, inline };
};

const orgCache = new Map();
const orgInFlight = new Map();

const buildOrgUsage = async (org, force) => {
  const db = mongoose.connection.db;
  if (!db) throw new Error("MongoDB not connected");

  const hex = String(org._id);
  const oid = new mongoose.Types.ObjectId(hex);
  const all = [oid, hex];
  if (org.organisation_id) all.push(String(org.organisation_id));
  const ids = { oid, all };

  const [ik, metaMap] = await Promise.all([getImageKitIndex(force), getCollectionMeta(db)]);

  const scanNames = [...metaMap.keys()];
  const scans = (await mapLimit(scanNames, 4, (n) => scanCollection(db, n, metaMap.get(n), ids))).filter(Boolean);

  let mongoBytes = 0;
  let mongoDocs = 0;
  let estimatedDiskBytes = 0;
  const groupMap = new Map();
  for (const s of scans) {
    mongoBytes += s.bytes;
    mongoDocs += s.docs;
    estimatedDiskBytes += s.estimatedDiskBytes;
    const g = groupOf(s.name);
    let gr = groupMap.get(g.key);
    if (!gr) {
      gr = { key: g.key, label: g.label, bytes: 0, docs: 0, collections: [] };
      groupMap.set(g.key, gr);
    }
    gr.bytes += s.bytes;
    gr.docs += s.docs;
    gr.collections.push({ name: s.name, docs: s.docs, bytes: s.bytes, formatted: formatBytes(s.bytes) });
  }
  const groups = [...groupMap.values()]
    .map((g) => ({
      ...g,
      formatted: formatBytes(g.bytes),
      collections: g.collections.sort((a, b) => b.bytes - a.bytes),
    }))
    .sort((a, b) => b.bytes - a.bytes);

  const { refs, inline } = await scanFileRefs(db, metaMap, ids);

  const endpoint = (process.env.IMAGEKIT_URL_ENDPOINT || "").replace(/\/+$/, "");
  const isImageKitUrl = (u) =>
    (endpoint && String(u).startsWith(endpoint)) || /(^|\/\/)ik\.imagekit\.io\//.test(String(u));

  const claimed = new Set();
  const mods = new Map();
  const fileList = [];
  const modStat = (module) => {
    let s = mods.get(module);
    if (!s) {
      s = { bytes: 0, files: 0, missing: 0, external: 0 };
      mods.set(module, s);
    }
    return s;
  };

  for (const ref of refs) {
    const hit = (ref.fileId && ik.byFileId.get(ref.fileId)) || ik.byPath.get(pathOf(ref.url)) || null;

    if (hit) {
      const key = hit.fileId || hit.url;
      if (claimed.has(key)) continue;
      claimed.add(key);
      const st = modStat(ref.module);
      st.bytes += hit.size;
      st.files += 1;
      fileList.push({
        module: ref.module,
        moduleLabel: MODULE_LABEL[ref.module] || ref.module,
        name: hit.name || ref.name || baseName(hit.filePath),
        title: ref.name || "",
        filePath: hit.filePath,
        url: hit.url,
        fileId: hit.fileId,
        mime: hit.mime,
        fileType: hit.fileType,
        bytes: hit.size,
        formatted: formatBytes(hit.size),
        uploadedAt: ref.uploadedAt || hit.createdAt || null,
        verified: true,
      });
      continue;
    }

    const st = modStat(ref.module);
    const looksExternal = ref.url && !ref.fileId && !isImageKitUrl(ref.url);
    if (looksExternal && !ref.dbBytes) {
      st.external += 1;
      continue;
    }
    if (!ik.error) st.missing += 1;
    if (ref.dbBytes) {
      st.bytes += ref.dbBytes;
      st.files += 1;
      fileList.push({
        module: ref.module,
        moduleLabel: MODULE_LABEL[ref.module] || ref.module,
        name: ref.name || baseName(pathOf(ref.url)),
        title: ref.name || "",
        filePath: pathOf(ref.url) || "",
        url: ref.url || "",
        fileId: ref.fileId || "",
        mime: "",
        fileType: "",
        bytes: ref.dbBytes,
        formatted: formatBytes(ref.dbBytes),
        uploadedAt: ref.uploadedAt || null,
        verified: false,
      });
    }
  }

  const modules = MODULE_DEFS.map((m) => {
    const s = mods.get(m.key) || { bytes: 0, files: 0, missing: 0, external: 0 };
    return {
      key: m.key,
      label: m.label,
      bytes: s.bytes,
      fileCount: s.files,
      missing: s.missing,
      externalLinks: s.external,
      formatted: formatBytes(s.bytes),
    };
  })
    .filter((m) => m.bytes || m.fileCount || m.missing || m.externalLinks)
    .sort((a, b) => b.bytes - a.bytes);

  const ikBytes = modules.reduce((a, m) => a + m.bytes, 0);
  fileList.sort((a, b) => b.bytes - a.bytes);

  return {
    summary: {
      id: hex,
      organisation_id: org.organisation_id,
      organisation_name: org.organisation_name,
      totalBytes: mongoBytes + ikBytes,
      totalFormatted: formatBytes(mongoBytes + ikBytes),
      mongo: {
        bytes: mongoBytes,
        formatted: formatBytes(mongoBytes),
        docs: mongoDocs,
        estimatedDiskBytes,
        estimatedDiskFormatted: formatBytes(estimatedDiskBytes),
        groups,
        inlineFiles: inline.sort((a, b) => b.bytes - a.bytes),
      },
      imagekit: {
        bytes: ikBytes,
        formatted: formatBytes(ikBytes),
        files: modules.reduce((a, m) => a + m.fileCount, 0),
        missingFiles: modules.reduce((a, m) => a + m.missing, 0),
        externalLinks: modules.reduce((a, m) => a + m.externalLinks, 0),
        modules,
      },
      imagekitAvailable: !ik.error,
      imagekitError: ik.error,
    },
    files: fileList,
  };
};

const getOrgSnapshot = async (org, { force = false } = {}) => {
  const key = String(org._id);
  const cached = orgCache.get(key);
  if (!force && cached && Date.now() - cached.builtAt < TTL_MS) return { ...cached, cached: true };

  if (!orgInFlight.has(key)) {
    const p = buildOrgUsage(org, force)
      .then((data) => {
        const entry = { builtAt: Date.now(), computedAt: new Date().toISOString(), ...data };
        orgCache.set(key, entry);
        return entry;
      })
      .finally(() => {
        orgInFlight.delete(key);
      });
    orgInFlight.set(key, p);
  }
  const entry = await orgInFlight.get(key);
  return { ...entry, cached: false };
};

const getOrganisationStorageUsage = async (org, { force = false } = {}) => {
  const snap = await getOrgSnapshot(org, { force });
  return { ...snap.summary, computedAt: snap.computedAt, cached: snap.cached };
};

const getOrganisationStorageFiles = async (
  org,
  { module = "", search = "", page = 1, limit = 25 } = {}
) => {
  const snap = await getOrgSnapshot(org);
  let files = snap.files;
  if (module) files = files.filter((f) => f.module === module);
  if (search) {
    const q = String(search).toLowerCase();
    files = files.filter((f) => `${f.name} ${f.title} ${f.filePath}`.toLowerCase().includes(q));
  }
  const total = files.length;
  const totalBytes = files.reduce((a, f) => a + f.bytes, 0);
  const p = Math.max(parseInt(page, 10) || 1, 1);
  const l = Math.min(Math.max(parseInt(limit, 10) || 25, 1), 100);
  return {
    files: files.slice((p - 1) * l, p * l),
    total,
    totalBytes,
    totalFormatted: formatBytes(totalBytes),
    pagination: { page: p, limit: l, pages: Math.ceil(total / l) || 1, total },
  };
};

module.exports = {
  formatBytes,
  getOrganisationStorageUsage,
  getOrganisationStorageFiles,
};