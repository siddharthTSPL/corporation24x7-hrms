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
      enum: ["monthly", "yearly", "lifetime"],
      default: "monthly",
    },
  },
  { _id: false }
);

const superAdminSchema = new mongoose.Schema(
  {
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
    },

    company_domain: {
      type: String,
      unique: true,
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
      default: () =>
        new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
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
  plan = "monthly"
) {
  const existing = this.licenses.find(
    (l) => l.product === product
  );

  if (existing) {
    throw new Error(`${product} already purchased`);
  }

  const license = {
    product,
    license_key: generateLicenseKey(product),
    activatedAt: new Date(),
    expiresAt: new Date(
      Date.now() + durationDays * 24 * 60 * 60 * 1000
    ),
    isActive: true,
    plan,
  };

  this.licenses.push(license);

  this.purchased_products.push(product);

  return license;
};

superAdminSchema.methods.canAccessProduct = function (
  product
) {
  if (this.isTrialValid()) {
    return true;
  }

  const license = this.licenses.find(
    (l) => l.product === product
  );

  if (!license) {
    return false;
  }

  return (
    license.isActive &&
    new Date(license.expiresAt) > new Date()
  );
};

superAdminSchema.statics.checkDomainAvailable =
  async function (email) {
    const domain = extractDomain(email);

    if (!domain) {
      throw new Error("Invalid email");
    }

    const existing = await this.findOne({
      company_domain: domain,
    });

    if (existing) {
      throw new Error(
        "Company already registered"
      );
    }

    return true;
  };

const SuperAdminModel = mongoose.model(
  "SuperAdmin",
  superAdminSchema
);

module.exports = SuperAdminModel;