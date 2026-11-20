// Badge catalogue — generated from "families" so every family has several
// tiers (bronze → diamond). Criteria types:
//   stat      : profile.stats[stat] >= min          (counts of events)
//   streak    : profile.streaks[name].longest >= min
//   level     : profile.level >= min
//   xp        : profile.xp >= min
//   all       : every stat in `stats` >= 1          (composite "all-rounder")
//   manual    : only granted by admins / system code
const TIERS = ["bronze", "silver", "gold", "platinum", "diamond"];
const TIER_REWARD = {
  bronze: { xp: 25, coins: 5 },
  silver: { xp: 50, coins: 10 },
  gold: { xp: 100, coins: 20 },
  platinum: { xp: 200, coins: 40 },
  diamond: { xp: 400, coins: 80 },
  special: { xp: 150, coins: 30 },
};
const TIER_COLOR = {
  bronze: "#b4763c",
  silver: "#9aa5b1",
  gold: "#e0a800",
  platinum: "#2fb5c4",
  diamond: "#4f7cff",
  special: "#c026d3",
};

// [familyKey, name, icon, category, criteriaFactory, thresholds[], descriptionTemplate]
const FAMILIES = [
  ["attendance_days", "Regular", "clock", "attendance", (n) => ({ type: "stat", stat: "attendance_checkin", min: n }), [1, 25, 100, 250, 500], (n) => `Check in on ${n} day${n > 1 ? "s" : ""}`],
  ["on_time", "Punctual", "timer", "attendance", (n) => ({ type: "stat", stat: "attendance_ontime", min: n }), [10, 50, 150, 300, 600], (n) => `Be on time ${n} times`],
  ["full_days", "Day Closer", "check", "attendance", (n) => ({ type: "stat", stat: "attendance_checkout", min: n }), [5, 30, 100, 250, 500], (n) => `Complete ${n} full working days`],
  ["att_streak", "Consistency", "flame", "attendance", (n) => ({ type: "streak", name: "attendance", min: n }), [3, 7, 14, 30, 60], (n) => `Maintain a ${n}-day attendance streak`],
  ["perfect_week", "Perfect Week", "calendar", "attendance", (n) => ({ type: "stat", stat: "attendance_perfect_week", min: n }), [1, 4, 12, 26, 52], (n) => `${n} perfect attendance week${n > 1 ? "s" : ""}`],
  ["perfect_month", "Perfect Month", "calendar", "attendance", (n) => ({ type: "stat", stat: "attendance_perfect_month", min: n }), [1, 3, 6, 9, 12], (n) => `${n} perfect attendance month${n > 1 ? "s" : ""}`],

  ["learner", "Continuous Learner", "graduation", "learning", (n) => ({ type: "stat", stat: "training_completed", min: n }), [1, 3, 6, 12, 25], (n) => `Complete ${n} training${n > 1 ? "s" : ""}`],
  ["policy_pro", "Policy Compliant", "shield", "growth", (n) => ({ type: "stat", stat: "policy_acknowledged", min: n }), [1, 5, 12, 25, 50], (n) => `Acknowledge ${n} polic${n > 1 ? "ies" : "y"}`],
  ["reviewer", "Reviewer", "clipboard", "growth", (n) => ({ type: "stat", stat: "review_submitted", min: n }), [1, 5, 15, 40, 100], (n) => `Submit ${n} performance review${n > 1 ? "s" : ""}`],
  ["open_minded", "Growth Mindset", "handshake", "growth", (n) => ({ type: "stat", stat: "review_accepted", min: n }), [1, 3, 8, 16, 32], (n) => `Acknowledge ${n} of your own reviews`],
  ["idea_machine", "Innovator", "bulb", "growth", (n) => ({ type: "stat", stat: "suggestion_submitted", min: n }), [1, 5, 15, 40, 100], (n) => `Share ${n} idea${n > 1 ? "s" : ""}`],

  ["sheet_hero", "Timesheet Champion", "file", "productivity", (n) => ({ type: "stat", stat: "timesheet_submitted", min: n }), [1, 10, 40, 100, 250], (n) => `Submit ${n} timesheet${n > 1 ? "s" : ""}`],
  ["closer", "Closer", "check", "productivity", (n) => ({ type: "stat", stat: "meeting_action_done", min: n }), [1, 10, 40, 100, 250], (n) => `Close ${n} meeting action item${n > 1 ? "s" : ""}`],
  ["voice", "Constructive Voice", "message", "productivity", (n) => ({ type: "stat", stat: "meeting_feedback_given", min: n }), [1, 10, 30, 80, 200], (n) => `Share feedback on ${n} meeting${n > 1 ? "s" : ""}`],

  ["cheerleader", "Recognition Giver", "thumbs", "culture", (n) => ({ type: "stat", stat: "kudos_given", min: n }), [1, 10, 40, 100, 250], (n) => `Recognise colleagues ${n} time${n > 1 ? "s" : ""}`],
  ["beloved", "Valued Teammate", "star", "culture", (n) => ({ type: "stat", stat: "kudos_received", min: n }), [1, 10, 30, 75, 150], (n) => `Receive recognition ${n} time${n > 1 ? "s" : ""}`],

  ["quest_runner", "Goal Getter", "target", "engagement", (n) => ({ type: "stat", stat: "quest_completed", min: n }), [1, 10, 40, 120, 300], (n) => `Complete ${n} goal${n > 1 ? "s" : ""}`],
  ["challenger", "Challenger", "trophy", "engagement", (n) => ({ type: "stat", stat: "challenge_completed", min: n }), [1, 3, 8, 16, 30], (n) => `Complete ${n} challenge${n > 1 ? "s" : ""}`],
  ["shopper", "Rewards Redeemer", "gift", "engagement", (n) => ({ type: "stat", stat: "store_redeem", min: n }), [1, 3, 8, 16, 30], (n) => `Redeem ${n} reward${n > 1 ? "s" : ""}`],
  ["weekly_champ", "Weekly Top Contributor", "medal", "engagement", (n) => ({ type: "stat", stat: "weekly_win", min: n }), [1, 3, 8, 16, 32], (n) => `Be a top contributor of the week ${n} time${n > 1 ? "s" : ""}`],
  ["monthly_star", "Top Performer", "crown", "engagement", (n) => ({ type: "stat", stat: "monthly_star", min: n }), [1, 2, 4, 8, 12], (n) => `Be top performer of the month ${n} time${n > 1 ? "s" : ""}`],

  ["leveller", "Level", "trend", "progress", (n) => ({ type: "level", min: n }), [5, 10, 20, 35, 50], (n) => `Reach level ${n}`],
  ["xp_collector", "XP Milestone", "sparkles", "progress", (n) => ({ type: "xp", min: n }), [1000, 5000, 15000, 40000, 100000], (n) => `Earn ${n.toLocaleString("en-IN")} lifetime XP`],
  ["loyal", "Tenure", "gift", "progress", (n) => ({ type: "stat", stat: "anniversary_bonus", min: n }), [1, 2, 3, 5, 10], (n) => `Reach ${n} work anniversar${n > 1 ? "ies" : "y"} with the company`],
];

