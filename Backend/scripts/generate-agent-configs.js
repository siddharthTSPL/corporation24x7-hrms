/* Generate a separate agent-config.json for EVERY organisation, in one go.
 *
 * Run on the HRMS server, from the hrms folder:
 *   node scripts/generate-agent-configs.js --url http://175.101.46.205:5001
 *
 * Options:
 *   --url <serverUrl>   address the agents will call (or set PUBLIC_API_URL in .env)
 *   --out <dir>         output folder (default: ./agent-configs)
 *   --org <name|id>     only this organisation (name is a case-insensitive match)
 *   --rotate            also re-key organisations that already have a key
 *                       (the old key stops working - that org's running agent must get the new file)
 *
 * Output:
 *   <out>/<organisation-name>/agent-config.json   one file per organisation  (give each org ITS OWN file)
 *   <out>/_all-in-one/agent-config.json           every generated organisation in one file
 *                                                 (only for ONE PC that serves several organisations)
 *
 * Only a hash of each key is stored in the database, so a key cannot be shown again later:
 * an organisation that already has a key is skipped unless you pass --rotate.
 * The files contain secrets - hand them over safely and delete them afterwards.
 */
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
require("dotenv").config({ path: path.join(__dirname, "..", ".env") });
const mongoose = require("mongoose");
const SuperAdmin = require("../Models/superadmin.model");
const BiometricOrgKey = require("../Models/biometricorgkey.model");

const arg = (n) => { const i = process.argv.indexOf(n); return i > -1 ? process.argv[i + 1] : undefined; };
const has = (n) => process.argv.includes(n);
const sha256 = (s) => crypto.createHash("sha256").update(s).digest("hex");
const slug = (s) => String(s || "org").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "") || "org";

(async () => {
  const serverUrl = String(arg("--url") || process.env.PUBLIC_API_URL || "").replace(/\/$/, "");
  if (!serverUrl) { console.error("Give the server address: --url http://your-server:5001  (or PUBLIC_API_URL in .env)"); process.exit(1); }
  const outDir = path.resolve(arg("--out") || "agent-configs");
  const only = arg("--org");
  const rotate = has("--rotate");

  await mongoose.connect(process.env.LINK, { serverSelectionTimeoutMS: 8000, family: 4 });

  let filter = {};
  if (only) filter = /^[a-f0-9]{24}$/i.test(only) ? { _id: only } : { organisation_name: new RegExp(`^${only.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`, "i") };
  const orgs = await SuperAdmin.find(filter).select("organisation_name").lean();
  if (!orgs.length) { console.error("No organisation found."); process.exit(1); }

  const existing = new Set((await BiometricOrgKey.find({ organisation_id: { $in: orgs.map((o) => o._id) } }).select("organisation_id").lean()).map((k) => String(k.organisation_id)));
  const generated = [], skipped = [];
  const used = new Set();

  for (const org of orgs) {
    const id = String(org._id);
    if (existing.has(id) && !rotate) { skipped.push(org.organisation_name); continue; }
    const secret = crypto.randomBytes(24).toString("hex");
    await BiometricOrgKey.findOneAndUpdate({ organisation_id: org._id }, { keyHash: sha256(secret), rotatedAt: new Date() }, { upsert: true });
    const entry = {
      name: org.organisation_name || id,
      serverUrl,
      agentKey: `${id}.${secret}`,
      lan: { scanSubnet: "auto", port: 4370, knownDevices: [] },
      usbDrive: { enabled: true },
      usbCable: { enabled: false },
    };
    let folder = slug(org.organisation_name); if (used.has(folder)) folder += "-" + id.slice(-4); used.add(folder);
    fs.mkdirSync(path.join(outDir, folder), { recursive: true });
    fs.writeFileSync(path.join(outDir, folder, "agent-config.json"),
      JSON.stringify({ syncIntervalMinutes: 5, deviceTimezone: "+05:30", organisations: [entry] }, null, 2), { mode: 0o600 });
    generated.push(entry);
    console.log(`  ✔ ${entry.name}  ->  ${path.join(folder, "agent-config.json")}`);
  }

  if (generated.length) {
    fs.mkdirSync(path.join(outDir, "_all-in-one"), { recursive: true });
    fs.writeFileSync(path.join(outDir, "_all-in-one", "agent-config.json"),
      JSON.stringify({ syncIntervalMinutes: 5, deviceTimezone: "+05:30", organisations: generated }, null, 2), { mode: 0o600 });
  }
  console.log(`\nGenerated ${generated.length} config file(s) in ${outDir}`);
  if (skipped.length) console.log(`Skipped ${skipped.length} organisation(s) that already have a key (use --rotate to re-key them): ${skipped.join(", ")}`);
  console.log("These files contain secret keys - give each organisation only its own file, then delete the folder.");
  await mongoose.disconnect();
})().catch((e) => { console.error("Failed:", e.message); process.exit(1); });