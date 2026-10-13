const round = (n) => Math.round(Number(n) || 0);

const DEFAULT_OPTIONS = {
  basic_percent: 40,
  hra_percent_of_basic: 50,
  conveyance_annual: 19200,
  lta_percent_of_basic: 0,
  variable_percent_of_ctc: 0,
  pf_mode: "CAPPED",
  pf_wage_ceiling_monthly: 15000,
  include_gratuity: true,
  include_insurance: true,
  insurance_annual: 6000,
  professional_tax_monthly: 200,
};

const mergeOptions = (options = {}) => {
  const merged = { ...DEFAULT_OPTIONS };
  Object.keys(DEFAULT_OPTIONS).forEach((key) => {
    if (options[key] !== undefined && options[key] !== null && options[key] !== "") {
      merged[key] = typeof DEFAULT_OPTIONS[key] === "boolean" ? Boolean(options[key]) : typeof DEFAULT_OPTIONS[key] === "string" ? String(options[key]) : Number(options[key]);
    }
  });
  return merged;
};

const employerPfAnnual = (basicAnnual, opts) => {
  const basicMonthly = basicAnnual / 12;
  if (opts.pf_mode === "NONE") return 0;
  const wage = opts.pf_mode === "ACTUAL" ? basicMonthly : Math.min(basicMonthly, opts.pf_wage_ceiling_monthly);
  return round(wage * 0.12 * 12);
};

const gratuityAnnual = (basicAnnual, opts) => (opts.include_gratuity ? round((basicAnnual * 15) / 26 / 12) : 0);

const build = (annualCtc, opts, overrides) => {
  const variable = overrides.variable !== undefined ? round(overrides.variable) : round((annualCtc * opts.variable_percent_of_ctc) / 100);
  const insurance = opts.include_insurance ? (overrides.insurance !== undefined ? round(overrides.insurance) : round(opts.insurance_annual)) : 0;
  let basic = overrides.basic !== undefined ? round(overrides.basic) : round((annualCtc * opts.basic_percent) / 100);
  let hra = overrides.hra !== undefined ? round(overrides.hra) : round((basic * opts.hra_percent_of_basic) / 100);
  let conveyance = overrides.conveyance !== undefined ? round(overrides.conveyance) : round(opts.conveyance_annual);
  const lta = overrides.lta !== undefined ? round(overrides.lta) : round((basic * opts.lta_percent_of_basic) / 100);
  const pf = overrides.employer_pf !== undefined ? round(overrides.employer_pf) : employerPfAnnual(basic, opts);
  const gratuity = overrides.gratuity !== undefined ? round(overrides.gratuity) : gratuityAnnual(basic, opts);
  return { basic, hra, conveyance, lta, variable, insurance, pf, gratuity };
};

