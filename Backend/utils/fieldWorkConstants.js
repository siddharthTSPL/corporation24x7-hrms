// Central place for Field Work Management business-rule constants.
// Per spec section 48 ("Code Quality") — no magic numbers scattered across
// the controller. Anything here is safe to tune without hunting through
// fieldOperations.controller.js.

// ── Checkpoint (periodic in-field verification) ────────────────────────────
const FIELD_CHECKPOINT_INTERVAL_MINUTES = 120; // every 2 hours
const FIELD_CHECKPOINT_GRACE_PERIOD_MINUTES = 15; // grace before "overdue"

// ── Minimum activity duration ───────────────────────────────────────────────
// Only "meeting" and "customer_visit" have a hard minimum by default; every
// other activity type can be ended immediately. An organisation can override
// any of these via field_operations.min_duration_overrides (minutes) without
// a code change.
const DEFAULT_MIN_DURATION_MINUTES = {
  meeting: 20,
  customer_visit: 20,
  service: 0,
  survey: 0,
  collection: 0,
  delivery: 0,
  installation: 0,
  follow_up: 0,
  other: 0,
};

const ACTIVITY_TYPES = [
  "customer_visit",
  "meeting",
  "service",
  "survey",
  "collection",
  "delivery",
  "installation",
  "follow_up",
  "other",
];

const ASSIGNMENT_TYPES = ["open", "assigned"];

// Individual/team field-work assignment state — mirrors spec section 5.
const FIELD_ASSIGNMENT_STATES = ["none", "team", "individual"];

const GEOFENCE_MODES = ["off", "warning", "strict"];

const ACTIVITY_PRIORITIES = ["low", "medium", "high"];

function resolveMinDurationMinutes(activityType, overrides = {}) {
  const key = ACTIVITY_TYPES.includes(activityType) ? activityType : "other";
  const overrideValue = Number(overrides?.[key]);
  if (Number.isFinite(overrideValue) && overrideValue >= 0)
    return overrideValue;
  return DEFAULT_MIN_DURATION_MINUTES[key] ?? 0;
}

module.exports = {
  FIELD_CHECKPOINT_INTERVAL_MINUTES,
  FIELD_CHECKPOINT_GRACE_PERIOD_MINUTES,
  DEFAULT_MIN_DURATION_MINUTES,
  ACTIVITY_TYPES,
  ASSIGNMENT_TYPES,
  FIELD_ASSIGNMENT_STATES,
  GEOFENCE_MODES,
  ACTIVITY_PRIORITIES,
  resolveMinDurationMinutes,
};
