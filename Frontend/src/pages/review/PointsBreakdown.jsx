import React from "react";
import { useReviewCriteria } from "./useReviewCriteria";

const BRAND = {
  pink: "#8B1A4A",
  maroon: "#5C0F30",
  cardBorder: "#E8D5DF",
  mutedText: "#9B7A8A",
  textPrimary: "#2D0A1A",
  accentLight: "#FAF0F5",
};

function GradeBadge({ grade, tone }) {
  return (
    <span
      className="text-[11px] font-semibold w-6 h-6 rounded-md flex items-center justify-center shrink-0"
      style={{
        background: tone === "minus" ? "#FCEEF0" : BRAND.accentLight,
        color: tone === "minus" ? "#B0233A" : BRAND.pink,
      }}
    >
      {grade ?? "—"}
    </span>
  );
}

function CriteriaColumn({ title, tone, criteria, grades }) {
  return (
    <div className="flex-1 min-w-[220px]">
      <p
        className="m-0 mb-1.5 text-[10.5px] font-semibold uppercase tracking-[0.08em]"
        style={{ color: tone === "minus" ? "#B0233A" : BRAND.pink }}
      >
        {title} ({criteria.length})
      </p>
      <div className="flex flex-col gap-1">
        {criteria.map((c) => (
          <div key={c.key} className="flex items-center justify-between gap-2 py-1">
            <span className="text-[12px] truncate" style={{ color: BRAND.textPrimary }}>
              {c.label}
            </span>
            <GradeBadge grade={grades[c.key]} tone={tone} />
          </div>
        ))}
      </div>
    </div>
  );
}

/**
 * Read-only breakdown of all 28 individual criteria grades (14 Plus + 14
 * Minus) behind a review's single "overallScore / 5". Pass the review
 * document — it reads review.plusPoints / review.minusPoints, each an
 * array of { key, grade }.
 */
export default function PointsBreakdown({ review }) {
  const { data: criteriaData, isLoading } = useReviewCriteria();
  const plusCriteria = criteriaData?.plusPoints ?? [];
  const minusCriteria = criteriaData?.minusPoints ?? [];

  const plusGrades = Object.fromEntries((review?.plusPoints ?? []).map((p) => [p.key, p.grade]));
  const minusGrades = Object.fromEntries((review?.minusPoints ?? []).map((p) => [p.key, p.grade]));

  if (isLoading) {
    return (
      <p className="m-0 text-[12px]" style={{ color: BRAND.mutedText }}>
        Loading breakdown…
      </p>
    );
  }

  if (plusCriteria.length === 0 && minusCriteria.length === 0) {
    return null;
  }

  return (
    <div>
      <p className="m-0 mb-2 text-[10.5px] uppercase tracking-[0.08em]" style={{ color: BRAND.mutedText }}>
        All 28 Points (each graded 1-5)
      </p>
      <div className="flex flex-wrap gap-4 p-3 rounded-xl border" style={{ borderColor: BRAND.cardBorder, background: "#FBF9FA" }}>
        <CriteriaColumn title="Plus Points" tone="plus" criteria={plusCriteria} grades={plusGrades} />
        <CriteriaColumn title="Minus Points" tone="minus" criteria={minusCriteria} grades={minusGrades} />
      </div>
    </div>
  );
}