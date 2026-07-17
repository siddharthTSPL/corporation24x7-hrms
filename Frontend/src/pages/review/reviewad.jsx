import React, { useState } from "react";
import { useFindAllManagerswithoutAdmin } from "../../auth/server-state/adminauth/adminauth.hook";
import { useReviewToManager } from "../../auth/server-state/adminother/adminother.hook";

const BRAND = {
  pink: "#8B1A4A",
  maroon: "#5C0F30",
  cream: "#F9F8F2",
  dark: "#1A0010",
  darkSurface: "#FFFFFF",
  cardBg: "#F5F0F3",
  cardBorder: "#E8D5DF",
  mutedText: "#9B7A8A",
  pageBackground: "#F2EEF0",
  textPrimary: "#2D0A1A",
  accentLight: "#FAF0F5",
  accentBorder: "#D4A0B8",
};

// Department short-form -> full-form mapping.
// Keep this in sync with the SuperAdmin dashboard's DEPT_OPTIONS list
// so any new department code added there gets a matching full name here.
const DEPT_FULL_FORMS = {
  OPR: "Operations",
  BPO: "Business Process Outsourcing",
  ENG: "Engineering",
  HR: "Human Resources",
  MGMT: "Management",
};

const getDepartmentName = (dept) => DEPT_FULL_FORMS[dept] || dept || "";

function getFullName(m) {
  if (m?.f_name) return `${m.f_name} ${m.l_name ?? ""}`.trim();
  return m?.name ?? "Unknown";
}

function getInitials(m) {
  const f = (m?.f_name ?? m?.name ?? "").charAt(0);
  const l = (m?.l_name ?? "").charAt(0);
  return (f + l).toUpperCase();
}

function getEmail(m) {
  return m?.work_email ?? m?.email ?? "";
}

function StarRating({ value, onChange }) {
  const [hovered, setHovered] = useState(0);
  return (
    <div className="flex gap-1.5 sm:gap-2">
      {[1, 2, 3, 4, 5].map((star) => {
        const filled = star <= (hovered || value);
        return (
          <button
            key={star}
            type="button"
            onClick={() => onChange(star)}
            onMouseEnter={() => setHovered(star)}
            onMouseLeave={() => setHovered(0)}
            className="bg-transparent border-none cursor-pointer p-0.5 transition-transform duration-150"
            style={{ transform: filled ? "scale(1.15)" : "scale(1)" }}
          >
            <svg className="w-6 h-6 sm:w-7 sm:h-7" viewBox="0 0 24 24">
              <polygon
                points="12,2 15.09,8.26 22,9.27 17,14.14 18.18,21.02 12,17.77 5.82,21.02 7,14.14 2,9.27 8.91,8.26"
                fill={filled ? BRAND.pink : "transparent"}
                stroke={filled ? BRAND.pink : BRAND.mutedText}
                strokeWidth="1.5"
                strokeLinejoin="round"
              />
            </svg>
          </button>
        );
      })}
    </div>
  );
}

