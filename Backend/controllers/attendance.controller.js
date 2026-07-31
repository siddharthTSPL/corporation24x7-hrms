const Attendance = require("../Models/attendance.model");
const AdminModel = require("../Models/Admin.model");
const Shift = require("../Models/shift.model");
const { calculateStatus, updateSummary } = require("../automatic/monthattendanceupdate");
const { resolveEmployeeShift, evaluateCheckinWindow, evaluateCheckoutWindow, getShiftThresholds, getForceCheckoutInstant } = require("../utils/shift.utils");
const { isHoliday, isWeekOff, startOfDay, getWeekOffMapForRange } = require("../automatic/weekoffcalendar");
const { getISTDateParts, istDateFromYMD, toISTKey } = require("../utils/Istdate.utils");

const getUserId = (user) => user._id || user.id;

// Anything worse than this (metres) is essentially never a real GPS fix -
// it's a WiFi/cell/IP-based estimate, which is what causes check-ins to
// land in the wrong city. Reject those rather than silently storing them.
const MAX_ACCEPTABLE_ACCURACY_M = 1500;

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
    const { latitude, longitude, accuracy, selfie } = req.body;
    const user = req.user;
    const userId = getUserId(user);
    const organisation_id = await resolveOrganisationId(user);

    if (!latitude || !longitude)
      return res.status(400).json({ message: "Location required" });

    if (accuracy !== undefined && accuracy !== null && Number(accuracy) > MAX_ACCEPTABLE_ACCURACY_M) {
      return res.status(400).json({
        message: `Location isn't accurate enough (±${Math.round(Number(accuracy))}m). Turn on precise/GPS location and disable any VPN, then try again.`,
        reason: "inaccurate_location",
      });
    }

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
    const { allowed, isLate, lateMinutes, tooLate } = evaluateCheckinWindow(shift, new Date());

    // Same "outside_shift" window as Face Attendance and getCalendarMeta:
    // more than earlyBufferMinutes before shift start, OR more than
    // lateCheckinCutoffMinutes after shift end.
    if (!allowed) {
      return res.status(400).json({
        message: `Outside Shift. Check-in opens ${shift.earlyBufferMinutes ?? 60} minute(s) before your shift (${shift.startTime}).`,
        reason: "outside_shift",
        shift: { name: shift.name, startTime: shift.startTime, endTime: shift.endTime },
      });
    }

    if (tooLate) {
      const lateCutoff = shift.lateCheckinCutoffMinutes ?? 60;
      return res.status(400).json({
        message: `Outside Shift. Your check-in window for ${shift.name} (${shift.startTime} – ${shift.endTime}) closed ${lateCutoff} minute(s) after shift end. Please contact your admin/manager.`,
        reason: "outside_shift",
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
        attendance.accuracy = accuracy;
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

    let newAttendance;
    try {
      newAttendance = await Attendance.create({
        organisation_id,
        employee: userId,
        onModel: getOnModel(user.role),
        role: user.role,
        date: today,
        checkIn: new Date(),
        latitude,
        longitude,
        accuracy,
        selfie,
        shift: shift._id,
        isLate,
        activeMinutes: 0,
        idleMinutes: 0,
        lastUpdated: Date.now(),
        source: "manual",
      });
    } catch (createErr) {
      // Another request (e.g. the desktop agent's ping) created today's
      // record in the tiny window between our findOne above and this
      // create() - re-fetch instead of failing the check-in.
      if (createErr.code === 11000) {
        newAttendance = await Attendance.findOne({ employee: userId, role: user.role, date: today, organisation_id });
      } else {
        throw createErr;
      }
    }

    const message = isLate
      ? `You are a bit late (by ${Math.round(lateMinutes)} min), but welcome! Check-in successful.`
      : "Check-in successful";
    res.json({ message, attendance: newAttendance, isLate, lateMinutes });
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
      // A background agent ping on a holiday/week-off must NOT create an
      // Attendance stub. Unlike checkin(), this endpoint has no user-facing
      // error to return for - it just silently no-ops. Without this guard,
      // the laptop being on in the background on an off-day creates a
      // source:"agent" record that never gets checked out (autoCheckoutAll
      // deliberately excludes source "agent"), which then permanently
      // blocks markNoShowAbsences()'s no-show sweep for that date (it skips
      // any date that already has ANY Attendance record) - the day ends up
      // uncounted anywhere: not present, not absent, not weekOffHolidayDays.
      const holidayCheck = await isHoliday(today, organisation_id);
      const weekOffCheck = holidayCheck.isHoliday
        ? null
        : await isWeekOff(today, organisation_id, userId, getOnModel(user.role));
      if (holidayCheck.isHoliday || weekOffCheck?.isOff) {
        return res.json({ message: "Off day - activity not tracked", activeMinutes: 0, idleMinutes: 0 });
      }

      const shift = await resolveEmployeeShift(user, organisation_id);
      try {
        attendance = await Attendance.create({
          organisation_id,
          employee: userId,
          onModel: getOnModel(user.role),
          role: user.role,
          date: today,
          // Deliberately NOT setting checkIn here - an agent ping is just
          // background activity tracking, not a real check-in. Leaving
          // checkIn unset means anything reading `attendance.checkIn` (or
          // `!!attendance.checkIn`) is naturally correct on its own,
          // without every consumer having to remember to also check
          // `source !== "agent"`. checkIn only gets set for real when a
          // manual/face check-in upgrades this record (see checkin()
          // above and scanFace() in faceattendance.controller.js).
          shift: shift._id,
          activeMinutes: 0,
          idleMinutes: 0,
          lastUpdated: Date.now(),
          source: "agent",
        });
      } catch (createErr) {
        if (createErr.code === 11000) {
          // Someone else (manual/face check-in) created today's record a
          // moment ago - fine, today already has a real record; nothing
          // for this background ping to do.
          return res.json({ message: "Activity started", activeMinutes: 0, idleMinutes: 0 });
        }
        throw createErr;
      }
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
    // activeMinutes only grows via periodic /activity heartbeat pings (see
    // activity() above). If that heartbeat never fired during this session
    // (e.g. checked in/out without the tracker running), activeMinutes sits
    // at 0 even though the person was genuinely checked in for hours -
    // calculateStatus would then wrongly call a real session "absent".
    // Fall back to the raw checkIn->checkOut duration in that case; if any
    // real heartbeat data exists, keep trusting it as-is.
    const elapsedSessionMinutes = attendance.checkIn
      ? (now.getTime() - new Date(attendance.checkIn).getTime()) / 60000
      : 0;
    const effectiveActiveMinutes =
      attendance.activeMinutes > 0 ? attendance.activeMinutes : elapsedSessionMinutes;
    const status = calculateStatus(effectiveActiveMinutes, thresholds);
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
      isCheckedIn: !attendance.checkOut && !!attendance.checkIn && attendance.source !== "agent",
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
      // Same fallback as checkout() above: if activeMinutes never got any
      // heartbeat data (still 0), use the raw checkIn->cutoff duration
      // instead of auto-marking a genuine multi-hour session "absent".
      const elapsedSessionMinutes = a.checkIn
        ? (forceCheckoutAt.getTime() - new Date(a.checkIn).getTime()) / 60000
        : 0;
      const effectiveActiveMinutes = a.activeMinutes > 0 ? a.activeMinutes : elapsedSessionMinutes;
      const status = calculateStatus(effectiveActiveMinutes, thresholds);
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
    // Default month/year must reflect the IST calendar day, not whatever
    // the server process's OS timezone happens to be (see Istdate.utils.js).
    const nowIST = getISTDateParts(now);
    const month = req.query.month ? Number(req.query.month) : nowIST.month; // 1-12
    const year = req.query.year ? Number(req.query.year) : nowIST.year;

    // Days in month is pure UTC calendar arithmetic (Date.UTC/getUTCDate),
    // not timezone-sensitive, so this is safe as-is.
    const daysInMonth = new Date(Date.UTC(year, month, 0)).getUTCDate();
    const monthStart = istDateFromYMD(year, month, 1);
    const monthEnd = istDateFromYMD(year, month, daysInMonth);

    // Only look as far into the month as today, plus the rest of the
    // month for holidays (holidays are known in advance; week-off status
    // for far-future rotational weeks may be "unconfigured" and that's fine).
    const Holiday = require("../Models/holiday.model");
    const holidayDocs = await Holiday.find({
      organisation_id,
      date: { $gte: monthStart, $lte: monthEnd },
    }).sort({ date: 1 }).lean();

    // toKey used to read dt.getFullYear()/getMonth()/getDate() directly -
    // those are LOCAL (server-process-timezone) getters. On a host running
    // UTC, a `date` field stored as IST-midnight (e.g. the UTC instant
    // "2026-07-14T18:30:00Z", which IS calendar day 2026-07-15 in IST)
    // reads back as "2026-07-14" - exactly the off-by-one-day seen in
    // production. toISTKey shifts into IST first, so it's correct
    // regardless of what timezone the server happens to run in.
    const pad2 = (n) => String(n).padStart(2, "0");
    const toKey = (d) => toISTKey(d);

    const holidays = holidayDocs.map((h) => ({ date: toKey(h.date), name: h.name }));

    const weekOffDates = [];
    const weekOffMap = await getWeekOffMapForRange(monthStart, monthEnd, organisation_id, userId, employeeModel);
    for (let d = 1; d <= daysInMonth; d++) {
      const key = `${year}-${pad2(month)}-${pad2(d)}`;
      const result = weekOffMap.get(key);
      if (result?.isOff) weekOffDates.push(key);
    }

    // ---- Today block ----
    const today0 = startOfDay(now);
    const todayKey = toKey(today0);
    const todayHoliday = await isHoliday(today0, organisation_id);
    const todayWeekOff = (today0 >= monthStart && today0 <= monthEnd)
      ? (weekOffMap.get(todayKey) ?? { isOff: false, reason: "unconfigured", unconfigured: true })
      : await isWeekOff(today0, organisation_id, userId, employeeModel);
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
    else if (!withinShiftWindow || checkinTooLate) disabledReason = "outside_shift";

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
          lateCheckinCutoffMinutes: shift.lateCheckinCutoffMinutes ?? 60,
        },
        withinShiftWindow,
        isVeryLate: checkinTooLate,
        canCheckIn: !todayHoliday.isHoliday && !todayWeekOff.isOff && !checkedInByFace && withinShiftWindow && !checkinTooLate,
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