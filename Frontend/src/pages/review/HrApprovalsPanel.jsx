import React, { useState } from "react";
import ReviewCard from "./ReviewCard";

const BRAND = {
  pink: "#8B1A4A",
  maroon: "#5C0F30",
  cardBorder: "#E8D5DF",
  mutedText: "#9B7A8A",
  accentLight: "#FAF0F5",
};

/**
 * @param useGetAllReviews  the role-appropriate "get all reviews" hook (org-wide)
 * @param onHrDecision      hook's mutate function, called with {reviewId, decision, comment}
 * @param isPending
 */
export default function HrApprovalsPanel({ useGetAllReviews, onHrDecision, isPending }) {
  const [showAll, setShowAll] = useState(false);
  const { data, isLoading, isError, error, refetch } = useGetAllReviews();
  const reviews = data?.reviews ?? [];

  const pending = reviews.filter((r) => r.hrAcknowledgement?.status === "pending");
  const visible = showAll ? reviews : pending;

  return (
    <div className="bg-white rounded-2xl border-2 shadow-md overflow-hidden" style={{ borderColor: BRAND.maroon }}>
      <div className="p-4 sm:p-5 border-b flex flex-wrap items-center justify-between gap-2" style={{ borderColor: BRAND.cardBorder }}>
        <div>
          <p className="m-0 text-[11px] tracking-[0.1em] uppercase font-medium" style={{ color: BRAND.mutedText }}>
            HR Approvals
          </p>
          <p className="m-0 mt-0.5 text-[13px]" style={{ color: BRAND.pink }}>
            {pending.length} review{pending.length !== 1 ? "s" : ""} awaiting final approval
          </p>
        </div>
        <button
          type="button"
          onClick={() => setShowAll((s) => !s)}
          className="text-[12px] font-medium py-1.5 px-3 rounded-full border cursor-pointer"
          style={{ borderColor: BRAND.cardBorder, color: BRAND.mutedText, background: BRAND.accentLight }}
        >
          {showAll ? "Show pending only" : "Show all reviews"}
        </button>
      </div>

      <div className="p-3 sm:p-4">
        {isLoading && (
          <div className="text-center py-8 text-sm" style={{ color: BRAND.mutedText }}>
            Loading reviews…
          </div>
        )}
        {isError && (
          <div className="text-center py-6">
            <p className="text-[13px] mb-2" style={{ color: "#8B1A2A" }}>
              {error?.response?.data?.message ?? error?.message ?? "Failed to load reviews."}
            </p>
            <button
              type="button"
              onClick={() => refetch()}
              className="text-xs py-1.5 px-3.5 rounded-lg border cursor-pointer"
              style={{ borderColor: BRAND.pink, color: BRAND.pink, background: BRAND.accentLight }}
            >
              Retry
            </button>
          </div>
        )}
        {!isLoading && !isError && visible.length === 0 && (
          <div className="text-center py-10 text-sm" style={{ color: BRAND.mutedText }}>
            {showAll ? "No reviews found." : "Nothing pending — all reviews have an HR decision."}
          </div>
        )}
        {!isLoading && !isError && visible.length > 0 && (
          <div className="flex flex-col gap-3">
            {visible
              .slice()
              .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
              .map((r) => (
                <ReviewCard
                  key={r._id}
                  review={r}
                  hrView
                  hrPending={isPending}
                  onHrDecision={({ decision, comment }) => onHrDecision({ reviewId: r._id, decision, comment })}
                />
              ))}
          </div>
        )}
      </div>
    </div>
  );
}