const calculateCtc = ({ annual_ctc, options = {}, overrides = {} }) => {
  const annualCtc = round(annual_ctc);
  if (!annualCtc || annualCtc <= 0) {
    const err = new Error("Annual CTC must be greater than zero");
    err.statusCode = 400;
    throw err;
  }

  const opts = mergeOptions(options);
  let parts = build(annualCtc, opts, overrides);

  const fixedTotal = () => parts.basic + parts.hra + parts.conveyance + parts.lta + parts.variable + parts.insurance + parts.pf + parts.gratuity;
  let special = annualCtc - fixedTotal();

  if (special < 0 && overrides.conveyance === undefined) {
    parts.conveyance = 0;
    special = annualCtc - fixedTotal();
  }
  if (special < 0 && overrides.hra === undefined) {
    const shortfall = -special;
    parts.hra = Math.max(0, parts.hra - shortfall);
    special = annualCtc - fixedTotal();
  }
  if (special < 0) {
    const err = new Error("CTC is too low for the selected salary structure. Reduce fixed components or increase CTC");
    err.statusCode = 400;
    throw err;
  }

  const special_allowance = overrides.special_allowance !== undefined ? round(overrides.special_allowance) : special;
  const totalFromParts = fixedTotal() + special_allowance;
  if (overrides.special_allowance !== undefined && totalFromParts !== annualCtc) {
    const err = new Error(`Components add up to ${totalFromParts} but CTC is ${annualCtc}`);
    err.statusCode = 400;
    throw err;
  }

  const monthly = (annual) => round(annual / 12);

  const components = [
    { key: "basic", label: "Basic Salary", type: "earning", annual: parts.basic },
    { key: "hra", label: "House Rent Allowance (HRA)", type: "earning", annual: parts.hra },
    { key: "conveyance", label: "Conveyance Allowance", type: "earning", annual: parts.conveyance },
    ...(parts.lta > 0 ? [{ key: "lta", label: "Leave Travel Allowance (LTA)", type: "earning", annual: parts.lta }] : []),
    { key: "special_allowance", label: "Special Allowance", type: "earning", annual: special_allowance },
  ]
    .filter((c) => c.annual > 0 || c.key === "basic")
    .map((c) => ({ ...c, monthly: monthly(c.annual) }));

  const grossFixedAnnual = components.reduce((sum, c) => sum + c.annual, 0);

  const employer = [
    { key: "employer_pf", label: "Employer PF Contribution", type: "employer", annual: parts.pf },
    { key: "gratuity", label: "Gratuity", type: "employer", annual: parts.gratuity },
    { key: "insurance", label: "Group Medical Insurance", type: "employer", annual: parts.insurance },
  ]
    .filter((c) => c.annual > 0)
    .map((c) => ({ ...c, monthly: monthly(c.annual) }));

  const variableComponent = parts.variable > 0 ? [{ key: "variable", label: "Performance Variable Pay", type: "variable", annual: parts.variable, monthly: monthly(parts.variable) }] : [];

  const employeePfAnnual = opts.pf_mode === "NONE" ? 0 : parts.pf;
  const professionalTaxAnnual = round(opts.professional_tax_monthly * 12);
  const deductions = [
    { key: "employee_pf", label: "Employee PF Contribution", type: "deduction", annual: employeePfAnnual },
    { key: "professional_tax", label: "Professional Tax", type: "deduction", annual: professionalTaxAnnual },
  ]
    .filter((c) => c.annual > 0)
    .map((c) => ({ ...c, monthly: monthly(c.annual) }));

  const totalDeductionsAnnual = deductions.reduce((sum, c) => sum + c.annual, 0);
  const netAnnual = grossFixedAnnual - totalDeductionsAnnual;

  return {
    currency: "INR",
    annual_ctc: annualCtc,
    monthly_ctc: monthly(annualCtc),
    options: opts,
    components: [...components, ...variableComponent, ...employer, ...deductions],
    gross_fixed_annual: grossFixedAnnual,
    gross_fixed_monthly: monthly(grossFixedAnnual),
    total_deductions_annual: totalDeductionsAnnual,
    net_take_home_annual: netAnnual,
    net_take_home_monthly: monthly(netAnnual),
  };
};

const ONES = ["", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine", "Ten", "Eleven", "Twelve", "Thirteen", "Fourteen", "Fifteen", "Sixteen", "Seventeen", "Eighteen", "Nineteen"];
const TENS = ["", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety"];

const belowThousand = (n) => {
  let out = "";
  if (n >= 100) {
    out += `${ONES[Math.floor(n / 100)]} Hundred`;
    n %= 100;
    if (n) out += " ";
  }
  if (n >= 20) {
    out += TENS[Math.floor(n / 10)];
    if (n % 10) out += ` ${ONES[n % 10]}`;
  } else if (n > 0) {
    out += ONES[n];
  }
  return out;
};

const amountInWords = (value) => {
  let n = Math.floor(Math.abs(Number(value) || 0));
  if (n === 0) return "Zero Rupees Only";
  const parts = [];
  const crore = Math.floor(n / 10000000);
  n %= 10000000;
  const lakh = Math.floor(n / 100000);
  n %= 100000;
  const thousand = Math.floor(n / 1000);
  n %= 1000;
  if (crore) parts.push(`${belowThousand(crore)} Crore`);
  if (lakh) parts.push(`${belowThousand(lakh)} Lakh`);
  if (thousand) parts.push(`${belowThousand(thousand)} Thousand`);
  if (n) parts.push(belowThousand(n));
  return `${parts.join(" ")} Rupees Only`;
};

const formatInr = (value) => `Rs. ${Math.round(Number(value) || 0).toLocaleString("en-IN")}`;

module.exports = { calculateCtc, amountInWords, formatInr, DEFAULT_OPTIONS };