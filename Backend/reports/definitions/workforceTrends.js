const { loadPeople } = require("../engine/people");
const { startOfISTDay } = require("../engine/dates");
const { statusAsOf } = require("./headcount");
const { loadExitDates } = require("./_phase2");
const { TREND_FILTERS, monthSpan, rangeText } = require("./_trends");
const { round2 } = require("./_shared");

/** PURE (unit-tested): attrition % = exits / average of opening and closing headcount. */
const attritionPct = (exits, opening, closing) => {
  const avg = (opening + closing) / 2;
  return avg > 0 ? round2((exits / avg) * 100) : null;
};

module.exports = {
  key: "workforce-trends",
  name: "Workforce Trends",
  category: "hr",
  sensitive: false,
  description: "Month-by-month headcount, joiners, exits and attrition rate.",
  filters: TREND_FILTERS,
  columns: [
    { key: "month", header: "Month", type: "text", width: 14 },
    { key: "opening", header: "Opening Headcount", type: "integer", width: 18 },
    { key: "joiners", header: "Joiners", type: "integer", width: 11, total: true },
    { key: "exits", header: "Exits", type: "integer", width: 11, total: true },
    { key: "closing", header: "Closing Headcount", type: "integer", width: 18 },
    { key: "netChange", header: "Net Change", type: "integer", width: 12, total: true },
    { key: "attritionPct", header: "Attrition % (month)", type: "percent", width: 18 },
  ],
  chart: { type: "combo", x: "month", bars: [{ key: "joiners", label: "Joiners" }, { key: "exits", label: "Exits" }], line: { key: "closing", label: "Closing headcount" } },
  notes: [
    "Uses today's department for every month (department history is not stored). Exit date = notice-period last working day, else Full & Final date of leaving; leavers with neither are excluded from exits and counted as gone only from today.",
    "Attrition % = exits / average(opening, closing) headcount for that month.",
  ],
  period: rangeText,
  validate(f) { monthSpan(f); },
  attritionPct,
  async *rows(ctx, f) {
    const months = monthSpan(f);
    const people = await loadPeople(ctx, { department: f.department });
    const exits = await loadExitDates(ctx, people);
    const today = startOfISTDay(new Date());
    const activeAt = (day) => people.filter((p) => statusAsOf(p, exits.get(p.id) || p.lastWorkingDay || null, day, today) === "active").length;
    const inM = (d, m) => d && new Date(d) >= m.start && new Date(d) <= m.end;
    // opening of the first month = active at the end of the previous month
    let prevClose = activeAt(startOfISTDay(new Date(months[0].start.getTime() - 1)));
    const out = [];
    for (const m of months) {
      const closing = activeAt(startOfISTDay(m.end));
      const joiners = people.filter((p) => inM(p.joiningDate, m)).length;
      const ex = people.filter((p) => p.workingStatus !== "working" && inM(exits.get(p.id), m)).length;
      out.push({ month: m.label, opening: prevClose, joiners, exits: ex, closing, netChange: closing - prevClose, attritionPct: attritionPct(ex, prevClose, closing) });
      prevClose = closing;
    }
    yield out;
  },
};
