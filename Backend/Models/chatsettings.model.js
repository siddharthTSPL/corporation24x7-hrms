const mongoose = require("mongoose");

// One row per person (User | Manager | Admin | SuperAdmin): everything on the chat Settings page.
const STATUS_PRESETS = ["available", "busy", "in_meeting", "on_leave", "custom"];
const AUTO = { type: String, enum: ["always", "wifi", "never"] };

const chatSettingsSchema = new mongoose.Schema(
  {
    organisation_id: { type: mongoose.Schema.Types.ObjectId, ref: "SuperAdmin", required: true, index: true },
    key: { type: String, required: true, unique: true }, // `${model}:${id}`

    privacy: {
      hideOnline: { type: Boolean, default: false }, // no online dot / "Online" / last seen for others
      typingIndicator: { type: Boolean, default: true }, // off => others never see "typing..." from me
      whoCanAddToGroups: { type: String, enum: ["everyone", "nobody"], default: "everyone" },
    },

    profile: {
      about: { type: String, default: "", maxlength: 140 },
    },

    status: {
      preset: { type: String, enum: [...STATUS_PRESETS, ""], default: "" },
      text: { type: String, default: "", maxlength: 80 },
      expiresAt: { type: Date, default: null }, // null => stays until changed
    },

    appearance: {
      theme: { type: String, enum: ["light", "dark", "system"], default: "system" },
      fontSize: { type: String, enum: ["small", "medium", "large"], default: "medium" },
      accent: { type: String, default: "" }, // "#RRGGBB" or "" for the app default
      compact: { type: Boolean, default: false },
      defaultWallpaper: { type: String, default: "" }, // same format as a per-chat wallpaper
    },

    notifications: {
      dnd: {
        enabled: { type: Boolean, default: false },
        start: { type: String, default: "22:00" }, // HH:MM, may be later than `end` (overnight)
        end: { type: String, default: "08:00" },
        timezone: { type: String, default: "Asia/Kolkata" },
      },
      groupNotifications: { type: Boolean, default: true },
      preview: { type: Boolean, default: true }, // show message text in notifications
    },

    // Auto-reply: when someone starts / continues a direct chat with me, this message is sent to them
    // automatically (at most once an hour per chat). `until` (optional) switches it off by itself.
    autoReply: {
      enabled: { type: Boolean, default: false },
      message: { type: String, default: "", maxlength: 500 },
      until: { type: Date, default: null },
    },

    storage: {
      autoDownload: {
        photos: { ...AUTO, default: "wifi" },
        audio: { ...AUTO, default: "wifi" },
        video: { ...AUTO, default: "never" },
        documents: { ...AUTO, default: "never" },
      },
    },
  },
  { timestamps: true }
);

chatSettingsSchema.statics.STATUS_PRESETS = STATUS_PRESETS;

module.exports = mongoose.models.ChatSettings || mongoose.model("ChatSettings", chatSettingsSchema);