const BADGES = [];
for (const [family, name, icon, category, criteria, thresholds, desc] of FAMILIES) {
  thresholds.forEach((n, i) => {
    const tier = TIERS[i];
    BADGES.push({
      key: `${family}_${tier}`,
      family,
      name: i === 0 && ["attendance_days", "learner", "cheerleader", "beloved", "policy_pro"].includes(family)
        ? { attendance_days: "First Day", learner: "First Lesson", cheerleader: "First Recognition", beloved: "First Appreciation", policy_pro: "Read the Rules" }[family]
        : `${name} ${["I", "II", "III", "IV", "V"][i]}`,
      description: desc(n),
      icon,
      category,
      tier,
      rarity: tier,
      criteria: criteria(n),
      reward: TIER_REWARD[tier],
      color: TIER_COLOR[tier],
    });
  });
}

// One-off / special achievements.
const SPECIAL = [
  { key: "welcome_aboard", name: "Welcome Aboard", description: "Join the rewards programme", icon: "rocket", category: "profile", criteria: { type: "stat", stat: "welcome", min: 1 } },
  { key: "say_cheese", name: "Profile Photo", description: "Add a profile photo", icon: "camera", category: "profile", criteria: { type: "stat", stat: "profile_photo", min: 1 } },
  { key: "profile_pro", name: "Complete Profile", description: "Complete your profile", icon: "user", category: "profile", criteria: { type: "stat", stat: "profile_complete", min: 1 } },
  { key: "season_champion", name: "Season Champion", description: "Finish a season ranked #1", icon: "crown", category: "engagement", criteria: { type: "stat", stat: "season_win", min: 1 } },
  { key: "all_rounder", name: "All-Rounder", description: "Check in, complete training, recognise a colleague, acknowledge a policy and submit a timesheet", icon: "layers", category: "progress", criteria: { type: "all", stats: ["attendance_checkin", "training_completed", "kudos_given", "policy_acknowledged", "timesheet_submitted"] } },
  { key: "century_club", name: "Level 100", description: "Reach level 100", icon: "medal", category: "progress", criteria: { type: "level", min: 100 } },
  { key: "hall_of_famer", name: "Hall of Fame", description: "Inducted into the Hall of Fame", icon: "trophy", category: "engagement", criteria: { type: "manual" }, manual: true },
  { key: "mentor", name: "Mentor", description: "Recognised by your manager as a mentor", icon: "compass", category: "culture", criteria: { type: "manual" }, manual: true },
  { key: "innovator", name: "Innovation Award", description: "Awarded for an outstanding idea", icon: "bulb", category: "growth", criteria: { type: "manual" }, manual: true },
  { key: "customer_champion", name: "Customer Champion", description: "Awarded for going above and beyond for a customer", icon: "shield", category: "culture", criteria: { type: "manual" }, manual: true },
  { key: "problem_solver", name: "Problem Solver", description: "Awarded for solving a hard problem", icon: "puzzle", category: "productivity", criteria: { type: "manual" }, manual: true },
  { key: "team_player", name: "Team Player", description: "Awarded for exceptional collaboration", icon: "users", category: "culture", criteria: { type: "manual" }, manual: true },
];
for (const s of SPECIAL) {
  if (s.manual && s.criteria.type === "all") s.criteria = { type: "manual" };
  BADGES.push({ ...s, family: s.key, tier: "special", rarity: "special", reward: TIER_REWARD.special, color: TIER_COLOR.special });
}

