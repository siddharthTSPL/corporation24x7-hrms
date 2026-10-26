const { fmtPeriod } = require("../engine/dates");

const round2 = (n) => Math.round((Number(n) || 0) * 100) / 100;
const BATCH = 500;

/** Yield arrays of at most `size` items. */
function* batches(items, size = BATCH) {
  for (let i = 0; i < items.length; i += size) yield items.slice(i, i + size);
}

const STATUS_LABEL = { working: "Working", resigned: "Resigned", fired: "Fired", terminated: "Terminated" };
const employmentStatus = (p) =>
  p.workingStatus === "working" ? (p.onNotice ? "On Notice" : "Working") : STATUS_LABEL[p.workingStatus] || p.workingStatus;

// Reusable filter fragments - every report uses the same keys/labels so the
// frontend builds one consistent filter bar.
const F = {
  department: { key: "department", label: "Department", type: "select", lookup: "departments" },
  designation: { key: "designation", label: "Designation", type: "select", lookup: "designations" },
  employees: { key: "employees", label: "Employee", type: "employees", lookup: "employees" },
};

const periodText = (from, to) => (from && to ? `${from} to ${to}` : from || to || "All dates");
const monthText = (m) => { const [y, mo] = String(m).split("-"); return fmtPeriod(Number(y), Number(mo)); };

module.exports = { round2, batches, employmentStatus, STATUS_LABEL, F, periodText, monthText, BATCH };
