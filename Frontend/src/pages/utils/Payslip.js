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

const ONES = ["", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine", "Ten", "Eleven", "Twelve", "Thirteen", "Fourteen", "Fifteen", "Sixteen", "Seventeen", "Eighteen", "Nineteen"];
const TENS = ["", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety"];

function twoDigitWords(n) {
  return n < 20 ? ONES[n] : TENS[Math.floor(n / 10)] + (n % 10 ? ` ${ONES[n % 10]}` : "");
}

function threeDigitWords(n) {
  const hundreds = Math.floor(n / 100);
  const remainder = n % 100;
  return [hundreds ? `${ONES[hundreds]} Hundred` : "", remainder ? twoDigitWords(remainder) : ""].filter(Boolean).join(" ");
}

function amountInWords(value) {
  const rounded = Math.round(Number(value) || 0);
  if (rounded === 0) return "Zero Rupees Only";
  let number = Math.abs(rounded);
  const parts = [];
  const crore = Math.floor(number / 10000000); number %= 10000000;
  const lakh = Math.floor(number / 100000); number %= 100000;
  const thousand = Math.floor(number / 1000); number %= 1000;
  if (crore) parts.push(`${threeDigitWords(crore)} Crore`);
  if (lakh) parts.push(`${twoDigitWords(lakh)} Lakh`);
  if (thousand) parts.push(`${twoDigitWords(thousand)} Thousand`);
  if (number) parts.push(threeDigitWords(number));
  return `${rounded < 0 ? "Minus " : ""}${parts.join(" ")} Rupees Only`;
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

function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>"']/g, (character) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
  })[character]);
}

