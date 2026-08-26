const { PLUS_CRITERIA, MINUS_CRITERIA } = require("../utils/reviewCriteria.utils");


const getReviewCriteria = async (req, res, next) => {
  res.status(200).json({
    success: true,
    plusPoints: PLUS_CRITERIA,
    minusPoints: MINUS_CRITERIA,
  });
};

module.exports = { getReviewCriteria };