function ManagerCard({ manager, selected, onClick }) {
  const isSelected = selected?._id === manager._id;
  return (
    <button
      type="button"
      onClick={() => onClick(manager)}
      className="w-full flex items-center gap-3 p-3 rounded-xl border transition-all duration-200 text-left relative overflow-hidden"
      style={{
        background: isSelected
          ? "linear-gradient(135deg, #F5E8EF 0%, #EDD5E3 100%)"
          : "#FFFFFF",
        borderColor: isSelected ? BRAND.pink : BRAND.cardBorder,
        boxShadow: isSelected
          ? `0 0 0 3px ${BRAND.pink}22, 0 4px 24px #00000015`
          : "0 2px 8px #00000010",
      }}
    >
      {isSelected && (
        <div
          className="absolute top-0 left-0 right-0 h-0.5"
          style={{
            background: `linear-gradient(90deg, ${BRAND.maroon}, ${BRAND.pink})`,
          }}
        />
      )}
      <div
        className="w-9 h-9 sm:w-10 sm:h-10 rounded-full flex items-center justify-center text-white text-xs sm:text-sm font-bold shrink-0 border"
        style={{
          background: isSelected
            ? `linear-gradient(135deg, ${BRAND.maroon}, ${BRAND.pink})`
            : `linear-gradient(135deg, #C9829E, ${BRAND.pink})`,
          fontFamily: "'Playfair Display', Georgia, serif",
          borderColor: isSelected ? BRAND.pink : BRAND.accentBorder,
        }}
      >
        {getInitials(manager)}
      </div>
      <div className="text-left min-w-0 flex-1">
        <p
          className="m-0 text-sm font-semibold text-[#2D0A1A] truncate"
          style={{ fontFamily: "'Playfair Display', Georgia, serif" }}
        >
          {getFullName(manager)}
        </p>
        <p className="m-0 mt-0.5 text-[11px] text-[#9B7A8A] truncate">
          {getEmail(manager)}
        </p>
        {manager.designation && (
          <p className="m-0 mt-0.5 text-[10px] sm:text-[11px] text-[#8B1A4A] capitalize truncate">
            {manager.designation}
            {manager.department ? ` · ${getDepartmentName(manager.department)}` : ""}
          </p>
        )}
      </div>
      {isSelected && (
        <div className="ml-auto w-5 h-5 rounded-full bg-[#8B1A4A] flex items-center justify-center shrink-0">
          <svg width="11" height="11" viewBox="0 0 12 12">
            <polyline
              points="2,6 5,9 10,3"
              fill="none"
              stroke="white"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </div>
      )}
    </button>
  );
}

const ratingLabels = {
  1: "Poor",
  2: "Fair",
  3: "Good",
  4: "Very Good",
  5: "Excellent",
};

