import mongoose from "mongoose";
import bcrypt from "bcrypt";
import crypto from "crypto";

const extractDomain = (email) => {
  if (!email || !email.includes("@")) return null;
  return email.split("@")[1].toLowerCase().trim();
};

const BLOCKED_DOMAINS = [
  "yahoo.com",
  "hotmail.com",
  "outlook.com",
  "live.com",
  "icloud.com",
  "aol.com",
];

const SOFTWARE_PRODUCTS = [
  "torchx_talent",
  "torchx_engage",
  "torchx_finance",
  "torchx_inventory",
  "torchx_pay",
];

const generateLicenseKey = (product) => {
  const random = crypto.randomBytes(8).toString("hex").toUpperCase();
  return `TORCHX-${product.replace("torchx_", "").toUpperCase()}-${random}`;
};

const GSTIN_CHARSET = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ";

export const validateGSTIN = (gstin) => {
  if (!gstin || typeof gstin !== "string") return false;
  const g = gstin.trim().toUpperCase();
  if (!/^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/.test(g)) return false;
  let sum = 0;
  for (let i = 0; i < 14; i++) {
    const val = GSTIN_CHARSET.indexOf(g[i]);
    const factor = i % 2 === 0 ? 1 : 2;
    const product = val * factor;
    sum += Math.floor(product / 36) + (product % 36);
  }
  const checkDigit = (36 - (sum % 36)) % 36;
  return GSTIN_CHARSET[checkDigit] === g[14];
};

export const validatePAN = (pan) => {
  if (!pan || typeof pan !== "string") return false;
  const p = pan.trim().toUpperCase();
  if (!/^[A-Z]{5}[0-9]{4}[A-Z]{1}$/.test(p)) return false;
  const validTypes = ["P", "C", "H", "F", "A", "T", "B", "L", "J", "G"];
  return validTypes.includes(p[3]);
};

export const validatePanOrGstin = (value) => {
  if (!value || typeof value !== "string") {
    return { valid: false, type: null, error: "PAN or GSTIN is required" };
  }
  const v = value.trim().toUpperCase();
  if (v.length === 15) {
    if (validateGSTIN(v)) return { valid: true, type: "GSTIN", value: v };
    return { valid: false, type: "GSTIN", error: "Invalid GSTIN — checksum or format mismatch" };
  }
  if (v.length === 10) {
    if (validatePAN(v)) return { valid: true, type: "PAN", value: v };
    return { valid: false, type: "PAN", error: "Invalid PAN — format must be AAAAA0000A with a valid entity type" };
  }
  return { valid: false, type: null, error: "Must be a 10-character PAN or 15-character GSTIN" };
};

