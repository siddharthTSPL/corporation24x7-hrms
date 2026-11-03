const mongoose = require("mongoose");
const ChatSettings = require("../../Models/chatsettings.model");
const presence = require("./presence");
const { httpError, resolvePeople } = require("./people.utils");
const { endOfISTDay } = require("../Istdate.utils");

const STATUS_LABELS = {
  available: "Available",
  busy: "Busy",
  in_meeting: "In a meeting",
  on_leave: "On leave",
};
const DURATIONS = ["1h", "today", "7d", "never"];
const HHMM = /^([01]\d|2[0-3]):[0-5]\d$/;
const HEX = /^#[0-9a-fA-F]{6}$/;
const WALLPAPER_OK = /^(preset:[a-z0-9_-]{1,30}|color:#[0-9a-fA-F]{6}|https:\/\/\S{1,480})$/;

// ---------- reading ----------

const load = async (actor) =>
  ChatSettings.findOneAndUpdate(
    { key: actor.key },
    { $setOnInsert: { organisation_id: actor.organisation_id, key: actor.key } },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  ).lean();

// An expired status counts as cleared (no background job needed).
const effectiveStatus = (s, now = new Date()) => {
  if (!s || !s.preset) return { preset: "", text: "", expiresAt: null };
  if (s.expiresAt && new Date(s.expiresAt) <= now) return { preset: "", text: "", expiresAt: null };
  return { preset: s.preset, text: s.text || STATUS_LABELS[s.preset] || "", expiresAt: s.expiresAt || null };
};

// Auto-reply that is on right now ({ enabled, message, until }); an expired one counts as off.
const effectiveAutoReply = (a, now = new Date()) => {
  const message = String(a?.message || "");
  const until = a?.until || null;
  const live = !!a?.enabled && !!message.trim() && !(until && new Date(until) <= now);
  return { enabled: live, message, until };
};

const shape = (doc) => ({
  privacy: {
    hideOnline: !!doc.privacy?.hideOnline,
    typingIndicator: doc.privacy?.typingIndicator !== false,
    whoCanAddToGroups: doc.privacy?.whoCanAddToGroups || "everyone",
  },
  profile: { about: doc.profile?.about || "" },
  autoReply: effectiveAutoReply(doc.autoReply),
  status: effectiveStatus(doc.status),
  appearance: {
    theme: doc.appearance?.theme || "system",
    fontSize: doc.appearance?.fontSize || "medium",
    accent: doc.appearance?.accent || "",
    compact: !!doc.appearance?.compact,
    defaultWallpaper: doc.appearance?.defaultWallpaper || "",
  },
  notifications: {
    dnd: {
      enabled: !!doc.notifications?.dnd?.enabled,
      start: doc.notifications?.dnd?.start || "22:00",
      end: doc.notifications?.dnd?.end || "08:00",
      timezone: doc.notifications?.dnd?.timezone || "Asia/Kolkata",
    },
    groupNotifications: doc.notifications?.groupNotifications !== false,
    preview: doc.notifications?.preview !== false,
  },
  storage: {
    autoDownload: {
      photos: doc.storage?.autoDownload?.photos || "wifi",
      audio: doc.storage?.autoDownload?.audio || "wifi",
      video: doc.storage?.autoDownload?.video || "never",
      documents: doc.storage?.autoDownload?.documents || "never",
    },
  },
  dndActiveNow: isInDnd(doc.notifications?.dnd),
});

const getSettings = async (actor) => {
  const doc = await load(actor);
  presence.setPrivacy(actor.key, doc.privacy || {});
  return shape(doc);
};

// ---------- Do Not Disturb ----------

const minutesNow = (timezone, now) => {
  try {
    const parts = new Intl.DateTimeFormat("en-GB", { timeZone: timezone, hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).formatToParts(now);
    const h = Number(parts.find((p) => p.type === "hour").value);
    const m = Number(parts.find((p) => p.type === "minute").value);
    return h * 60 + m;
  } catch {
    return now.getUTCHours() * 60 + now.getUTCMinutes();
  }
};
const toMinutes = (hhmm) => Number(hhmm.slice(0, 2)) * 60 + Number(hhmm.slice(3));

// true when `now` falls inside the person's DND window (handles overnight windows like 22:00 -> 08:00)
function isInDnd(dnd, now = new Date()) {
  if (!dnd || !dnd.enabled || !HHMM.test(dnd.start || "") || !HHMM.test(dnd.end || "")) return false;
  const cur = minutesNow(dnd.timezone || "Asia/Kolkata", now);
  const s = toMinutes(dnd.start);
  const e = toMinutes(dnd.end);
  if (s === e) return false;
  return s < e ? cur >= s && cur < e : cur >= s || cur < e;
}

// ---------- writing ----------

const bool = (v, name) => {
  if (typeof v !== "boolean") throw httpError(`${name} must be true or false.`);
  return v;
};
const oneOf = (v, list, name) => {
  if (!list.includes(v)) throw httpError(`${name} must be one of: ${list.join(", ")}.`);
  return v;
};

// Turns a partial settings object into validated dotted $set paths. Unknown fields are ignored.
const buildPatch = (body = {}) => {
  const set = {};
  const p = body.privacy;
  if (p && typeof p === "object") {
    if ("hideOnline" in p) set["privacy.hideOnline"] = bool(p.hideOnline, "hideOnline");
    if ("typingIndicator" in p) set["privacy.typingIndicator"] = bool(p.typingIndicator, "typingIndicator");
    if ("whoCanAddToGroups" in p) set["privacy.whoCanAddToGroups"] = oneOf(p.whoCanAddToGroups, ["everyone", "nobody"], "whoCanAddToGroups");
  }
  if (body.profile && typeof body.profile === "object" && "about" in body.profile) {
    const about = String(body.profile.about ?? "").replace(/\u0000/g, "").trim();
    if (about.length > 140) throw httpError("About can be at most 140 characters.");
    set["profile.about"] = about;
  }
  const ar = body.autoReply;
  if (ar && typeof ar === "object") {
    if ("enabled" in ar) set["autoReply.enabled"] = bool(ar.enabled, "autoReply.enabled");
    if ("message" in ar) {
      const message = String(ar.message ?? "").replace(/\u0000/g, "").trim();
      if (message.length > 500) throw httpError("Auto-reply can be at most 500 characters.");
      set["autoReply.message"] = message;
    }
    if ("until" in ar) {
      if (ar.until === null || ar.until === "") set["autoReply.until"] = null;
      else {
        const d = new Date(ar.until);
        if (isNaN(d)) throw httpError("Choose a valid date and time for the auto-reply to end.");
        if (d.getTime() <= Date.now()) throw httpError("The auto-reply end time must be in the future.");
        set["autoReply.until"] = d;
      }
    }
  }
  const a = body.appearance;
  if (a && typeof a === "object") {
    if ("theme" in a) set["appearance.theme"] = oneOf(a.theme, ["light", "dark", "system"], "theme");
    if ("fontSize" in a) set["appearance.fontSize"] = oneOf(a.fontSize, ["small", "medium", "large"], "fontSize");
    if ("accent" in a) {
      if (a.accent !== "" && !HEX.test(String(a.accent))) throw httpError("Accent colour must look like #1A73E8.");
      set["appearance.accent"] = String(a.accent);
    }
    if ("compact" in a) set["appearance.compact"] = bool(a.compact, "compact");
    if ("defaultWallpaper" in a) {
      if (a.defaultWallpaper !== "" && !WALLPAPER_OK.test(String(a.defaultWallpaper))) throw httpError("Invalid wallpaper.");
      set["appearance.defaultWallpaper"] = String(a.defaultWallpaper);
    }
  }
  const n = body.notifications;
  if (n && typeof n === "object") {
    if ("groupNotifications" in n) set["notifications.groupNotifications"] = bool(n.groupNotifications, "groupNotifications");
    if ("preview" in n) set["notifications.preview"] = bool(n.preview, "preview");
    const d = n.dnd;
    if (d && typeof d === "object") {
      if ("enabled" in d) set["notifications.dnd.enabled"] = bool(d.enabled, "dnd.enabled");
      for (const f of ["start", "end"]) {
        if (f in d) {
          if (!HHMM.test(String(d[f]))) throw httpError(`dnd.${f} must be a 24-hour time like 22:00.`);
          set[`notifications.dnd.${f}`] = String(d[f]);
        }
      }
      if ("timezone" in d) {
        try { new Intl.DateTimeFormat("en", { timeZone: String(d.timezone) }); } catch { throw httpError("Unknown timezone."); }
        set["notifications.dnd.timezone"] = String(d.timezone);
      }
    }
  }
  const s = body.storage?.autoDownload;
  if (s && typeof s === "object") {
    for (const f of ["photos", "audio", "video", "documents"]) {
      if (f in s) set[`storage.autoDownload.${f}`] = oneOf(s[f], ["always", "wifi", "never"], `autoDownload.${f}`);
    }
  }
  return set;
};

const updateSettings = async (actor, body, { emitToKeys, emitToOrganisation }) => {
  const set = buildPatch(body);
  if (!Object.keys(set).length) throw httpError("Nothing to update.");
  const before = await load(actor);
  if (set["autoReply.enabled"] === true) {
    const finalMessage = "autoReply.message" in set ? set["autoReply.message"] : before.autoReply?.message || "";
    if (!String(finalMessage).trim()) throw httpError("Write the auto-reply message first.");
  }
  const doc = await ChatSettings.findOneAndUpdate({ key: actor.key }, { $set: set }, { new: true }).lean();

  presence.setPrivacy(actor.key, doc.privacy || {});
  const visibilityChanged = !!before.privacy?.hideOnline !== !!doc.privacy?.hideOnline;
  if (visibilityChanged) {
    // everyone's online dots update immediately
    emitToOrganisation(actor.organisation_id, "presence:update", { key: actor.key, ...presence.publicState(actor.key) });
  }
  if ("profile.about" in set) {
    emitToOrganisation(actor.organisation_id, "chat:person:updated", { key: actor.key, about: doc.profile?.about || "" });
  }
  emitToKeys([actor.key], "chat:settings:updated", shape(doc)); // my other devices
  return shape(doc);
};

// ---------- status presets ----------

const expiryFor = (duration, now = new Date()) => {
  if (duration === "1h") return new Date(now.getTime() + 60 * 60 * 1000);
  if (duration === "7d") return new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
  if (duration === "today") return endOfISTDay(now);
  return null; // never
};

const setStatus = async (actor, { preset, text, duration = "never" } = {}, { emitToOrganisation }) => {
  let update;
  if (!preset) {
    update = { "status.preset": "", "status.text": "", "status.expiresAt": null }; // clear
  } else {
    oneOf(preset, ChatSettings.STATUS_PRESETS, "preset");
    oneOf(duration, DURATIONS, "duration");
    let label = STATUS_LABELS[preset] || "";
    if (preset === "custom") {
      label = String(text ?? "").replace(/\u0000/g, "").trim();
      if (!label) throw httpError("Write your custom status.");
      if (label.length > 80) throw httpError("Status can be at most 80 characters.");
    }
    update = { "status.preset": preset, "status.text": label, "status.expiresAt": expiryFor(duration) };
  }
  await load(actor);
  const doc = await ChatSettings.findOneAndUpdate({ key: actor.key }, { $set: update }, { new: true }).lean();
  const status = effectiveStatus(doc.status);
  emitToOrganisation(actor.organisation_id, "chat:person:updated", { key: actor.key, status });
  return status;
};

// ---------- using other people's settings ----------

// Adds `about` + `status` to people (Map<key, person>) so chat lists / info sheets can show them.
const decoratePeople = async (people) => {
  const keys = [...people.keys()];
  if (!keys.length) return;
  await presence.hydrate(keys); // last seen + privacy
  const rows = await ChatSettings.find({ key: { $in: keys } }).select("key profile status").lean();
  const by = new Map(rows.map((r) => [r.key, r]));
  for (const [key, person] of people) {
    const r = by.get(key);
    person.about = r?.profile?.about || "";
    person.status = effectiveStatus(r?.status);
  }
};

// The text to send for this person right now, or "" when their auto-reply is off / expired.
const getAutoReply = async (key) => {
  const row = await ChatSettings.findOne({ key }).select("autoReply").lean();
  const a = effectiveAutoReply(row && row.autoReply);
  return a.enabled ? a.message.trim() : "";
};

// "Who can add me to groups" - throws a friendly error naming whoever said no.
const assertCanBeAdded = async (actor, people) => {
  const keys = [...people].map((p) => p.key).filter((k) => k !== actor.key);
  if (!keys.length) return;
  const rows = await ChatSettings.find({ key: { $in: keys }, "privacy.whoCanAddToGroups": "nobody" }).select("key").lean();
  if (!rows.length) return;
  const blocked = new Set(rows.map((r) => r.key));
  const names = [...people].filter((p) => blocked.has(p.key)).map((p) => p.name);
  throw httpError(`${names.join(", ")} ${names.length > 1 ? "have" : "has"} chosen not to be added to groups.`, 403);
};

module.exports = {
  STATUS_LABELS, DURATIONS,
  getSettings, updateSettings, setStatus,
  effectiveStatus, decoratePeople, assertCanBeAdded, isInDnd, load, getAutoReply,
};