export default function ReviewManager() {
  const {
    data,
    isLoading,
    isError,
    error,
    refetch,
  } = useFindAllManagerswithoutAdmin();

  const managers = Array.isArray(data)
    ? data
    : data?.managers ?? data?.data?.managers ?? [];

  const { mutate: submitReview, isPending, error: submitError } = useReviewToManager();

  const [selected, setSelected] = useState(null);
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [showForm, setShowForm] = useState(false);

  const canSubmit =
    selected && rating > 0 && comment.trim().length >= 10 && !isPending;

  const handleSelectManager = (manager) => {
    setSelected(manager);
    setShowForm(true);
  };

  const handleBack = () => {
    setShowForm(false);
  };

  const handleSubmit = () => {
    if (!canSubmit) return;
    submitReview(
      { managerid: selected._id, rating, comment },
      {
        onSuccess: () => {
          setSubmitted(true);
          setSelected(null);
          setRating(0);
          setComment("");
          setShowForm(false);
          setTimeout(() => setSubmitted(false), 4000);
        },
      }
    );
  };

  return (
    <div
      className="min-h-screen w-full overflow-x-hidden bg-[#F2EEF0] font-sans text-[#2D0A1A]"
      style={{ padding: "clamp(16px, 4vw, 40px)" }}
    >
      <link
        href="https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;600;700&family=Inter:wght@300;400;500&display=swap"
        rel="stylesheet"
      />

      <div className="w-full max-w-5xl mx-auto">
        <div className="mb-6 sm:mb-10 text-center">
          <div className="inline-block px-4 py-1 border border-[#D4A0B8] rounded-full text-[11px] tracking-[0.12em] uppercase text-[#8B1A4A] mb-3 bg-[#FAF0F5]">
            Performance Review
          </div>
          <h1
            className="text-2xl sm:text-3xl md:text-4xl font-bold text-[#2D0A1A] m-0 mb-2 tracking-tight"
            style={{ fontFamily: "'Playfair Display', Georgia, serif" }}
          >
            Review a Manager
          </h1>
          <p className="text-sm sm:text-base text-[#9B7A8A] m-auto max-w-md leading-relaxed">
            Share your experience and help drive meaningful growth within the team.
          </p>
        </div>

        {submitted && (
          <div
            className="p-4 rounded-xl border mb-6 flex items-center gap-3 text-sm"
            style={{
              background: "linear-gradient(135deg, #EDD5E3, #F5E8EF)",
              borderColor: `${BRAND.pink}55`,
              color: BRAND.textPrimary,
            }}
          >
            <div className="w-5 h-5 rounded-full bg-[#8B1A4A] flex items-center justify-center shrink-0">
              <svg width="12" height="12" viewBox="0 0 12 12">
                <polyline
                  points="2,6 5,9 10,3"
                  fill="none"
                  stroke="white"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </div>
            Review submitted successfully. Thank you for your feedback.
          </div>
        )}

        {submitError && (
          <div className="bg-[#FFF0F0] border border-[#cc3355] rounded-xl p-4 mb-6 text-[#8B1A2A] text-sm">
            {submitError?.response?.data?.message ??
              "Something went wrong. Please try again."}
          </div>
        )}

        <div className="block lg:hidden">
          {!showForm ? (
            <div className="bg-white rounded-2xl border-2 border-[#5C0F30] shadow-md overflow-hidden">
              <div className="p-4 border-b border-[#E8D5DF] flex justify-between items-center">
                <p className="m-0 text-[11px] tracking-[0.1em] uppercase text-[#9B7A8A] font-medium">
                  Select Manager
                </p>
                {managers.length > 0 && (
                  <span className="text-[11px] text-[#8B1A4A] bg-[#8B1A4A]/10 px-2.5 py-0.5 rounded-full">
                    {managers.length} available
                  </span>
                )}
              </div>
              <div className="p-3 flex flex-col gap-2 max-h-[60vh] overflow-y-auto">
                {isLoading && (
                  <div className="text-[#9B7A8A] text-sm py-4 px-2 flex items-center gap-2">
                    <svg
                      className="w-4 h-4 animate-spin"
                      viewBox="0 0 24 24"
                      fill="none"
                    >
                      <circle
                        cx="12"
                        cy="12"
                        r="10"
                        stroke={BRAND.mutedText}
                        strokeWidth="2"
                        opacity="0.3"
                      />
                      <path
                        d="M12 2a10 10 0 0 1 10 10"
                        stroke={BRAND.mutedText}
                        strokeWidth="2"
                        strokeLinecap="round"
                      />
                    </svg>
                    Loading managers…
                  </div>
                )}
                {isError && (
                  <div className="p-3 px-2">
                    <div className="text-[#8B1A2A] text-[13px] mb-1.5">
                      {error?.response?.data?.message ??
                        error?.message ??
                        "Failed to load managers."}
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
                {!isLoading &&
                  !isError &&
                  managers.map((m) => (
                    <ManagerCard
                      key={m._id}
                      manager={m}
                      selected={selected}
                      onClick={handleSelectManager}
                    />
                  ))}
                {!isLoading && !isError && managers.length === 0 && (
                  <div className="text-[#9B7A8A] text-sm py-4 px-2">
                    No managers found.
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="bg-white rounded-2xl border-2 border-[#5C0F30] shadow-md overflow-hidden">
              <div className="p-4 border-b border-[#E8D5DF] flex items-center gap-3">
                <button
                  type="button"
                  onClick={handleBack}
                  className="w-8 h-8 flex items-center justify-center rounded-lg bg-[#FAF0F5] border border-[#D4A0B8] cursor-pointer shrink-0"
                >
                  <svg
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                  >
                    <path
                      d="M19 12H5M12 19l-7-7 7-7"
                      stroke={BRAND.pink}
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </button>
                <p className="m-0 text-[11px] tracking-[0.1em] uppercase text-[#9B7A8A] font-medium">
                  Your Review
                </p>
                {selected && (
                  <span
                    className="text-[13px] text-[#8B1A4A] italic truncate ml-auto"
                    style={{ fontFamily: "'Playfair Display', Georgia, serif" }}
                  >
                    {getFullName(selected)}
                  </span>
                )}
              </div>
              <div className="p-4 sm:p-5">
                <MobileReviewForm
                  selected={selected}
                  rating={rating}
                  setRating={setRating}
                  comment={comment}
                  setComment={setComment}
                  canSubmit={canSubmit}
                  isPending={isPending}
                  handleSubmit={handleSubmit}
                />
              </div>
            </div>
          )}
        </div>

        <div className="hidden lg:grid grid-cols-[1fr_1.1fr] gap-8 items-start">
          <div className="bg-white rounded-2xl border-2 border-[#5C0F30] shadow-md overflow-hidden flex flex-col max-h-[700px]">
            <div className="p-5 border-b border-[#E8D5DF] flex justify-between items-center shrink-0">
              <p className="m-0 text-[11px] tracking-[0.1em] uppercase text-[#9B7A8A] font-medium">
                Select Manager
              </p>
              {managers.length > 0 && (
                <span className="text-[11px] text-[#8B1A4A] bg-[#8B1A4A]/10 px-2.5 py-0.5 rounded-full">
                  {managers.length} available
                </span>
              )}
            </div>
            <div className="p-4 flex flex-col gap-2 overflow-y-auto">
              {isLoading && (
                <div className="text-[#9B7A8A] text-sm py-4 px-2 flex items-center gap-2">
                  <svg
                    className="w-4 h-4 animate-spin"
                    viewBox="0 0 24 24"
                    fill="none"
                  >
                    <circle
                      cx="12"
                      cy="12"
                      r="10"
                      stroke={BRAND.mutedText}
                      strokeWidth="2"
                      opacity="0.3"
                    />
                    <path
                      d="M12 2a10 10 0 0 1 10 10"
                      stroke={BRAND.mutedText}
                      strokeWidth="2"
                      strokeLinecap="round"
                    />
                  </svg>
                  Loading managers…
                </div>
              )}
              {isError && (
                <div className="p-3 px-2">
                  <div className="text-[#8B1A2A] text-[13px] mb-1.5">
                    {error?.response?.data?.message ??
                      error?.message ??
                      "Failed to load managers."}
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
              {!isLoading &&
                !isError &&
                managers.map((m) => (
                  <ManagerCard
                    key={m._id}
                    manager={m}
                    selected={selected}
                    onClick={setSelected}
                  />
                ))}
              {!isLoading && !isError && managers.length === 0 && (
                <div className="text-[#9B7A8A] text-sm py-4 px-2">
                  No managers found.
                </div>
              )}
            </div>
          </div>

          <div className="bg-white rounded-2xl border-2 border-[#5C0F30] shadow-md overflow-hidden">
            <div className="p-5 border-b border-[#E8D5DF] flex justify-between items-center">
              <p className="m-0 text-[11px] tracking-[0.1em] uppercase text-[#9B7A8A] font-medium">
                Your Review
              </p>
              {selected && (
                <span
                  className="text-[13px] text-[#8B1A4A] italic truncate ml-2"
                  style={{ fontFamily: "'Playfair Display', Georgia, serif" }}
                >
                  {getFullName(selected)}
                </span>
              )}
            </div>
            <div className="p-5 sm:p-6">
              {!selected ? (
                <div className="text-center py-9 px-5 text-[#9B7A8A] text-sm leading-relaxed">
                  <div className="w-14 h-14 rounded-full bg-[#FAF0F5] border border-dashed border-[#D4A0B8] flex items-center justify-center m-auto mb-4">
                    <svg
                      className="w-5 h-5"
                      viewBox="0 0 24 24"
                      fill="none"
                    >
                      <path
                        d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2M12 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8z"
                        stroke={BRAND.mutedText}
                        strokeWidth="1.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  </div>
                  Select a manager from the left to begin your review.
                </div>
              ) : (
                <DesktopReviewForm
                  selected={selected}
                  rating={rating}
                  setRating={setRating}
                  comment={comment}
                  setComment={setComment}
                  canSubmit={canSubmit}
                  isPending={isPending}
                  handleSubmit={handleSubmit}
                />
              )}
            </div>
          </div>
        </div>
      </div>

      <style>{`
        textarea::placeholder { color: ${BRAND.mutedText}; }
        ::-webkit-scrollbar { width: 4px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: ${BRAND.cardBorder}; border-radius: 4px; }
      `}</style>
    </div>
  );
}

function ReviewFormFields({
  selected,
  rating,
  setRating,
  comment,
  setComment,
  canSubmit,
  isPending,
  handleSubmit,
}) {
  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center gap-3 p-3 sm:p-4 bg-[#FAF0F5] rounded-xl border border-[#D4A0B8]">
        <div
          className="w-9 h-9 sm:w-10 sm:h-10 rounded-full flex items-center justify-center text-[13px] font-bold text-white shrink-0"
          style={{
            background: `linear-gradient(135deg, ${BRAND.maroon}, ${BRAND.pink})`,
            fontFamily: "'Playfair Display', Georgia, serif",
          }}
        >
          {getInitials(selected)}
        </div>
        <div className="min-w-0">
          <p className="m-0 text-sm font-medium text-[#2D0A1A] truncate">
            {getFullName(selected)}
          </p>
          <p className="m-0 mt-0.5 text-[11px] text-[#9B7A8A] capitalize truncate">
            {selected.designation}
            {selected.department ? ` · ${getDepartmentName(selected.department)}` : ""}
          </p>
        </div>
      </div>

      <div>
        <label className="block text-xs tracking-[0.08em] uppercase text-[#9B7A8A] mb-3 font-medium">
          Rating
        </label>
        <div className="flex items-center gap-4 flex-wrap">
          <StarRating value={rating} onChange={setRating} />
          {rating > 0 && (
            <span
              className="text-[13px] text-[#8B1A4A] italic"
              style={{ fontFamily: "'Playfair Display', Georgia, serif" }}
            >
              {ratingLabels[rating]}
            </span>
          )}
        </div>
        {rating > 0 && (
          <div className="flex gap-1 mt-3">
            {[1, 2, 3, 4, 5].map((i) => (
              <div
                key={i}
                className="flex-1 h-1 rounded-md transition-colors duration-200"
                style={{
                  background: i <= rating ? BRAND.pink : BRAND.cardBorder,
                }}
              />
            ))}
          </div>
        )}
      </div>

      <div>
        <label className="block text-xs tracking-[0.08em] uppercase text-[#9B7A8A] mb-3 font-medium">
          Feedback
        </label>
        <textarea
          rows={5}
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          placeholder="Share your observations about this manager's performance, leadership, and communication…"
          className="w-full bg-[#F5F0F3] border rounded-xl p-3 sm:p-4 text-sm text-[#2D0A1A] leading-relaxed resize-y outline-none font-sans box-border transition-colors min-h-[120px] focus:border-[#8B1A4A] focus:ring-2 focus:ring-[#8B1A4A]/10"
          style={{
            borderColor:
              comment.length > 0 ? `${BRAND.pink}66` : BRAND.cardBorder,
          }}
        />
        <div
          className="mt-1.5 text-[11px] text-right transition-colors"
          style={{
            color:
              comment.trim().length < 10 ? BRAND.mutedText : BRAND.pink,
          }}
        >
          {comment.trim().length} / 10 min chars
        </div>
      </div>

      <div className="h-px bg-[#E8D5DF]" />

      <button
        type="button"
        onClick={handleSubmit}
        disabled={!canSubmit}
        className="w-full flex items-center justify-center gap-2.5 py-3 sm:py-4 rounded-xl text-sm font-medium tracking-[0.02em] transition-all duration-200 border-none"
        style={{
          background: canSubmit
            ? `linear-gradient(135deg, ${BRAND.maroon} 0%, ${BRAND.pink} 100%)`
            : BRAND.cardBg,
          color: canSubmit ? "white" : BRAND.mutedText,
          opacity: canSubmit ? 1 : 0.6,
          cursor: canSubmit ? "pointer" : "not-allowed",
          boxShadow: canSubmit ? "0 4px 16px #8B1A4A33" : "none",
        }}
      >
        {isPending ? (
          <>
            <svg
              className="w-4 h-4 animate-spin"
              viewBox="0 0 24 24"
              fill="none"
            >
              <circle
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="2"
                opacity="0.3"
              />
              <path
                d="M12 2a10 10 0 0 1 10 10"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
              />
            </svg>
            Submitting…
          </>
        ) : (
          <>
            Submit Review
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none">
              <path
                d="M5 12h14M12 5l7 7-7 7"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </>
        )}
      </button>
    </div>
  );
}

function MobileReviewForm(props) {
  return <ReviewFormFields {...props} />;
}

function DesktopReviewForm(props) {
  return <ReviewFormFields {...props} />;
}