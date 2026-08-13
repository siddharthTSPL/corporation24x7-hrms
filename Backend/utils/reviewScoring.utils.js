/**
 * Shared scoring logic for the 3-parameter Review system:
 *   1. Task Submission  -> manager enters assignedDays + actualDays, system computes % + rating + score
 *   2. Behaviour & Ethics -> manager enters score (out of 10) directly, no auto calculation
 *   3. Attendance        -> system auto-fetches from AttendanceSummary and computes % + rating + score
 *
 * Rating bands (Task Submission - performance % = assignedDays / actualDays * 100):
 *   140%+     -> Excellent  -> 10
 *   110-139%  -> Very Good  -> 8
 *   90-109%   -> Good       -> 6
 *   70-89%    -> Average    -> 4
 *   <70%      -> Poor       -> 2
 *
 * Rating bands (Attendance %):
 *   95%+      -> Excellent  -> 10
 *   85-94%    -> Very Good  -> 8
 *   75-84%    -> Good       -> 6
 *   60-74%    -> Average    -> 4
 *   <60%      -> Poor       -> 2
 *
 * NOTE: Attendance bands were proposed but not explicitly confirmed by the
 * user in the latest session (only Task Submission bands were confirmed).
 * Adjust ATTENDANCE_BANDS below if different thresholds are wanted.
 */

const round1 = (n) => Math.round(n * 10) / 10;

const TASK_BANDS = [
  { min: 140, rating: "Excellent", score: 10 },
  { min: 110, rating: "Very Good", score: 8 },
  { min: 90, rating: "Good", score: 6 },
  { min: 70, rating: "Average", score: 4 },
  { min: -Infinity, rating: "Poor", score: 2 },
];

const ATTENDANCE_BANDS = [
  { min: 95, rating: "Excellent", score: 10 },
  { min: 85, rating: "Very Good", score: 8 },
  { min: 75, rating: "Good", score: 6 },
  { min: 60, rating: "Average", score: 4 },
  { min: -Infinity, rating: "Poor", score: 2 },
];

// Overall rating from the final averaged score (out of 10).
const OVERALL_BANDS = [
  { min: 9, rating: "Excellent" },
  { min: 7, rating: "Very Good" },
  { min: 5, rating: "Good" },
  { min: 3, rating: "Average" },
  { min: -Infinity, rating: "Poor" },
];

function bandFor(bands, value) {
  return bands.find((b) => value >= b.min);
}

/**
 * Task Submission: assignedDays (target) / actualDays (actual days taken) * 100
 */
function computeTaskSubmission(assignedDays, actualDays) {
  const a = Number(assignedDays);
  const b = Number(actualDays);
  if (!a || !b || a <= 0 || b <= 0) {
    throw Object.assign(new Error("assignedDays and actualDays must be positive numbers"), {
      statusCode: 400,
    });
  }
  const percentage = round1((a / b) * 100);
  const band = bandFor(TASK_BANDS, percentage);
  return { assignedDays: a, actualDays: b, percentage, rating: band.rating, score: band.score };
}

/**
 * Attendance: presentDays (+ half days counted as 0.5) / total recorded working
 * days (present + half + absent, excluding week-off/holiday) * 100.
 */
function computeAttendance({ presentDays = 0, halfDays = 0, absentDays = 0 } = {}) {
  const effectivePresent = presentDays + halfDays * 0.5;
  const totalWorkingDays = presentDays + halfDays + absentDays;
  const percentage = totalWorkingDays > 0 ? round1((effectivePresent / totalWorkingDays) * 100) : 0;
  const band = bandFor(ATTENDANCE_BANDS, percentage);
  return {
    presentDays,
    halfDays,
    absentDays,
    totalWorkingDays,
    percentage,
    rating: band.rating,
    score: band.score,
  };
}

/**
 * Behaviour & Ethics: manager gives the score directly (out of 10), no auto logic.
 * Still map it to a rating label for display consistency.
 */
function computeBehaviour(score) {
  const s = Number(score);
  if (s === undefined || s === null || Number.isNaN(s) || s < 0 || s > 10) {
    throw Object.assign(new Error("Behaviour & Ethics score must be a number between 0 and 10"), {
      statusCode: 400,
    });
  }
  const band = bandFor(OVERALL_BANDS, s);
  return { score: round1(s), rating: band.rating };
}

/**
 * Overall = simple average of the 3 scores (out of 10), rounded to 1 decimal.
 * NOTE: equal weighting was the last-discussed default; no explicit weights
 * (e.g. task 50% / attendance 30% / behaviour 20%) were confirmed.
 */
function computeOverall({ taskScore, behaviourScore, attendanceScore }) {
  const avg = round1((taskScore + behaviourScore + attendanceScore) / 3);
  const band = bandFor(OVERALL_BANDS, avg);
  return { score: avg, rating: band.rating };
}

module.exports = {
  computeTaskSubmission,
  computeAttendance,
  computeBehaviour,
  computeOverall,
  TASK_BANDS,
  ATTENDANCE_BANDS,
  OVERALL_BANDS,
};