import React, { useState } from "react";
import { ratingColor } from "./ReviewGradingForm";
import PointsBreakdown from "./PointsBreakdown";

const BRAND = {
  pink: "#8B1A4A",
  maroon: "#5C0F30",
  cardBorder: "#E8D5DF",
  mutedText: "#9B7A8A",
  textPrimary: "#2D0A1A",
  accentLight: "#FAF0F5",
  accentBorder: "#D4A0B8",
};

function getFullName(p) {
  if (p?.f_name) return `${p.f_name} ${p.l_name ?? ""}`.trim();
  return p?.name ?? "Unknown";
}

function formatDate(d) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}

// Until HR has actually approved/rejected the review, the badge just reads
// "Pending" — the in-between reviewer/reviewee states aren't a final
// decision yet, so labelling them individually read as more final than
// they were.
const STATUS_LABEL = {
  submitted: "Pending",
  reviewee_accepted: "Pending",
  reviewee_disputed: "Pending",
  hr_approved: "HR Approved (Final)",
  hr_rejected: "HR Rejected",
};

const STATUS_COLOR = {
  submitted: "#B8860B",
  reviewee_accepted: "#B8860B",
  reviewee_disputed: "#B8860B",
  hr_approved: "#1E7A3D",
  hr_rejected: "#B0233A",
};

/**
 * @param review               the review document
 * @param revieweeView         true when the logged-in user IS the reviewee (shows Accept/Dispute)
 * @param onRespond({status, comment})   called when reviewee accepts/disputes
 * @param respondPending
 * @param hrView               true when the logged-in user can give the HR acknowledgement
 * @param onHrDecision({decision, comment})
 * @param hrPending
 */
export default function ReviewCard({
  review,
  revieweeView = false,
  onRespond,
  respondPending = false,
  hrView = false,
  onHrDecision,
  hrPending = false,
}) {
  const [comment, setComment] = useState("");
  const [expanded, setExpanded] = useState(false);

  const status = review.status || "submitted";
  const canRespond = revieweeView && review.revieweeAcceptance?.status === "pending";
  const canHrAct = hrView && review.hrAcknowledgement?.status === "pending";

  return (
    <div className="bg-white rounded-2xl border shadow-sm overflow-hidden" style={{ borderColor: BRAND.cardBorder }}>
      <div className="p-4 flex flex-wrap items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="m-0 text-[14px] font-semibold truncate" style={{ color: BRAND.textPrimary, fontFamily: "'Playfair Display', Georgia, serif" }}>
            {getFullName(review.reviewee)}
          </p>
          <p className="m-0 text-[11px]" style={{ color: BRAND.mutedText }}>
            Reviewed by {getFullName(review.reviewer)} · {review.monthYear} · {formatDate(review.createdAt)}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="text-right">
            <p className="m-0 text-lg font-bold" style={{ color: ratingColor(review.overallRating) }}>
              {review.overallScore} / 5
            </p>
            <p className="m-0 text-[11px]" style={{ color: ratingColor(review.overallRating) }}>
              {review.overallRating}
            </p>
          </div>
          <span
            className="text-[10.5px] font-medium py-1 px-2.5 rounded-full whitespace-nowrap"
            style={{ background: `${STATUS_COLOR[status]}18`, color: STATUS_COLOR[status] }}
          >
            {STATUS_LABEL[status] || status}
          </span>
        </div>
      </div>

      <button
        type="button"
        onClick={() => setExpanded((e) => !e)}
        className="w-full text-left px-4 pb-3 text-[12px] cursor-pointer"
        style={{ color: BRAND.pink }}
      >
        {expanded ? "Hide details ▲" : "View details ▼"}
      </button>

      {expanded && (
        <div className="px-4 pb-4 flex flex-col gap-3 border-t pt-3" style={{ borderColor: BRAND.cardBorder }}>
          <PointsBreakdown review={review} />
          {review.reviewerComments && (
            <div>
              <p className="m-0 text-[10.5px] uppercase tracking-[0.08em]" style={{ color: BRAND.mutedText }}>Reviewer Comments</p>
              <p className="m-0 text-[13px]" style={{ color: BRAND.textPrimary }}>{review.reviewerComments}</p>
            </div>
          )}
          {review.recommendation && (
            <div>
              <p className="m-0 text-[10.5px] uppercase tracking-[0.08em]" style={{ color: BRAND.mutedText }}>Recommendation</p>
              <p className="m-0 text-[13px]" style={{ color: BRAND.textPrimary }}>{review.recommendation}</p>
            </div>
          )}
          {review.revieweeAcceptance?.status !== "pending" && review.revieweeAcceptance?.comment && (
            <div>
              <p className="m-0 text-[10.5px] uppercase tracking-[0.08em]" style={{ color: BRAND.mutedText }}>Reviewee's Response</p>
              <p className="m-0 text-[13px]" style={{ color: BRAND.textPrimary }}>{review.revieweeAcceptance.comment}</p>
            </div>
          )}
          {review.hrAcknowledgement?.status !== "pending" && review.hrAcknowledgement?.comment && (
            <div>
              <p className="m-0 text-[10.5px] uppercase tracking-[0.08em]" style={{ color: BRAND.mutedText }}>HR Comment</p>
              <p className="m-0 text-[13px]" style={{ color: BRAND.textPrimary }}>{review.hrAcknowledgement.comment}</p>
            </div>
          )}
        </div>
      )}

      {(canRespond || canHrAct) && (
        <div className="p-4 border-t flex flex-col gap-2.5" style={{ borderColor: BRAND.cardBorder, background: BRAND.accentLight }}>
          <textarea
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            rows={2}
            placeholder={canRespond ? "Add a comment (optional)…" : "Add an approval/rejection note (optional)…"}
            className="w-full box-border bg-white border rounded-xl py-2 px-3 text-[13px] outline-none resize-none"
            style={{ borderColor: BRAND.cardBorder, color: BRAND.textPrimary }}
          />
          <div className="flex gap-2 justify-end">
            {canRespond && (
              <>
                <button
                  type="button"
                  disabled={respondPending}
                  onClick={() => onRespond({ status: "disputed", comment })}
                  className="text-[12px] font-medium py-2 px-3.5 rounded-lg border cursor-pointer disabled:opacity-40"
                  style={{ borderColor: "#B0233A", color: "#B0233A", background: "#fff" }}
                >
                  Dispute
                </button>
                <button
                  type="button"
                  disabled={respondPending}
                  onClick={() => onRespond({ status: "accepted", comment })}
                  className="text-[12px] font-semibold py-2 px-3.5 rounded-lg text-white cursor-pointer disabled:opacity-40"
                  style={{ background: `linear-gradient(135deg, ${BRAND.maroon}, ${BRAND.pink})` }}
                >
                  Accept
                </button>
              </>
            )}
            {canHrAct && (
              <>
                <button
                  type="button"
                  disabled={hrPending}
                  onClick={() => onHrDecision({ decision: "rejected", comment })}
                  className="text-[12px] font-medium py-2 px-3.5 rounded-lg border cursor-pointer disabled:opacity-40"
                  style={{ borderColor: "#B0233A", color: "#B0233A", background: "#fff" }}
                >
                  Reject
                </button>
                <button
                  type="button"
                  disabled={hrPending}
                  onClick={() => onHrDecision({ decision: "approved", comment })}
                  className="text-[12px] font-semibold py-2 px-3.5 rounded-lg text-white cursor-pointer disabled:opacity-40"
                  style={{ background: `linear-gradient(135deg, ${BRAND.maroon}, ${BRAND.pink})` }}
                >
                  Approve (Final)
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}