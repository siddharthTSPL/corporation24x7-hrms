const mongoose = require("mongoose");
const User = require("../Models/user.model");
const Manager = require("../Models/manager.model");
const Admin = require("../Models/Admin.model");
const HolidayPolicy = require("../Models/holidaypolicy.model");
const EmployeeWeekOffOverride = require("../Models/employeeweekoffoverride.model");
const WeekOffGroup = require("../Models/weekoffgroup.model");
const Attendance = require("../Models/attendance.model");
const { toISTKey, istDateFromYMD } = require("../utils/Istdate.utils");
require("dotenv").config();

// Fill these in before running - use the "uid" shown on the dashboard
// (e.g. "MGMT02", "ENG09"), not the Mongo _id.
const UIDS = ["MGMT02", "ENG02", "ENG01", "OPR01"];
const MONTH = 7;
const YEAR = 2026;

const findEmployeeByUid = async (uid) => {
  const user = await User.findOne({ uid }).select("_id uid name organisation_id date_of_joining createdAt").lean();
  if (user) return { role: "employee", employeeModel: "User", ...user };

  const manager = await Manager.findOne({ uid }).select("_id uid name organisation_id date_of_joining createdAt").lean();
  if (manager) return { role: "manager", employeeModel: "Manager", ...manager };

  const admin = await Admin.findOne({ uid }).select("_id uid name organisation_id date_of_joining createdAt").lean();
  if (admin) return { role: "admin", employeeModel: "Admin", ...admin };

  return null;
};

const run = async () => {
  const monthStart = istDateFromYMD(YEAR, MONTH, 1);
  const daysInMonth = new Date(Date.UTC(YEAR, MONTH, 0)).getUTCDate();
  const monthEnd = istDateFromYMD(YEAR, MONTH, daysInMonth);

  for (const uid of UIDS) {
    console.log(`\n================ ${uid} ================`);
    const emp = await findEmployeeByUid(uid);
    if (!emp) {
      console.log("  NOT FOUND - check the uid is correct");
      continue;
    }
    console.log(`  name: ${emp.name}, role: ${emp.role}, _id: ${emp._id}`);
    console.log(`  organisation_id: ${emp.organisation_id}`);
    console.log(`  date_of_joining: ${emp.date_of_joining || emp.createdAt}`);

    const policy = await HolidayPolicy.findOne({ organisation_id: emp.organisation_id }).lean();
    console.log(`  org HolidayPolicy.weekOffType: ${policy?.weekOffType || "(none - defaults to 'sunday')"}`);

    const override = await EmployeeWeekOffOverride.findOne({
      organisation_id: emp.organisation_id,
      employee: emp._id,
      employeeModel: emp.employeeModel,
      isActive: true,
    }).lean();
    console.log(`  EmployeeWeekOffOverride: ${override ? JSON.stringify(override) : "(none)"}`);

    const group = await WeekOffGroup.findOne({
      organisation_id: emp.organisation_id,
      isActive: true,
      members: { $elemMatch: { employee: emp._id, employeeModel: emp.employeeModel } },
    }).lean();
    console.log(`  WeekOffGroup: ${group ? `${group.name || group._id}` : "(none)"}`);

    const attendanceDocs = await Attendance.find({
      employee: emp._id,
      role: emp.role,
      date: { $gte: monthStart, $lte: monthEnd },
    }).select("date status source checkIn checkOut").sort({ date: 1 }).lean();

    console.log(`  Attendance records in ${MONTH}/${YEAR}: ${attendanceDocs.length}`);
    attendanceDocs.forEach((a) => {
      console.log(
        `    ${toISTKey(a.date)}  status=${a.status || "(no status/not checked out)"}  source=${a.source}  checkIn=${!!a.checkIn}  checkOut=${!!a.checkOut}`
      );
    });
  }
};

mongoose.connect(process.env.LINK)
  .then(async () => {
    await run();
    process.exit(0);
  })
  .catch((err) => {
    console.error("DB connection failed:", err.message);
    process.exit(1);
  });