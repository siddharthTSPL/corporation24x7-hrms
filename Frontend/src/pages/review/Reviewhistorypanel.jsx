import React, { useMemo, useState } from "react";
import { exportReviewsCsv } from "./reviewCsv";
import { useReviewCriteria } from "./useReviewCriteria";
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

function getEmail(p) {
  return p?.work_email ?? p?.email ?? "";
}

function ratingColor(rating) {
  if (rating === "Excellent" || rating === "Very Good") return "#1E7A3D";
  if (rating === "Good") return BRAND.pink;
  if (rating === "Average") return "#B8860B";
  return "#B0233A";
}

const STATUS_LABEL = {
  submitted: "Awaiting response",
  reviewee_accepted: "Accepted",
  reviewee_disputed: "Disputed",
  hr_approved: "HR Approved",
  hr_rejected: "HR Rejected",
};

const STATUS_COLOR = {
  submitted: "#B8860B",
  reviewee_accepted: "#1E7A3D",
  reviewee_disputed: "#B0233A",
  hr_approved: "#1E7A3D",
  hr_rejected: "#B0233A",
};

function formatDate(d) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export default function ReviewHistoryPanel({
  useGetAllReviews,
  revieweeRoleModel,
  revieweeLabel = "Employee",
  csvFilePrefix = "reviews",
}) {
  const [monthYear, setMonthYear] = useState("");
  const [search, setSearch] = useState("");
  const [expandedId, setExpandedId] = useState(null);

  const { data: criteriaData, isLoading: criteriaLoading } = useReviewCriteria();
  const plusCriteria = criteriaData?.plusPoints ?? [];
  const minusCriteria = criteriaData?.minusPoints ?? [];

  const params = useMemo(() => {
    const p = {};
    if (revieweeRoleModel) p.revieweeRoleModel = revieweeRoleModel;
    if (monthYear) p.monthYear = monthYear;
    return p;
  }, [revieweeRoleModel, monthYear]);

  const { data, isLoading, isError, error, refetch } = useGetAllReviews(params);
  const reviews = data?.reviews ?? [];

  const filtered = reviews.filter((r) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      getFullName(r.reviewee).toLowerCase().includes(q) ||
      getEmail(r.reviewee).toLowerCase().includes(q) ||
      getFullName(r.reviewer).toLowerCase().includes(q)
    );
  });

  const handleExport = () => {
    if (filtered.length === 0) return;
    const filename = `${csvFilePrefix}-${monthYear || "all"}-${new Date()
      .toISOString()
      .slice(0, 10)}.csv`;
    // Includes the full 28-point breakdown (14 Plus + 14 Minus), not just
    // the overall /5 score.
    exportReviewsCsv({ reviews: filtered, plusCriteria, minusCriteria, filename });
  };

  return (
    <div className="bg-white rounded-2xl border-2 border-[#5C0F30] shadow-md overflow-hidden">
      <div className="p-4 sm:p-5 border-b border-[#E8D5DF] flex flex-col gap-3">
        <div className="flex justify-between items-center flex-wrap gap-2">
          <p className="m-0 text-[11px] tracking-[0.1em] uppercase text-[#9B7A8A] font-medium">
            {revieweeLabel} Review History
          </p>
          <span className="text-[11px] text-[#8B1A4A] bg-[#8B1A4A]/10 px-2.5 py-0.5 rounded-full">
            {filtered.length} review{filtered.length !== 1 ? "s" : ""}
          </span>
        </div>

        <div className="flex flex-wrap gap-2.5 items-end">
          <div className="flex-1 min-w-[160px]">
            <label className="block text-[10px] mb-1" style={{ color: BRAND.mutedText }}>
              Search
            </label>
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Name or email…"
              className="w-full box-border bg-[#F5F0F3] border rounded-lg py-2 px-3 text-[13px] outline-none font-sans"
              style={{ borderColor: BRAND.cardBorder, color: BRAND.textPrimary }}
            />
          </div>
          <div className="min-w-[140px]">
            <label className="block text-[10px] mb-1" style={{ color: BRAND.mutedText }}>
              Month
            </label>
            <input
              type="month"
              value={monthYear}
              onChange={(e) => setMonthYear(e.target.value)}
              className="w-full box-border bg-[#F5F0F3] border rounded-lg py-2 px-3 text-[13px] outline-none font-sans"
              style={{ borderColor: BRAND.cardBorder, color: BRAND.textPrimary }}
            />
          </div>
          <button
            type="button"
            onClick={handleExport}
            disabled={filtered.length === 0 || criteriaLoading}
            className="flex items-center justify-center gap-1.5 py-2 px-3.5 rounded-lg text-[13px] font-medium text-white cursor-pointer transition-all disabled:opacity-40 disabled:cursor-not-allowed whitespace-nowrap"
            style={{
              background: `linear-gradient(135deg, ${BRAND.maroon}, ${BRAND.pink})`,
              boxShadow: "0 3px 12px rgba(139,26,74,0.3)",
            }}
          >
            Export CSV (all 28 points)
          </button>
        </div>
      </div>

      <div className="p-3 sm:p-4">
        {isLoading && (
          <div className="text-[#9B7A8A] text-sm py-6 px-2 text-center">Loading reviews…</div>
        )}

        {isError && (
          <div className="p-4 text-center">
            <div className="text-[#8B1A2A] text-[13px] mb-2">
              {error?.response?.data?.message ?? error?.message ?? "Failed to load reviews."}
            </div>
            <button
              type="button"
              onClick={() => refetch()}
              className="bg-transparent cursor-pointer text-xs text-[#8B1A4A] border border-[#8B1A4A]/50 rounded-lg py-1.5 px-3.5 bg-[#FAF0F5] hover:bg-[#F5E8EF] transition-colors"
            >
              Retry
            </button>
          </div>
        )}

        {!isLoading && !isError && filtered.length === 0 && (
          <div className="text-center py-9 px-5 text-[#9B7A8A] text-sm leading-relaxed">
            No reviews found{monthYear ? " for this month" : ""}.
          </div>
        )}

        {!isLoading && !isError && filtered.length > 0 && (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-[13px] min-w-[820px]">
              <thead>
                <tr style={{ background: BRAND.accentLight }}>
                  <th className="text-left py-2.5 px-3 font-medium text-[11px] tracking-[0.05em] uppercase" style={{ color: BRAND.mutedText }}>
                    {revieweeLabel}
                  </th>
                  <th className="text-left py-2.5 px-3 font-medium text-[11px] tracking-[0.05em] uppercase" style={{ color: BRAND.mutedText }}>
                    Month
                  </th>
                  <th className="text-left py-2.5 px-3 font-medium text-[11px] tracking-[0.05em] uppercase" style={{ color: BRAND.mutedText }}>
                    Overall
                  </th>
                  <th className="text-left py-2.5 px-3 font-medium text-[11px] tracking-[0.05em] uppercase" style={{ color: BRAND.mutedText }}>
                    Status
                  </th>
                  <th className="text-left py-2.5 px-3 font-medium text-[11px] tracking-[0.05em] uppercase" style={{ color: BRAND.mutedText }}>
                    Recommendation
                  </th>
                  <th className="text-left py-2.5 px-3 font-medium text-[11px] tracking-[0.05em] uppercase" style={{ color: BRAND.mutedText }}>
                    Reviewed By
                  </th>
                  <th className="text-left py-2.5 px-3 font-medium text-[11px] tracking-[0.05em] uppercase" style={{ color: BRAND.mutedText }}>
                    Date
                  </th>
                  <th className="text-left py-2.5 px-3 font-medium text-[11px] tracking-[0.05em] uppercase" style={{ color: BRAND.mutedText }}>
                    28 Points
                  </th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((r) => {
                  const isExpanded = expandedId === r._id;
                  return (
                    <React.Fragment key={r._id}>
                      <tr className="border-b" style={{ borderColor: BRAND.cardBorder }}>
                        <td className="py-2.5 px-3">
                          <p className="m-0 font-medium truncate max-w-[160px]" style={{ color: BRAND.textPrimary }}>
                            {getFullName(r.reviewee)}
                          </p>
                          <p className="m-0 text-[11px] truncate max-w-[160px]" style={{ color: BRAND.mutedText }}>
                            {getEmail(r.reviewee)}
                          </p>
                        </td>
                        <td className="py-2.5 px-3" style={{ color: BRAND.textPrimary }}>
                          {r.monthYear}
                        </td>
                        <td className="py-2.5 px-3">
                          <span className="font-semibold" style={{ color: ratingColor(r.overallRating) }}>
                            {r.overallScore}/5 · {r.overallRating}
                          </span>
                        </td>
                        <td className="py-2.5 px-3">
                          <span
                            className="text-[11px] font-medium py-0.5 px-2 rounded-full whitespace-nowrap"
                            style={{ background: `${STATUS_COLOR[r.status] ?? BRAND.mutedText}18`, color: STATUS_COLOR[r.status] ?? BRAND.mutedText }}
                          >
                            {STATUS_LABEL[r.status] ?? r.status}
                          </span>
                        </td>
                        <td className="py-2.5 px-3" style={{ color: BRAND.textPrimary }}>
                          {r.recommendation ?? "—"}
                        </td>
                        <td className="py-2.5 px-3" style={{ color: BRAND.textPrimary }}>
                          {getFullName(r.reviewer)}
                        </td>
                        <td className="py-2.5 px-3 whitespace-nowrap" style={{ color: BRAND.mutedText }}>
                          {formatDate(r.createdAt)}
                        </td>
                        <td className="py-2.5 px-3 whitespace-nowrap">
                          <button
                            type="button"
                            onClick={() => setExpandedId(isExpanded ? null : r._id)}
                            className="text-[11px] font-medium cursor-pointer"
                            style={{ color: BRAND.pink }}
                          >
                            {isExpanded ? "Hide ▲" : "View ▼"}
                          </button>
                        </td>
                      </tr>
                      {isExpanded && (
                        <tr className="border-b" style={{ borderColor: BRAND.cardBorder }}>
                          <td colSpan={8} className="py-3 px-3" style={{ background: BRAND.accentLight }}>
                            <PointsBreakdown review={r} />
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}