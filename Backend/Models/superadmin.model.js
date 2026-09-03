const mongoose = require("mongoose");
const bcrypt = require("bcrypt");
const crypto = require("crypto");

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
      unique: true,
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
      enum: ["basic", "Advance", "enterprise"],
      default: "basic",
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

const superAdminSchema = new mongoose.Schema(
  {
    profile_image: {
      type: String,
    },
    organisation_id: {
      type: String,
      unique: true,
      sparse: true,
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

    phone: {
      type: String,
    },

    organisation_name: {
      type: String,
      required: true,
      unique: true,
    },

    address: {
      line1: { type: String, default: "" },
      line2: { type: String, default: "" },
      city: { type: String, default: "" },
      state: { type: String, default: "" },
      zip_code: { type: String, default: "" },
      country: { type: String, default: "India" },
    },

    company_address: {
      type: String,
    },

    company_size: {
      type: String,
    },

    industry: {
      type: String,
    },

    pan_or_gstin: {
      type: String,
    },

    pan_gstin_type: {
      type: String,
      enum: ["PAN", "GSTIN"],
    },

    last_login: {
      type: Date,
      default: null,
    },

    company_domain: {
      type: String,
    },

    purchased_products: [
      {
        type: String,
        enum: SOFTWARE_PRODUCTS,
      },
    ],

    licenses: [licenseSchema],

    plan: {
      type: String,
      default: null,
    },

    plan_started_at: {
      type: Date,
      default: null,
    },

    plan_expires_at: {
      type: Date,
      default: null,
    },

    trial_started_at: {
      type: Date,
      default: Date.now,
    },

    trial_expires_at: {
      type: Date,
      default: () => new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
    },

    is_trial_active: {
      type: Boolean,
      default: true,
    },

    role: {
      type: String,
      default: "super_admin",
    },

    active_user_count: {
      type: Number,
      default: 1,
    },

    working_status: {
      type: String,
      enum: ["working", "resigned", "fired", "terminated"],
      default: "working",
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

    isFirstLogin: {
      type: Boolean,
      default: false,
    },

    kiosk_password: {
      type: String,
      select: false,
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
  if (this.isModified("password")) {
    this.password = await bcrypt.hash(this.password, 10);
  }
  if (this.isModified("kiosk_password") && this.kiosk_password) {
    this.kiosk_password = await bcrypt.hash(this.kiosk_password, 10);
  }
});

superAdminSchema.methods.isValidPassword = async function (password) {
  return bcrypt.compare(password, this.password);
};

superAdminSchema.methods.isValidKioskPassword = async function (password) {
  if (!this.kiosk_password) return false;
  return bcrypt.compare(password, this.kiosk_password);
};

superAdminSchema.methods.isTrialValid = function () {
  return this.is_trial_active && new Date() < new Date(this.trial_expires_at);
};

superAdminSchema.methods.generateLicense = function (
  product,
  durationDays = 30,
  plan = "basic",
  users = 0,
  plan_type = "monthly",
  startDate = new Date()
) {
  const activatedAt = new Date(startDate);
  const expiresAt = new Date(
    activatedAt.getTime() + durationDays * 24 * 60 * 60 * 1000
  );

  const existing = this.licenses.find((l) => l.product === product);

  if (existing) {
    existing.activatedAt = activatedAt;
    existing.expiresAt = expiresAt;
    existing.isActive = true;
    existing.plan = plan;
    existing.users = users;
    existing.plan_type = plan_type;

    if (!this.purchased_products.includes(product)) {
      this.purchased_products.push(product);
    }

    return existing;
  }

  const license = {
    product,
    license_key: generateLicenseKey(product),
    activatedAt,
    expiresAt,
    isActive: true,
    plan,
    users,
    plan_type,
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

superAdminSchema.methods.syncLicenseStatus = function (product) {
  const license = this.licenses.find((l) => l.product === product);
  if (!license) return false;

  const expired = new Date(license.expiresAt) <= new Date();
  if (expired && license.isActive) {
    license.isActive = false;
    return true;
  }
  return false;
};

superAdminSchema.methods.syncAllLicenseStatuses = function () {
  let changed = false;
  const now = new Date();
  for (const license of this.licenses) {
    if (license.isActive && new Date(license.expiresAt) <= now) {
      license.isActive = false;
      changed = true;
    }
  }
  return changed;
};

superAdminSchema.statics.forceExpireStaleLicenses = async function () {
  const now = new Date();
  const result = await this.updateMany(
    { "licenses.isActive": true, "licenses.expiresAt": { $lte: now } },
    { $set: { "licenses.$[elem].isActive": false } },
    { arrayFilters: [{ "elem.isActive": true, "elem.expiresAt": { $lte: now } }] }
  );
  return {
    matchedDocuments: result.matchedCount,
    modifiedDocuments: result.modifiedCount,
  };
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

module.exports = SuperAdminModel;