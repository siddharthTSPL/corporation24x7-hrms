/**
 * Fixed criteria list — mirrors "1-SS-Simple-Performance-Review-Template.xlsx".
 * Each item is graded 1-5 by the reviewer.
 *
 * PLUS points: positive traits. Grade 5 = excellent, 1 = poor.
 * MINUS points: negative/risk behaviours. Grade 1 = rarely/never happens
 *               (good), 5 = severe / frequent occurrence (bad).
 *
 * NOTE: the source spreadsheet's "Parameter" column for the Minus Points
 * table (column G, rows 10-22) is mis-aligned by a row — several
 * descriptions are duplicated/shifted and don't match their own label
 * (e.g. "Delays" was showing the description meant for "Errors/Negligence").
 * The descriptions below have been corrected so each label has its own
 * matching description; the 14 labels themselves are unchanged from the sheet.
 */

const PLUS_CRITERIA = [
  { key: "targetAchievement", label: "Target Achievement", description: "Completion of assigned targets/KPIs within deadline" },
  { key: "qualityOfWork", label: "Quality of Work", description: "Accuracy, completeness and quality of work" },
  { key: "punctuality", label: "Punctuality", description: "Reporting time, meeting deadlines and timely completion" },
  { key: "attendance", label: "Attendance", description: "Regular attendance and availability during working hours" },
  { key: "communication", label: "Communication", description: "Clear and professional communication with staff/clients" },
  { key: "teamwork", label: "Teamwork", description: "Cooperation and coordination with colleagues" },
  { key: "functionalSkills", label: "Functional Skills", description: "Knowledge and ability to perform job responsibilities" },
  { key: "initiative", label: "Initiative", description: "Takes responsibility and proactively solves problems" },
  { key: "honestyIntegrity", label: "Honesty & Integrity", description: "Transparency, ethical conduct and responsible handling of information" },
  { key: "professionalism", label: "Professionalism", description: "Discipline, attitude, appearance and workplace conduct" },
  { key: "clientHandling", label: "Client/Stakeholder Handling", description: "Professional handling of clients, vendors and internal stakeholders" },
  { key: "compliance", label: "Compliance", description: "Follows company policies, procedures and instructions" },
  { key: "trainingDevelopment", label: "Training & Development", description: "Attends required training and applies learning to work" },
  { key: "ownershipAccountability", label: "Ownership & Accountability", description: "Takes responsibility for assigned work and outcomes" },
];

const MINUS_CRITERIA = [
  { key: "missedTargets", label: "Missed Targets", description: "Failure to achieve agreed targets without valid reason" },
  { key: "errorsNegligence", label: "Errors/Negligence", description: "Repeated mistakes or lack of attention to detail" },
  { key: "delays", label: "Delays", description: "Frequent delays in completing or submitting assigned work" },
  { key: "unplannedAbsence", label: "Unplanned Absence", description: "Frequent or unexplained absence from work" },
  { key: "poorCommunication", label: "Poor Communication", description: "Miscommunication, inappropriate language or delayed responses" },
  { key: "nonCooperation", label: "Non-Cooperation", description: "Conflict, lack of support or unwillingness to coordinate with the team" },
  { key: "skillGap", label: "Skill Gap", description: "Lack of required knowledge or failure to improve skills" },
  { key: "lackOfInitiative", label: "Lack of Initiative", description: "Requires constant supervision even for routine work" },
  { key: "policyViolation", label: "Policy Violation", description: "Misrepresentation, misuse of company resources or breach of policy" },
  { key: "unprofessionalBehaviour", label: "Unprofessional Behaviour", description: "Misconduct, inappropriate attitude or workplace behaviour" },
  { key: "clientComplaints", label: "Client Complaints", description: "Negative feedback or complaints related to conduct or work quality" },
  { key: "instructionsIgnored", label: "Instructions Ignored", description: "Failure to follow reasonable instructions or procedures" },
  { key: "trainingAvoidance", label: "Training Avoidance", description: "Failure to attend or participate in required training" },
  { key: "blameShifting", label: "Blame-Shifting", description: "Avoids taking responsibility for mistakes or assigned work" },
];

const PLUS_KEYS = PLUS_CRITERIA.map((c) => c.key);
const MINUS_KEYS = MINUS_CRITERIA.map((c) => c.key);

module.exports = { PLUS_CRITERIA, MINUS_CRITERIA, PLUS_KEYS, MINUS_KEYS };