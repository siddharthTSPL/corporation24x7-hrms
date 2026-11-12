// Quest templates. Daily quests only use actions that are ALWAYS available to
// everyone (so nobody is handed an impossible quest); conditional actions
// (timesheet, training...) appear as optional weekly/monthly "bonus" quests.
const DAILY = [
  { key: "d_checkin", title: "Start strong", desc: "Check in for the day", event: "attendance_checkin", target: 1, xp: 15, coins: 3, icon: "🕘" },
  { key: "d_ontime", title: "Right on time", desc: "Check in on time", event: "attendance_ontime", target: 1, xp: 15, coins: 3, icon: "⏰" },
  { key: "d_checkout", title: "Finish the day", desc: "Complete your day with a check-out", event: "attendance_checkout", target: 1, xp: 15, coins: 3, icon: "🏁" },
  { key: "d_claim", title: "Daily check-in", desc: "Claim your daily reward", event: "daily_claim", target: 1, xp: 10, coins: 3, icon: "🎁" },
  { key: "d_spin", title: "Feeling lucky", desc: "Spin the lucky wheel", event: "spin_played", target: 1, xp: 10, coins: 3, icon: "🎡" },
  { key: "d_quiz", title: "Brain boost", desc: "Answer today's quiz", event: "quiz_attempt", target: 1, xp: 15, coins: 3, icon: "🧠" },
  { key: "d_kudos", title: "Spread the love", desc: "Recognise a teammate with kudos", event: "kudos_given", target: 1, xp: 20, coins: 5, icon: "👏" },
  { key: "d_react", title: "Cheer someone on", desc: "React to 3 kudos on the wall", event: "kudos_reacted", target: 3, xp: 10, coins: 2, icon: "😊" },
];

const WEEKLY = [
  { key: "w_checkins", title: "Five-day focus", desc: "Check in 5 times this week", event: "attendance_checkin", target: 5, xp: 60, coins: 12, icon: "📅" },
  { key: "w_ontime", title: "Punctual week", desc: "Be on time 4 times", event: "attendance_ontime", target: 4, xp: 50, coins: 10, icon: "⏰" },
  { key: "w_kudos", title: "Kudos crew", desc: "Give kudos 3 times", event: "kudos_given", target: 3, xp: 50, coins: 10, icon: "👏" },
  { key: "w_quiz", title: "Quiz champion", desc: "Get 4 daily quizzes right", event: "quiz_correct", target: 4, xp: 60, coins: 12, icon: "🎯" },
  { key: "w_login", title: "Daily devotee", desc: "Claim your daily reward 5 times", event: "daily_claim", target: 5, xp: 40, coins: 10, icon: "🎁" },
  { key: "w_spin", title: "Wheel of fortune", desc: "Spin 3 times", event: "spin_played", target: 3, xp: 30, coins: 8, icon: "🎡" },
  { key: "w_timesheet", title: "Timesheet on time", desc: "Submit your timesheet (bonus, if your org uses it)", event: "timesheet_submitted", target: 1, xp: 40, coins: 8, icon: "🧾", optional: true },
  { key: "w_actions", title: "Get it done", desc: "Close 3 meeting action items (bonus)", event: "meeting_action_done", target: 3, xp: 40, coins: 8, icon: "☑️", optional: true },
];

const MONTHLY = [
  { key: "m_checkins", title: "Show up, every day", desc: "Check in 20 times this month", event: "attendance_checkin", target: 20, xp: 200, coins: 40, icon: "🗓️" },
  { key: "m_kudos", title: "Culture builder", desc: "Give kudos 10 times", event: "kudos_given", target: 10, xp: 150, coins: 30, icon: "💖" },
  { key: "m_quiz", title: "Knowledge keeper", desc: "Get 15 daily quizzes right", event: "quiz_correct", target: 15, xp: 200, coins: 40, icon: "🧠" },
  { key: "m_login", title: "Never miss a day", desc: "Claim your daily reward 20 times", event: "daily_claim", target: 20, xp: 150, coins: 30, icon: "🎁" },
  { key: "m_learn", title: "Keep learning", desc: "Complete a training (bonus)", event: "training_completed", target: 1, xp: 150, coins: 30, icon: "🎓", optional: true },
  { key: "m_ideas", title: "Idea generator", desc: "Share 2 ideas (bonus)", event: "suggestion_submitted", target: 2, xp: 100, coins: 20, icon: "💡", optional: true },
];

