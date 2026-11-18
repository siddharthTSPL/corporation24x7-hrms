// Single source of truth for department short code -> full name.
// The backend stores short codes (OPR, BPO, ENG, HR, MGMT); every screen that
// SHOWS a department should go through getDepartmentName() so users always
// see the full name. Unknown codes are shown as-is (never blank), so a
// department added later still renders.
export const DEPT_FULL_FORMS = {
  OPR: "Operations",
  BPO: "Business Process Outsourcing",
  ENG: "Engineering",
  HR: "Human Resources",
  MGMT: "Management",
};

export const getDepartmentName = (dept, fallback = "") => {
  if (dept === undefined || dept === null || dept === "") return fallback;
  const raw = String(dept).trim();
  return DEPT_FULL_FORMS[raw] || DEPT_FULL_FORMS[raw.toUpperCase()] || raw;
};
