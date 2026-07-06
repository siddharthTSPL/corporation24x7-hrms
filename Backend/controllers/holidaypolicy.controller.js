const HolidayPolicy = require("../Models/holidaypolicy.model");
const WeeklyOffSchedule = require("../Models/weeklyoffschedule.model");
const Holiday = require("../Models/holiday.model");
const EmployeeWeekOffOverride = require("../Models/employeeweekoffoverride.model");
const WeekOffGroup = require("../Models/weekoffgroup.model");
const { generateMonthlyReport } = require("../automatic/monthlyreport");
const { getWeekStart, getWeekEnd } = require("../automatic/weekoffcalendar");

// ---------- HolidayPolicy (org-wide mode: sunday / sat_sun / rotational) ----------

const getPolicy = async (req, res) => {
  const organisation_id = req.admin.organisation_id;
  const policy = await HolidayPolicy.findOne({ organisation_id }).lean();
  res.status(200).json({ success: true, policy: policy || { weekOffType: "sunday" } });
};

const setPolicy = async (req, res) => {
  const organisation_id = req.admin.organisation_id;
  const { weekOffType } = req.body;

  if (!["sunday", "sat_sun", "rotational"].includes(weekOffType))
    return res.status(400).json({ success: false, message: "Invalid weekOffType" });

  const policy = await HolidayPolicy.findOneAndUpdate(
    { organisation_id },
    {
      $set: {
        weekOffType,
        updatedBy: req.admin._id,
        updatedByModel: "Admin",
      },
    },
    { upsert: true, new: true }
  );

  res.status(200).json({ success: true, policy });
};

// ---------- WeeklyOffSchedule (mandatory, only relevant when policy = rotational) ----------

const setWeekSchedule = async (req, res) => {
  const organisation_id = req.admin.organisation_id;
  const { weekStartDate, offDays, group } = req.body;
  // group: omit or null -> default entry (applies to anyone not in a named group)
  //        <groupId>    -> applies only to members of that WeekOffGroup

  if (!weekStartDate || !Array.isArray(offDays) || offDays.length === 0)
    return res.status(400).json({ success: false, message: "weekStartDate and at least one offDay are required" });

  const normalisedStart = getWeekStart(new Date(weekStartDate));
  const normalisedEnd = getWeekEnd(normalisedStart);

  const schedule = await WeeklyOffSchedule.findOneAndUpdate(
    { organisation_id, weekStartDate: normalisedStart, group: group || null },
    {
      $set: {
        weekEndDate: normalisedEnd,
        offDays,
        setBy: req.admin._id,
        setByModel: "Admin",
      },
    },
    { upsert: true, new: true }
  );

  res.status(200).json({ success: true, schedule });
};

const bulkSetWeekSchedule = async (req, res) => {
  const organisation_id = req.admin.organisation_id;
  const { weeks } = req.body; // [{ weekStartDate, offDays, group? }, ...]

  if (!Array.isArray(weeks) || weeks.length === 0)
    return res.status(400).json({ success: false, message: "weeks array is required" });

  const ops = [];
  const rejected = [];

  for (const w of weeks) {
    if (!w.weekStartDate || !Array.isArray(w.offDays) || w.offDays.length === 0) {
      rejected.push({ ...w, reason: "weekStartDate and at least one offDay are required" });
      continue;
    }
    const normalisedStart = getWeekStart(new Date(w.weekStartDate));
    const normalisedEnd = getWeekEnd(normalisedStart);

    ops.push({
      updateOne: {
        filter: { organisation_id, weekStartDate: normalisedStart, group: w.group || null },
        update: {
          $set: {
            weekEndDate: normalisedEnd,
            offDays: w.offDays,
            setBy: req.admin._id,
            setByModel: "Admin",
          },
        },
        upsert: true,
      },
    });
  }

  const result = ops.length ? await WeeklyOffSchedule.bulkWrite(ops) : { upsertedCount: 0, modifiedCount: 0 };

  res.status(200).json({
    success: true,
    inserted: result.upsertedCount || 0,
    updated: result.modifiedCount || 0,
    rejected,
  });
};

