// One-command switch-on for DPDP when you can't use the Super Admin page yet.
//   node scripts/DpdpEnable.js <superadmin_email> <6-8 digit PIN>
// Sets the access PIN (bcrypt hash) and turns masking + document-PIN ON for that organisation.
require("dotenv").config();
const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const SuperAdmin = require("../Models/superadmin.model");
const DpdpSettings = require("../Models/dpdpSettings.model");
const { validatePin } = require("../utils/dpdp.utils");

(async () => {
  const [email, pin] = process.argv.slice(2);
  if (!email || !pin) { console.log("Usage: node scripts/DpdpEnable.js <superadmin_email> <PIN>"); process.exit(1); }
  const err = validatePin(pin);
  if (err) { console.log(err); process.exit(1); }
  await mongoose.connect(process.env.LINK, { family: 4 });
  const sa = await SuperAdmin.findOne({ email: String(email).toLowerCase().trim() });
  if (!sa) { console.log("No super admin with that email"); process.exit(1); }
  const s = (await DpdpSettings.findOne({ organisation_id: sa._id })) || new DpdpSettings({ organisation_id: sa._id });
  s.pinHash = await bcrypt.hash(pin, 12);
  s.pinVersion = (s.pinVersion || 0) + 1;
  s.pinSetAt = new Date();
  s.usingDefaultPin = false;
  s.enabled = true;
  s.maskingEnabled = true;
  s.pinRequiredForDocuments = true;
  await s.save();
  console.log(`DPDP is ON for organisation ${sa._id} (${sa.email}). PIN version ${s.pinVersion}. Restart not needed (settings cache is 30s).`);
  await mongoose.disconnect();
})().catch((e) => { console.error(e); process.exit(1); });
