const mongoose = require("mongoose");
const GamKudos = require("../../Models/gamification/kudos.model");
const GamProfile = require("../../Models/gamification/gamprofile.model");
const engine = require("./engine");
const { periodKeys, toISTKey } = require("./periods");
const { startOfISTDay } = require("../Istdate.utils");

const ref = (p) => ({ organisation_id: p.organisation_id, model: p.personModel, id: p.person });
const REACTIONS = ["👏", "🎉", "❤️", "🔥", "🙌", "💯"];

const monthBudget = (profile, settings) => {
  const month = periodKeys().month;
  const b = profile.kudosBudget && profile.kudosBudget.monthKey === month ? profile.kudosBudget : { monthKey: month, used: 0 };
  return { used: b.used || 0, allowance: settings.kudos.monthlyAllowance, left: Math.max(0, settings.kudos.monthlyAllowance - (b.used || 0)), monthKey: month };
};

const give = async (from, toKey, { category, message, coins }, settings) => {
  if (settings.modules.kudos === false) return { error: "Kudos is turned off for your organisation." };
  if (toKey === from.personKey) return { error: "You can't give kudos to yourself - ask a teammate to do it!" };
  const text = String(message || "").trim();
  if (text.length < settings.kudos.minMessageLength) return { error: `Please write at least ${settings.kudos.minMessageLength} characters so it feels personal.` };
  const to = await GamProfile.findOne({ personKey: toKey, organisation_id: from.organisation_id }).lean()
    || (await (async () => {
      const [model, id] = [toKey.split(":")[0], toKey.split(":")[1]];
      return engine.getOrCreateProfile(from.organisation_id, model, id, { fireWelcome: true });
    })());
  if (!to || String(to.organisation_id) !== String(from.organisation_id)) return { error: "That person couldn't be found." };

  const since = startOfISTDay();
  const [today, todayToPerson] = await Promise.all([
    GamKudos.countDocuments({ fromKey: from.personKey, createdAt: { $gte: since } }),
    GamKudos.countDocuments({ fromKey: from.personKey, toKey, createdAt: { $gte: since } }),
  ]);
  if (today >= settings.kudos.dailyLimit) return { error: `You can give up to ${settings.kudos.dailyLimit} kudos a day.` };
  if (todayToPerson >= settings.kudos.maxPerDayPerPerson) return { error: "You've already recognised them today. Spread the love!" };

  let gift = Math.max(0, Math.min(Math.round(Number(coins) || 0), settings.kudos.maxCoinsPerKudos));
  const budget = monthBudget(from, settings);
  if (gift > budget.left) return { error: `You only have ${budget.left} gift coins left this month.` };

  const cat = GamKudos.CATEGORIES.find((c) => c.key === category) ? category : "teamwork";
  const doc = await GamKudos.create({
    organisation_id: from.organisation_id, fromKey: from.personKey, fromName: from.name, fromPhoto: from.photo,
    toKey: to.personKey, toName: to.name, toPhoto: to.photo, toDepartment: to.department, category: cat, message: text, coins: gift,
  });
  if (gift > 0) {
    await GamProfile.updateOne({ _id: from._id }, { $set: { "kudosBudget.monthKey": budget.monthKey }, $inc: { "kudosBudget.used": gift } });
  }
  const mine = await engine.award({ ...ref(from), event: "kudos_given", dedupeKey: `kg:${doc._id}`, meta: { to: to.personKey } });
  const catLabel = GamKudos.CATEGORIES.find((c) => c.key === cat).label;
  await engine.award({ ...ref(to), event: "kudos_received", coins: undefined, dedupeKey: `kr:${doc._id}`, meta: { from: from.personKey, gift }, reason: `Kudos from ${from.name}` });
  if (gift > 0) await engine.award({ ...ref(to), event: "kudos_gift", coins: gift, dedupeKey: `kgift:${doc._id}`, reason: `Gift from ${from.name}`, force: true, silent: true });
  await engine.notifyPerson(to, { title: `🌟 ${from.name} recognised you`, message: `${catLabel}: "${text.slice(0, 120)}"${gift ? ` (+${gift} gift coins)` : ""}`, priority: "medium", meta: { kudos: String(doc._id) } });
  return { kudos: doc.toObject(), award: mine, budget: monthBudget({ ...from, kudosBudget: { monthKey: budget.monthKey, used: budget.used + gift } }, settings) };
};

const toggleReaction = async (profile, kudosId, emoji) => {
  if (!REACTIONS.includes(emoji)) return { error: "Unsupported reaction." };
  if (!mongoose.isValidObjectId(kudosId)) return { error: "Not found." };
  const k = await GamKudos.findOne({ _id: kudosId, organisation_id: profile.organisation_id, hidden: false });
  if (!k) return { error: "Not found." };
  const list = (k.reactions && k.reactions[emoji]) || [];
  const has = list.includes(profile.personKey);
  const path = `reactions.${emoji}`;
  await GamKudos.updateOne({ _id: k._id }, has ? { $pull: { [path]: profile.personKey } } : { $addToSet: { [path]: profile.personKey } });
  if (!has) await engine.award({ ...ref(profile), event: "kudos_reacted", dedupeKey: `kre:${k._id}:${profile.personKey}` });
  const fresh = await GamKudos.findById(k._id).lean();
  return { reactions: fresh.reactions };
};

const shapeKudos = (k, viewerKey) => ({
  id: String(k._id), fromKey: k.fromKey, fromName: k.fromName, fromPhoto: k.fromPhoto, toKey: k.toKey, toName: k.toName, toPhoto: k.toPhoto,
  toDepartment: k.toDepartment, category: k.category, message: k.message, coins: k.coins, pinned: k.pinned, createdAt: k.createdAt,
  reactions: Object.fromEntries(Object.entries(k.reactions || {}).map(([e, l]) => [e, { count: l.length, mine: l.includes(viewerKey) }]).filter(([, v]) => v.count > 0)),
  comments: (k.comments || []).slice(-20).map((c) => ({ name: c.name, text: c.text, at: c.at, mine: c.key === viewerKey })),
  mine: k.fromKey === viewerKey, forMe: k.toKey === viewerKey,
});

module.exports = { give, toggleReaction, monthBudget, shapeKudos, REACTIONS };
