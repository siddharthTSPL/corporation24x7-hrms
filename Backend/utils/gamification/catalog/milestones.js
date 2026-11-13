// Attendance consistency milestones: bonus paid the first time each run length is reached.
const STREAK_MILESTONES = [
  { days: 5, xp: 20, coins: 4 },
  { days: 10, xp: 40, coins: 8 },
  { days: 20, xp: 80, coins: 16 },
  { days: 30, xp: 150, coins: 30 },
  { days: 60, xp: 300, coins: 60 },
  { days: 100, xp: 600, coins: 120 },
  { days: 200, xp: 1200, coins: 240 },
  { days: 365, xp: 2500, coins: 500 },
];
module.exports = { STREAK_MILESTONES };
