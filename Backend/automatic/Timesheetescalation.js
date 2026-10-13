const cron = require("node-cron");
const Timesheet = require("../Models/Timesheet.model");
const Manager = require("../Models/manager.model");
const Admin = require("../Models/Admin.model");
const { resolveDefaultAdminHandler } = require("../utils/approvalFlow.utils");

const ESCALATION_HOURS_THRESHOLD = 48;
const MAX_ESCALATION_LEVEL = 3;
const PENDING_STATUSES = [
  "pending_manager",
  "pending_reporting_manager",
  "pending_admin",
  "pending_superadmin",
];

const resolveAdminStage = async (adminId, organisation_id) => {
  const handler = await resolveDefaultAdminHandler(adminId, organisation_id);
  const targetAdmin = await Admin.findOne({ _id: handler, organisation_id })
    .select("reporting_manager_model")
    .lean();
  return {
    handler,
    status: targetAdmin?.reporting_manager_model === "Admin"
      ? "pending_coadmin"
      : "pending_admin",
  };
};

const escalateStuckTimesheets = async () => {
  try {
    const cutoff = new Date(Date.now() - ESCALATION_HOURS_THRESHOLD * 60 * 60 * 1000);

    const stuckTimesheets = await Timesheet.find({
      status: { $in: PENDING_STATUSES },
      escalation_level: { $lt: MAX_ESCALATION_LEVEL },
      $or: [
        { last_escalated_at: null, submitted_at: { $lte: cutoff } },
        { last_escalated_at: { $lte: cutoff } },
      ],
    });

    let escalatedCount = 0;

    for (const timesheet of stuckTimesheets) {
      if (timesheet.currentHandlerModel === "Manager") {
        const manager = await Manager.findOne({ _id: timesheet.currentHandler })
          .select("reporting_manager reporting_manager_model")
          .lean();

        if (!manager?.reporting_manager) {
          console.warn(`[Timesheet Escalation] No reporting_manager for Manager on ${timesheet._id}. Skipping.`);
          continue;
        }

        timesheet.handlerChain.push(timesheet.currentHandler);
        if (manager.reporting_manager_model === "Admin") {
          const adminStage = await resolveAdminStage(
            manager.reporting_manager,
            timesheet.organisation_id,
          );
          timesheet.currentHandler = adminStage.handler;
          timesheet.currentHandlerModel = "Admin";
          timesheet.status = adminStage.status;
        } else {
          timesheet.currentHandler = manager.reporting_manager;
          timesheet.currentHandlerModel = manager.reporting_manager_model;
          timesheet.status = "pending_reporting_manager";
        }

      } else if (timesheet.currentHandlerModel === "Admin") {
        const admin = await Admin.findOne({ _id: timesheet.currentHandler })
          .select("reporting_manager reporting_manager_model")
          .lean();

        if (!admin?.reporting_manager) {
          console.warn(`[Timesheet Escalation] No reporting_manager for Admin on ${timesheet._id}. Skipping.`);
          continue;
        }

        timesheet.handlerChain.push(timesheet.currentHandler);
        timesheet.currentHandler = admin.reporting_manager;
        timesheet.currentHandlerModel = admin.reporting_manager_model;
        timesheet.status = admin.reporting_manager_model === "Admin"
          ? "pending_admin"
          : admin.reporting_manager_model === "Manager"
            ? "pending_reporting_manager"
            : "pending_superadmin";

      } else {
        continue;
      }

      timesheet.approverPool = [];
      timesheet.escalation_level += 1;
      timesheet.last_escalated_at = new Date();
      await timesheet.save();
      escalatedCount += 1;
    }

    if (escalatedCount) {
      console.log(`[Timesheet Escalation] Escalated ${escalatedCount} timesheet(s)`);
    }
  } catch (error) {
    console.error("[Timesheet Escalation] Error:", error.message);
  }
};

cron.schedule("0 * * * *", escalateStuckTimesheets);

module.exports = escalateStuckTimesheets;
