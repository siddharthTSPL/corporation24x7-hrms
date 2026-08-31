const express = require("express");
const reviewrouter = express.Router();
const asyncHandler = require("../middleware/errorhandling/asynchandler");
const { getReviewCriteria } = require("../controllers/review.controller");

reviewrouter.get("/criteria", asyncHandler(getReviewCriteria));

module.exports = reviewrouter;