import { downloadCsv } from "../dashboard/Exportcsv";

export function getFullName(p) {
  if (p?.f_name) return `${p.f_name} ${p.l_name ?? ""}`.trim();
  return p?.name ?? "Unknown";
}

export function getEmail(p) {
  return p?.work_email ?? p?.email ?? "";
}

export function formatDate(d) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}

export const STATUS_LABEL = {
  submitted: "Awaiting response",
  reviewee_accepted: "Accepted",
  reviewee_disputed: "Disputed",
  hr_approved: "HR Approved",
  hr_rejected: "HR Rejected",
};

// Summary columns present on every review export, regardless of role.
const BASE_COLUMNS = [
  { key: "revieweeName", label: "Reviewee" },
  { key: "revieweeEmail", label: "Email" },
  { key: "revieweeRole", label: "Role" },
  { key: "monthYear", label: "Month" },
  { key: "overallScore", label: "Overall Score (/5)" },
  { key: "overallRating", label: "Overall Rating" },
  { key: "status", label: "Status" },
  { key: "recommendation", label: "Recommendation" },
  { key: "revieweeResponse", label: "Reviewee Response" },
  { key: "hrDecision", label: "HR Decision" },
  { key: "reviewerComments", label: "Reviewer Comments" },
  { key: "reviewedBy", label: "Reviewed By" },
  { key: "reviewedOn", label: "Reviewed On" },
];

function baseRow(r) {
  return {
    revieweeName: getFullName(r.reviewee),
    revieweeEmail: getEmail(r.reviewee),
    revieweeRole: r.revieweeRole ?? "",
    monthYear: r.monthYear ?? "",
    overallScore: r.overallScore ?? "",
    overallRating: r.overallRating ?? "",
    status: STATUS_LABEL[r.status] ?? r.status ?? "",
    recommendation: r.recommendation ?? "",
    revieweeResponse: r.revieweeAcceptance?.status ?? "",
    hrDecision: r.hrAcknowledgement?.status ?? "",
    reviewerComments: r.reviewerComments ?? "",
    reviewedBy: getFullName(r.reviewer),
    reviewedOn: formatDate(r.createdAt),
  };
}

/**
 * Builds a CSV that includes the full 28-point breakdown (14 Plus + 14
 * Minus criteria, each with the raw 1-5 grade the reviewer actually gave —
 * not the inverted/averaged overall score) alongside the usual summary
 * columns, and triggers the browser download.
 *
 * @param {object[]} reviews
 * @param {{key,label}[]} plusCriteria   from useReviewCriteria()
 * @param {{key,label}[]} minusCriteria  from useReviewCriteria()
 * @param {string} filename
 */
export function exportReviewsCsv({ reviews, plusCriteria = [], minusCriteria = [], filename }) {
  const plusColumns = plusCriteria.map((c) => ({ key: `plus__${c.key}`, label: `Plus: ${c.label}` }));
  const minusColumns = minusCriteria.map((c) => ({ key: `minus__${c.key}`, label: `Minus: ${c.label}` }));
  const columns = [...BASE_COLUMNS, ...plusColumns, ...minusColumns];

  const rows = reviews.map((r) => {
    const row = baseRow(r);
    plusCriteria.forEach((c) => {
      const entry = (r.plusPoints ?? []).find((p) => p.key === c.key);
      row[`plus__${c.key}`] = entry ? entry.grade : "";
    });
    minusCriteria.forEach((c) => {
      const entry = (r.minusPoints ?? []).find((p) => p.key === c.key);
      row[`minus__${c.key}`] = entry ? entry.grade : "";
    });
    return row;
  });

  downloadCsv(filename, columns, rows);
}