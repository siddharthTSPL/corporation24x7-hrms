// Daily claim, lucky spin, daily quiz and streak freezes.
const GamProfile = require("../../Models/gamification/gamprofile.model");
const { GamQuizQuestion, GamQuizAttempt } = require("../../Models/gamification/quizquestion.model");
const engine = require("./engine");
const { DAILY_CYCLE, rollSpin, SPIN_PRIZES } = require("./catalog/spin");
const { BANK } = require("./catalog/quiz");
const { toISTKey, diffDays } = require("./periods");
const { viewStreak } = require("./streaks");

const ref = (profile) => ({ organisation_id: profile.organisation_id, model: profile.personModel, id: profile.person });

// ── Daily reward ────────────────────────────────────────────────────────
const dailyState = async (profile) => {
  const todayKey = toISTKey();
  const claim = profile.dailyClaim || {};
  const streak = await viewStreak(profile, "login", todayKey);
  const claimedToday = claim.lastKey === todayKey;
  // day (1..7) that the NEXT claim will pay
  const nextDay = claimedToday ? (((claim.day || 1) % 7) + 1) : streak.current > 0 ? ((streak.current % 7) + 1) : 1;
  return {
    claimedToday,
    streak: streak.current,
    longest: streak.longest,
    atRisk: streak.atRisk,
    nextDay,
    todayDay: claimedToday ? claim.day || 1 : nextDay,
    cycle: DAILY_CYCLE,
  };
};

const claimDaily = async (profile) => {
  const todayKey = toISTKey();
  const claim = profile.dailyClaim || {};
  if (claim.lastKey === todayKey) return { error: "You've already claimed today's reward." };

  const streak = await viewStreak(profile, "login", todayKey);
  const day = streak.current > 0 ? (streak.current % 7) + 1 : 1; // before advancing
  const reward = DAILY_CYCLE[day - 1];

  // Atomic guard so two quick taps can't pay twice.
  const guard = await GamProfile.findOneAndUpdate(
    { _id: profile._id, "dailyClaim.lastKey": { $ne: todayKey } },
    { $set: { dailyClaim: { lastKey: todayKey, day } } },
    { returnDocument: "after" }
  );
  if (!guard) return { error: "You've already claimed today's reward." };

  const res = await engine.award({
    ...ref(profile), event: "daily_claim", xp: reward.xp, coins: reward.coins,
    dedupeKey: `daily:${profile.personKey}:${todayKey}`, meta: { day }, force: true,
  });
  return { day, reward, award: res };
};

// ── Lucky spin ──────────────────────────────────────────────────────────
const spinState = (profile, settings) => {
  const todayKey = toISTKey();
  const s = profile.spin && profile.spin.key === todayKey ? profile.spin : { key: todayKey, count: 0, extra: 0 };
  const freeLeft = s.count >= 1 ? 0 : 1;
  const extraLeft = Math.max(0, settings.spin.maxExtraPerDay - (s.extra || 0));
  return { freeLeft, extraLeft, extraCost: settings.spin.extraSpinCost, prizes: SPIN_PRIZES.map(({ id, label, color }) => ({ id, label, color })) };
};

const doSpin = async (profile, settings, { extra = false } = {}) => {
  const todayKey = toISTKey();
  const s = profile.spin && profile.spin.key === todayKey ? profile.spin : { key: todayKey, count: 0, extra: 0 };
  if (!extra && s.count >= 1) return { error: "You've used your free spin today. Buy an extra spin with coins!" };
  if (extra) {
    if ((s.extra || 0) >= settings.spin.maxExtraPerDay) return { error: "You've reached today's extra-spin limit." };
    if (settings.spin.extraSpinCost > 0) {
      const paid = await engine.award({
        ...ref(profile), event: "spin_extra", coins: -settings.spin.extraSpinCost,
        dedupeKey: `spinx:${profile.personKey}:${todayKey}:${(s.extra || 0) + 1}`, force: true, silent: true,
      });
      if (!paid.ok) return { error: paid.skipped === "insufficient_coins" ? "Not enough coins for an extra spin." : "Couldn't buy the spin." };
    }
  }
  const next = { key: todayKey, count: s.count + 1, extra: (s.extra || 0) + (extra ? 1 : 0) };
  await GamProfile.updateOne({ _id: profile._id }, { $set: { spin: next } });

  const prize = rollSpin();
  if (prize.freeze) {
    const max = settings.streaks.maxFreezes;
    await GamProfile.updateOne({ _id: profile._id, freezes: { $lt: max } }, { $inc: { freezes: prize.freeze } });
  }
  const res = await engine.award({
    ...ref(profile), event: "spin_played", xp: prize.xp, coins: prize.coins,
    dedupeKey: `spin:${profile.personKey}:${todayKey}:${next.count}`, meta: { prize: prize.id }, force: true,
  });
  return { prize: { id: prize.id, label: prize.label, coins: prize.coins, xp: prize.xp, freeze: prize.freeze || 0 }, award: res, state: spinState({ ...profile, spin: next }, settings) };
};

