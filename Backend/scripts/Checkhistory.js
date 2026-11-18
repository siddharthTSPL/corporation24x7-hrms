const mongoose = require("mongoose");
require("dotenv").config();
const Attendance = require("../Models/attendance.model");
const User = require("../Models/user.model");
const { fillHistoryGaps } = require("../utils/attendanceHistoryFill.utils");
const { istDateFromYMD, toISTKey } = require("../utils/Istdate.utils");

const [employeeId, from, to] = process.argv.slice(2);

const run = async () => {
  if (!employeeId || !from || !to) return console.log("Usage: node scripts/Checkhistory.js <employeeId> <YYYY-MM-DD> <YYYY-MM-DD>");
  const p = (s) => s.split("-").map(Number);
  const rangeStart = istDateFromYMD(...p(from));
  const rangeEnd = istDateFromYMD(...p(to));
  const u = await User.findById(employeeId).select("organisation_id f_name").lean();
  const records = await Attendance.find({ employee: employeeId, date: { $gte: rangeStart, $lte: rangeEnd } }).select("date checkIn checkOut source status").lean();
  const rows = records.map((r) => ({ id: String(r._id), date: r.date, checkIn: r.checkIn || null, checkOut: r.checkOut || null, source: r.source, status: r.status || "absent" }));
  const out = await fillHistoryGaps({ organisation_id: u.organisation_id, personId: u._id, roleKey: "employee", rows, rangeStart, rangeEnd });
  console.log(`\n== ${u.f_name} ==`);
  console.table(out.map((r) => ({ date: toISTKey(r.date), status: r.status, source: r.source, leaveType: r.leaveType || "", holiday: r.holidayName || "", tsPercent: r.timesheetPercent || "" })));
};

mongoose.connect(process.env.LINK).then(run).then(() => process.exit(0)).catch((e) => { console.error(e.message); process.exit(1); });