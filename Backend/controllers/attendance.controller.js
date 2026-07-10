const Attendance = require("../Models/attendance.model");
const AdminModel = require("../Models/Admin.model");
const Shift = require("../Models/shift.model");
const { calculateStatus, updateSummary } = require("../automatic/monthattendanceupdate");
const { resolveEmployeeShift, evaluateCheckinWindow, evaluateCheckoutWindow, getShiftThresholds, getForceCheckoutInstant } = require("../utils/shift.utils");
const { isHoliday, isWeekOff, startOfDay } = require("../automatic/weekoffcalendar");

const getUserId = (user) => user._id || user.id;

const getOnModel = (role) => {
  if (role === "manager") return "Manager";
  if (role === "admin") return "Admin";
  if (role === "employee") return "User";
  return "User";
};

const resolveOrganisationId = async (user) => {
  if (user.organisation_id) return user.organisation_id;
  if (user.role === "admin") {
    const admin = await AdminModel.findById(getUserId(user)).select("organisation_id").lean();
    return admin?.organisation_id || null;
  }
  return null;
};

const displayMinutes = (mins) => Math.round(mins || 0);

const checkin = async (req, res) => {
  try {
    const { latitude, longitude, selfie } = req.body;
    const user = req.user;
    const userId = getUserId(user);
    const organisation_id = await resolveOrganisationId(user);

    if (!latitude || !longitude)
      return res.status(400).json({ message: "Location required" });

    const employeeModel = getOnModel(user.role);
    const today0 = startOfDay(new Date());

    const holidayCheck = await isHoliday(today0, organisation_id);
    if (holidayCheck.isHoliday) {
      return res.status(400).json({
        message: `Today is a holiday (${holidayCheck.name}). Check-in is disabled.`,
        reason: "holiday",
        holidayName: holidayCheck.name,
      });
    }

    const weekOffCheck = await isWeekOff(today0, organisation_id, userId, employeeModel);
    if (weekOffCheck.isOff) {
      return res.status(400).json({
        message: "Today is your week off. Check-in is disabled.",
        reason: "weekoff",
      });
    }

    const shift = await resolveEmployeeShift(user, organisation_id);
    const { allowed, isLate, tooLate } = evaluateCheckinWindow(shift, new Date());

    if (!allowed) {
      if (tooLate) {
        return res.status(400).json({
          message: `Not allowed — you are too late. Check-in for ${shift.name} closes ${shift.lateCheckinCutoffMinutes ?? 60} minute(s) after shift start (${shift.startTime}).`,
          reason: "too_late",
          shift: { name: shift.name, startTime: shift.startTime, endTime: shift.endTime },
        });
      }
      return res.status(400).json({
        message: `Check-in opens ${shift.earlyBufferMinutes ?? 60} minute(s) before your shift (${shift.startTime}).`,
        reason: "too_early",
        shift: { name: shift.name, startTime: shift.startTime, endTime: shift.endTime },
      });
    }

    const today = startOfDay(new Date()); // IST-based day boundary (see automatic/weekoffcalendar.js)

    const attendance = await Attendance.findOne({ employee: userId, role: user.role, date: today, organisation_id });

    if (attendance) {
      if (attendance.checkOut)
        return res.status(400).json({ message: "You have already completed your attendance for today.", alreadyDone: true });
      if (attendance.source === "agent") {
        attendance.latitude = latitude;
        attendance.longitude = longitude;
        attendance.selfie = selfie || attendance.selfie;
        attendance.checkIn = new Date();
        attendance.source = "manual";
        attendance.onModel = getOnModel(user.role);
        attendance.shift = shift._id;
        attendance.isLate = isLate;
        attendance.activeMinutes = 0;
        attendance.idleMinutes = 0;
        attendance.lastUpdated = Date.now();
        await attendance.save();
        return res.json({ message: "Check-in successful", attendance, isLate });
      }
      // One channel per day: whichever system checked you in owns the
      // whole day, including checkout. The other channel must not act on
      // this record - it should only report who already checked you in.
      if (attendance.source === "face") {
        return res.status(400).json({
          message: "Already checked in by Face Attendance. Please use Face Attendance to check out too.",
          reason: "checked_in_by_face",
        });
      }
      return res.status(400).json({
        message: "Already checked in by System. Please check out from here as well.",
        reason: "checked_in_by_system",
      });
    }

    const newAttendance = await Attendance.create({
      organisation_id,
      employee: userId,
      onModel: getOnModel(user.role),
      role: user.role,
      date: today,
      checkIn: new Date(),
      latitude,
      longitude,
      selfie,
      shift: shift._id,
      isLate,
      activeMinutes: 0,
      idleMinutes: 0,
      lastUpdated: Date.now(),
      source: "manual",
    });

    res.json({ message: "Check-in successful", attendance: newAttendance, isLate });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const activity = async (req, res) => {
  try {
    const { status } = req.body;
    const user = req.user;
    const userId = getUserId(user);
    const organisation_id = await resolveOrganisationId(user);

    if (!["active", "idle"].includes(status))
      return res.status(400).json({ message: "Invalid status" });

    const today = startOfDay(new Date()); // IST-based day boundary (see automatic/weekoffcalendar.js)

    let attendance = await Attendance.findOne({ employee: userId, role: user.role, date: today, organisation_id });

    if (!attendance) {
      const shift = await resolveEmployeeShift(user, organisation_id);
      attendance = await Attendance.create({
        organisation_id,
        employee: userId,
        onModel: getOnModel(user.role),
        role: user.role,
        date: today,
        checkIn: new Date(),
        shift: shift._id,
        activeMinutes: 0,
        idleMinutes: 0,
        lastUpdated: Date.now(),
        source: "agent",
      });
      return res.json({ message: "Activity started", activeMinutes: 0, idleMinutes: 0 });
    }

    if (attendance.checkOut)
      return res.status(400).json({ message: "Already checked out" });

    const now = Date.now();
    const elapsedMs = now - (attendance.lastUpdated || now);
    const elapsedMinutes = Math.min(elapsedMs / 60000, 3);

    if (attendance.source === "manual") {
      if (status === "active") attendance.activeMinutes += elapsedMinutes;
      else attendance.idleMinutes += elapsedMinutes;
    }

    attendance.lastUpdated = now;
    await attendance.save();

    res.json({
      message: "Activity updated",
      activeMinutes: displayMinutes(attendance.activeMinutes),
      idleMinutes: displayMinutes(attendance.idleMinutes),
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const checkout = async (req, res) => {
  try {
    const user = req.user;
    const userId = getUserId(user);
    const organisation_id = await resolveOrganisationId(user);

    const today = startOfDay(new Date()); // IST-based day boundary (see automatic/weekoffcalendar.js)

    const attendance = await Attendance.findOne({ employee: userId, role: user.role, date: today, organisation_id });

    if (!attendance)
      return res.status(404).json({ message: "Please check in first" });
    if (attendance.source === "agent")
      return res.status(400).json({ message: "Please check in first before checking out" });
    if (attendance.source === "face")
      return res.status(400).json({
        message: "You checked in via Face Attendance. Please use Face Attendance to check out too.",
        reason: "checked_in_by_face",
      });
    if (attendance.checkOut)
      return res.status(400).json({ message: "Already checked out" });

    // Use the shift stamped at checkin so a later shift change doesn't
    // retroactively alter today's thresholds; fall back if it's missing
    // (e.g. old records created before this feature existed).
    const shiftDoc = attendance.shift
      ? await Shift.findById(attendance.shift).lean()
      : await resolveEmployeeShift(user, organisation_id);
    const thresholds = getShiftThresholds(shiftDoc);

    const now = new Date();
    const checkoutWindow = evaluateCheckoutWindow(shiftDoc, now, attendance.checkIn);

    if (!checkoutWindow.allowed) {
      return res.status(400).json({
        message: `You're already checked in for today. Checkout opens in ${checkoutWindow.minutesUntilCheckoutOpens} minute(s).`,
        reason: "checkin_already_done",
        minutesUntilCheckoutOpens: checkoutWindow.minutesUntilCheckoutOpens,
      });
    }

    attendance.checkOut = now;
    const status = calculateStatus(attendance.activeMinutes, thresholds);
    const { remark, isOvertime, overtimeMinutes } = checkoutWindow;
    attendance.status = status;
    attendance.checkoutRemark = remark;
    attendance.overtimeMinutes = isOvertime ? overtimeMinutes : 0;
    await attendance.save();
    await updateSummary(attendance);

    const message =
      remark === "auto_overtime"
        ? `You are automatically checked out because you are overtime more than ${Math.floor((shiftDoc.maxOvertimeMinutes ?? 60) / 60)} hour(s).`
        : "Checkout successful";

    res.json({
      message,
      status,
      checkoutRemark: remark,
      overtimeMinutes: attendance.overtimeMinutes,
      activeMinutes: displayMinutes(attendance.activeMinutes),
      idleMinutes: displayMinutes(attendance.idleMinutes),
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const getToday = async (req, res) => {
  try {
    const user = req.user;
    const userId = getUserId(user);
    const organisation_id = await resolveOrganisationId(user);

    const today = startOfDay(new Date()); // IST-based day boundary (see automatic/weekoffcalendar.js)

    const attendance = await Attendance.findOne({ employee: userId, role: user.role, date: today, organisation_id }).lean();

    if (!attendance)
      return res.json({ attendance: null, isCheckedIn: false, isCheckedOut: false });

    res.json({
      attendance: {
        ...attendance,
        activeMinutes: displayMinutes(attendance.activeMinutes),
        idleMinutes: displayMinutes(attendance.idleMinutes),
      },
      isCheckedIn: attendance.source === "manual" && !attendance.checkOut,
      isCheckedOut: !!attendance.checkOut,
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Runs frequently (every 5 min, see automatic/autoelcredit.js) rather than
// once a day, because "shift end + maxOvertimeMinutes" is a different
// clock time for every shift - a single fixed daily run can't catch a
// shift that ends at 9 PM if it only runs at 7 PM.
//
// Deliberately NOT scoped to `date: today` - an overnight shift's record
// may still be dated "yesterday" (IST) when its overtime cutoff arrives.
// Deliberately excludes source "agent": an agent-only ping was never a
// real, window-validated check-in and must not be auto-completed as a
// full attendance day (see faceattendance.controller.js).
const autoCheckoutAll = async () => {
  try {
    const openSessions = await Attendance.find({
      source: { $in: ["manual", "face"] },
      checkIn: { $exists: true },
      checkOut: { $exists: false },
    }).select("_id activeMinutes organisation_id shift employee role date checkIn").lean();

    if (!openSessions.length) return;

    const shiftCache = new Map();
    const getShiftFor = async (session) => {
      if (session.shift) {
        if (!shiftCache.has(String(session.shift))) {
          const shift = await Shift.findById(session.shift).lean();
          shiftCache.set(String(session.shift), shift);
        }
        return shiftCache.get(String(session.shift));
      }
      return resolveEmployeeShift({}, session.organisation_id);
    };

    const now = new Date();
    const ops = [];
    const summaryPayloads = [];

    for (const a of openSessions) {
      const shift = await getShiftFor(a);
      if (!shift) continue;

      const forceCheckoutAt = getForceCheckoutInstant(shift, a.date);
      if (now < forceCheckoutAt) continue; // overtime cutoff not reached yet

      const thresholds = getShiftThresholds(shift);
      const status = calculateStatus(a.activeMinutes, thresholds);
      const checkoutWindow = evaluateCheckoutWindow(shift, forceCheckoutAt, a.checkIn);

      ops.push({
        updateOne: {
          filter: { _id: a._id, organisation_id: a.organisation_id, checkOut: { $exists: false } },
          update: {
            $set: {
              checkOut: forceCheckoutAt,
              status,
              checkoutRemark: "auto_overtime",
              overtimeMinutes: checkoutWindow.overtimeMinutes ?? 0,
              autoCheckedOut: true,
            },
          },
        },
      });
      summaryPayloads.push({ ...a, checkOut: forceCheckoutAt, status });
    }

    if (!ops.length) return;

    await Attendance.bulkWrite(ops, { ordered: false });
    await Promise.all(summaryPayloads.map((a) => updateSummary(a)));
  } catch (error) {
    console.error("[Cron] Auto checkout failed:", error.message);
  }
};

const getMyShift = async (req, res) => {
  try {
    const user = req.user;
    const organisation_id = await resolveOrganisationId(user);
    const shift = await resolveEmployeeShift(user, organisation_id);

    res.json({
      shift: {
        name: shift.name,
        startTime: shift.startTime,
        endTime: shift.endTime,
        graceMinutes: shift.graceMinutes ?? 15,
        earlyBufferMinutes: shift.earlyBufferMinutes ?? 60,
      },
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Returns holiday list + week-off dates for a given month, plus a rich
// "today" block combining holiday / week-off / shift-window so the
// frontend can grey out Check-in proactively instead of waiting for a
// 400 from /checkin.
const getCalendarMeta = async (req, res) => {
  try {
    const user = req.user;
    const userId = getUserId(user);
    const organisation_id = await resolveOrganisationId(user);
    const employeeModel = getOnModel(user.role);

    const now = new Date();
    const month = req.query.month ? Number(req.query.month) : now.getMonth() + 1; // 1-12
    const year = req.query.year ? Number(req.query.year) : now.getFullYear();

    const monthStart = new Date(year, month - 1, 1);
    const monthEnd = new Date(year, month, 0);

    // Only look as far into the month as today, plus the rest of the
    // month for holidays (holidays are known in advance; week-off status
    // for far-future rotational weeks may be "unconfigured" and that's fine).
    const Holiday = require("../Models/holiday.model");
    const holidayDocs = await Holiday.find({
      organisation_id,
      date: { $gte: monthStart, $lte: monthEnd },
    }).sort({ date: 1 }).lean();

    // BUG FIX: this used to be `new Date(d).toISOString().slice(0, 10)`,
    // which formats in UTC. Holiday/shift dates in this codebase are all
    // stored and constructed using LOCAL (server) midnight - e.g.
    // `new Date(year, month - 1, day)` or `date.setHours(0, 0, 0, 0)`.
    // Converting one of those to an ISO string and slicing rolls the date
    // back by one day whenever the server's local timezone is ahead of
    // UTC (e.g. IST, UTC+5:30), because UTC midnight of that instant falls
    // on the *previous* calendar day. Reading the LOCAL Y/M/D components
    // instead keeps the key matching the calendar day everyone intended,
    // regardless of what timezone the server happens to run in.
    const pad2 = (n) => String(n).padStart(2, "0");
    const toKey = (d) => {
      const dt = new Date(d);
      return `${dt.getFullYear()}-${pad2(dt.getMonth() + 1)}-${pad2(dt.getDate())}`;
    };

    const holidays = holidayDocs.map((h) => ({ date: toKey(h.date), name: h.name }));

    const weekOffDates = [];
    const daysInMonth = monthEnd.getDate();
    for (let d = 1; d <= daysInMonth; d++) {
      const date = new Date(year, month - 1, d);
      const result = await isWeekOff(date, organisation_id, userId, employeeModel);
      // Build the key directly from the loop's own year/month/d instead of
      // re-deriving it from `date` - this sidesteps any Date serialization
      // entirely for this one, since we already know exactly which
      // calendar day we're evaluating.
      if (result.isOff) weekOffDates.push(`${year}-${pad2(month)}-${pad2(d)}`);
    }

    // ---- Today block ----
    const today0 = startOfDay(now);
    const todayKey = toKey(today0);
    const todayHoliday = await isHoliday(today0, organisation_id);
    const todayWeekOff = await isWeekOff(today0, organisation_id, userId, employeeModel);
    const shift = await resolveEmployeeShift(user, organisation_id);
    const { allowed: withinShiftWindow, tooLate: checkinTooLate } = evaluateCheckinWindow(shift, now);

    // Cross-channel check: if Face Attendance already checked this person
    // in (and they haven't checked out), the System channel must not
    // offer a fresh check-in - it should say who already did it. A
    // "manual"-source record isn't blocked here since that's the normal
    // "already checked in, show checkout" state handled elsewhere by
    // isCheckedIn/isCheckedOut - this is specifically the cross-channel case.
    const todayAttendance = await Attendance.findOne({
      employee: userId,
      role: user.role,
      date: today0,
      organisation_id,
    }).select("source checkOut checkIn").lean();
    const checkedInByFace = todayAttendance?.source === "face" && !todayAttendance?.checkOut;

    let disabledReason = null;
    if (todayHoliday.isHoliday) disabledReason = "holiday";
    else if (todayWeekOff.isOff) disabledReason = "weekoff";
    else if (checkedInByFace) disabledReason = "checked_in_by_face";
    else if (!withinShiftWindow) disabledReason = checkinTooLate ? "too_late" : "too_early";

    res.json({
      success: true,
      holidays,
      weekOffDates,
      today: {
        date: todayKey,
        isHoliday: todayHoliday.isHoliday,
        holidayName: todayHoliday.name || null,
        isWeekOff: todayWeekOff.isOff,
        weekOffReason: todayWeekOff.reason,
        shift: {
          name: shift.name,
          startTime: shift.startTime,
          endTime: shift.endTime,
          earlyBufferMinutes: shift.earlyBufferMinutes ?? 60,
        },
        withinShiftWindow,
        canCheckIn: !todayHoliday.isHoliday && !todayWeekOff.isOff && !checkedInByFace && withinShiftWindow,
        disabledReason,
        checkedInByFace,
        faceCheckInTime: checkedInByFace ? todayAttendance.checkIn : null,
      },
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

module.exports = { checkin, activity, checkout, getToday, autoCheckoutAll, getMyShift, getCalendarMeta };