// ── Daily quiz ──────────────────────────────────────────────────────────
const hash = (s) => { let h = 7; for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0; return h; };

const todaysQuestion = async (profile) => {
  const custom = await GamQuizQuestion.find({ organisation_id: profile.organisation_id, active: true }).lean();
  const pool = [...BANK.map((q) => ({ ...q, builtin: true })), ...custom.map((q) => ({ id: String(q._id), category: q.category, question: q.question, options: q.options, answer: q.answer, explanation: q.explanation }))];
  const todayKey = toISTKey();
  // Same question for the whole org on a given day -> people can discuss it.
  const idx = hash(`${profile.organisation_id}:${todayKey}`) % pool.length;
  return { q: pool[idx], todayKey };
};

const quizState = async (profile) => {
  const { q, todayKey } = await todaysQuestion(profile);
  const attempt = await GamQuizAttempt.findOne({ personKey: profile.personKey, dateKey: todayKey }).lean();
  const streak = await viewStreak(profile, "quiz", todayKey);
  const base = { dateKey: todayKey, id: q.id, category: q.category, question: q.question, options: q.options, streak: streak.current };
  if (!attempt) return { ...base, answered: false };
  return { ...base, answered: true, choice: attempt.choice, correct: attempt.correct, answer: q.answer, explanation: q.explanation };
};

const answerQuiz = async (profile, choice) => {
  const { q, todayKey } = await todaysQuestion(profile);
  const n = Number(choice);
  if (!Number.isInteger(n) || n < 0 || n >= q.options.length) return { error: "Pick one of the options." };
  const correct = n === q.answer;
  try {
    await GamQuizAttempt.create({ organisation_id: profile.organisation_id, personKey: profile.personKey, dateKey: todayKey, questionId: q.id, choice: n, correct });
  } catch (e) {
    if (e.code === 11000) return { error: "You've already answered today's quiz." };
    throw e;
  }
  const attemptAward = await engine.award({ ...ref(profile), event: "quiz_attempt", dedupeKey: `quizA:${profile.personKey}:${todayKey}`, force: true, silent: correct });
  let correctAward = null;
  if (correct) correctAward = await engine.award({ ...ref(profile), event: "quiz_correct", dedupeKey: `quizC:${profile.personKey}:${todayKey}`, force: true });
  return { correct, answer: q.answer, explanation: q.explanation, award: correctAward || attemptAward };
};

// ── Streak freeze ───────────────────────────────────────────────────────
const buyFreeze = async (profile, settings) => {
  const max = settings.streaks.maxFreezes;
  if ((profile.freezes || 0) >= max) return { error: `You can hold at most ${max} streak freezes.` };
  const cost = settings.streaks.freezeCost;
  const n = (profile.freezes || 0) + 1;
  if (cost > 0) {
    const paid = await engine.award({ ...ref(profile), event: "streak_freeze_buy", coins: -cost, dedupeKey: `fz:${profile.personKey}:${Date.now()}`, force: true, silent: true });
    if (!paid.ok) return { error: paid.skipped === "insufficient_coins" ? "Not enough coins." : "Couldn't buy a freeze." };
  }
  await GamProfile.updateOne({ _id: profile._id }, { $inc: { freezes: 1 } });
  return { freezes: n, cost };
};

module.exports = { dailyState, claimDaily, spinState, doSpin, quizState, answerQuiz, buyFreeze };
