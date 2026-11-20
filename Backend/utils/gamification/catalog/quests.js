// Goals. Built-in goals only use work activity that every employee can actually do,
// so nobody is handed an impossible goal. Conditional activity (timesheet, training...)
// appears as an optional "stretch" goal. Admins can add their own (daily/weekly/monthly/one-off).
const WEEKLY = [
  { key: "w_checkins", title: "Consistent week", desc: "Check in 5 times this week", event: "attendance_checkin", target: 5, xp: 60, coins: 12, icon: "calendar" },
  { key: "w_ontime", title: "Punctual week", desc: "Be on time 4 times this week", event: "attendance_ontime", target: 4, xp: 50, coins: 10, icon: "timer" },
  { key: "w_close", title: "Close the day", desc: "Complete 4 working days with a check-out", event: "attendance_checkout", target: 4, xp: 50, coins: 10, icon: "check" },
  { key: "w_kudos", title: "Recognise your peers", desc: "Recognise colleagues 3 times", event: "kudos_given", target: 3, xp: 50, coins: 10, icon: "thumbs" },
  { key: "w_timesheet", title: "Timesheet on time", desc: "Submit your timesheet (stretch goal, if your organisation uses timesheets)", event: "timesheet_submitted", target: 1, xp: 40, coins: 8, icon: "file", optional: true },
  { key: "w_actions", title: "Follow-through", desc: "Close 3 meeting action items (stretch goal)", event: "meeting_action_done", target: 3, xp: 40, coins: 8, icon: "check", optional: true },
];

const MONTHLY = [
  { key: "m_checkins", title: "Show up, every day", desc: "Check in 20 times this month", event: "attendance_checkin", target: 20, xp: 200, coins: 40, icon: "calendar" },
  { key: "m_ontime", title: "Punctuality", desc: "Be on time 18 times this month", event: "attendance_ontime", target: 18, xp: 180, coins: 36, icon: "timer" },
  { key: "m_kudos", title: "Culture builder", desc: "Recognise colleagues 10 times", event: "kudos_given", target: 10, xp: 150, coins: 30, icon: "thumbs" },
  { key: "m_learn", title: "Keep learning", desc: "Complete a training (stretch goal)", event: "training_completed", target: 1, xp: 150, coins: 30, icon: "graduation", optional: true },
  { key: "m_ideas", title: "Share an idea", desc: "Share 2 ideas or suggestions (stretch goal)", event: "suggestion_submitted", target: 2, xp: 100, coins: 20, icon: "bulb", optional: true },
];

// New-joiner checklist: permanent, one-off, shown until done.
const ONBOARDING = [
  { key: "o_welcome", title: "Join the programme", desc: "Open Rewards & Recognition for the first time", event: "welcome", target: 1, xp: 10, coins: 5, icon: "rocket" },
  { key: "o_photo", title: "Add a profile photo", desc: "Upload a profile photo so colleagues recognise you", event: "profile_photo", target: 1, xp: 15, coins: 5, icon: "camera" },
  { key: "o_checkin", title: "First check-in", desc: "Mark your attendance for the first time", event: "attendance_checkin", target: 1, xp: 20, coins: 5, icon: "clock" },
  { key: "o_kudos", title: "Recognise a colleague", desc: "Send your first recognition", event: "kudos_given", target: 1, xp: 25, coins: 10, icon: "thumbs" },
  { key: "o_policy", title: "Acknowledge a policy", desc: "Acknowledge a company policy (when one is assigned)", event: "policy_acknowledged", target: 1, xp: 20, coins: 5, icon: "shield", optional: true },
];

const DAILY = []; // no built-in daily goals (admins may still create daily goals)
const POOLS = { daily: DAILY, weekly: WEEKLY, monthly: MONTHLY };
const PICK_COUNT = { daily: 0, weekly: 3, monthly: 3 };

// Small deterministic PRNG so a person sees the same goals all week.
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

// Guaranteed picks are always achievable; one optional stretch goal is added.
const pickQuests = (period, seedStr) => {
  const pool = (POOLS[period] || []).slice();
  if (!pool.length) return [];
  const rand = hashSeed(`${period}:${seedStr}`);
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }
  const required = pool.filter((q) => !q.optional);
  const optional = pool.filter((q) => q.optional);
  const n = PICK_COUNT[period];
  const picks = required.slice(0, Math.max(1, n - 1));
  if (optional.length) picks.push(optional[0]);
  return picks.slice(0, n);
};

const QUEST_MAP = Object.fromEntries([...WEEKLY, ...MONTHLY, ...ONBOARDING].map((q) => [q.key, q]));

module.exports = { DAILY, WEEKLY, MONTHLY, ONBOARDING, POOLS, PICK_COUNT, pickQuests, QUEST_MAP };
