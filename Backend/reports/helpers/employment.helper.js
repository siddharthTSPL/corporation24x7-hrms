const { z } = require("zod");
const User = require("../../Models/user.model");
require("../../Models/manager.model"); // registers the Manager model so populate works
const { companyScope } = require("../report.helpers");

const STATUS_VALUES = [
  "working",
  "on_notice",
  "resigned",
  "fired",
  "terminated",
];
const EMPLOYED = new Set(["working", "on_notice"]); // counted in headcount

// Reporting date: optional, defaults to today, cannot be in the future
const asOfSchema = z.coerce
  .date()
  .optional()
  .refine(
    (d) => d === undefined || d <= new Date(),
    "Reporting date cannot be in the future",
  );

const endOfDay = (d) => {
  const x = new Date(d);
  x.setHours(23, 59, 59, 999);
  return x;
};

const joinDateOf = (u) => u.date_of_joining || u.createdAt;

// FALLBACK: if someone is marked resigned/fired/terminated but has no lastWorkingDay,
// updatedAt is used as the exit date. Confirm the real exit-date field with your lead.
function exitDateOf(u) {
  if (!u.working_status || u.working_status === "working") return null;
  return (
    (u.noticePeriod && u.noticePeriod.lastWorkingDay) || u.updatedAt || null
  );
}

function effectiveStatus(u, asOf) {
  const exit = exitDateOf(u);
  if (exit && asOf > endOfDay(exit)) return u.working_status; // already left on this date
  const np = u.noticePeriod || {};
  const onNotice =
    (np.active || exit) && np.initiatedOn && new Date(np.initiatedOn) <= asOf;
  return onNotice ? "on_notice" : "working";
}

/**
 * Single source of truth for both reports.
 * Returns the organisation's employees as they were on the reporting date.
 */
async function getEmployeesAsOf(ctx, f) {
  const asOf = f.asOf ? endOfDay(f.asOf) : new Date();

  const match = companyScope(ctx, {
    $or: [
      { date_of_joining: { $lte: asOf } },
      { date_of_joining: null, createdAt: { $lte: asOf } },
    ],
  });
  if (f.department) match.department = f.department;
  if (f.designation) match.designation = f.designation;
  if (f.office_location) match.office_location = f.office_location;

  const users = await User.find(match)
    .select(
      "empid f_name l_name department designation office_location date_of_joining " +
        "createdAt updatedAt working_status noticePeriod Under_manager",
    )
    .populate("Under_manager", "f_name l_name")
    .lean();

  return users
    .map((u) => ({
      ...u,
      joinDate: joinDateOf(u),
      exitDate: exitDateOf(u),
      status: effectiveStatus(u, asOf),
    }))
    .filter((u) => f.includeExited || EMPLOYED.has(u.status))
    .filter((u) => !f.status || u.status === f.status);
}

module.exports = {
  getEmployeesAsOf,
  asOfSchema,
  STATUS_VALUES,
  EMPLOYED,
  effectiveStatus,
};
