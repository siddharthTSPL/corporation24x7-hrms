/**
 * Scoring logic for the Excel-style Performance Review
 * ("1-SS-Simple-Performance-Review-Template.xlsx").
 *
 * The reviewer grades 14 "Plus Points" (positive traits) and 14 "Minus
 * Points" (negative behaviours) — each on a 1-5 scale. See
 * utils/reviewCriteria.utils.js for the fixed list of criteria.
 *
 *   Plus Point grade:  5 = excellent ... 1 = poor        (higher = better)
 *   Minus Point grade: 1 = rarely/never happens (good)
 *                       5 = severe / frequent occurrence (bad)
 *
 * To combine both into one 1-5 "goodness" score, each Minus grade is
 * inverted first: invertedGrade = 6 - grade. Overall score is then the
 * simple average of all 28 grades (14 plus + 14 inverted-minus), rounded
 * to 1 decimal place.
 *
 * ASSUMPTION (not in the source spreadsheet, which only had a manual
 * "OVERALL PERFORMANCE RATING 1-5" cell): equal weighting across all 28
 * criteria. Adjust here if the business wants Plus/Minus weighted
 * differently.
 */

const { PLUS_KEYS, MINUS_KEYS } = require("./reviewCriteria.utils");

const round1 = (n) => Math.round(n * 10) / 10;

// Overall rating bands on the 1-5 scale.
const OVERALL_BANDS = [
  { min: 4.5, rating: "Excellent" },
  { min: 3.5, rating: "Very Good" },
  { min: 2.5, rating: "Good" },
  { min: 1.5, rating: "Average" },
  { min: -Infinity, rating: "Poor" },
];

function bandFor(bands, value) {
  return bands.find((b) => value >= b.min);
}

function validateGrade(key, grade) {
  const g = Number(grade);
  if (!Number.isFinite(g) || g < 1 || g > 5) {
    throw Object.assign(new Error(`"${key}" grade must be a number between 1 and 5`), {
      statusCode: 400,
    });
  }
  return g;
}

/**
 * Validates + normalises the plusPoints / minusPoints arrays coming from
 * the request body, e.g.:
 *   plusPoints: [{ key: "targetAchievement", grade: 4 }, ...]   (all 14 keys required)
 *   minusPoints: [{ key: "missedTargets", grade: 1 }, ...]      (all 14 keys required)
 */
function normalisePoints(points, requiredKeys, label) {
  if (!Array.isArray(points) || points.length !== requiredKeys.length) {
    throw Object.assign(
      new Error(`${label} must include a grade (1-5) for all ${requiredKeys.length} criteria`),
      { statusCode: 400 },
    );
  }

  const seen = new Set();
  const normalised = requiredKeys.map((key) => {
    const entry = points.find((p) => p.key === key);
    if (!entry) {
      throw Object.assign(new Error(`Missing "${key}" in ${label}`), { statusCode: 400 });
    }
    seen.add(key);
    return { key, grade: validateGrade(key, entry.grade) };
  });

  if (seen.size !== requiredKeys.length) {
    throw Object.assign(new Error(`${label} contains duplicate or unknown criteria keys`), {
      statusCode: 400,
    });
  }

  return normalised;
}

/**
 * Computes the overall 1-5 score + rating from plusPoints / minusPoints.
 * Returns the normalised arrays too, so the controller can save exactly
 * what was validated.
 */
function computeOverallFromPoints({ plusPoints, minusPoints }) {
  const plus = normalisePoints(plusPoints, PLUS_KEYS, "plusPoints");
  const minus = normalisePoints(minusPoints, MINUS_KEYS, "minusPoints");

  const plusSum = plus.reduce((sum, p) => sum + p.grade, 0);
  const invertedMinusSum = minus.reduce((sum, m) => sum + (6 - m.grade), 0);

  const totalCriteria = plus.length + minus.length;
  const overallScore = round1((plusSum + invertedMinusSum) / totalCriteria);
  const band = bandFor(OVERALL_BANDS, overallScore);

  return {
    plusPoints: plus,
    minusPoints: minus,
    overallScore,
    overallRating: band.rating,
  };
}

module.exports = {
  computeOverallFromPoints,
  normalisePoints,
  OVERALL_BANDS,
};