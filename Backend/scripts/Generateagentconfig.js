// Creates agent-config.json for the TorchX Biometric Agent straight from the
// backend folder - no browser login needed.
//
//   node scripts/Generateagentconfig.js                       -> lists organisations
//   node scripts/Generateagentconfig.js <ORG-CODE> [outDir]   -> writes <outDir>/agent-config.json
//
// Default outDir = ../biometric-agent ; default server URL = http://localhost:5000
// (override with a 3rd argument, e.g. https://your-server.com)
// NOTE: running it again for the same organisation replaces its key.
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const mongoose = require("mongoose");
require("dotenv").config({ path: path.join(__dirname, "..", ".env") });

const SuperAdmin = require("../Models/superadmin.model");
const BiometricOrgKey = require("../Models/biometricorgkey.model");

(async () => {
  await mongoose.connect(process.env.LINK, { serverSelectionTimeoutMS: 8000, family: 4 });
  const [orgCode, outArg, urlArg] = process.argv.slice(2);

  if (!orgCode) {
    const orgs = await SuperAdmin.find({}).select("organisation_id organisation_name").lean();
    console.log("\nOrganisations:");
    orgs.forEach((o) => console.log(`  ${o.organisation_id}   ${o.organisation_name}`));
    console.log("\nNow run:  node scripts/Generateagentconfig.js <ORGANISATION_ID>\n");
    return;
  }

  const org = await SuperAdmin.findOne({ organisation_id: orgCode.trim() }).select("_id organisation_name").lean();
  if (!org) { console.error(`No organisation with ID "${orgCode}". Run without arguments to list them.`); process.exitCode = 1; return; }

  const secret = crypto.randomBytes(24).toString("hex");
  await BiometricOrgKey.findOneAndUpdate(
    { organisation_id: org._id },
    { keyHash: crypto.createHash("sha256").update(secret).digest("hex"), rotatedAt: new Date() },
    { upsert: true, returnDocument: "after" }
  );

  const cfg = {
    serverUrl: (urlArg || "http://localhost:5000").replace(/\/$/, ""),
    agentKey: `${org._id}.${secret}`,
    syncIntervalMinutes: 5,
    deviceTimezone: "+05:30",
    lan: { scanSubnet: "auto", port: 4370, knownDevices: [] },
    usbDrive: { enabled: true, deviceSerial: "" },
  };
  const outDir = path.resolve(outArg || path.join(__dirname, "..", "..", "biometric-agent"));
  fs.mkdirSync(outDir, { recursive: true });
  const file = path.join(outDir, "agent-config.json");
  fs.writeFileSync(file, JSON.stringify(cfg, null, 2));
  console.log(`\nWritten for "${org.organisation_name}": ${file}\n`);
})().catch((e) => { console.error(e.message); process.exitCode = 1; }).finally(() => mongoose.disconnect());