const TEMPLATES = {
  classic: {
    key: "classic",
    name: "Classic Corporate",
    description: "Traditional serif letterhead with a centered logo and navy accents",
    font: "Times",
    accent: "#1f3a5f",
    secondary: "#6b7a90",
    header: "centered",
    heading: "underline",
    table: "grid",
    border: "none",
    footer: "line",
  },
  modern: {
    key: "modern",
    name: "Modern Minimal",
    description: "Clean sans-serif layout with a colored top band and airy spacing",
    font: "Helvetica",
    accent: "#0f766e",
    secondary: "#64748b",
    header: "band",
    heading: "bar",
    table: "zebra",
    border: "none",
    footer: "plain",
  },
  executive: {
    key: "executive",
    name: "Executive Gold",
    description: "Premium framed page with double rule and maroon-gold palette",
    font: "Times",
    accent: "#730042",
    secondary: "#b08d57",
    header: "framed",
    heading: "smallcaps",
    table: "grid",
    border: "double",
    footer: "line",
  },
  startup: {
    key: "startup",
    name: "Startup Bright",
    description: "Friendly modern look with a left-aligned logo and vibrant violet accent",
    font: "Helvetica",
    accent: "#6d28d9",
    secondary: "#7c7c9a",
    header: "left",
    heading: "pill",
    table: "zebra",
    border: "none",
    footer: "plain",
  },
  formal: {
    key: "formal",
    name: "Formal Legal",
    description: "Black and white numbered clauses with boxed details, suited for formal contracts",
    font: "Times",
    accent: "#111111",
    secondary: "#555555",
    header: "minimal",
    heading: "numbered",
    table: "box",
    border: "thin",
    footer: "line",
  },
};

const DEFAULT_OFFER_SECTIONS = [
  {
    key: "intro",
    title: "",
    enabled: true,
    body: "Dear {{candidate_name}},\n\nWe are delighted to offer you the position of {{designation}} at {{company_name}}. Following your interviews, we were impressed with your skills and experience and we believe you will be a valuable addition to our team.\n\nThis letter sets out the principal terms of your employment with us.",
  },
  {
    key: "position",
    title: "Position and Place of Work",
    enabled: true,
    body: "- Designation: {{designation}}\n- Department: {{department}}\n- Employment Type: {{employment_type}}\n- Work Mode: {{work_mode}}\n- Work Location: {{work_location}}\n- Date of Joining: {{joining_date}}",
  },
  {
    key: "compensation",
    title: "Compensation",
    enabled: true,
    body: "Your total annual Cost to Company (CTC) will be {{annual_ctc}} ({{annual_ctc_words}}). The detailed break-up of your compensation is provided in Annexure A to this letter.\n\nSalary will be paid monthly, subject to deduction of applicable statutory taxes and contributions as per the prevailing laws.",
  },
  {
    key: "probation",
    title: "Probation",
    enabled: true,
    body: "You will be on probation for a period of {{probation_months}} months from your date of joining. Your confirmation will be subject to satisfactory performance and conduct during this period. The company may extend the probation period at its discretion.",
  },
  {
    key: "notice",
    title: "Notice Period and Termination",
    enabled: true,
    body: "Post confirmation, either party may terminate the employment by giving {{notice_period_days}} days written notice or salary in lieu thereof. During probation, the notice period shall be as per the company policy. The company reserves the right to terminate employment without notice in case of misconduct or breach of company policies.",
  },
  {
    key: "documents",
    title: "Documents Required at Joining",
    enabled: true,
    body: "Please carry the following on your date of joining:\n- Government issued photo identity and address proof\n- Educational certificates and mark sheets\n- Relieving letter and last three salary slips from previous employer, if applicable\n- Recent passport size photographs\n- Bank account details for salary credit",
  },
  {
    key: "verification",
    title: "Background Verification",
    enabled: true,
    body: "This offer is contingent upon satisfactory completion of background verification and reference checks. Any discrepancy in the information provided by you may result in withdrawal of this offer or termination of employment.",
  },
  {
    key: "confidentiality",
    title: "Confidentiality",
    enabled: true,
    body: "You will be required to maintain strict confidentiality of all proprietary and business information of {{company_name}} during and after your employment, and to comply with all company policies as amended from time to time.",
  },
  {
    key: "acceptance",
    title: "Acceptance of Offer",
    enabled: true,
    body: "This offer is valid until {{valid_till}}. To accept, please use the secure link shared with this letter or sign and return a copy of this letter before the validity date. If we do not hear from you by then, the offer will lapse automatically.\n\nWe look forward to welcoming you to {{company_name}}.",
  },
];

