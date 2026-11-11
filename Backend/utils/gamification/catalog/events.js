// Every action that can earn points. `xp` raises your level + leaderboard rank;
// `coins` are the spendable currency in the Rewards Store.
//
// capExempt: reward-type events (quest/badge/season payouts, manual awards ...)
// are never throttled by the daily XP cap — only organic activity is.
// dailyCap: max times per IST day this event can pay out (0/undefined = no limit).
// once: pays out a single time per person, ever.
const EVENTS = {
  // ── Attendance ─────────────────────────────────────────────
  attendance_checkin: { label: "Checked in", icon: "🕘", category: "attendance", module: "attendance", xp: 10, coins: 2, dailyCap: 1 },
  attendance_ontime: { label: "On-time check-in", icon: "⏰", category: "attendance", module: "attendance", xp: 5, coins: 1, dailyCap: 1 },
  attendance_checkout: { label: "Completed the day", icon: "🏁", category: "attendance", module: "attendance", xp: 10, coins: 2, dailyCap: 1 },
  attendance_perfect_week: { label: "Perfect attendance week", icon: "📅", category: "attendance", module: "attendance", xp: 50, coins: 10, capExempt: true },
  attendance_perfect_month: { label: "Perfect attendance month", icon: "🗓️", category: "attendance", module: "attendance", xp: 250, coins: 50, capExempt: true },

  // ── Work & productivity ───────────────────────────────────
  timesheet_submitted: { label: "Timesheet submitted", icon: "🧾", category: "productivity", module: "timesheet", xp: 15, coins: 3, dailyCap: 2 },
  timesheet_approved: { label: "Timesheet approved", icon: "✅", category: "productivity", module: "timesheet", xp: 10, coins: 2, dailyCap: 2 },
  meeting_action_done: { label: "Action item closed", icon: "☑️", category: "productivity", module: "meetings", xp: 10, coins: 2, dailyCap: 5 },
  meeting_feedback_given: { label: "Meeting feedback shared", icon: "🗣️", category: "productivity", module: "meetings", xp: 5, coins: 1, dailyCap: 3 },

  // ── Learning & growth ─────────────────────────────────────
  training_completed: { label: "Training completed", icon: "🎓", category: "learning", module: "training", xp: 100, coins: 20 },
  review_submitted: { label: "Review submitted", icon: "📝", category: "growth", module: "review", xp: 30, coins: 5, dailyCap: 5 },
  review_accepted: { label: "Review acknowledged", icon: "🤝", category: "growth", module: "review", xp: 15, coins: 3, dailyCap: 3 },
  policy_acknowledged: { label: "Policy acknowledged", icon: "📜", category: "growth", module: "policy", xp: 10, coins: 2, dailyCap: 5 },
  suggestion_submitted: { label: "Idea / suggestion shared", icon: "💡", category: "growth", module: "tickets", xp: 20, coins: 4, dailyCap: 2 },

  // ── Culture & community ───────────────────────────────────
  kudos_given: { label: "Recognised a teammate", icon: "👏", category: "culture", module: "kudos", xp: 8, coins: 2, dailyCap: 5 },
  // counts toward the daily XP cap on purpose: stops two friends farming each other
  kudos_received: { label: "Received kudos", icon: "🌟", category: "culture", module: "kudos", xp: 20, coins: 5, dailyCap: 10 },
  kudos_reacted: { label: "Reacted to kudos", icon: "😊", category: "culture", module: "kudos", xp: 1, coins: 0, dailyCap: 5 },

  // ── Daily engagement ──────────────────────────────────────
  daily_claim: { label: "Daily check-in reward", icon: "🎁", category: "engagement", module: "streaks", xp: 5, coins: 5, capExempt: true, dailyCap: 1 },
  spin_played: { label: "Lucky spin", icon: "🎡", category: "engagement", module: "spin", xp: 0, coins: 0, capExempt: true },
  quiz_attempt: { label: "Answered the daily quiz", icon: "🧠", category: "engagement", module: "quiz", xp: 3, coins: 0, capExempt: true, dailyCap: 1 },
  quiz_correct: { label: "Daily quiz — correct!", icon: "🎯", category: "engagement", module: "quiz", xp: 15, coins: 3, capExempt: true, dailyCap: 1 },
  store_visit: { label: "Visited the Rewards Store", icon: "🛍️", category: "engagement", module: "store", xp: 5, coins: 0, once: true },

  // ── Profile ───────────────────────────────────────────────
  welcome: { label: "Joined the game", icon: "🚀", category: "profile", xp: 25, coins: 10, once: true, capExempt: true },
  profile_photo: { label: "Added a profile photo", icon: "📸", category: "profile", xp: 20, coins: 5, once: true, capExempt: true },
  profile_complete: { label: "Completed your profile", icon: "🧩", category: "profile", xp: 50, coins: 10, once: true, capExempt: true },

  // ── Reward-type / system events (never capped) ────────────
  streak_bonus: { label: "Streak milestone", icon: "🔥", category: "bonus", xp: 0, coins: 0, capExempt: true, system: true },
  quest_reward: { label: "Quest reward", icon: "🗺️", category: "bonus", xp: 0, coins: 0, capExempt: true, system: true },
  daily_sweep: { label: "All daily quests cleared", icon: "🧹", category: "bonus", xp: 25, coins: 5, capExempt: true, system: true },
  badge_reward: { label: "Badge reward", icon: "🏅", category: "bonus", xp: 0, coins: 0, capExempt: true, system: true },
  challenge_reward: { label: "Challenge reward", icon: "🏆", category: "bonus", xp: 0, coins: 0, capExempt: true, system: true },
  challenge_completed: { label: "Challenge completed", icon: "🥇", category: "bonus", xp: 0, coins: 0, capExempt: true, system: true },
  quest_completed: { label: "Quest completed", icon: "✔️", category: "bonus", xp: 0, coins: 0, capExempt: true, system: true },
  level_up: { label: "Level up", icon: "⬆️", category: "bonus", xp: 0, coins: 0, capExempt: true, system: true },
  weekly_win: { label: "Weekly leaderboard winner", icon: "🥇", category: "bonus", xp: 0, coins: 0, capExempt: true, system: true },
  monthly_star: { label: "Star of the month", icon: "⭐", category: "bonus", xp: 0, coins: 0, capExempt: true, system: true },
  season_reward: { label: "Season reward", icon: "🏟️", category: "bonus", xp: 0, coins: 0, capExempt: true, system: true },
  season_win: { label: "Season champion", icon: "👑", category: "bonus", xp: 0, coins: 0, capExempt: true, system: true },
  birthday_bonus: { label: "Birthday bonus", icon: "🎂", category: "bonus", xp: 50, coins: 25, capExempt: true, system: true },
  anniversary_bonus: { label: "Work anniversary", icon: "🎉", category: "bonus", xp: 0, coins: 0, capExempt: true, system: true },
  manual_award: { label: "Awarded by your team", icon: "🎖️", category: "bonus", xp: 0, coins: 0, capExempt: true, system: true },
  badge_granted: { label: "Badge granted", icon: "🎗️", category: "bonus", xp: 0, coins: 0, capExempt: true, system: true },
  store_redeem: { label: "Reward redeemed", icon: "🛒", category: "spend", xp: 0, coins: 0, capExempt: true, system: true },
  store_refund: { label: "Redemption refunded", icon: "↩️", category: "spend", xp: 0, coins: 0, capExempt: true, system: true },
  streak_freeze_buy: { label: "Streak freeze purchased", icon: "🧊", category: "spend", xp: 0, coins: 0, capExempt: true, system: true },
  spin_extra: { label: "Extra spin purchased", icon: "🎟️", category: "spend", xp: 0, coins: 0, capExempt: true, system: true },
  kudos_gift: { label: "Coins gifted with kudos", icon: "💝", category: "spend", xp: 0, coins: 0, capExempt: true, system: true },
  admin_adjust: { label: "Adjustment by admin", icon: "🛠️", category: "spend", xp: 0, coins: 0, capExempt: true, system: true },
};

