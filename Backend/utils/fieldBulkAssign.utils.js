const XLSX = require("xlsx");

// Same column-alias-matching idea as utils/bulkOnboarding.utils.js (kept as
// its own small module rather than bolted onto that file, since the column
// set and validation rules here are entirely different — team/territory/
// coordinates, not employee-onboarding fields).
const COLUMNS = [
  {
    key: "employeeRef",
    label: "Employee ID or Work Email*",
    required: true,
    aliases: [
      "employee id",
      "empid",
      "employee id or work email",
      "employee",
      "work email",
      "email",
    ],
  },
  {
    key: "teamName",
    label: "Team Name*",
    required: true,
    aliases: ["team name", "team", "field team"],
  },
  {
    key: "territory",
    label: "Territory",
    required: false,
    aliases: ["territory", "area", "zone"],
  },
  {
    key: "managerEmail",
    label: "Manager Email (optional, only used if the team has none yet)",
    required: false,
    aliases: ["manager email", "manager", "reporting manager email"],
  },
  {
    key: "latitude",
    label: "Base Latitude (optional)",
    required: false,
    aliases: ["latitude", "lat"],
  },
  {
    key: "longitude",
    label: "Base Longitude (optional)",
    required: false,
    aliases: ["longitude", "lng", "long"],
  },
];

const normalize = (str) =>
  String(str || "")
    .toLowerCase()
    .replace(/\*/g, "")
    .replace(/\(.*?\)/g, "")
    .trim()
    .replace(/[\s_-]+/g, " ")
    .trim();

function buildHeaderToKeyMap() {
  const map = {};
  COLUMNS.forEach((col) => {
    col.aliases.forEach((alias) => {
      map[normalize(alias)] = col.key;
    });
  });
  return map;
}

function mapSheetRowsToFields(sheetRows) {
  const headerToKey = buildHeaderToKeyMap();
  return sheetRows
    .map((raw, idx) => {
      const row = { __rowNumber: idx + 2 }; // header is row 1, data starts row 2
      Object.entries(raw).forEach(([header, value]) => {
        const key = headerToKey[normalize(header)];
        if (key) row[key] = typeof value === "string" ? value.trim() : value;
      });
      return row;
    })
    .filter((row) =>
      Object.keys(row).some(
        (k) => k !== "__rowNumber" && String(row[k] ?? "").length > 0,
      ),
    );
}

function parseFieldAssignmentWorkbook(buffer) {
  const workbook = XLSX.read(buffer, { type: "buffer" });
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  const sheetRows = XLSX.utils.sheet_to_json(sheet, { defval: "", raw: false });
  return mapSheetRowsToFields(sheetRows);
}

function buildFieldAssignmentTemplateWorkbook(teamNames = []) {
  const header = COLUMNS.map((c) => c.label);
  const sample = [
    "EMP1042",
    teamNames[0] || "North Sales",
    "Meerut",
    "",
    "28.9845",
    "77.7064",
  ];
  const worksheet = XLSX.utils.aoa_to_sheet([header, sample]);
  worksheet["!cols"] = header.map(() => ({ wch: 26 }));
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "Field Assignment");
  if (teamNames.length) {
    const teamSheet = XLSX.utils.aoa_to_sheet([
      ["Existing team names (for reference/copy-paste)"],
      ...teamNames.map((name) => [name]),
    ]);
    XLSX.utils.book_append_sheet(workbook, teamSheet, "Your Teams");
  }
  return XLSX.write(workbook, { type: "buffer", bookType: "xlsx" });
}

module.exports = {
  COLUMNS,
  parseFieldAssignmentWorkbook,
  buildFieldAssignmentTemplateWorkbook,
};