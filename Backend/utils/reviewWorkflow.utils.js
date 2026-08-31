const { computeOverallFromPoints } = require("./reviewScoring.utils");

const httpError = (message, statusCode) => Object.assign(new Error(message), { statusCode });

const currentMonthYear = () => {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
};

/**
 * Validates the review form body (Excel-style) and returns the fields
 * ready to pass into Review.create({ ...identityFields, ...this }).
 * Throws a 400 httpError on any validation failure.
 */
function buildReviewFields(body) {
  const {
    plusPoints,
    minusPoints,
    achievedGoals,
    nextGoals,
    developmentPlan,
    employeeComments,
    reviewerComments,
    recommendation,
    reviewPeriod,
    lastReviewDate,
    reviewerDesignation,
    revieweeDepartment,
    revieweeDesignation,
  } = body;

  const scored = computeOverallFromPoints({ plusPoints, minusPoints });

  const ALLOWED_RECOMMENDATIONS = ["Promotion", "Increment", "Training", "PIP", "No Change"];
  if (recommendation && !ALLOWED_RECOMMENDATIONS.includes(recommendation)) {
    throw httpError(`recommendation must be one of: ${ALLOWED_RECOMMENDATIONS.join(", ")}`, 400);
  }

  return {
    plusPoints: scored.plusPoints,
    minusPoints: scored.minusPoints,
    overallScore: scored.overallScore,
    overallRating: scored.overallRating,
    achievedGoals: Array.isArray(achievedGoals) ? achievedGoals : [],
    nextGoals: Array.isArray(nextGoals) ? nextGoals : [],
    developmentPlan: Array.isArray(developmentPlan) ? developmentPlan : [],
    employeeComments: employeeComments || "",
    reviewerComments: reviewerComments || "",
    recommendation: recommendation || "No Change",
    reviewPeriod: reviewPeriod || "monthly",
    lastReviewDate: lastReviewDate || undefined,
    reviewerDesignation: reviewerDesignation || "",
    revieweeDepartment: revieweeDepartment || "",
    revieweeDesignation: revieweeDesignation || "",
    monthYear: currentMonthYear(),
    status: "submitted",
  };
}

/**
 * Wraps Review.create(...) and turns the unique-index collision
 * (reviewer + reviewee + monthYear) into a friendly 400 error.
 */
async function createReviewOrThrow(Review, doc, alreadyReviewedMessage) {
  try {
    return await Review.create(doc);
  } catch (err) {
    if (err.code === 11000) {
      throw httpError(alreadyReviewedMessage, 400);
    }
    throw err;
  }
}

/**
 * Step 2 — the reviewee (employee/manager/admin) accepts or disputes the
 * review that was given to them.
 */
async function respondToReviewAsReviewee(Review, { reviewId, revieweeId, revieweeRoleModel, organisation_id, status, comment }) {
  if (!["accepted", "disputed"].includes(status)) {
    throw httpError('status must be "accepted" or "disputed"', 400);
  }

  const review = await Review.findOne({
    _id: reviewId,
    reviewee: revieweeId,
    revieweeRoleModel,
    organisation_id,
  });

  if (!review) throw httpError("Review not found", 404);

  review.revieweeAcceptance = {
    status,
    comment: comment || "",
    respondedAt: new Date(),
  };

  // Don't clobber a final HR decision if it already happened out of order.
  if (review.hrAcknowledgement?.status === "pending") {
    review.status = status === "accepted" ? "reviewee_accepted" : "reviewee_disputed";
  }

  await review.save();
  return review;
}

/**
 * Step 3 — final HR acknowledgement. Caller must have already verified
 * that the acting Admin has isHR === true.
 */
async function hrAcknowledgeReview(Review, { reviewId, hrAdminId, hrAdminModel = "Admin", organisation_id, decision, comment }) {
  if (!["approved", "rejected"].includes(decision)) {
    throw httpError('decision must be "approved" or "rejected"', 400);
  }

  const review = await Review.findOne({ _id: reviewId, organisation_id });
  if (!review) throw httpError("Review not found", 404);

  if (review.hrAcknowledgement?.status !== "pending") {
    throw httpError("This review has already received an HR decision", 400);
  }

  review.hrAcknowledgement = {
    status: decision,
    hrAdmin: hrAdminId,
    hrAdminModel,
    comment: comment || "",
    respondedAt: new Date(),
  };
  review.status = decision === "approved" ? "hr_approved" : "hr_rejected";

  await review.save();
  return review;
}

module.exports = {
  httpError,
  currentMonthYear,
  buildReviewFields,
  createReviewOrThrow,
  respondToReviewAsReviewee,
  hrAcknowledgeReview,
};