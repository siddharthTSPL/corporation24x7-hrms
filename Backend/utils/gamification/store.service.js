const mongoose = require("mongoose");
const GamReward = require("../../Models/gamification/reward.model");
const GamRedemption = require("../../Models/gamification/redemption.model");
const GamProfile = require("../../Models/gamification/gamprofile.model");
const engine = require("./engine");

const ref = (p) => ({ organisation_id: p.organisation_id, model: p.personModel, id: p.person });

const redeem = async (profile, rewardId, note) => {
  if (!mongoose.isValidObjectId(rewardId)) return { error: "Reward not found." };
  const reward = await GamReward.findOne({ _id: rewardId, organisation_id: profile.organisation_id, active: true });
  if (!reward) return { error: "This reward isn't available." };
  if ((profile.level || 1) < reward.minLevel) return { error: `Unlocks at level ${reward.minLevel}.` };
  if (profile.coins < reward.cost) return { error: "You don't have enough reward points yet." };
  if (reward.perUserLimit > 0) {
    const used = await GamRedemption.countDocuments({ reward: reward._id, personKey: profile.personKey, status: { $nin: ["rejected", "cancelled"] } });
    if (used >= reward.perUserLimit) return { error: "You've reached the limit for this reward." };
  }
  // stock (atomic)
  const stockFilter = reward.stock >= 0 ? { _id: reward._id, stock: { $gt: 0 } } : { _id: reward._id };
  const stockUpdate = reward.stock >= 0 ? { $inc: { stock: -1, redeemedCount: 1 } } : { $inc: { redeemedCount: 1 } };
  if (!(await GamReward.findOneAndUpdate(stockFilter, stockUpdate))) return { error: "Sorry, this reward is out of stock." };

  const redemptionId = new mongoose.Types.ObjectId();
  const paid = await engine.award({
    ...ref(profile), event: "store_redeem", coins: -reward.cost, dedupeKey: `redeem:${redemptionId}`,
    meta: { reward: String(reward._id), name: reward.name, countOnly: true }, reason: `Redeemed: ${reward.name}`, force: true,
  });
  if (!paid.ok) {
    await GamReward.updateOne({ _id: reward._id }, { $inc: { redeemedCount: -1, ...(reward.stock >= 0 ? { stock: 1 } : {}) } });
    return { error: paid.skipped === "insufficient_coins" ? "You don't have enough reward points yet." : "Couldn't complete the redemption." };
  }
  const auto = !reward.requiresApproval;
  const doc = await GamRedemption.create({
    _id: redemptionId, organisation_id: profile.organisation_id, reward: reward._id, rewardName: reward.name, rewardIcon: reward.icon,
    personKey: profile.personKey, personName: profile.name, department: profile.department, cost: reward.cost,
    status: auto ? "fulfilled" : "pending", note: String(note || "").slice(0, 300),
    decidedAt: auto ? new Date() : null, decidedBy: auto ? "system" : "",
  });
  return { redemption: doc.toObject(), reward: reward.toObject() };
};

// Refunds points + stock (cancel by owner, reject by admin).
const refund = async (redemption, profile) => {
  await engine.award({
    organisation_id: redemption.organisation_id, model: profile.personModel, id: profile.person, event: "store_refund",
    coins: redemption.cost, dedupeKey: `refund:${redemption._id}`, reason: `Refund: ${redemption.rewardName}`, force: true, silent: true,
  });
  // A refunded redemption must not keep counting toward redemption achievements.
  await GamProfile.updateOne({ _id: profile._id }, { $inc: { spentCoins: -redemption.cost, "stats.store_redeem": -1 } });
  const r = await GamReward.findById(redemption.reward);
  if (r) await GamReward.updateOne({ _id: r._id }, { $inc: { redeemedCount: -1, ...(r.stock >= 0 ? { stock: 1 } : {}) } });
};

module.exports = { redeem, refund };