const setWeekScheduleForMonth = async (req, res) => {
  const organisation_id = req.admin.organisation_id;
  const { month, year, offDays, group } = req.body;
  // Give month+year+offDays once -> every week that touches this month
  // gets the same offDays in one shot. Only meaningful for rotational
  // policy; sunday/sat_sun never need this since they apply forever
  // from a single PUT /policy call.

  if (!month || !year || !Array.isArray(offDays) || offDays.length === 0)
    return res.status(400).json({ success: false, message: "month, year and at least one offDay are required" });

  const monthStart = new Date(Number(year), Number(month) - 1, 1);
  const monthEnd = new Date(Number(year), Number(month), 0);

  const weekStarts = [];
  let cursor = getWeekStart(monthStart);
  while (cursor <= monthEnd) {
    weekStarts.push(new Date(cursor));
    cursor = new Date(cursor);
    cursor.setDate(cursor.getDate() + 7);
  }

  const ops = weekStarts.map((weekStartDate) => {
    const weekEndDate = getWeekEnd(weekStartDate);
    return {
      updateOne: {
        filter: { organisation_id, weekStartDate, group: group || null },
        update: {
          $set: {
            weekEndDate,
            offDays,
            setBy: req.admin._id,
            setByModel: "Admin",
          },
        },
        upsert: true,
      },
    };
  });

  const result = ops.length ? await WeeklyOffSchedule.bulkWrite(ops) : { upsertedCount: 0, modifiedCount: 0 };

  res.status(200).json({
    success: true,
    weeksSet: weekStarts.map((d) => d.toISOString().slice(0, 10)),
    inserted: result.upsertedCount || 0,
    updated: result.modifiedCount || 0,
  });
};

// ---------- WeekOffGroup (teams that can get different rotational off-days) ----------

const createGroup = async (req, res) => {
  const organisation_id = req.admin.organisation_id;
  const { name, members } = req.body; // members: [{ employee, employeeModel }]

  if (!name)
    return res.status(400).json({ success: false, message: "name is required" });

  const group = await WeekOffGroup.findOneAndUpdate(
    { organisation_id, name },
    {
      $set: {
        members: members || [],
        isActive: true,
        createdBy: req.admin._id,
        createdByModel: "Admin",
      },
    },
    { upsert: true, new: true }
  );

  res.status(200).json({ success: true, group });
};

const addGroupMembers = async (req, res) => {
  const organisation_id = req.admin.organisation_id;
  const { groupId } = req.params;
  const { members } = req.body; // [{ employee, employeeModel }]

  if (!Array.isArray(members) || members.length === 0)
    return res.status(400).json({ success: false, message: "members array is required" });

  const group = await WeekOffGroup.findOneAndUpdate(
    { _id: groupId, organisation_id },
    { $addToSet: { members: { $each: members } } },
    { new: true }
  );

  if (!group) return res.status(404).json({ success: false, message: "Group not found" });

  res.status(200).json({ success: true, group });
};

const removeGroupMember = async (req, res) => {
  const organisation_id = req.admin.organisation_id;
  const { groupId, employee } = req.params;

  const group = await WeekOffGroup.findOneAndUpdate(
    { _id: groupId, organisation_id },
    { $pull: { members: { employee } } },
    { new: true }
  );

  if (!group) return res.status(404).json({ success: false, message: "Group not found" });

  res.status(200).json({ success: true, group });
};

const listGroups = async (req, res) => {
  const organisation_id = req.admin.organisation_id;
  const groups = await WeekOffGroup.find({ organisation_id, isActive: true }).lean();
  res.status(200).json({ success: true, groups });
};

