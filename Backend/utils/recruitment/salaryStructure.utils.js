const COMPONENT_TYPES = ["earning", "variable", "employer", "deduction"];
const METHODS = ["FIXED_ANNUAL", "FIXED_MONTHLY", "PERCENT_OF_CTC", "PERCENT_OF_COMPONENT", "BALANCE"];

const round = (n) => Math.round(Number(n) || 0);

const fail = (message) => {
  const err = new Error(message);
  err.statusCode = 400;
  return err;
};

const slugify = (label) =>
  String(label || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 40);

const DEFAULT_COMPONENTS = [
  { key: "basic", label: "Basic Salary", type: "earning", method: "PERCENT_OF_CTC", value: 40, ref_key: null, enabled: true },
  { key: "hra", label: "House Rent Allowance (HRA)", type: "earning", method: "PERCENT_OF_COMPONENT", value: 50, ref_key: "basic", enabled: true },
  { key: "conveyance", label: "Conveyance Allowance", type: "earning", method: "FIXED_MONTHLY", value: 1600, ref_key: null, enabled: true },
  { key: "special_allowance", label: "Special Allowance", type: "earning", method: "BALANCE", value: 0, ref_key: null, enabled: true },
  { key: "professional_tax", label: "Professional Tax", type: "deduction", method: "FIXED_MONTHLY", value: 200, ref_key: null, enabled: true },
];

const validateComponents = (input) => {
  if (!Array.isArray(input) || input.length === 0) throw fail("Add at least one salary component");
  if (input.length > 30) throw fail("A salary structure can have at most 30 components");

  const seen = new Set();
  const list = input.map((raw, i) => {
    const row = i + 1;
    const label = String(raw?.label ?? "").trim().slice(0, 60);
    if (!label) throw fail(`Component ${row}: name is required`);
    const key = slugify(raw?.key || label);
    if (!key) throw fail(`Component "${label}": name must contain letters or numbers`);
    if (seen.has(key)) throw fail(`Component "${label}": duplicate component name`);
    seen.add(key);

    const type = raw?.type;
    if (!COMPONENT_TYPES.includes(type)) throw fail(`Component "${label}": choose a valid type`);
    const method = raw?.method;
    if (!METHODS.includes(method)) throw fail(`Component "${label}": choose a valid calculation method`);

    let value = 0;
    let ref_key = null;
    if (method !== "BALANCE") {
      value = Number(raw?.value);
      if (raw?.value === "" || raw?.value === null || raw?.value === undefined || !Number.isFinite(value) || value < 0) {
        throw fail(`Component "${label}": enter a valid amount of zero or more`);
      }
      if ((method === "PERCENT_OF_CTC" || method === "PERCENT_OF_COMPONENT") && value > 100) {
        throw fail(`Component "${label}": percentage cannot be more than 100`);
      }
      value = Math.round(value * 100) / 100;
    }
    if (method === "PERCENT_OF_COMPONENT") {
      ref_key = slugify(raw?.ref_key);
      if (!ref_key) throw fail(`Component "${label}": choose the component the percentage is based on`);
    }
    if (method === "BALANCE" && type !== "earning") throw fail(`Component "${label}": only a fixed earning can balance the CTC`);

    return { key, label, type, method, value, ref_key, enabled: raw?.enabled !== false };
  });

  const active = list.filter((c) => c.enabled);
  const balances = active.filter((c) => c.method === "BALANCE");
  if (balances.length !== 1) throw fail("Exactly one active earning must be set to Balance (for example Special Allowance) so the total always matches the CTC");

  const byKey = Object.fromEntries(active.map((c) => [c.key, c]));
  active.forEach((c) => {
    if (c.method !== "PERCENT_OF_COMPONENT") return;
    const ref = byKey[c.ref_key];
    if (!ref) throw fail(`Component "${c.label}": the component it is based on is missing or disabled`);
    if (ref.key === c.key) throw fail(`Component "${c.label}": cannot be a percentage of itself`);
    if (ref.method === "BALANCE") throw fail(`Component "${c.label}": cannot be based on the balancing component`);
    if (ref.type === "deduction") throw fail(`Component "${c.label}": cannot be based on a deduction`);
  });

  order(active);
  return list;
};

