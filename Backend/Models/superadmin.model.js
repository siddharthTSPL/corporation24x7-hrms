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

const superAdminSchema = new mongoose.Schema(
  {
    profile_image:{
      type: String
    },
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

    country: {
      type: String,
    },

    state: {
      type: String,
    },

    city: {
      type: String,
    },

    zip_code: {
      type: String,
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

    active_user_count:{
      type: Number,
      default: 0
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

    // Dedicated credential for face-attendance kiosk devices. Kept
    // completely separate from the superadmin's own login password so a
    // tablet sitting at reception never holds (or needs) the actual
    // account password — only whoever knows this org-level kiosk
    // password can sign a device in.
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
  if (!this.isModified("password")) return;
  this.password = await bcrypt.hash(this.password, 10);
});

superAdminSchema.pre("save", async function () {
  if (!this.isModified("kiosk_password") || !this.kiosk_password) return;
  this.kiosk_password = await bcrypt.hash(this.kiosk_password, 10);
});

superAdminSchema.methods.isValidPassword = async function (password) {
  return bcrypt.compare(password, this.password);
};

superAdminSchema.methods.isValidKioskPassword = async function (password) {
  if (!this.kiosk_password) return false;
  return bcrypt.compare(password, this.kiosk_password);
};

superAdminSchema.methods.isTrialValid = function () {
  return new Date() < new Date(this.trial_expires_at);
};

superAdminSchema.methods.generateLicense = function (
  product,
  durationDays = 30,
  plan = "startup"
) {
  const existing = this.licenses.find((l) => l.product === product);

  if (existing) {
    throw new Error(`${product} already purchased`);
  }

  const license = {
    product,
    license_key: generateLicenseKey(product),
    activatedAt: new Date(),
    expiresAt: new Date(Date.now() + durationDays * 24 * 60 * 60 * 1000),
    isActive: true,
    plan,
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

module.exports = SuperAdminModel;