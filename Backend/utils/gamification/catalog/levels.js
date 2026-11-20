// Level curve, rank tiers and level titles.
// threshold(n) = XP needed to REACH level n (level 1 = 0 XP).
const MAX_LEVEL = 100;

const threshold = (level, base = 80) => {
  if (level <= 1) return 0;
  return Math.round((base * Math.pow(level - 1, 1.7)) / 10) * 10;
};

const levelFromXp = (xp, base = 80) => {
  const safe = Math.max(0, Number(xp) || 0);
  let lo = 1;
  let hi = MAX_LEVEL;
  while (lo < hi) {
    const mid = Math.ceil((lo + hi) / 2);
    if (threshold(mid, base) <= safe) lo = mid;
    else hi = mid - 1;
  }
  const level = lo;
  const floor = threshold(level, base);
  const next = level >= MAX_LEVEL ? null : threshold(level + 1, base);
  return {
    level,
    xp: safe,
    levelFloor: floor,
    nextLevelXp: next,
    xpIntoLevel: safe - floor,
    xpForLevel: next === null ? 0 : next - floor,
    progress: next === null ? 1 : Math.min(1, (safe - floor) / (next - floor)),
    maxed: level >= MAX_LEVEL,
  };
};

// Rank tiers (shown as the colour of the avatar ring / level chip).
const RANKS = [
  { key: "bronze", label: "Bronze", minLevel: 1, color: "#b4763c" },
  { key: "silver", label: "Silver", minLevel: 10, color: "#9aa5b1" },
  { key: "gold", label: "Gold", minLevel: 20, color: "#e0a800" },
  { key: "platinum", label: "Platinum", minLevel: 35, color: "#2fb5c4" },
  { key: "diamond", label: "Diamond", minLevel: 50, color: "#4f7cff" },
  { key: "master", label: "Master", minLevel: 70, color: "#9b4dff" },
  { key: "legend", label: "Legend", minLevel: 90, color: "#ff3d7f" },
];

const rankForLevel = (level) => {
  let r = RANKS[0];
  for (const rank of RANKS) if (level >= rank.minLevel) r = rank;
  return r;
};

const TITLES = [
  { minLevel: 1, title: "Rookie" },
  { minLevel: 3, title: "Explorer" },
  { minLevel: 5, title: "Contributor" },
  { minLevel: 8, title: "Achiever" },
  { minLevel: 12, title: "Specialist" },
  { minLevel: 17, title: "Expert" },
  { minLevel: 23, title: "Trailblazer" },
  { minLevel: 30, title: "Champion" },
  { minLevel: 40, title: "Master" },
  { minLevel: 55, title: "Virtuoso" },
  { minLevel: 70, title: "Legend" },
  { minLevel: 90, title: "Mythic" },
];

const titleForLevel = (level) => {
  let t = TITLES[0].title;
  for (const row of TITLES) if (level >= row.minLevel) t = row.title;
  return t;
};

// Coins granted when a level is reached.
const levelUpCoins = (level) => Math.min(500, 10 * level);

module.exports = { MAX_LEVEL, threshold, levelFromXp, RANKS, rankForLevel, TITLES, titleForLevel, levelUpCoins };
