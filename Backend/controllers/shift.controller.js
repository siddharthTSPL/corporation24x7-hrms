const Shift = require("../Models/shift.model");
const ShiftAssignment = require("../Models/shiftAssignment.model");
const { ensureDefaultShift, getShiftDurationMinutes } = require("../utils/shift.utils");


const User = require("../Models/user.model");
const Manager = require("../Models/manager.model");
const AdminUser = require("../Models/Admin.model");

const ROLE_MODEL_MAP = {
  employee: User,
  manager: Manager,
  admin: AdminUser,
};

// Mongoose model name (matches ShiftAssignment.employee_model enum / refPath)
const ROLE_MODEL_NAME_MAP = {
  employee: "User",
  manager: "Manager",
  admin: "Admin",
};

const SHIFT_SUMMARY_FIELDS = "name startTime endTime isActive";

const getOrgId = (req) => req.user.organisation_id || req.user._id;

const createShift = async (req, res) => {
  try {
    const organisation_id = getOrgId(req);
    const {
      name,
      startTime,
      endTime,
      graceMinutes,
      earlyBufferMinutes,
      minMinutesBeforeCheckout,
      absentBelowMinutes,
      halfDayBelowMinutes,
    } = req.body;

    if (!name || !startTime || !endTime)
      return res.status(400).json({ message: "name, startTime and endTime are required" });

    const shift = await Shift.create({
      organisation_id,
      name,
      startTime,
      endTime,
      graceMinutes,
      earlyBufferMinutes,
      minMinutesBeforeCheckout,
      absentBelowMinutes,
      halfDayBelowMinutes,
    });

    res.status(201).json({ message: "Shift created", shift });
  } catch (error) {
    if (error.code === 11000)
      return res.status(409).json({ message: "A shift with this name already exists" });
    res.status(500).json({ error: error.message });
  }
};

