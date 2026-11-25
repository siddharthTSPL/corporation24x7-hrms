const express = require("express");
const anyRoleAuth = require("../middleware/auth/Anyrole.middleware");
const u = require("../controllers/gamification.controller");
const a = require("../controllers/gamificationAdmin.controller");
const { isOrgEnabled } = require("../utils/gamification/settings");

const router = express.Router();
router.use(anyRoleAuth);

// Master switch: the SuperAdmin must turn Rewards & Gamification on for the
// organisation. Until then everything is blocked except GET /me, which just
// tells the UI `enabled: false` so it can hide the module.
router.use(async (req, res, next) => {
  try {
    if (req.method === "GET" && req.path === "/me") return next();
    if (await isOrgEnabled(req.actor.organisation_id)) return next();
    return res.status(403).json({ success: false, code: "GAMIFICATION_DISABLED", message: "Rewards & Gamification is not enabled for your organisation." });
  } catch (e) { return next(e); }
});

// Admin-level only (admin, senior admin, super admin).
const adminOnly = (req, res, next) => {
  if (["admin", "senior_admin", "super_admin"].includes(req.actor.role)) return next();
  return res.status(403).json({ success: false, message: "Admin access required." });
};

// ── everyone ──
router.get("/me", u.me);
router.get("/hub", u.hub);
router.get("/meta", u.meta);
router.get("/history", u.history);
router.patch("/prefs", u.updatePrefs);

router.get("/badges", u.badges);
router.post("/badges/seen", u.badgesSeen);

router.get("/leaderboard", u.leaderboard);
router.get("/feed", u.feed);
router.get("/seasons", u.seasons);

router.get("/quests", u.quests);
router.post("/quests/claim-all", u.questClaimAll);
router.post("/quests/:id/claim", u.questClaim);


router.get("/challenges", u.challenges);
router.get("/challenges/:id/board", u.challengeBoard);
router.post("/challenges/:id/join", u.challengeJoin);
router.post("/challenges/:id/claim", u.challengeClaim);

router.get("/store", u.store);
router.get("/store/redemptions", u.myRedemptions);
router.post("/store/redemptions/:id/cancel", u.cancelRedemption);
router.post("/store/:id/redeem", u.redeem);

router.get("/kudos/meta", u.kudosMeta);
router.get("/kudos/people", u.kudosPeople);
router.get("/kudos", u.kudosFeed);
router.post("/kudos", u.kudosGive);
router.post("/kudos/:id/react", u.kudosReact);
router.post("/kudos/:id/comment", u.kudosComment);

// managers (own reportees) and admins
router.get("/team", u.team);
router.post("/award", u.manualAward);

// ── admin ──
router.get("/admin/settings", adminOnly, a.getSettings);
router.put("/admin/settings", adminOnly, a.updateSettings);
router.post("/admin/settings/reset-rules", adminOnly, a.resetRules);
router.get("/admin/analytics", adminOnly, a.analytics);
router.get("/admin/export", adminOnly, a.exportCsv);

router.get("/admin/participants", adminOnly, a.participants);
router.patch("/admin/participants/:key", adminOnly, a.updateParticipant);
router.post("/admin/adjust", adminOnly, a.adjust);

router.get("/admin/badges", adminOnly, a.listBadges);
router.post("/admin/badges", adminOnly, a.createBadge);
router.put("/admin/badges/:id", adminOnly, a.updateBadge);
router.delete("/admin/badges/:id", adminOnly, a.deleteBadge);
router.post("/admin/badges/grant", adminOnly, a.grantBadge);
router.post("/admin/badges/revoke", adminOnly, a.revokeBadge);

router.get("/admin/quests", adminOnly, a.listQuests);
router.post("/admin/quests", adminOnly, a.createQuest);
router.put("/admin/quests/:id", adminOnly, a.updateQuest);
router.delete("/admin/quests/:id", adminOnly, a.deleteQuest);

router.get("/admin/challenges", adminOnly, a.listChallenges);
router.post("/admin/challenges", adminOnly, a.createChallenge);
router.put("/admin/challenges/:id", adminOnly, a.updateChallenge);
router.post("/admin/challenges/:id/finalise", adminOnly, a.finaliseChallenge);
router.post("/admin/challenges/:id/cancel", adminOnly, a.cancelChallenge);

router.get("/admin/rewards", adminOnly, a.listRewards);
router.post("/admin/rewards/seed", adminOnly, a.seedRewards);
router.post("/admin/rewards", adminOnly, a.createReward);
router.put("/admin/rewards/:id", adminOnly, a.updateReward);
router.delete("/admin/rewards/:id", adminOnly, a.deleteReward);
router.get("/admin/redemptions", adminOnly, a.listRedemptions);
router.patch("/admin/redemptions/:id", adminOnly, a.decideRedemption);

router.get("/admin/seasons", adminOnly, a.listSeasons);
router.post("/admin/seasons", adminOnly, a.createSeason);
router.post("/admin/seasons/:id/finalise", adminOnly, a.finaliseSeason);
router.delete("/admin/seasons/:id", adminOnly, a.deleteSeason);


router.patch("/admin/kudos/:id", adminOnly, a.moderateKudos);

module.exports = router;
