import React from "react";
import ReviewCard from "./ReviewCard";
import { exportReviewsCsv } from "./reviewCsv";
import { useReviewCriteria } from "./useReviewCriteria";

const BRAND = {
  pink: "#8B1A4A",
  maroon: "#5C0F30",
  mutedText: "#9B7A8A",
};

export default function MyReviewsList({ reviews = [], onRespond, respondPending, csvFilePrefix = "my-reviews" }) {
  const { data: criteriaData, isLoading: criteriaLoading } = useReviewCriteria();
  const plusCriteria = criteriaData?.plusPoints ?? [];
  const minusCriteria = criteriaData?.minusPoints ?? [];

  const sorted = reviews.slice().sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

  const handleExport = () => {
    if (sorted.length === 0) return;
    const filename = `${csvFilePrefix}-${new Date().toISOString().slice(0, 10)}.csv`;
    exportReviewsCsv({ reviews: sorted, plusCriteria, minusCriteria, filename });
  };

  if (reviews.length === 0) {
    return (
      <div className="text-center py-10 text-sm" style={{ color: BRAND.mutedText }}>
        No reviews have been given to you yet.
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex justify-end">
        <button
          type="button"
          onClick={handleExport}
          disabled={criteriaLoading}
          className="text-[12px] font-medium py-2 px-3.5 rounded-lg text-white cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed whitespace-nowrap"
          style={{
            background: `linear-gradient(135deg, ${BRAND.maroon}, ${BRAND.pink})`,
            boxShadow: "0 3px 12px rgba(139,26,74,0.3)",
          }}
        >
          Export CSV (all 28 points)
        </button>
      </div>
      {sorted.map((r) => (
        <ReviewCard
          key={r._id}
          review={r}
          revieweeView
          respondPending={respondPending}
          onRespond={({ status, comment }) => onRespond({ reviewId: r._id, status, comment })}
        />
      ))}
    </div>
  );
}