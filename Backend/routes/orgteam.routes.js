const express = require("express");
const orgTeamRouter = express.Router();

const asyncHandler = require("../middleware/errorhandling/asynchandler");
const adminOrSuperAdminAuth = require("../middleware/auth/adminOrSuperadmin.middleware");
const { getTeams, setHRTeam, saveITTeam, saveAccountsTeam } = require("../controllers/orgteam.controller");

// TorchX Management -> Teams. Admin and SuperAdmin can both configure.
orgTeamRouter.get("/", adminOrSuperAdminAuth, asyncHandler(getTeams));
orgTeamRouter.put("/hr", adminOrSuperAdminAuth, asyncHandler(setHRTeam));
orgTeamRouter.put("/it", adminOrSuperAdminAuth, asyncHandler(saveITTeam));
orgTeamRouter.put("/accounts", adminOrSuperAdminAuth, asyncHandler(saveAccountsTeam));

module.exports = orgTeamRouter;