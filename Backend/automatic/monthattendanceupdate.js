const AttendanceSummary = require("../Models/attendancesummary.model");


const calculateStatus = (activeMinutes) => {

  const hours = activeMinutes / 60;

  if (hours >= 5) {
    return "present";
  }

  if (hours >= 3.5) {
    return "half_day";
  }

  return "absent";
};



const updateSummary = async (attendance) => {

  const date = new Date(attendance.date);

  let summary = await AttendanceSummary.findOne({
    employee: attendance.employee,
    role: attendance.role,
    month: date.getMonth() + 1,
    year: date.getFullYear()
  });

  if (!summary) {

    summary = new AttendanceSummary({
      employee: attendance.employee,
      role: attendance.role,
      month: date.getMonth() + 1,
      year: date.getFullYear(),
      presentDays: 0
    });

  }

  if (attendance.status === "present") {
    summary.presentDays += 1;
  }

  if (attendance.status === "half_day") {
    summary.presentDays += 0.5;
  }

  await summary.save();
};


module.exports = {
  calculateStatus,
  updateSummary
};