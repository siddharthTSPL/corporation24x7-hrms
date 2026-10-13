const HiringRequisition = require("../../Models/Hiringrequisition.model");
const Candidate = require("../../Models/candidate.model");

const FILLED_STAGES = ["SELECTED", "OFFER_RELEASED", "OFFER_ACCEPTED", "JOINED"];

const syncRequisitionFillStatus = async (requisitionId) => {
  const requisition = await HiringRequisition.findById(requisitionId);
  if (!requisition) return null;

  const filled_count = await Candidate.countDocuments({
    requisition_id: requisitionId,
    current_stage: { $in: FILLED_STAGES },
  });

  requisition.filled_count = filled_count;

  if (["APPROVED", "FILLED"].includes(requisition.status)) {
    requisition.status = filled_count >= requisition.openings ? "FILLED" : "APPROVED";
  }

  await requisition.save();
  return requisition;
};

module.exports = { FILLED_STAGES, syncRequisitionFillStatus };