// New-joiner path: permanent, one-off, shown until done.
const ONBOARDING = [
  { key: "o_welcome", title: "Say hello", desc: "Join the rewards programme", event: "welcome", target: 1, xp: 10, coins: 5, icon: "🚀" },
  { key: "o_photo", title: "Put a face to the name", desc: "Upload a profile photo", event: "profile_photo", target: 1, xp: 15, coins: 5, icon: "📸" },
  { key: "o_checkin", title: "First check-in", desc: "Mark your attendance for the first time", event: "attendance_checkin", target: 1, xp: 20, coins: 5, icon: "🕘" },
  { key: "o_claim", title: "Claim a reward", desc: "Claim your first daily reward", event: "daily_claim", target: 1, xp: 15, coins: 5, icon: "🎁" },
  { key: "o_spin", title: "Take a spin", desc: "Spin the lucky wheel once", event: "spin_played", target: 1, xp: 15, coins: 5, icon: "🎡" },
  { key: "o_quiz", title: "Test yourself", desc: "Answer a daily quiz", event: "quiz_attempt", target: 1, xp: 15, coins: 5, icon: "🧠" },
  { key: "o_kudos", title: "Make someone's day", desc: "Give your first kudos", event: "kudos_given", target: 1, xp: 25, coins: 10, icon: "👏" },
  { key: "o_policy", title: "Know the rules", desc: "Acknowledge a policy (when one is assigned)", event: "policy_acknowledged", target: 1, xp: 20, coins: 5, icon: "📜", optional: true },
  { key: "o_store", title: "Browse the store", desc: "Visit the Rewards Store", event: "store_visit", target: 1, xp: 10, coins: 5, icon: "🛍️" },
];

const POOLS = { daily: DAILY, weekly: WEEKLY, monthly: MONTHLY };
const PICK_COUNT = { daily: 3, weekly: 3, monthly: 3 };

// Small deterministic PRNG so a person sees the same quests all day.
const hashSeed = (str) => {
  let h = 1779033703 ^ str.length;
  for (let i = 0; i < str.length; i++) {
    h = Math.imul(h ^ str.charCodeAt(i), 3432918353);
    h = (h << 13) | (h >>> 19);
  }
  return () => {
    h = Math.imul(h ^ (h >>> 16), 2246822507);
    h = Math.imul(h ^ (h >>> 13), 3266489909);
    return ((h ^= h >>> 16) >>> 0) / 4294967296;
  };
};

const pickQuests = (period, seedStr) => {
  const pool = POOLS[period].slice();
  const rand = hashSeed(`${period}:${seedStr}`);
  // Fisher-Yates with the seeded PRNG. Optional quests sort last so the
  // guaranteed picks are always achievable.
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }
  const required = pool.filter((q) => !q.optional);
  const optional = pool.filter((q) => q.optional);
  const n = PICK_COUNT[period];
  const picks = required.slice(0, Math.max(1, n - (period === "daily" ? 0 : 1)));
  if (period !== "daily" && optional.length) picks.push(optional[0]);
  return picks.slice(0, n);
};

const QUEST_MAP = Object.fromEntries([...DAILY, ...WEEKLY, ...MONTHLY, ...ONBOARDING].map((q) => [q.key, q]));

module.exports = { DAILY, WEEKLY, MONTHLY, ONBOARDING, POOLS, PICK_COUNT, pickQuests, QUEST_MAP };
