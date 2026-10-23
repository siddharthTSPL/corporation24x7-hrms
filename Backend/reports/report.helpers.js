const mongoose = require("mongoose");

// Your schemas use organisation_id (ObjectId) as the company field
const COMPANY_FIELD = "organisation_id";
const COMPANY_IS_OBJECT_ID = true;

/**
 * Use as the first $match / find filter in EVERY report query.
 * The organisation id comes from the logged-in admin, never from the request body.
 */
function companyScope(ctx, extra = {}) {
  const value = COMPANY_IS_OBJECT_ID
    ? new mongoose.Types.ObjectId(ctx.companyId)
    : ctx.companyId;
  return { [COMPANY_FIELD]: value, ...extra };
}

/** Builds { $gte, $lte } only for the dates provided */
function dateRange(from, to) {
  const r = {};
  if (from) r.$gte = from;
  if (to) {
    const end = new Date(to);
    end.setHours(23, 59, 59, 999); // include the whole "to" day
    r.$lte = end;
  }
  return Object.keys(r).length ? r : undefined;
}

module.exports = { companyScope, dateRange };