const BADGE_MAP = Object.fromEntries(BADGES.map((b) => [b.key, b]));

// Indexes so the engine only inspects badges that could have changed.
const BY_STAT = {};
const BY_STREAK = {};
const LEVEL_BADGES = [];
const XP_BADGES = [];
const ALL_BADGES = [];
for (const b of BADGES) {
  const c = b.criteria;
  if (c.type === "stat") (BY_STAT[c.stat] = BY_STAT[c.stat] || []).push(b);
  else if (c.type === "streak") (BY_STREAK[c.name] = BY_STREAK[c.name] || []).push(b);
  else if (c.type === "level") LEVEL_BADGES.push(b);
  else if (c.type === "xp") XP_BADGES.push(b);
  else if (c.type === "all") ALL_BADGES.push(b);
}

const meets = (badge, profile) => {
  const c = badge.criteria;
  const stats = profile.stats || {};
  switch (c.type) {
    case "stat": return (stats[c.stat] || 0) >= c.min;
    case "streak": return ((profile.streaks && profile.streaks[c.name] && profile.streaks[c.name].longest) || 0) >= c.min;
    case "level": return (profile.level || 1) >= c.min;
    case "xp": return (profile.xp || 0) >= c.min;
    case "all": return c.stats.length > 0 && c.stats.every((s) => (stats[s] || 0) >= 1);
    default: return false;
  }
};

// Current numeric progress toward a badge (for the progress bars in the UI).
const progressOf = (badge, profile) => {
  const c = badge.criteria;
  const stats = profile.stats || {};
  switch (c.type) {
    case "stat": return { current: Math.min(stats[c.stat] || 0, c.min), target: c.min };
    case "streak": return { current: Math.min((profile.streaks && profile.streaks[c.name] && profile.streaks[c.name].longest) || 0, c.min), target: c.min };
    case "level": return { current: Math.min(profile.level || 1, c.min), target: c.min };
    case "xp": return { current: Math.min(profile.xp || 0, c.min), target: c.min };
    case "all": { const done = c.stats.filter((s) => (stats[s] || 0) >= 1).length; return { current: done, target: c.stats.length }; }
    default: return { current: 0, target: 1 };
  }
};

// Which not-yet-earned badges could this change have unlocked?
const candidatesFor = ({ event, streakName, levelChanged, xpChanged }) => {
  const list = [];
  if (event && BY_STAT[event]) list.push(...BY_STAT[event]);
  if (streakName && BY_STREAK[streakName]) list.push(...BY_STREAK[streakName]);
  if (levelChanged) list.push(...LEVEL_BADGES);
  if (xpChanged) list.push(...XP_BADGES);
  if (event) list.push(...ALL_BADGES.filter((b) => b.criteria.stats.includes(event)));
  return list;
};

module.exports = { BADGES, BADGE_MAP, TIERS, TIER_COLOR, TIER_REWARD, meets, progressOf, candidatesFor };
