// Accumulators compute summary totals in ONE streaming pass, so the on-screen
// summary strip and the Excel totals row come from the same code and the same
// rows (no second query that could disagree).
const round2 = (n) => Math.round((Number(n) || 0) * 100) / 100;

/**
 * makeAccumulator(columns, extra?)
 *   extra (optional) = { add(row), items(): [{label,value,type}] }
 * result() => { count, columnTotals: {key: n}, items: [{label, value, type}] }
 */
function makeAccumulator(columns, extra) {
  const totalCols = columns.filter((c) => c.total);
  const sums = Object.fromEntries(totalCols.map((c) => [c.key, 0]));
  let count = 0;
  return {
    add(row) {
      count += 1;
      for (const c of totalCols) {
        const v = Number(row[c.key]);
        if (Number.isFinite(v)) sums[c.key] += v;
      }
      if (extra?.add) extra.add(row);
    },
    result() {
      const columnTotals = Object.fromEntries(Object.entries(sums).map(([k, v]) => [k, round2(v)]));
      const items = [{ label: "Records", value: count, type: "integer" }];
      for (const c of totalCols) items.push({ label: `Total ${c.header}`, value: columnTotals[c.key], type: c.type });
      if (extra?.items) items.push(...extra.items());
      return { count, columnTotals, items };
    },
  };
}

module.exports = { makeAccumulator, round2 };