const getWeekSchedules = async (req, res) => {
  const organisation_id = req.admin.organisation_id;
  const { month, year } = req.query;

  if (!month || !year)
    return res.status(400).json({ success: false, message: "month and year are required" });

  const monthStart = new Date(Number(year), Number(month) - 1, 1);
  const monthEnd = new Date(Number(year), Number(month), 0);

  const schedules = await WeeklyOffSchedule.find({
    organisation_id,
    weekStartDate: { $lte: monthEnd },
    weekEndDate: { $gte: monthStart },
  })
    .sort({ weekStartDate: 1 })
    .lean();

  res.status(200).json({ success: true, schedules });
};

// ---------- Holiday calendar (admin managed, per date) ----------

const addHoliday = async (req, res) => {
  const organisation_id = req.admin.organisation_id;
  const { date, name } = req.body;

  if (!date || !name)
    return res.status(400).json({ success: false, message: "date and name are required" });

  const normalisedDate = new Date(date);
  normalisedDate.setHours(0, 0, 0, 0);

  const holiday = await Holiday.findOneAndUpdate(
    { organisation_id, date: normalisedDate },
    { $set: { name, createdBy: req.admin._id, createdByModel: "Admin" } },
    { upsert: true, new: true }
  );

  res.status(200).json({ success: true, holiday });
};

const bulkAddHolidays = async (req, res) => {
  const organisation_id = req.admin.organisation_id;
  const { holidays } = req.body; // [{ date, name }, ...]

  if (!Array.isArray(holidays) || holidays.length === 0)
    return res.status(400).json({ success: false, message: "holidays array is required" });

  const ops = [];
  const rejected = [];

  for (const h of holidays) {
    if (!h.date || !h.name) {
      rejected.push({ ...h, reason: "date and name are required" });
      continue;
    }
    const normalisedDate = new Date(h.date);
    if (isNaN(normalisedDate.getTime())) {
      rejected.push({ ...h, reason: "invalid date" });
      continue;
    }
    normalisedDate.setHours(0, 0, 0, 0);

    ops.push({
      updateOne: {
        filter: { organisation_id, date: normalisedDate },
        update: {
          $set: {
            name: h.name,
            createdBy: req.admin._id,
            createdByModel: "Admin",
          },
        },
        upsert: true,
      },
    });
  }

  const result = ops.length ? await Holiday.bulkWrite(ops) : { upsertedCount: 0, modifiedCount: 0 };

  res.status(200).json({
    success: true,
    inserted: result.upsertedCount || 0,
    updated: result.modifiedCount || 0,
    rejected,
  });
};

const bulkEditHolidays = async (req, res) => {
  const organisation_id = req.admin.organisation_id;
  const { holidays } = req.body; // [{ id, date?, name? }, ...] - id required, date/name optional (only sent fields change)

  if (!Array.isArray(holidays) || holidays.length === 0)
    return res.status(400).json({ success: false, message: "holidays array is required" });

  const ops = [];
  const rejected = [];

  for (const h of holidays) {
    if (!h.id) {
      rejected.push({ ...h, reason: "id is required for edit" });
      continue;
    }
    if (!h.date && !h.name) {
      rejected.push({ ...h, reason: "nothing to update, provide date and/or name" });
      continue;
    }

    const setFields = {};
    if (h.name) setFields.name = h.name;
    if (h.date) {
      const normalisedDate = new Date(h.date);
      if (isNaN(normalisedDate.getTime())) {
        rejected.push({ ...h, reason: "invalid date" });
        continue;
      }
      normalisedDate.setHours(0, 0, 0, 0);
      setFields.date = normalisedDate;
    }

    ops.push({
      updateOne: {
        filter: { _id: h.id, organisation_id },
        update: { $set: setFields },
      },
    });
  }

  const result = ops.length ? await Holiday.bulkWrite(ops) : { matchedCount: 0, modifiedCount: 0 };

  res.status(200).json({
    success: true,
    matched: result.matchedCount || 0,
    updated: result.modifiedCount || 0,
    rejected,
  });
};

