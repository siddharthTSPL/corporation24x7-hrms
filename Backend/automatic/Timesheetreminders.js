const cron = require("node-cron");
const {
  runSubmissionReminders,
  runApprovalReminders,
} = require("../utils/Timesheetnotify.utils");

let running = false;

const runTimesheetReminders = async () => {
  if (running) return;
  running = true;
  try {
    const submissionCount = await runSubmissionReminders();
    const approvalCount = await runApprovalReminders();
    if (submissionCount || approvalCount) {
      console.log(
        `[Timesheet Reminders] Sent ${submissionCount} submission and ${approvalCount} approval reminder(s)`
      );
    }
  } catch (error) {
    console.error("[Timesheet Reminders] Error:", error.message);
  } finally {
    running = false;
  }
};

cron.schedule("*/30 * * * *", runTimesheetReminders);

module.exports = runTimesheetReminders;
