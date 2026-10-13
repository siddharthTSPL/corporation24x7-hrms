// Shared payslip helpers — used by the admin Payroll page and the
// employee/manager/admin "My Payslip" section in the Self Service Portal,
// so the downloaded payslip HTML looks identical everywhere.

export const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

const DEPARTMENT_LABEL = {
  OPR: "Operations",
  BPO: "Business Process Outsourcing",
  ENG: "Engineering",
  HR: "Human Resources",
  MGMT: "Management",
};

export function departmentLabel(code) {
  if (!code || code === "—") return code || "—";
  return DEPARTMENT_LABEL[code] || code;
}

export function fmtINR(n) {
  const num = Number(n) || 0;
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(num);
}

function humanizeKey(key) {
  const spaced = String(key).replace(/([a-z0-9])([A-Z])/g, "$1 $2");
  return spaced.charAt(0).toUpperCase() + spaced.slice(1);
}

const EARNINGS_LABELS = { other: "Other Earnings" };
const DEDUCTIONS_LABELS = {
  pf: "Employee PF",
  esi: "ESI",
  professionalTax: "Professional Tax",
  tds: "TDS",
  lwf: "LWF",
  loan: "Loan EMI",
  advance: "Advance",
  other: "Other Deduction",
};

const EARNINGS_EXCLUDE = ["gross", "benefits", "reimbursementComponents", "totalEarnings"];
const DEDUCTIONS_EXCLUDE = ["lossOfPay", "components", "totalDeductions"];

function dynamicRows(obj, excludeKeys, labelOverrides) {
  return Object.entries(obj || {})
    .filter(([key, value]) => !excludeKeys.includes(key) && typeof value === "number" && value !== 0)
    .map(([key, value]) => ({ label: labelOverrides[key] || humanizeKey(key), amount: value }));
}

export function getPayslipLineItems(payroll) {
  const breakup = payroll.breakup || {};

  const earnings = [
    { label: "Basic", amount: breakup.basic || 0 },
    { label: "HRA", amount: breakup.hra || 0 },
    ...(breakup.allowances || []).map((a) => ({ label: a.name, amount: a.amount })),
    ...dynamicRows(payroll.earnings, EARNINGS_EXCLUDE, EARNINGS_LABELS),
    ...(breakup.benefitComponents || []).map((c) => ({ label: c.name, amount: c.amount })),
    ...(breakup.reimbursementComponents || []).map((c) => ({ label: c.name, amount: c.amount })),
  ];

  const deductions = [
    ...dynamicRows(payroll.deductions, DEDUCTIONS_EXCLUDE, DEDUCTIONS_LABELS),
    ...(breakup.deductionComponents || []).map((c) => ({ label: c.name, amount: c.amount })),
  ];

  const employerContribution = dynamicRows(payroll.employerContribution, [], { pf: "Employer PF", esi: "Employer ESI", lwf: "Employer LWF", statutoryBonus: "Statutory Bonus" });

  return { earnings, deductions, employerContribution };
}

// Opens (or downloads, if popups are blocked) a printable payslip as an
// HTML document in a new tab.
export function downloadPayslip({ payroll, name, employeeId, department, designation, bankName, accountNumber, orgName }) {
  const att = payroll.attendance || {};
  const { earnings, deductions } = getPayslipLineItems(payroll);
  const rowsHtml = (items) => items.map((r) => `<tr><td>${r.label}</td><td class="amt">${fmtINR(r.amount)}</td></tr>`).join("");
  const period = `${MONTH_NAMES[payroll.month - 1]} ${payroll.year}`;

  const html = `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8" />
<title>${orgName ? orgName + " - " : ""}Payslip - ${name} - ${period}</title>
<style>
  * { box-sizing: border-box; }
  body { font-family: Arial, Helvetica, sans-serif; color: #2a1a16; padding: 32px; max-width: 640px; margin: 0 auto; }
  h1 { font-size: 18px; margin: 0 0 4px; }
  .org { font-size: 14px; font-weight: 700; color: #CD166E; margin: 0 0 2px; }
  .sub { color: #8a7a74; font-size: 12px; margin-bottom: 20px; }
  table { width: 100%; border-collapse: collapse; margin-bottom: 18px; }
  th { text-align: left; font-size: 10.5px; text-transform: uppercase; letter-spacing: 0.4px; color: #8a7a74; padding: 4px 0; border-bottom: 1px solid #ede5e0; }
  td { font-size: 13px; padding: 5px 0; border-bottom: 1px solid #f3ede9; }
  td.amt, th.amt { text-align: right; }
  .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 4px 16px; margin-bottom: 20px; font-size: 13px; }
  .grid .lbl { color: #8a7a74; }
  .total-row td { font-weight: 700; border-top: 2px solid #2a1a16; border-bottom: none; }
  .net { display: flex; justify-content: space-between; align-items: center; padding: 14px 0; border-top: 2px solid #2a1a16; border-bottom: 2px solid #2a1a16; margin: 18px 0; }
  .net .lbl { font-size: 14px; font-weight: 700; }
  .net .val { font-size: 18px; font-weight: 800; }
  @media print { body { padding: 0; } }
</style>
</head>
<body>
  ${orgName ? `<p class="org">${orgName}</p>` : ""}
  <h1>Payslip</h1>
  <div class="sub">Pay Period: ${period}${payroll.status ? " · " + payroll.status.toUpperCase().replace("_", " ") : ""}</div>

  <div class="grid">
    <div><span class="lbl">Employee: </span>${name}</div>
    <div><span class="lbl">Employee ID: </span>${employeeId}</div>
    <div><span class="lbl">Department: </span>${departmentLabel(department)}</div>
    <div><span class="lbl">Designation: </span>${designation}</div>
    <div><span class="lbl">Bank Name: </span>${bankName || "—"}</div>
    <div><span class="lbl">Account Number: </span>${accountNumber || "—"}</div>
    <div><span class="lbl">Paid Days: </span>${att.paidDays ?? "—"} / ${att.workingDays ?? "—"}</div>
    <div><span class="lbl">LOP Days: </span>${att.lopDays ?? "—"}</div>
  </div>

  <table>
    <thead><tr><th>Earnings</th><th class="amt">Amount</th></tr></thead>
    <tbody>
      ${rowsHtml(earnings)}
      <tr class="total-row"><td>GROSS EARNINGS</td><td class="amt">${fmtINR(payroll.earnings?.totalEarnings)}</td></tr>
    </tbody>
  </table>

  <table>
    <thead><tr><th>Deductions</th><th class="amt">Amount</th></tr></thead>
    <tbody>
      ${rowsHtml(deductions)}
      <tr class="total-row"><td>TOTAL DEDUCTIONS</td><td class="amt">${fmtINR(payroll.deductions?.totalDeductions)}</td></tr>
    </tbody>
  </table>

  <div class="net">
    <span class="lbl">NET PAY</span>
    <span class="val">${fmtINR(payroll.netSalary)}</span>
  </div>

  <script>window.onload = function() { window.print(); };</script>
</body>
</html>`;

  const blob = new Blob([html], { type: "text/html" });
  const url = URL.createObjectURL(blob);
  const win = window.open(url, "_blank");

  if (!win) {
    const link = document.createElement("a");
    link.href = url;
    link.download = `Payslip - ${name} - ${period}.html`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  setTimeout(() => URL.revokeObjectURL(url), 60000);
}