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

// Mirrors backend utils/reviewScoring.utils.js bands, for live preview only.
// The server always recomputes and is the source of truth.
const TASK_BANDS = [
  { min: 140, rating: "Excellent", score: 10 },
  { min: 110, rating: "Very Good", score: 8 },
  { min: 90, rating: "Good", score: 6 },
  { min: 70, rating: "Average", score: 4 },
  { min: -Infinity, rating: "Poor", score: 2 },
];

function taskBandFor(percentage) {
  return TASK_BANDS.find((b) => percentage >= b.min);
}

function ratingColor(rating) {
  if (rating === "Excellent" || rating === "Very Good") return "#1E7A3D";
  if (rating === "Good") return BRAND.pink;
  if (rating === "Average") return "#B8860B";
  return "#B0233A";
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
  const [assignedDays, setAssignedDays] = useState("");
  const [actualDays, setActualDays] = useState("");
  const [behaviourScore, setBehaviourScore] = useState("");
  const [comment, setComment] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [showForm, setShowForm] = useState(false);

  const assignedNum = Number(assignedDays);
  const actualNum = Number(actualDays);
  const behaviourNum = Number(behaviourScore);
  const taskPreview =
    assignedNum > 0 && actualNum > 0
      ? { percentage: Math.round((assignedNum / actualNum) * 1000) / 10, ...taskBandFor((assignedNum / actualNum) * 100) }
      : null;

  const canSubmit =
    selected &&
    assignedNum > 0 &&
    actualNum > 0 &&
    behaviourScore !== "" &&
    behaviourNum >= 0 &&
    behaviourNum <= 10 &&
    !isPending;

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
      {
        managerid: selected._id,
        assignedDays: assignedNum,
        actualDays: actualNum,
        behaviourScore: behaviourNum,
        comment,
      },
      {
        onSuccess: () => {
          setSubmitted(true);
          setSelected(null);
          setAssignedDays("");
          setActualDays("");
          setBehaviourScore("");
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
                  assignedDays={assignedDays}
                  setAssignedDays={setAssignedDays}
                  actualDays={actualDays}
                  setActualDays={setActualDays}
                  taskPreview={taskPreview}
                  behaviourScore={behaviourScore}
                  setBehaviourScore={setBehaviourScore}
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
                  assignedDays={assignedDays}
                  setAssignedDays={setAssignedDays}
                  actualDays={actualDays}
                  setActualDays={setActualDays}
                  taskPreview={taskPreview}
                  behaviourScore={behaviourScore}
                  setBehaviourScore={setBehaviourScore}
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
  assignedDays,
  setAssignedDays,
  actualDays,
  setActualDays,
  taskPreview,
  behaviourScore,
  setBehaviourScore,
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
          Task Submission
        </label>
        <p className="text-[12px] mb-3 -mt-1.5" style={{ color: BRAND.mutedText }}>
          Enter the days assigned and days actually taken — the system calculates the % and rating.
        </p>
        <div className="flex gap-3 flex-wrap">
          <div className="flex-1 min-w-[120px]">
            <label className="block text-[10px] mb-1" style={{ color: BRAND.mutedText }}>Assigned Days</label>
            <input
              type="number"
              min="1"
              value={assignedDays}
              onChange={(e) => setAssignedDays(e.target.value)}
              placeholder="e.g. 30"
              className="w-full box-border bg-[#F5F0F3] border rounded-xl py-2.5 px-3.5 text-sm outline-none font-sans focus:border-[#8B1A4A]"
              style={{ borderColor: BRAND.cardBorder, color: BRAND.textPrimary }}
            />
          </div>
          <div className="flex-1 min-w-[120px]">
            <label className="block text-[10px] mb-1" style={{ color: BRAND.mutedText }}>Actual Days Taken</label>
            <input
              type="number"
              min="1"
              value={actualDays}
              onChange={(e) => setActualDays(e.target.value)}
              placeholder="e.g. 20"
              className="w-full box-border bg-[#F5F0F3] border rounded-xl py-2.5 px-3.5 text-sm outline-none font-sans focus:border-[#8B1A4A]"
              style={{ borderColor: BRAND.cardBorder, color: BRAND.textPrimary }}
            />
          </div>
        </div>
        {taskPreview && (
          <div className="mt-3 flex items-center gap-2.5 flex-wrap">
            <span className="text-[13px] font-semibold" style={{ color: ratingColor(taskPreview.rating) }}>
              {taskPreview.percentage}% · {taskPreview.rating}
            </span>
            <span className="text-[11px]" style={{ color: BRAND.mutedText }}>({taskPreview.score}/10)</span>
          </div>
        )}
      </div>

      <div>
        <label className="block text-xs tracking-[0.08em] uppercase text-[#9B7A8A] mb-3 font-medium">
          Behaviour &amp; Ethics
        </label>
        <p className="text-[12px] mb-3 -mt-1.5" style={{ color: BRAND.mutedText }}>
          Give a score out of 10 based on conduct, discipline, and professionalism.
        </p>
        <input
          type="number"
          min="0"
          max="10"
          step="0.5"
          value={behaviourScore}
          onChange={(e) => setBehaviourScore(e.target.value)}
          placeholder="0 – 10"
          className="w-full sm:w-40 box-border bg-[#F5F0F3] border rounded-xl py-2.5 px-3.5 text-sm outline-none font-sans focus:border-[#8B1A4A]"
          style={{ borderColor: BRAND.cardBorder, color: BRAND.textPrimary }}
        />
      </div>

      <div
        className="text-[11px] rounded-xl px-3.5 py-2.5 border"
        style={{ color: BRAND.mutedText, background: BRAND.accentLight, borderColor: BRAND.accentBorder }}
      >
        Attendance is calculated automatically from this month's attendance records — no input needed here.
      </div>

      <div>
        <label className="block text-xs tracking-[0.08em] uppercase text-[#9B7A8A] mb-3 font-medium">
          Comment <span className="normal-case" style={{ color: `${BRAND.mutedText}b3` }}>(optional)</span>
        </label>
        <textarea
          rows={4}
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          placeholder="Any additional notes on this manager's performance, leadership, and communication…"
          className="w-full bg-[#F5F0F3] border rounded-xl p-3 sm:p-4 text-sm leading-relaxed resize-y outline-none font-sans box-border transition-colors focus:border-[#8B1A4A] focus:ring-2 focus:ring-[#8B1A4A]/10"
          style={{
            borderColor: comment.length > 0 ? `${BRAND.pink}66` : BRAND.cardBorder,
            color: BRAND.textPrimary,
          }}
        />
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