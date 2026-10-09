const cron = require("node-cron");
const SuperAdmin = require("../Models/superadmin.model");
const FieldLocation = require("../Models/fieldLocation.model");
const FieldVisit = require("../Models/fieldVisit.model");
const FieldDutySession = require("../Models/fieldDutySession.model");

// GPS trail data is sensitive. Retention is enforced server-side so it does
// not depend on a browser, dashboard, or administrator remembering to purge it.
async function purgeExpiredFieldOperationsData() {
  const organisations = await SuperAdmin.find({ "field_operations.enabled": { $ne: false } })
    .select("field_operations.data_retention_days").lean();

  await Promise.all(organisations.map(async (organisation) => {
    const days = Math.max(1, Number(organisation.field_operations?.data_retention_days) || 180);
    const cutoff = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
    const closedSessions = await FieldDutySession.find({
      organisation_id: organisation._id,
      status: "checked_out",
      endedAt: { $lt: cutoff },
    }).select("_id").lean();
    const sessionIds = closedSessions.map((session) => session._id);
    if (!sessionIds.length) return;
    await Promise.all([
      FieldLocation.deleteMany({ organisation_id: organisation._id, session: { $in: sessionIds } }),
      FieldVisit.deleteMany({ organisation_id: organisation._id, session: { $in: sessionIds } }),
      FieldDutySession.deleteMany({ _id: { $in: sessionIds } }),
    ]);
  }));
}

cron.schedule("17 3 * * *", () => {
  purgeExpiredFieldOperationsData().catch((error) => console.error("[Field Operations] retention purge failed:", error.message));
}, { timezone: "Asia/Kolkata" });

module.exports = { purgeExpiredFieldOperationsData };
