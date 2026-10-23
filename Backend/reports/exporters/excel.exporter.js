const ExcelJS = require("exceljs");

async function sendExcel(res, result) {
  const wb = new ExcelJS.Workbook();
  wb.created = new Date();
  const ws = wb.addWorksheet(result.title.slice(0, 31));

  ws.columns = result.columns.map((c) => ({
    header: c.label,
    key: c.key,
    width: c.width || 18,
  }));
  ws.getRow(1).font = { bold: true };
  ws.views = [{ state: "frozen", ySplit: 1 }];

  result.rows.forEach((r) => ws.addRow(r));

  if (result.summary) {
    ws.addRow({});
    const firstKey = result.columns[0].key;
    const secondKey = result.columns[1] ? result.columns[1].key : firstKey;
    Object.entries(result.summary).forEach(([label, value]) => {
      const row = ws.addRow({ [firstKey]: label, [secondKey]: value });
      row.font = { bold: true };
    });
  }

  res.setHeader(
    "Content-Type",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  );
  res.setHeader(
    "Content-Disposition",
    `attachment; filename="${result.reportKey}-${Date.now()}.xlsx"`,
  );
  await wb.xlsx.write(res);
  res.end();
}

module.exports = { sendExcel };
