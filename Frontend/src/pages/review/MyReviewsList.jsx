import React from "react";
import ReviewCard from "./ReviewCard";

const BRAND = { mutedText: "#9B7A8A" };

export default function MyReviewsList({ reviews = [], onRespond, respondPending }) {
  if (reviews.length === 0) {
    return (
      <div className="text-center py-10 text-sm" style={{ color: BRAND.mutedText }}>
        No reviews have been given to you yet.
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      {reviews
        .slice()
        .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
        .map((r) => (
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