const order = (active) => {
  const byKey = Object.fromEntries(active.map((c) => [c.key, c]));
  const done = new Set();
  const sorted = [];
  const visiting = new Set();
  const visit = (c) => {
    if (done.has(c.key)) return;
    if (visiting.has(c.key)) throw fail(`Component "${c.label}": circular calculation between components`);
    visiting.add(c.key);
    if (c.method === "PERCENT_OF_COMPONENT") visit(byKey[c.ref_key]);
    visiting.delete(c.key);
    done.add(c.key);
    sorted.push(c);
  };
  active.forEach(visit);
  return sorted;
};

const computeBreakup = ({ annual_ctc, components, overrides = {} }) => {
  const annualCtc = round(annual_ctc);
  if (!annualCtc || annualCtc <= 0) throw fail("Annual CTC must be greater than zero");

  const config = validateComponents(components);
  const active = config.filter((c) => c.enabled);
  const sorted = order(active);
  const amounts = {};

  sorted
    .filter((c) => c.method !== "BALANCE")
    .forEach((c) => {
      if (overrides[c.key] !== undefined && overrides[c.key] !== null && overrides[c.key] !== "") {
        const o = Number(overrides[c.key]);
        if (!Number.isFinite(o) || o < 0) throw fail(`Invalid amount for ${c.label}`);
        amounts[c.key] = round(o);
        return;
      }
      if (c.method === "FIXED_ANNUAL") amounts[c.key] = round(c.value);
      else if (c.method === "FIXED_MONTHLY") amounts[c.key] = round(c.value) * 12;
      else if (c.method === "PERCENT_OF_CTC") amounts[c.key] = round((annualCtc * c.value) / 100);
      else amounts[c.key] = round((amounts[c.ref_key] * c.value) / 100);
    });

  const balance = active.find((c) => c.method === "BALANCE");
  const costTotal = active.filter((c) => c.type !== "deduction" && c.method !== "BALANCE").reduce((s, c) => s + amounts[c.key], 0);
  const balanceAmount = annualCtc - costTotal;
  if (balanceAmount < 0) {
    throw fail(`Components add up to Rs. ${costTotal.toLocaleString("en-IN")} which is Rs. ${(-balanceAmount).toLocaleString("en-IN")} more than the CTC of Rs. ${annualCtc.toLocaleString("en-IN")}. Reduce the components or increase the CTC`);
  }
  amounts[balance.key] = balanceAmount;

  const monthly = (annual) => round(annual / 12);
  const rows = (type) =>
    active
      .filter((c) => c.type === type && (amounts[c.key] > 0))
      .map((c) => ({ key: c.key, label: c.label, type: c.type, annual: amounts[c.key], monthly: monthly(amounts[c.key]) }));

  const earnings = rows("earning");
  const variable = rows("variable");
  const employer = rows("employer");
  const deductions = rows("deduction");

  const sum = (list) => list.reduce((s, c) => s + c.annual, 0);
  const grossFixedAnnual = sum(earnings);
  const reconciled = grossFixedAnnual + sum(variable) + sum(employer);
  if (reconciled !== annualCtc) throw fail(`Calculation mismatch: breakup totals Rs. ${reconciled.toLocaleString("en-IN")} but the CTC is Rs. ${annualCtc.toLocaleString("en-IN")}`);

  const totalDeductionsAnnual = sum(deductions);
  const netAnnual = grossFixedAnnual - totalDeductionsAnnual;

  return {
    currency: "INR",
    source: "COMPANY_CONFIG",
    config,
    annual_ctc: annualCtc,
    monthly_ctc: monthly(annualCtc),
    options: {},
    components: [...earnings, ...variable, ...employer, ...deductions],
    gross_fixed_annual: grossFixedAnnual,
    gross_fixed_monthly: monthly(grossFixedAnnual),
    total_deductions_annual: totalDeductionsAnnual,
    net_take_home_annual: netAnnual,
    net_take_home_monthly: monthly(netAnnual),
  };
};

module.exports = { COMPONENT_TYPES, METHODS, DEFAULT_COMPONENTS, validateComponents, computeBreakup };