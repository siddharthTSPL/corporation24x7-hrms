// Lucky wheel prizes (weights are relative) and the 7-day daily-reward cycle.
const crypto = require("crypto");

const SPIN_PRIZES = [
  { id: "c10", label: "10 coins", coins: 10, xp: 0, weight: 28, color: "#38bdf8" },
  { id: "x20", label: "20 XP", coins: 0, xp: 20, weight: 16, color: "#a78bfa" },
  { id: "c25", label: "25 coins", coins: 25, xp: 0, weight: 22, color: "#34d399" },
  { id: "x50", label: "50 XP", coins: 0, xp: 50, weight: 8, color: "#f472b6" },
  { id: "c50", label: "50 coins", coins: 50, xp: 0, weight: 12, color: "#fbbf24" },
  { id: "fz", label: "Streak freeze", coins: 0, xp: 0, freeze: 1, weight: 5, color: "#60a5fa" },
  { id: "c100", label: "100 coins", coins: 100, xp: 0, weight: 5, color: "#fb923c" },
  { id: "jp", label: "JACKPOT 250 coins", coins: 250, xp: 100, weight: 1, color: "#ef4444" },
];

const rollSpin = () => {
  const total = SPIN_PRIZES.reduce((s, p) => s + p.weight, 0);
  let r = crypto.randomInt(0, total);
  for (const p of SPIN_PRIZES) {
    if (r < p.weight) return p;
    r -= p.weight;
  }
  return SPIN_PRIZES[0];
};

// Day 1..7 of the claim cycle; day 7 is the big one.
const DAILY_CYCLE = [
  { day: 1, coins: 5, xp: 5 },
  { day: 2, coins: 8, xp: 5 },
  { day: 3, coins: 10, xp: 10 },
  { day: 4, coins: 12, xp: 10 },
  { day: 5, coins: 15, xp: 15 },
  { day: 6, coins: 20, xp: 15 },
  { day: 7, coins: 50, xp: 40, bonus: "Week complete!" },
];

// Streak milestones: bonus XP/coins the first time each length is reached in a run.
const STREAK_MILESTONES = [
  { days: 3, xp: 15, coins: 3 },
  { days: 7, xp: 40, coins: 8 },
  { days: 14, xp: 80, coins: 16 },
  { days: 30, xp: 200, coins: 40 },
  { days: 60, xp: 400, coins: 80 },
  { days: 100, xp: 800, coins: 160 },
  { days: 200, xp: 1500, coins: 300 },
  { days: 365, xp: 3000, coins: 600 },
];

module.exports = { SPIN_PRIZES, rollSpin, DAILY_CYCLE, STREAK_MILESTONES };