const CATEGORIES = {
  attendance: { label: "Attendance", color: "#2563eb" },
  productivity: { label: "Productivity", color: "#0891b2" },
  learning: { label: "Learning", color: "#7c3aed" },
  growth: { label: "Growth", color: "#16a34a" },
  culture: { label: "Culture", color: "#db2777" },
  engagement: { label: "Engagement", color: "#ea580c" },
  profile: { label: "Profile", color: "#64748b" },
  bonus: { label: "Bonus", color: "#ca8a04" },
  spend: { label: "Store & spend", color: "#475569" },
};

// Merge the built-in rule with the organisation's overrides (settings.rules).
const resolveRule = (event, settings = {}) => {
  const base = EVENTS[event];
  if (!base) return null;
  const o = (settings.rules && settings.rules[event]) || {};
  return {
    ...base,
    enabled: o.enabled === undefined ? true : !!o.enabled,
    xp: Number.isFinite(o.xp) ? Math.max(0, o.xp) : base.xp,
    coins: Number.isFinite(o.coins) ? Math.max(0, o.coins) : base.coins,
    dailyCap: Number.isFinite(o.dailyCap) ? Math.max(0, o.dailyCap) : base.dailyCap || 0,
  };
};

// Events admins may tune in the settings screen (everything that is not system).
const TUNABLE_EVENTS = Object.entries(EVENTS)
  .filter(([, v]) => !v.system)
  .map(([key]) => key);

module.exports = { EVENTS, CATEGORIES, resolveRule, TUNABLE_EVENTS };
