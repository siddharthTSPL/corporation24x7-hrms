// Avatar frames, profile titles and card themes. `unlock` decides how a
// cosmetic becomes available: level, badge, store (bought) or default.
const FRAMES = [
  { id: "none", name: "No frame", unlock: { type: "default" }, css: "" },
  { id: "ember", name: "Ember", unlock: { type: "level", value: 3 }, css: "linear-gradient(135deg,#f97316,#ef4444)" },
  { id: "aqua", name: "Aqua", unlock: { type: "level", value: 5 }, css: "linear-gradient(135deg,#06b6d4,#3b82f6)" },
  { id: "jade", name: "Jade", unlock: { type: "level", value: 8 }, css: "linear-gradient(135deg,#10b981,#84cc16)" },
  { id: "royal", name: "Royal", unlock: { type: "level", value: 12 }, css: "linear-gradient(135deg,#6366f1,#a855f7)" },
  { id: "sunset", name: "Sunset", unlock: { type: "level", value: 15 }, css: "linear-gradient(135deg,#f59e0b,#ec4899)" },
  { id: "aurora", name: "Aurora", unlock: { type: "level", value: 20 }, css: "linear-gradient(135deg,#22d3ee,#a78bfa,#f472b6)" },
  { id: "galaxy", name: "Galaxy", unlock: { type: "level", value: 30 }, css: "linear-gradient(135deg,#312e81,#7c3aed,#db2777)", animated: true },
  { id: "legend", name: "Legend", unlock: { type: "level", value: 50 }, css: "conic-gradient(from 0deg,#fde047,#f97316,#ec4899,#8b5cf6,#fde047)", animated: true },
  { id: "streak_flame", name: "Streak Flame", unlock: { type: "badge", value: "att_streak_gold" }, css: "linear-gradient(135deg,#fbbf24,#dc2626)", animated: true },
  { id: "champion_gold", name: "Champion Gold", unlock: { type: "badge", value: "season_champion" }, css: "conic-gradient(from 90deg,#fde68a,#d97706,#fde68a)", animated: true },
  { id: "neon", name: "Neon", unlock: { type: "store" }, css: "linear-gradient(135deg,#22ff88,#00cfff)", animated: true },
  { id: "rose_gold", name: "Rose Gold", unlock: { type: "store" }, css: "linear-gradient(135deg,#fbcfe8,#f59e9e,#f9a8d4)" },
];

const TITLES = [
  { id: "level", name: "(Level title)", unlock: { type: "default" } },
  { id: "early_adopter", name: "Early Adopter", unlock: { type: "badge", value: "welcome_aboard" } },
  { id: "streak_master", name: "Streak Master", unlock: { type: "badge", value: "att_streak_gold" } },
  { id: "kudos_king", name: "Kudos Magnet", unlock: { type: "badge", value: "beloved_gold" } },
  { id: "quiz_wizard", name: "Quiz Wizard", unlock: { type: "badge", value: "quiz_whiz_gold" } },
  { id: "learner", name: "Lifelong Learner", unlock: { type: "badge", value: "learner_gold" } },
  { id: "clockwork", name: "Clockwork", unlock: { type: "badge", value: "on_time_gold" } },
  { id: "season_champion", name: "Season Champion", unlock: { type: "badge", value: "season_champion" } },
  { id: "all_rounder", name: "Renaissance Employee", unlock: { type: "badge", value: "all_rounder" } },
  { id: "big_spender", name: "Big Spender", unlock: { type: "store" } },
  { id: "lucky_charm", name: "Lucky Charm", unlock: { type: "store" } },
  { id: "office_legend", name: "Office Legend", unlock: { type: "store" } },
];

const THEMES = [
  { id: "default", name: "Classic", unlock: { type: "default" }, css: "linear-gradient(135deg,#730042,#cd166e)" },
  { id: "midnight", name: "Midnight", unlock: { type: "level", value: 10 }, css: "linear-gradient(135deg,#0f172a,#1e3a8a)" },
  { id: "sunrise", name: "Sunrise", unlock: { type: "level", value: 20 }, css: "linear-gradient(135deg,#f97316,#facc15)" },
  { id: "forest", name: "Forest", unlock: { type: "store" }, css: "linear-gradient(135deg,#064e3b,#16a34a)" },
  { id: "sakura", name: "Sakura", unlock: { type: "store" }, css: "linear-gradient(135deg,#be185d,#f9a8d4)" },
  { id: "ocean", name: "Ocean", unlock: { type: "store" }, css: "linear-gradient(135deg,#0c4a6e,#06b6d4)" },
  { id: "neon_city", name: "Neon City", unlock: { type: "store" }, css: "linear-gradient(135deg,#1e1b4b,#c026d3,#22d3ee)" },
];

const CATALOG = { frame: FRAMES, title: TITLES, theme: THEMES };

const find = (type, id) => (CATALOG[type] || []).find((c) => c.id === id) || null;

// Is this cosmetic usable by the person right now?
const isUnlocked = (type, id, profile) => {
  const item = find(type, id);
  if (!item) return false;
  const u = item.unlock || {};
  if (u.type === "default") return true;
  if (u.type === "level") return (profile.level || 1) >= u.value;
  if (u.type === "badge") return (profile.badgeKeys || []).includes(u.value);
  if (u.type === "store") return (profile.unlockedCosmetics || []).includes(`${type}:${id}`);
  return false;
};

module.exports = { FRAMES, TITLES, THEMES, CATALOG, find, isUnlocked };
