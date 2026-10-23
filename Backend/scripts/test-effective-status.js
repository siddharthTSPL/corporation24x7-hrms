const { effectiveStatus } = require("../reports/helpers/employment.helper");

const asOf = new Date("2026-10-23T12:00:00");
const d = (s) => new Date(s);

const cases = [
  ["working, no notice", { working_status: "working" }, "working"],
  [
    "resigned, last day in future",
    {
      working_status: "resigned",
      noticePeriod: {
        active: true,
        initiatedOn: d("2026-10-01"),
        lastWorkingDay: d("2026-10-31"),
      },
    },
    "on_notice",
  ],
  [
    "resigned, last day is today",
    {
      working_status: "resigned",
      noticePeriod: {
        active: true,
        initiatedOn: d("2026-10-01"),
        lastWorkingDay: d("2026-10-23"),
      },
    },
    "on_notice",
  ],
  [
    "resigned, last day passed",
    {
      working_status: "resigned",
      noticePeriod: {
        active: true,
        initiatedOn: d("2026-10-01"),
        lastWorkingDay: d("2026-10-20"),
      },
    },
    "resigned",
  ],
  [
    "fired, last day passed",
    {
      working_status: "fired",
      noticePeriod: {
        active: true,
        initiatedOn: d("2026-10-10"),
        lastWorkingDay: d("2026-10-22"),
      },
    },
    "fired",
  ],
];

for (const [name, user, expected] of cases) {
  const got = effectiveStatus(user, asOf);
  console.log(
    got === expected ? "PASS" : "FAIL",
    "-",
    name,
    "->",
    got,
    "(expected",
    expected + ")",
  );
}