const safeFileName = (value) => String(value ?? "").replace(/[\\/:*?"<>|]/g, "-").trim();

async function htmlToPdfDownload(html, filename) {
  const iframe = document.createElement("iframe");
  iframe.setAttribute("aria-hidden", "true");
  iframe.style.cssText = "position:fixed;left:-10000px;top:0;width:794px;height:1123px;border:0;visibility:hidden;";
  document.body.appendChild(iframe);

  try {
    const [{ default: html2canvas }, { jsPDF }] = await Promise.all([import("html2canvas"), import("jspdf")]);
    const doc = iframe.contentDocument;
    doc.open();
    doc.write(html);
    doc.close();
    await new Promise((resolve) => setTimeout(resolve, 350));
    if (doc.fonts?.ready) await doc.fonts.ready;
    await Promise.all(Array.from(doc.images).map((image) => image.complete ? Promise.resolve() : new Promise((resolve) => {
      image.onload = resolve;
      image.onerror = resolve;
      setTimeout(resolve, 3000);
    })));
    iframe.style.height = `${doc.body.scrollHeight}px`;

    const canvas = await html2canvas(doc.body, { scale: 2, backgroundColor: "#ffffff", useCORS: true });
    const pdf = new jsPDF({ unit: "mm", format: "a4", orientation: "portrait" });
    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();
    const imageHeight = (canvas.height * pageWidth) / canvas.width;
    const image = canvas.toDataURL("image/jpeg", 0.98);
    let heightLeft = imageHeight;
    let position = 0;
    pdf.addImage(image, "JPEG", 0, position, pageWidth, imageHeight);
    heightLeft -= pageHeight;
    while (heightLeft > 0) {
      position = heightLeft - imageHeight;
      pdf.addPage();
      pdf.addImage(image, "JPEG", 0, position, pageWidth, imageHeight);
      heightLeft -= pageHeight;
    }
    pdf.save(filename);
  } catch (error) {
    console.error("Payslip PDF generation failed", error);
    window.alert("Payslip PDF download failed. Please try again.");
  } finally {
    iframe.remove();
  }
}

// Generate the same branded PDF for payroll and employee self-service.
export async function downloadPayslip({ payroll, name, employeeId, department, designation, bankName, accountNumber, orgName }) {
  const att = payroll.attendance || {};
  const org = payroll.organisationSnapshot || {};
  const { earnings, deductions, employerContribution } = getPayslipLineItems(payroll);
  const period = `${MONTH_NAMES[payroll.month - 1]} ${payroll.year}`;
  const orgDetails = [org.address, [org.cin && `CIN: ${org.cin}`, org.gstin && `GSTIN: ${org.gstin}`, org.pan && `PAN: ${org.pan}`].filter(Boolean).join("  |  ")].filter(Boolean);
  const statusText = (payroll.status || "paid").split("_").map((part) => part.charAt(0).toUpperCase() + part.slice(1)).join(" ");
  const statusColors = ({ paid: ["#e8f5e9", "#16764b"], approved: ["#faeeda", "#8a5a00"], generated: ["#e6f1fb", "#27689d"], on_hold: ["#fcebeb", "#a42d2d"] })[payroll.status] || ["#e8f5e9", "#16764b"];
  const rowHtml = (items) => items.length
    ? items.map((item) => `<tr><td>${escapeHtml(item.label)}</td><td class="amt">${fmtINR(item.amount)}</td></tr>`).join("")
    : '<tr><td class="empty" colspan="2">—</td></tr>';
  const detail = (label, value) => `<div class="detail"><span>${escapeHtml(label)}</span><strong>${escapeHtml(value || "—")}</strong></div>`;
  const attCell = (label, value) => `<div><span class="att-label">${label}</span><strong>${value ?? "—"}</strong></div>`;
  // html2canvas draws text a few px lower than the browser inside small pills/chips, no matter
  // what line-height/vertical-align is used. So the status badge and the contact chips are inline
  // SVGs: the browser rasterises them itself and the text baseline is fixed by coordinates.
  const measureCtx = document.createElement("canvas").getContext("2d");
  const textWidth = (text, weight) => {
    const value = String(text ?? "");
    if (!measureCtx) return value.length * 5.6;
    measureCtx.font = `${weight} 9.5px Arial, Helvetica, sans-serif`;
    return measureCtx.measureText(value).width;
  };
  const FONT = 'font-family="Arial, Helvetica, sans-serif" font-size="9.5"';
  const statusBadge = (text, [background, color]) => {
    const width = Math.ceil(textWidth(text, 700)) + 22;
    return `<svg class="svg-pill" width="${width}" height="22" viewBox="0 0 ${width} 22" xmlns="http://www.w3.org/2000/svg"><rect x="0" y="0" width="${width}" height="22" rx="11" fill="${background}"/><text x="${width / 2}" y="14.4" text-anchor="middle" ${FONT} font-weight="700" fill="${color}">${escapeHtml(text)}</text></svg>`;
  };
  const contactChip = (label, value) => {
    const labelWidth = Math.ceil(textWidth(label, 700));
    const valueWidth = Math.ceil(textWidth(value, 400));
    const width = 12 + labelWidth + 8 + valueWidth + 12;
    return `<svg class="svg-chip" width="${width}" height="26" viewBox="0 0 ${width} 26" xmlns="http://www.w3.org/2000/svg"><rect x="0.5" y="0.5" width="${width - 1}" height="25" rx="12.5" fill="#ffffff" fill-opacity="0.15" stroke="#ffffff" stroke-opacity="0.6"/><text x="12" y="16.4" ${FONT} font-weight="700" fill="#ffd9ec">${escapeHtml(label)}</text><text x="${12 + labelWidth + 8}" y="16.4" ${FONT} fill="#ffffff">${escapeHtml(value)}</text></svg>`;
  };
  const html = `<!doctype html><html><head><meta charset="utf-8"/><title>${escapeHtml(orgName || org.name || "Company")} - Payslip - ${escapeHtml(name)} - ${escapeHtml(period)}</title>
<style>
*{box-sizing:border-box}body{margin:0;padding:20px;background:#fff;color:#2a1a16;font-family:Arial,Helvetica,sans-serif}.sheet{max-width:780px;margin:0 auto;border:1px solid #e3d6dd;border-top:6px solid #730042;border-radius:14px;padding:24px}.head{display:grid;grid-template-columns:minmax(0,1fr) 190px;align-items:center;column-gap:24px;min-height:145px;padding:18px 20px;border-radius:12px;color:#fff;background:linear-gradient(125deg,#cd166e 0%,#730042 100%)}.brand{display:flex;align-items:center;gap:14px;min-width:0;flex:1}.logo-frame{width:82px;height:78px;flex:0 0 82px;display:flex;align-items:center;justify-content:center;padding:8px;border-radius:12px;background:#fff}.logo{max-width:100%;max-height:100%;object-fit:contain}.org-copy{flex:1;min-width:0;padding-left:12px;border-left:2px solid #ffffff88}.org{margin:0;color:#fff;font-size:21px;font-weight:800;line-height:1.2}.org-line{margin:5px 0 0;color:#f6dcea;font-size:11.5px;line-height:1.5}
.contacts{display:block;margin-top:10px;font-size:0;line-height:0}
.svg-chip{display:inline-block;vertical-align:top;max-width:100%;height:auto;margin:0 8px 6px 0}
.meta{width:190px;flex:0 0 190px;text-align:right}
.title-row{width:auto;margin-left:auto;border-collapse:collapse}
.title-row td{padding:0;border:0;height:26px;font-size:20px;line-height:26px;vertical-align:middle;white-space:nowrap}
.title-row .slip-title{padding-right:12px;font-weight:800;letter-spacing:1.7px;color:#fff;text-align:right}
.title-row .status-cell{text-align:right}
.title-row .svg-pill{display:block;margin-left:auto}
.period{display:flex;align-items:center;justify-content:center;gap:9px;margin-top:9px;padding:8px 9px;border:1px solid #ffffff66;border-radius:10px;background:#ffffff1c;text-align:left}.period svg{width:22px;height:22px}.period span{color:#f6dcea;font-size:10.5px}.period strong{display:block;margin-top:2px;color:#fff;font-size:12.5px}.box{margin-top:16px;overflow:hidden;border:1px solid #e3d6dd;border-radius:10px}.box-title{padding:7px 14px;border-bottom:1px solid #e3d6dd;background:#f7eef2;color:#730042;font-size:11px;font-weight:800;letter-spacing:.8px;text-transform:uppercase}.details{display:grid;grid-template-columns:1fr 1fr}.detail{display:flex;gap:8px;padding:7px 14px;border-bottom:1px solid #f3eaee;font-size:12.5px}.detail span{min-width:112px;color:#8a7a74}.detail strong{overflow-wrap:anywhere}.attendance{display:grid;grid-template-columns:repeat(4,1fr)}.attendance>div{padding:10px 14px;border-right:1px solid #f3eaee}.attendance>div:last-child{border-right:0}.att-label{display:block;color:#8a7a74;font-size:10.5px;letter-spacing:.4px;text-transform:uppercase}.attendance strong{display:block;margin-top:2px;font-size:15px}.cols{display:flex;align-items:stretch;gap:16px;margin-top:14px}.col{display:flex;flex:1;flex-direction:column;overflow:hidden;border:1px solid #e3d6dd;border-radius:10px}table{width:100%;border-collapse:collapse}th{padding:8px 12px;background:#730042;color:#fff;text-align:left;font-size:11px;letter-spacing:.7px;text-transform:uppercase}th.amt,td.amt{text-align:right}td{padding:7px 12px;border-bottom:1px solid #f3eaee;font-size:12.5px}.empty{color:#b0948a;text-align:center}.grow{flex:1}.total td{border-top:2px solid #730042;border-bottom:0;background:#f7eef2;color:#730042;font-weight:800}.net{display:flex;align-items:center;justify-content:space-between;gap:16px;margin-top:14px;padding:14px 18px;border:1px solid #730042;border-radius:10px;background:#f7eef2}.net-label{color:#730042;font-size:12px;font-weight:800;letter-spacing:1px}.net-words{margin-top:4px;color:#6b5a54;font-size:11.5px}.net-value{color:#730042;font-size:24px;font-weight:800;white-space:nowrap}.note{margin:12px 0 0;color:#6b5a54;font-size:11.5px}.foot{margin-top:18px;padding-top:10px;border-top:1px dashed #d9c9d1;color:#8a7a74;text-align:center;font-size:10.5px}@media(max-width:720px){body{padding:8px}.sheet{padding:12px}.head{grid-template-columns:1fr;row-gap:16px;padding:14px}.meta{width:auto;flex:1 1 auto}.details{grid-template-columns:1fr}.attendance{grid-template-columns:repeat(2,1fr)}.cols{flex-direction:column}.detail span{min-width:108px}}
</style></head><body><main class="sheet"><header class="head"><div class="brand">${org.logoUrl ? `<div class="logo-frame"><img class="logo" src="${escapeHtml(org.logoUrl)}" alt="Company logo"/></div>` : ""}<div class="org-copy" style="${org.logoUrl ? "" : "padding-left:0;border-left:0"}"><p class="org">${escapeHtml(orgName || org.name || "Company")}</p>${orgDetails.map((line) => `<p class="org-line">${escapeHtml(line)}</p>`).join("")}${org.email || org.phone ? `<div class="contacts">${org.email ? contactChip("Email", org.email) : ""}${org.phone ? contactChip("Phone", org.phone) : ""}</div>` : ""}</div></div><div class="meta"><table class="title-row"><tbody><tr><td class="slip-title">PAYSLIP</td><td class="status-cell">${statusBadge(statusText, statusColors)}</td></tr></tbody></table><div class="period"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="5" width="18" height="16" rx="2"/><path d="M16 3v4M8 3v4M3 10h18"/></svg><span>For the month of<strong>${escapeHtml(period)}</strong></span></div></div></header>
<section class="box"><div class="box-title">Employee Details</div><div class="details">${detail("Employee Name", name)}${detail("Employee ID", employeeId)}${detail("Department", departmentLabel(department))}${detail("Designation", designation)}${detail("Bank Name", bankName)}${detail("Account Number", accountNumber)}</div></section>
<section class="box"><div class="box-title">Attendance Summary</div><div class="attendance">${attCell("Calendar Days", att.calendarDays ?? att.daysInMonth)}${attCell("Working Days", att.workingDays)}${attCell("Paid Days", att.paidDays)}${attCell("LOP Days", att.lopDays)}</div></section>
<div class="cols"><section class="col"><table class="grow"><thead><tr><th>Earnings</th><th class="amt">Amount</th></tr></thead><tbody>${rowHtml(earnings)}</tbody></table><table><tbody><tr class="total"><td>GROSS EARNINGS</td><td class="amt">${fmtINR(payroll.earnings?.totalEarnings)}</td></tr></tbody></table></section>${deductions.length ? `<section class="col"><table class="grow"><thead><tr><th>Deductions</th><th class="amt">Amount</th></tr></thead><tbody>${rowHtml(deductions)}</tbody></table><table><tbody><tr class="total"><td>TOTAL DEDUCTIONS</td><td class="amt">${fmtINR(payroll.deductions?.totalDeductions)}</td></tr></tbody></table></section>` : ""}</div>
<section class="net"><div><div class="net-label">NET PAY</div><div class="net-words">${escapeHtml(amountInWords(payroll.netSalary))}</div></div><div class="net-value">${fmtINR(payroll.netSalary)}</div></section>
${employerContribution.length ? `<section class="box"><div class="box-title">Employer Contributions (not deducted from salary)</div><table><tbody>${rowHtml(employerContribution)}</tbody></table></section>` : ""}${att.manualEntry ? '<p class="note">Paid Days entered manually for this pay run.</p>' : ""}${payroll.remarks ? `<p class="note"><strong>Remarks:</strong> ${escapeHtml(payroll.remarks)}</p>` : ""}<footer class="foot">This is a system-generated payslip and does not require a signature.</footer></main></body></html>`;

  await htmlToPdfDownload(html, `Payslip - ${safeFileName(name)} - ${safeFileName(period)}.pdf`);
}