const bulkDeleteHolidays = async (req, res) => {
  const organisation_id = req.admin.organisation_id;
  const { ids, dates } = req.body;
  // give either ids: [...] or dates: [...] (or both)

  if ((!Array.isArray(ids) || ids.length === 0) && (!Array.isArray(dates) || dates.length === 0))
    return res.status(400).json({ success: false, message: "ids or dates array is required" });

  const filter = { organisation_id, $or: [] };
  if (Array.isArray(ids) && ids.length) filter.$or.push({ _id: { $in: ids } });
  if (Array.isArray(dates) && dates.length) {
    const normalisedDates = dates.map((d) => {
      const nd = new Date(d);
      nd.setHours(0, 0, 0, 0);
      return nd;
    });
    filter.$or.push({ date: { $in: normalisedDates } });
  }

  const result = await Holiday.deleteMany(filter);

  res.status(200).json({ success: true, deletedCount: result.deletedCount || 0 });
};

const deleteHoliday = async (req, res) => {
  const organisation_id = req.admin.organisation_id;
  const { id } = req.params;

  await Holiday.findOneAndDelete({ _id: id, organisation_id });
  res.status(200).json({ success: true, message: "Holiday removed" });
};

const listHolidays = async (req, res) => {
  const organisation_id = req.admin.organisation_id;
  const { month, year } = req.query;

  const filter = { organisation_id };
  if (month && year) {
    filter.date = {
      $gte: new Date(Number(year), Number(month) - 1, 1),
      $lte: new Date(Number(year), Number(month), 0),
    };
  }

  const holidays = await Holiday.find(filter).sort({ date: 1 }).lean();
  res.status(200).json({ success: true, holidays });
};

// ---------- Individual employee override ----------

const setEmployeeOverride = async (req, res) => {
  const organisation_id = req.admin.organisation_id;
  const { employee, employeeModel, weekOffType, fixedOffDays } = req.body;

  if (!employee || !employeeModel || !weekOffType)
    return res.status(400).json({ success: false, message: "employee, employeeModel and weekOffType are required" });

  const override = await EmployeeWeekOffOverride.findOneAndUpdate(
    { organisation_id, employee },
    {
      $set: {
        employeeModel,
        weekOffType,
        fixedOffDays: weekOffType === "custom_fixed_days" ? fixedOffDays : undefined,
        isActive: true,
        setBy: req.admin._id,
        setByModel: "Admin",
      },
    },
    { upsert: true, new: true }
  );

  res.status(200).json({ success: true, override });
};

const removeEmployeeOverride = async (req, res) => {
  const organisation_id = req.admin.organisation_id;
  const { employee } = req.params;

  await EmployeeWeekOffOverride.findOneAndUpdate(
    { organisation_id, employee },
    { $set: { isActive: false } }
  );

  res.status(200).json({ success: true, message: "Override removed, employee now follows org policy" });
};

// ---------- Monthly report ----------

const getEmployeeMonthlyReport = async (req, res) => {
  const organisation_id = req.admin.organisation_id;
  const { employee, role, month, year } = req.query;

  if (!employee || !role || !month || !year)
    return res.status(400).json({ success: false, message: "employee, role, month and year are required" });

  const report = await generateMonthlyReport({
    organisation_id,
    employee,
    role,
    month: Number(month),
    year: Number(year),
  });

  res.status(200).json({ success: true, report });
};

module.exports = {
  getPolicy,
  setPolicy,
  setWeekSchedule,
  bulkSetWeekSchedule,
  setWeekScheduleForMonth,
  getWeekSchedules,
  createGroup,
  addGroupMembers,
  removeGroupMember,
  listGroups,
  addHoliday,
  bulkAddHolidays,
  bulkEditHolidays,
  bulkDeleteHolidays,
  deleteHoliday,
  listHolidays,
  setEmployeeOverride,
  removeEmployeeOverride,
  getEmployeeMonthlyReport,
};
