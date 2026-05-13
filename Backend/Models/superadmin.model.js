const mongoose = require("mongoose");
const bcrypt = require("bcrypt");

const extractDomain = (email) => {
  if (!email || !email.includes("@")) return null;
  return email.split("@")[1].toLowerCase().trim();
};

const BLOCKED_DOMAINS = [
  "gmail.com",
  "yahoo.com",
  "hotmail.com",
  "outlook.com",
  "live.com",
  "icloud.com",
  "me.com",
  "aol.com",
  "protonmail.com",
  "zohomail.com",
  "yandex.com",
  "mail.com",
  "inbox.com",
  "rediffmail.com",
  "msn.com",
];

const superAdminSchema = new mongoose.Schema(
  {
    f_name: {
      type: String,
      required: [true, "First name is required"],
      trim: true,
    },

    l_name: {
      type: String,
      required: [true, "Last name is required"],
      trim: true,
    },

    email: {
      type: String,
      required: [true, "Work email is required"],
      unique: true,
      lowercase: true,
      trim: true,
    },

    password: {
      type: String,
      required: [true, "Password is required"],
    },

    phone: {
      type: String,
      trim: true,
    },

    profile_image: {
      type: String,
      default: null,
    },

    organisation_name: {
      type: String,
      required: [true, "Organisation name is required"],
      trim: true,
    },

    company_domain: {
      type: String,
      unique: true,
      lowercase: true,
      trim: true,
    },

    company_address: {
      type: String,
      trim: true,
    },

    company_size: {
      type: String,
      enum: ["1-10", "11-50", "51-200", "201-500", "500+"],
      default: "1-10",
    },

    industry: {
      type: String,
      trim: true,
    },

    plan: {
      type: String,
      enum: ["trial", "basic", "professional", "enterprise"],
      default: "trial",
    },

    plan_started_at: {
      type: Date,
      default: Date.now,
    },

    plan_expires_at: {
      type: Date,
      default: () => new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    },

    role: {
      type: String,
      default: "super_admin",
      immutable: true,
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
      default: true,
    },

    last_login: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

superAdminSchema.pre("validate", function (next) {
  if (!this.email) return next();
  const domain = extractDomain(this.email);
  if (BLOCKED_DOMAINS.includes(domain)) {
    return next(
      new Error(
        `Personal email domains like "${domain}" are not allowed. Please use your company work email.`
      )
    );
  }
  this.company_domain = domain;
  next();
});

superAdminSchema.pre("save", async function (next) {
  if (!this.isModified("password")) return next();
  this.password = await bcrypt.hash(this.password, 10);
  next();
});

superAdminSchema.methods.isValidPassword = async function (password) {
  return await bcrypt.compare(password, this.password);
};

superAdminSchema.statics.checkDomainAvailable = async function (email) {
  const domain = extractDomain(email);
  if (!domain) throw new Error("Invalid email format.");
  if (BLOCKED_DOMAINS.includes(domain)) {
    throw new Error(
      `"${domain}" is a personal email provider. Use your company work email.`
    );
  }
  const existing = await this.findOne({ company_domain: domain });
  if (existing) {
    throw new Error(
      `An account for "${domain}" already exists. Each company can only have one super admin account.`
    );
  }
  return true;
};

superAdminSchema.index({ status: 1, plan: 1 });

const SuperAdminModel = mongoose.model("SuperAdmin", superAdminSchema);
module.exports = SuperAdminModel;