const DEFAULT_APPOINTMENT_SECTIONS = [
  {
    key: "intro",
    title: "",
    enabled: true,
    body: "Dear {{candidate_name}},\n\nFurther to our offer letter {{offer_ref_no}} and your acceptance thereof, we are pleased to appoint you as {{designation}} in the {{department}} department of {{company_name}}, with effect from {{joining_date}}, on the terms and conditions set out below.",
  },
  {
    key: "position",
    title: "Appointment Details",
    enabled: true,
    body: "- Designation: {{designation}}\n- Department: {{department}}\n- Employment Type: {{employment_type}}\n- Work Mode: {{work_mode}}\n- Place of Work: {{work_location}}\n- Date of Joining: {{joining_date}}",
  },
  {
    key: "compensation",
    title: "Remuneration",
    enabled: true,
    body: "Your total annual Cost to Company (CTC) will be {{annual_ctc}} ({{annual_ctc_words}}) as detailed in Annexure A. Salary is payable monthly and is subject to deduction of income tax at source and other statutory deductions.",
  },
  {
    key: "probation",
    title: "Probation and Confirmation",
    enabled: true,
    body: "You will be on probation for {{probation_months}} months from the date of joining. Confirmation will be communicated in writing on satisfactory completion of probation.",
  },
  {
    key: "duties",
    title: "Duties and Responsibilities",
    enabled: true,
    body: "You will perform the duties assigned to you by your reporting manager and the management from time to time. You shall devote your full time and attention to the company and shall not take up any other employment or business without prior written permission.",
  },
  {
    key: "leave",
    title: "Leave and Holidays",
    enabled: true,
    body: "You will be entitled to leave and holidays as per the leave policy and holiday calendar of the company in force from time to time.",
  },
  {
    key: "confidentiality",
    title: "Confidentiality and Conduct",
    enabled: true,
    body: "You shall not disclose any confidential or proprietary information of the company to any third party during or after your employment. You are expected to follow the code of conduct and all policies of the company.",
  },
  {
    key: "notice",
    title: "Termination",
    enabled: true,
    body: "After confirmation, either party may terminate this employment by giving {{notice_period_days}} days written notice or salary in lieu of notice. The company may terminate your services without notice for misconduct, breach of policy or breach of trust.",
  },
  {
    key: "general",
    title: "General",
    enabled: true,
    body: "This appointment is governed by the laws of India and is subject to the jurisdiction of the courts at {{company_city}}. Please sign and return the duplicate copy of this letter as a token of your acceptance of the above terms.\n\nWe welcome you to {{company_name}} and wish you a rewarding career with us.",
  },
];

const PLACEHOLDERS = [
  "candidate_name", "candidate_email", "candidate_phone", "designation", "department", "employment_type", "work_mode",
  "work_location", "joining_date", "letter_date", "valid_till", "annual_ctc", "annual_ctc_words", "monthly_ctc",
  "probation_months", "notice_period_days", "company_name", "company_address", "company_city", "signatory_name",
  "signatory_designation", "offer_ref_no", "ref_no",
];

const listTemplates = () => Object.values(TEMPLATES).map(({ key, name, description, accent, secondary, header, heading }) => ({ key, name, description, accent, secondary, header, heading }));

const getTemplate = (key) => TEMPLATES[key] || TEMPLATES.classic;

const cloneSections = (kind) => (kind === "APPOINTMENT" ? DEFAULT_APPOINTMENT_SECTIONS : DEFAULT_OFFER_SECTIONS).map((s) => ({ ...s }));

module.exports = { TEMPLATES, PLACEHOLDERS, listTemplates, getTemplate, cloneSections };