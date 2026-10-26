const mongoose = require("mongoose");
const { httpError } = require("./errors");
const { parseDateStrict, parseMonthStrict } = require("./dates");

const MAX_TEXT = 100;
const MAX_IDS = 500;

/**
 * Filter schema entry:
 *   { key, label, type, required?, default?, options?, lookup?, multi? }
 * type: date | month | select | multiselect | employee | employees | text | boolean
 * Unknown keys sent by a client are dropped, so nothing unvalidated ever
 * reaches a Mongo query.
 */
function normalizeFilters(def, raw = {}) {
  const input = raw && typeof raw === "object" ? raw : {};
  const out = {};

  for (const f of def.filters || []) {
    let v = input[f.key];
    const empty = v === undefined || v === null || v === "" || (Array.isArray(v) && v.length === 0);
    if (empty) {
      v = typeof f.default === "function" ? f.default() : f.default;
    }
    const stillEmpty = v === undefined || v === null || v === "" || (Array.isArray(v) && v.length === 0);
    if (stillEmpty) {
      if (f.required) throw httpError(400, `${f.label} is required.`);
      continue;
    }

    switch (f.type) {
      case "date":
        parseDateStrict(v, f.label); // validate only; definitions parse as needed
        out[f.key] = String(v).trim();
        break;
      case "month":
        parseMonthStrict(v, f.label);
        out[f.key] = String(v).trim();
        break;
      case "boolean":
        out[f.key] = v === true || v === "true" || v === 1 || v === "1";
        break;
      case "text":
        out[f.key] = String(v).trim().slice(0, MAX_TEXT);
        break;
      case "select": {
        const s = String(v);
        if (f.options && !f.options.some((o) => o.value === s)) {
          throw httpError(400, `Invalid value for ${f.label}.`);
        }
        out[f.key] = s.slice(0, MAX_TEXT);
        break;
      }
      case "multiselect": {
        const arr = (Array.isArray(v) ? v : [v]).map((x) => String(x).slice(0, MAX_TEXT));
        if (f.options) {
          const allowed = new Set(f.options.map((o) => o.value));
          if (arr.some((x) => !allowed.has(x))) throw httpError(400, `Invalid value for ${f.label}.`);
        }
        out[f.key] = [...new Set(arr)];
        break;
      }
      case "employee":
      case "employees": {
        const arr = (Array.isArray(v) ? v : [v]).map(String);
        if (arr.length > MAX_IDS) throw httpError(400, `Too many ${f.label} values (max ${MAX_IDS}).`);
        if (arr.some((x) => !mongoose.Types.ObjectId.isValid(x) || String(new mongoose.Types.ObjectId(x)) !== x)) {
          throw httpError(400, `Invalid ${f.label} id.`);
        }
        out[f.key] = f.type === "employee" ? arr.slice(0, 1) : [...new Set(arr)];
        break;
      }
      default:
        throw httpError(500, `Unsupported filter type: ${f.type}`);
    }
  }

  if (typeof def.validate === "function") def.validate(out);
  return out;
}

/** Human readable "Label: value" lines for Excel header + on-screen meta. */
function describeFilters(def, filters, labels = {}) {
  const lines = [];
  for (const f of def.filters || []) {
    const v = filters[f.key];
    if (v === undefined || v === null || (Array.isArray(v) && !v.length)) continue;
    let shown;
    if (f.type === "boolean") shown = v ? "Yes" : "No";
    else if (Array.isArray(v)) {
      shown = v
        .map((x) => f.options?.find((o) => o.value === x)?.label || labels[x] || x)
        .join(", ");
    } else {
      shown = f.options?.find((o) => o.value === v)?.label || labels[v] || v;
    }
    lines.push(`${f.label}: ${shown}`);
  }
  return lines;
}

module.exports = { normalizeFilters, describeFilters };
