const { amountInWords, formatInr } = require("./ctcCalculator.utils");

const fmtLongDate = (d) => {
  if (!d) return "";
  const date = new Date(d);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleDateString("en-IN", { day: "2-digit", month: "long", year: "numeric", timeZone: "Asia/Kolkata" });
};

const buildContext = ({ letter, candidate, offer }) => {
  const company = letter.company || {};
  const ctc = letter.ctc || {};
  return {
    candidate_name: candidate?.full_name || "",
    candidate_email: candidate?.email || "",
    candidate_phone: candidate?.phone || "",
    designation: letter.designation || "",
    department: letter.department || "",
    employment_type: letter.employment_type || "",
    work_mode: letter.work_mode || "",
    work_location: letter.work_location || "",
    joining_date: fmtLongDate(letter.joining_date),
    letter_date: fmtLongDate(letter.letter_date),
    valid_till: fmtLongDate(letter.valid_till),
    annual_ctc: ctc.annual_ctc ? formatInr(ctc.annual_ctc) : "",
    annual_ctc_words: ctc.annual_ctc ? amountInWords(ctc.annual_ctc) : "",
    monthly_ctc: ctc.annual_ctc ? formatInr(Math.round(ctc.annual_ctc / 12)) : "",
    probation_months: String(letter.probation_months ?? ""),
    notice_period_days: String(letter.notice_period_days ?? ""),
    company_name: company.name || "",
    company_address: company.address || "",
    company_city: company.city || "",
    signatory_name: letter.signatory?.name || "",
    signatory_designation: letter.signatory?.designation || "",
    offer_ref_no: offer?.ref_no || letter.ref_no || "",
    ref_no: letter.ref_no || "",
  };
};

const resolvePlaceholders = (text, context) => {
  const unresolved = new Set();
  const resolved = String(text || "").replace(/\{\{\s*([a-z_]+)\s*\}\}/gi, (match, key) => {
    const k = key.toLowerCase();
    if (!(k in context)) {
      unresolved.add(k);
      return "";
    }
    const value = context[k];
    if (value === "" || value === undefined || value === null) unresolved.add(k);
    return value === undefined || value === null ? "" : String(value);
  });
  return { text: resolved, unresolved: [...unresolved] };
};

const resolveSections = (sections, context) => {
  const unresolved = new Set();
  const out = (sections || [])
    .filter((s) => s.enabled !== false)
    .map((s) => {
      const title = resolvePlaceholders(s.title, context);
      const body = resolvePlaceholders(s.body, context);
      title.unresolved.forEach((u) => unresolved.add(u));
      body.unresolved.forEach((u) => unresolved.add(u));
      return { key: s.key, title: title.text, body: body.text };
    });
  return { sections: out, unresolved: [...unresolved] };
};

module.exports = { buildContext, resolvePlaceholders, resolveSections, fmtLongDate };