const updateShift = async (req, res) => {
  try {
    const organisation_id = getOrgId(req);
    const { id } = req.params;
    const updates = { ...req.body };
    delete updates.isDefault; // use setDefaultShift instead
    delete updates.organisation_id;

    const shift = await Shift.findOneAndUpdate(
      { _id: id, organisation_id },
      updates,
      { new: true, runValidators: true }
    );

    if (!shift) return res.status(404).json({ message: "Shift not found" });
    res.json({ message: "Shift updated", shift });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const setDefaultShift = async (req, res) => {
  try {
    const organisation_id = getOrgId(req);
    const { id } = req.params;

    const shift = await Shift.findOne({ _id: id, organisation_id, isActive: true });
    if (!shift) return res.status(404).json({ message: "Shift not found" });

    await Shift.updateMany(
      { organisation_id, isDefault: true },
      { $set: { isDefault: false } }
    );
    shift.isDefault = true;
    await shift.save();

    res.json({ message: "Default shift updated", shift });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const deleteShift = async (req, res) => {
  try {
    const organisation_id = getOrgId(req);
    const { id } = req.params;

    const shift = await Shift.findOne({ _id: id, organisation_id });
    if (!shift) return res.status(404).json({ message: "Shift not found" });
    if (shift.isDefault)
      return res.status(400).json({ message: "Cannot delete the default shift. Set another shift as default first." });

    // Soft delete so historical attendance snapshots referencing this shift stay intact
    shift.isActive = false;
    await shift.save();

    res.json({ message: "Shift deactivated" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const listShifts = async (req, res) => {
  try {
    const organisation_id = getOrgId(req);
    await ensureDefaultShift(organisation_id); // guarantees at least one exists

    const shifts = await Shift.find({ organisation_id, isActive: true }).sort({ isDefault: -1, name: 1 }).lean();
    const withDuration = shifts.map((s) => ({ ...s, durationMinutes: getShiftDurationMinutes(s) }));

    res.json({ shifts: withDuration });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Handles first-time assign AND reassign - same endpoint, it just records
// every call as a new row in ShiftAssignment history so nothing is lost.
const assignShiftToUser = async (req, res) => {
  try {
    const organisation_id = getOrgId(req);
    const { employee_id, role, shift_id, note } = req.body;

    if (!employee_id || !role)
      return res.status(400).json({ message: "employee_id and role are required" });

    const Model = ROLE_MODEL_MAP[role];
    const employeeModelName = ROLE_MODEL_NAME_MAP[role];
    if (!Model)
      return res.status(400).json({ message: "role must be one of: employee, manager, admin" });

    let shiftValue = null;
    if (shift_id) {
      const shift = await Shift.findOne({ _id: shift_id, organisation_id, isActive: true });
      if (!shift) return res.status(404).json({ message: "Shift not found" });
      shiftValue = shift._id;
    }
    // shift_id omitted/null -> falls back to org default shift automatically

    const existing = await Model.findOne({ _id: employee_id, organisation_id }).select("shift");
    if (!existing) return res.status(404).json({ message: `${role} not found` });
    const previousShift = existing.shift || null;

    const updated = await Model.findOneAndUpdate(
      { _id: employee_id, organisation_id },
      { shift: shiftValue },
      { new: true }
    ).select("name email shift f_name l_name");

    const historyEntry = await ShiftAssignment.create({
      organisation_id,
      employee_id,
      employee_model: employeeModelName,
      shift: shiftValue,
      previous_shift: previousShift,
      assigned_by: req.user._id,
      assigned_by_model: req.actorModel,
      note: note || "",
    });

    res.json({ message: "Shift assigned", user: updated, history: historyEntry });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Full assign/reassign history for one employee, newest first, with
// shift details and who made the change populated for display.
const getShiftHistoryForEmployee = async (req, res) => {
  try {
    const organisation_id = getOrgId(req);
    const { employee_id } = req.params;
    const { role } = req.query;

    const Model = ROLE_MODEL_MAP[role];
    if (!Model)
      return res.status(400).json({ message: "role must be one of: employee, manager, admin" });

    const employee = await Model.findOne({ _id: employee_id, organisation_id }).select(
      "f_name l_name email shift"
    );
    if (!employee) return res.status(404).json({ message: `${role} not found` });

    const history = await ShiftAssignment.find({ organisation_id, employee_id })
      .sort({ createdAt: -1 })
      .populate("shift", SHIFT_SUMMARY_FIELDS)
      .populate("previous_shift", SHIFT_SUMMARY_FIELDS)
      .populate("assigned_by", "f_name l_name email")
      .lean();

    res.json({ employee, currentShift: employee.shift, history });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Correct a mistake in a specific history row (e.g. wrong shift was picked).
// If it's the most recent row for that employee, the employee's live
// `shift` field is kept in sync with the edit.
const editShiftAssignment = async (req, res) => {
  try {
    const organisation_id = getOrgId(req);
    const { historyId } = req.params;
    const { shift_id, note } = req.body;

    const entry = await ShiftAssignment.findOne({ _id: historyId, organisation_id });
    if (!entry) return res.status(404).json({ message: "History entry not found" });

    let shiftValue = null;
    if (shift_id) {
      const shift = await Shift.findOne({ _id: shift_id, organisation_id, isActive: true });
      if (!shift) return res.status(404).json({ message: "Shift not found" });
      shiftValue = shift._id;
    }

    entry.shift = shiftValue;
    if (note !== undefined) entry.note = note;
    await entry.save();

    // Only the newest entry for this employee drives their current shift.
    const latest = await ShiftAssignment.findOne({
      organisation_id,
      employee_id: entry.employee_id,
    }).sort({ createdAt: -1 });

    if (latest && String(latest._id) === String(entry._id)) {
      const Model = ROLE_MODEL_MAP[
        Object.keys(ROLE_MODEL_NAME_MAP).find((k) => ROLE_MODEL_NAME_MAP[k] === entry.employee_model)
      ];
      await Model.findOneAndUpdate(
        { _id: entry.employee_id, organisation_id },
        { shift: shiftValue }
      );
    }

    const populated = await ShiftAssignment.findById(entry._id)
      .populate("shift", SHIFT_SUMMARY_FIELDS)
      .populate("previous_shift", SHIFT_SUMMARY_FIELDS)
      .populate("assigned_by", "f_name l_name email");

    res.json({ message: "History entry updated", history: populated });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// Deletes a single history row. If that row was the employee's current
// (latest) shift record, the employee's live `shift` falls back to the
// next most recent history entry, or to the org default if none remain.
const deleteShiftAssignment = async (req, res) => {
  try {
    const organisation_id = getOrgId(req);
    const { historyId } = req.params;

    const entry = await ShiftAssignment.findOne({ _id: historyId, organisation_id });
    if (!entry) return res.status(404).json({ message: "History entry not found" });

    const wasLatest = !(await ShiftAssignment.exists({
      organisation_id,
      employee_id: entry.employee_id,
      createdAt: { $gt: entry.createdAt },
    }));

    await entry.deleteOne();

    if (wasLatest) {
      const previous = await ShiftAssignment.findOne({
        organisation_id,
        employee_id: entry.employee_id,
      }).sort({ createdAt: -1 });

      const Model = ROLE_MODEL_MAP[
        Object.keys(ROLE_MODEL_NAME_MAP).find((k) => ROLE_MODEL_NAME_MAP[k] === entry.employee_model)
      ];
      await Model.findOneAndUpdate(
        { _id: entry.employee_id, organisation_id },
        { shift: previous ? previous.shift : null }
      );
    }

    res.json({ message: "History entry deleted" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

module.exports = {
  createShift,
  updateShift,
  setDefaultShift,
  deleteShift,
  listShifts,
  assignShiftToUser,
  getShiftHistoryForEmployee,
  editShiftAssignment,
  deleteShiftAssignment,
};