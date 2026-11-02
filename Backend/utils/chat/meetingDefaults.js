const MeetingDefault = require("../../Models/meetingdefault.model");
const controls = require("./meetingControls.service");

const FALLBACK = { allowJoinBeforeHost: false, reminderMinutes: 10 };

const shape = (doc) => ({
  settings: controls.plainSettings(doc && doc.settings),
  allowJoinBeforeHost: doc ? !!doc.allowJoinBeforeHost : FALLBACK.allowJoinBeforeHost,
  reminderMinutes: doc && Number.isFinite(doc.reminderMinutes) ? doc.reminderMinutes : FALLBACK.reminderMinutes,
});

const getOrgDefaults = async (organisationId) => {
  const doc = await MeetingDefault.findOne({ organisation_id: organisationId }).lean();
  return shape(doc);
};

const saveOrgDefaults = async (organisationId, actorKey, body) => {
  const current = await getOrgDefaults(organisationId);
  const src = body && typeof body === "object" ? body : {};
  const settings = controls.normalizeSettings(src.settings, current.settings);
  const allowJoinBeforeHost = typeof src.allowJoinBeforeHost === "boolean" ? src.allowJoinBeforeHost : current.allowJoinBeforeHost;
  const parsed = parseInt(src.reminderMinutes, 10);
  const reminderMinutes = Number.isFinite(parsed) ? Math.min(Math.max(parsed, 0), 1440) : current.reminderMinutes;
  const doc = await MeetingDefault.findOneAndUpdate(
    { organisation_id: organisationId },
    { $set: { settings, allowJoinBeforeHost, reminderMinutes, updatedByKey: actorKey }, $setOnInsert: { organisation_id: organisationId } },
    { new: true, upsert: true, runValidators: true }
  ).lean();
  return shape(doc);
};

module.exports = { getOrgDefaults, saveOrgDefaults };
