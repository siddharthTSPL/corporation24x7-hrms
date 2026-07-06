const Shift = require("../Models/shift.model");
const { ensureDefaultShift, getShiftDurationMinutes } = require("../utils/shift.utils");


const User = require("../Models/user.model");
const Manager = require("../Models/manager.model");
const AdminUser = require("../Models/Admin.model");

const ROLE_MODEL_MAP = {
  employee: User,
  manager: Manager,
  admin: AdminUser,
};

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

const assignShiftToUser = async (req, res) => {
  try {
    const organisation_id = getOrgId(req);
    const { employee_id, role, shift_id } = req.body;

    if (!employee_id || !role)
      return res.status(400).json({ message: "employee_id and role are required" });

    const Model = ROLE_MODEL_MAP[role];
    if (!Model)
      return res.status(400).json({ message: "role must be one of: employee, manager, admin" });

    let shiftValue = null;
    if (shift_id) {
      const shift = await Shift.findOne({ _id: shift_id, organisation_id, isActive: true });
      if (!shift) return res.status(404).json({ message: "Shift not found" });
      shiftValue = shift._id;
    }
    // shift_id omitted/null -> falls back to org default shift automatically

    const updated = await Model.findOneAndUpdate(
      { _id: employee_id, organisation_id },
      { shift: shiftValue },
      { new: true }
    ).select("name email shift");

    if (!updated) return res.status(404).json({ message: `${role} not found` });

    res.json({ message: "Shift assigned", user: updated });
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
};