export const validateOrganisationName = (name) => {
  if (!name || typeof name !== "string") {
    return { valid: false, error: "Organisation name is required" };
  }
  const trimmed = name.trim();
  if (trimmed.length < 3) {
    return { valid: false, error: "Organisation name is too short" };
  }
  if (/^[^a-zA-Z]*$/.test(trimmed)) {
    return { valid: false, error: "Organisation name must contain letters" };
  }
  if (/^[a-zA-Z]{1,2}$/.test(trimmed)) {
    return { valid: false, error: "Organisation name must be a real company name" };
  }
  if (/^(.)\1+$/i.test(trimmed.replace(/\s/g, ""))) {
    return { valid: false, error: "Organisation name does not look real" };
  }
  const words = trimmed.split(/\s+/).filter(Boolean);
  const hasRealWord = words.some((w) => /[a-zA-Z]{3,}/.test(w));
  if (!hasRealWord) {
    return { valid: false, error: "Organisation name must contain at least one meaningful word" };
  }
  if (/[^a-zA-Z0-9\s\.\,\&\-\'\/]/.test(trimmed)) {
    return { valid: false, error: "Organisation name contains invalid special characters" };
  }
  if (/^[\s\d\.\-\&]+$/.test(trimmed)) {
    return { valid: false, error: "Organisation name must have real words, not just symbols or numbers" };
  }
  return { valid: true };
};

const licenseSchema = new mongoose.Schema(
  {
    product: {
      type: String,
      enum: SOFTWARE_PRODUCTS,
      required: true,
    },
    license_key: {
      type: String,
      required: true,
    },
    activatedAt: {
      type: Date,
      default: Date.now,
    },
    expiresAt: {
      type: Date,
      required: true,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    plan: {
      type: String,
      enum: ["startup", "business", "enterprise"],
      default: "startup",
    },
    plan_type: {
      type: String,
      enum: ["monthly", "yearly"],
      default: "monthly",
    },
    users: {
      type: Number,
      default: 0,
    },
  },
  { _id: false }
);

const addressSchema = new mongoose.Schema(
  {
    line1:    { type: String, default: "" },
    line2:    { type: String, default: "" },
    city:     { type: String, default: "" },
    state:    { type: String, default: "" },
    zip_code: { type: String, default: "" },
    country:  { type: String, default: "India" },
  },
  { _id: false }
);

const superAdminSchema = new mongoose.Schema(
  {
    organisation_id: {
      type: String,
      unique: true,
    },
    f_name: String,
    l_name: String,
    email: {
      type: String,
      unique: true,
      required: true,
    },
    password: {
      type: String,
      required: true,
    },
    organisation_name: {
      type: String,
      required: true,
      unique: true,
    },
    company_domain: {
      type: String,
    },
    pan_or_gstin: {
      type: String,
      trim: true,
      uppercase: true,
    },
    pan_gstin_type: {
      type: String,
      enum: ["PAN", "GSTIN"],
    },
    address: {
      type: addressSchema,
      default: () => ({}),
    },
    purchased_products: [
      {
        type: String,
        enum: SOFTWARE_PRODUCTS,
      },
    ],
    licenses: [licenseSchema],
    trial_started_at: {
      type: Date,
      default: Date.now,
    },
    trial_expires_at: {
      type: Date,
      default: () => new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    },
    is_trial_active: {
      type: Boolean,
      default: true,
    },
    role: {
      type: String,
      default: "super_admin",
    },
    status: {
      type: String,
      enum: ["active", "inactive", "suspended"],
      default: "active",
    },
    isVerified: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);

superAdminSchema.pre("validate", function () {
  if (!this.email) return;
  const domain = extractDomain(this.email);
  if (BLOCKED_DOMAINS.includes(domain)) {
    throw new Error("Use company email only");
  }
  this.company_domain = domain;
});

superAdminSchema.pre("save", async function () {
  if (!this.isModified("password")) return;
  this.password = await bcrypt.hash(this.password, 10);
});

superAdminSchema.methods.isValidPassword = async function (password) {
  return bcrypt.compare(password, this.password);
};

superAdminSchema.methods.isTrialValid = function () {
  return new Date() < new Date(this.trial_expires_at);
};

superAdminSchema.methods.generateLicense = function (
  product,
  durationDays = 30,
  plan = "startup",
  users = 1,
  plan_type = "monthly"
) {
  const existingIndex = this.licenses.findIndex((l) => l.product === product);

  if (existingIndex !== -1) {
    const existing = this.licenses[existingIndex];
    if (existing.isActive && new Date(existing.expiresAt) > new Date()) {
      throw new Error(`${product} already has an active license`);
    }
    this.licenses.splice(existingIndex, 1);
    const productIndex = this.purchased_products.indexOf(product);
    if (productIndex !== -1) this.purchased_products.splice(productIndex, 1);
  }

  const license = {
    product,
    license_key: generateLicenseKey(product),
    activatedAt: new Date(),
    expiresAt: new Date(Date.now() + durationDays * 24 * 60 * 60 * 1000),
    isActive: true,
    plan,
    plan_type,
    users,
  };

  this.licenses.push(license);
  this.purchased_products.push(product);

  return license;
};

superAdminSchema.methods.canAccessProduct = function (product) {
  if (this.isTrialValid()) {
    return true;
  }

  const license = this.licenses.find((l) => l.product === product);
  if (!license) {
    return false;
  }

  return license.isActive && new Date(license.expiresAt) > new Date();
};

superAdminSchema.statics.checkDomainAvailable = async function (
  email,
  organisation_name
) {
  const domain = extractDomain(email);
  if (!domain) throw new Error("Invalid email");

  const existing = await this.findOne({
    organisation_name: {
      $regex: new RegExp(`^${organisation_name}$`, "i"),
    },
  });

  if (existing) throw new Error("Organisation name already registered");

  return true;
};

const SuperAdminModel = mongoose.model("SuperAdmin", superAdminSchema);

export default SuperAdminModel;