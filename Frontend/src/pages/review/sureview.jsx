import React, { useState } from "react";
import {
  useGetAllAdmins,
  useReviewToAdmin,
} from "../../auth/server-state/superadmin/other/suother.hook";

/* ─────────────────────────────────────────────
   BRAND TOKENS  
───────────────────────────────────────────── */
const BRAND = {
  pink:          "#8B1A4A",
  maroon:        "#5C0F30",
  cream:         "#F9F8F2",
  dark:          "#1A0010",
  darkSurface:   "#FFFFFF",
  cardBg:        "#F5F0F3",
  cardBorder:    "#E8D5DF",
  mutedText:     "#9B7A8A",
  pageBackground:"#F2EEF0",
  textPrimary:   "#2D0A1A",
  accentLight:   "#FAF0F5",
  accentBorder:  "#D4A0B8",
};

/* ─────────────────────────────────────────────
   HELPERS
───────────────────────────────────────────── */
const getFullName = (a) =>
  a?.f_name ? `${a.f_name} ${a.l_name ?? ""}`.trim() : "Unknown";

const getInitials = (a) => {
  const f = (a?.f_name ?? "").charAt(0);
  const l = (a?.l_name ?? "").charAt(0);
  return (f + l).toUpperCase() || "AD";
};

const getEmail = (a) => a?.work_email ?? a?.email ?? "";

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

/* ─────────────────────────────────────────────
   ADMIN CARD
───────────────────────────────────────────── */
function AdminCard({ admin, selected, onClick }) {
  const isSelected = selected?._id === admin._id;
  return (
    <button
      type="button"
      onClick={() => onClick(admin)}
      className={`w-full flex items-center gap-3 sm:gap-4 p-3 sm:p-4 rounded-xl border transition-all duration-200 box-border text-left relative overflow-hidden ${
        isSelected ? "border-[#8B1A4A] shadow-lg" : "border-[#E8D5DF] hover:bg-gray-50"
      }`}
      style={{
        background: isSelected ? "linear-gradient(135deg,#F5E8EF 0%,#EDD5E3 100%)" : "#FFFFFF",
        boxShadow: isSelected ? `0 0 0 3px ${BRAND.pink}22, 0 4px 24px #00000015` : "0 2px 8px #00000010",
      }}
    >
      {/* Top accent line when selected */}
      {isSelected && (
        <div className="absolute top-0 left-0 right-0 h-0.5" style={{ background: `linear-gradient(90deg,${BRAND.maroon},${BRAND.pink})` }} />
      )}

      {/* Avatar */}
      <div 
        className="w-10 h-10 sm:w-11 sm:h-11 rounded-full flex items-center justify-center text-white text-sm font-bold shrink-0 border" 
        style={{ 
          background: isSelected ? `linear-gradient(135deg,${BRAND.maroon},${BRAND.pink})` : `linear-gradient(135deg,#C9829E,${BRAND.pink})`,
          fontFamily: "'Playfair Display',Georgia,serif",
          borderColor: isSelected ? BRAND.pink : BRAND.accentBorder,
        }}
      >
        {getInitials(admin)}
      </div>

      {/* Info */}
      <div className="text-left min-w-0 flex-1">
        <p className="m-0 text-sm font-semibold text-[#2D0A1A] truncate" style={{ fontFamily: "'Playfair Display',Georgia,serif" }}>
          {getFullName(admin)}
        </p>
        <p className="m-0 mt-0.5 text-xs text-[#9B7A8A] tracking-[0.03em] truncate">
          {getEmail(admin)}
        </p>
        <div className="flex items-center gap-1.5 mt-1">
          {admin.designation && (
            <span className="text-[11px] text-[#8B1A4A] capitalize truncate">
              {admin.designation}
            </span>
          )}
          {/* Admin badge */}
          <span 
            className="text-[10px] font-bold py-0.5 px-2 rounded-full tracking-[0.05em] shrink-0" 
            style={{ background: isSelected ? `${BRAND.pink}22` : "#F5E8EF", color: BRAND.pink }}
          >
            Admin
          </span>
          {/* Status dot */}
          {admin.status && (
            <span 
              className="w-1.5 h-1.5 rounded-full shrink-0" 
              style={{ background: admin.status === "active" ? "#22C55E" : "#9B8BAE" }}
            />
          )}
        </div>
      </div>

      {/* Checkmark when selected */}
      {isSelected && (
        <div className="ml-auto w-5 h-5 rounded-full flex items-center justify-center shrink-0 bg-[#8B1A4A]">
          <svg width="11" height="11" viewBox="0 0 12 12">
            <polyline points="2,6 5,9 10,3" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>
      )}
    </button>
  );
}

/* ─────────────────────────────────────────────
   MAIN COMPONENT
───────────────────────────────────────────── */
export default function ReviewAdmin() {
  const { data, isLoading, isError, error, refetch } = useGetAllAdmins();
  const admins = data?.admins ?? [];

  const { mutate: submitReview, isPending, error: submitError } = useReviewToAdmin();

  const [selected,       setSelected]       = useState(null);
  const [assignedDays,   setAssignedDays]   = useState("");
  const [actualDays,     setActualDays]     = useState("");
  const [behaviourScore, setBehaviourScore] = useState("");
  const [comment,        setComment]        = useState("");
  const [submitted,      setSubmitted]      = useState(false);
  const [search,         setSearch]         = useState("");

  const filtered = admins.filter((a) =>
    getFullName(a).toLowerCase().includes(search.toLowerCase()) ||
    getEmail(a).toLowerCase().includes(search.toLowerCase())
  );

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

  const handleSubmit = () => {
    if (!canSubmit) return;
    submitReview(
      {
        adminid: selected._id,
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
          setTimeout(() => setSubmitted(false), 4000);
        },
      }
    );
  };

  return (
    <div className="min-h-screen w-full bg-[#F2EEF0] p-4 sm:p-6 lg:p-12 flex flex-col items-center overflow-x-hidden">
      <link
        href="https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;600;700&family=Inter:wght@300;400;500&display=swap"
        rel="stylesheet"
      />

      <div className="w-full max-w-5xl">

        {/* ── Page Header ── */}
        <div className="mb-8 sm:mb-12 text-center">
          <div className="inline-flex items-center gap-1.5 px-4 py-1 border border-[#D4A0B8] rounded-full text-[11px] tracking-[0.12em] uppercase text-[#8B1A4A] mb-4 bg-[#FAF0F5]">
            <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
              <path d="M1 8L2.5 3L5 6L7.5 2L9 8H1Z" fill={BRAND.pink} />
            </svg>
            Super Admin · Admin Review
          </div>

          <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-[#2D0A1A] m-0 mb-3 tracking-tight" style={{ fontFamily: "'Playfair Display',Georgia,serif" }}>
            Review an Admin
          </h1>
          <p className="text-sm sm:text-base text-[#9B7A8A] m-auto max-w-md leading-relaxed">
            Evaluate admins in your organisation. Your feedback helps shape
            leadership quality and operational excellence.
          </p>
        </div>

        {/* ── Success Toast ── */}
        {submitted && (
          <div className="bg-gradient-to-br from-[#EDD5E3] to-[#F5E8EF] border border-[#8B1A4A]/50 rounded-xl p-4 mb-7 flex items-center gap-3 text-[#2D0A1A] text-sm">
            <div className="w-5 h-5 rounded-full bg-[#8B1A4A] flex items-center justify-center shrink-0">
              <svg width="12" height="12" viewBox="0 0 12 12">
                <polyline points="2,6 5,9 10,3" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
            Review submitted successfully. Thank you for your feedback.
          </div>
        )}

        {/* ── Submit Error ── */}
        {submitError && (
          <div className="bg-[#FFF0F0] border border-[#cc3355] rounded-xl p-4 mb-7 text-[#8B1A2A] text-sm">
            {submitError?.response?.data?.message ?? "Something went wrong. Please try again."}
          </div>
        )}

        {/* ── Two-column layout ── */}
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_1.1fr] gap-6 lg:gap-8 items-start">

          {/* ── LEFT: Admin List ── */}
          <div className="bg-white rounded-2xl border border-[#E8D5DF] overflow-hidden shadow-md">
            <div className="p-4 sm:p-5 border-b border-[#E8D5DF]">
              <div className="flex justify-between items-center mb-3">
                <p className="m-0 text-[11px] tracking-[0.1em] uppercase text-[#9B7A8A] font-medium">
                  Your Admins
                </p>
                {admins.length > 0 && (
                  <span className="text-[11px] text-[#8B1A4A] bg-[#8B1A4A]/10 px-2.5 py-0.5 rounded-full">
                    {admins.length} admin{admins.length !== 1 ? "s" : ""}
                  </span>
                )}
              </div>

              {/* Search — only when > 3 admins */}
              {admins.length > 3 && (
                <div className="relative w-full">
                  <svg className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" width="14" height="14" viewBox="0 0 24 24" fill="none">
                    <circle cx="11" cy="11" r="8" stroke={BRAND.mutedText} strokeWidth="2" />
                    <path d="M21 21l-4.35-4.35" stroke={BRAND.mutedText} strokeWidth="2" strokeLinecap="round" />
                  </svg>
                  <input
                    type="text"
                    placeholder="Search admins…"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="w-full box-border bg-[#F5F0F3] border border-[#E8D5DF] rounded-lg py-2 pl-9 pr-3 text-[#2D0A1A] text-sm outline-none focus:border-[#8B1A4A] font-sans"
                  />
                </div>
              )}
            </div>

            {/* Admin list scroll area */}
            <div className="p-3 sm:p-4 flex flex-col gap-2 max-h-[400px] sm:max-h-[500px] lg:max-h-[600px] overflow-y-auto">
              {isLoading && (
                <div className="text-[#9B7A8A] text-sm py-4 px-2 flex items-center gap-2">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" className="animate-spin">
                    <circle cx="12" cy="12" r="10" stroke={BRAND.mutedText} strokeWidth="2" opacity="0.3" />
                    <path d="M12 2a10 10 0 0 1 10 10" stroke={BRAND.mutedText} strokeWidth="2" strokeLinecap="round" />
                  </svg>
                  Loading admins…
                </div>
              )}

              {isError && (
                <div className="p-3 px-2">
                  <div className="text-[#8B1A2A] text-[13px] mb-1.5">
                    {error?.response?.data?.message ?? error?.message ?? "Failed to load admins."}
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

              {!isLoading && !isError && filtered.map((admin) => (
                <AdminCard
                  key={admin._id}
                  admin={admin}
                  selected={selected}
                  onClick={setSelected}
                />
              ))}

              {!isLoading && !isError && admins.length > 0 && filtered.length === 0 && (
                <div className="text-[#9B7A8A] text-[13px] py-3 px-2">
                  No results for "{search}"
                </div>
              )}

              {!isLoading && !isError && admins.length === 0 && (
                <div className="text-[#9B7A8A] text-sm py-4 px-2">
                  No admins found in your organisation.
                </div>
              )}
            </div>
          </div>

          {/* ── RIGHT: Review Form ── */}
          <div className="bg-white rounded-2xl border border-[#E8D5DF] overflow-hidden shadow-md">
            <div className="p-4 sm:p-5 border-b border-[#E8D5DF] flex justify-between items-center">
              <p className="m-0 text-[11px] tracking-[0.1em] uppercase text-[#9B7A8A] font-medium">
                Your Review
              </p>
              {selected && (
                <span className="text-[13px] text-[#8B1A4A] italic" style={{ fontFamily: "'Playfair Display',Georgia,serif" }}>
                  {getFullName(selected)}
                </span>
              )}
            </div>

            <div className="p-5 sm:p-6">
              {!selected ? (
                /* Empty state */
                <div className="text-center py-12 px-5 text-[#9B7A8A] text-sm leading-relaxed">
                  <div className="w-14 h-14 rounded-full bg-[#FAF0F5] border border-dashed border-[#D4A0B8] flex items-center justify-center m-auto mb-5">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                      <circle cx="12" cy="8" r="4" stroke={BRAND.mutedText} strokeWidth="1.5" />
                      <path d="M4 20c0-4 3.6-7 8-7s8 3 8 7" stroke={BRAND.mutedText} strokeWidth="1.5" strokeLinecap="round" />
                      <path d="M16 3l1.5 1.5M19.5 6.5L21 8" stroke={BRAND.pink} strokeWidth="1.3" strokeLinecap="round" opacity="0.6" />
                    </svg>
                  </div>
                  Select an admin from the left<br />to begin your review.
                </div>
              ) : (
                <div className="flex flex-col gap-7">

                  {/* Selected admin pill */}
                  <div className="flex items-center gap-3 p-3 sm:p-4 bg-[#FAF0F5] rounded-xl border border-[#D4A0B8]">
                    <div 
                      className="w-10 h-10 rounded-full flex items-center justify-center text-[13px] font-bold text-white shrink-0" 
                      style={{ background: `linear-gradient(135deg,${BRAND.maroon},${BRAND.pink})`, fontFamily: "'Playfair Display',Georgia,serif" }}
                    >
                      {getInitials(selected)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="m-0 text-sm font-medium text-[#2D0A1A] truncate">
                        {getFullName(selected)}
                      </p>
                      <p className="m-0 mt-0.5 text-[11px] text-[#9B7A8A] truncate">
                        {selected.designation || "Admin"} · {getEmail(selected)}
                      </p>
                    </div>
                    {/* Admin crown badge */}
                    <div 
                      className="py-1 px-2.5 rounded-full text-[10px] font-bold text-white tracking-[0.05em] shrink-0 flex items-center gap-1" 
                      style={{ background: `linear-gradient(135deg,${BRAND.maroon},${BRAND.pink})` }}
                    >
                      <svg width="8" height="8" viewBox="0 0 10 10" fill="none">
                        <path d="M1 8L2.5 3L5 6L7.5 2L9 8H1Z" fill="rgba(255,255,255,0.9)" />
                      </svg>
                      Admin
                    </div>
                  </div>

                  {/* Task Submission */}
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
                          className="w-full box-border bg-[#F5F0F3] border rounded-xl py-2.5 px-3.5 text-sm outline-none font-sans"
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
                          className="w-full box-border bg-[#F5F0F3] border rounded-xl py-2.5 px-3.5 text-sm outline-none font-sans"
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

                  {/* Behaviour & Ethics */}
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
                      className="w-full sm:w-40 box-border bg-[#F5F0F3] border rounded-xl py-2.5 px-3.5 text-sm outline-none font-sans"
                      style={{ borderColor: BRAND.cardBorder, color: BRAND.textPrimary }}
                    />
                  </div>

                  {/* Attendance note */}
                  <div
                    className="text-[11px] rounded-xl px-3.5 py-2.5 border"
                    style={{ color: BRAND.mutedText, background: BRAND.accentLight, borderColor: BRAND.accentBorder }}
                  >
                    Attendance is calculated automatically from this month's attendance records — no input needed here.
                  </div>

                  {/* Comment */}
                  <div>
                    <label className="block text-xs tracking-[0.08em] uppercase text-[#9B7A8A] mb-3 font-medium">
                      Comment <span className="normal-case" style={{ color: `${BRAND.mutedText}b3` }}>(optional)</span>
                    </label>
                    <textarea
                      rows={4}
                      value={comment}
                      onChange={(e) => setComment(e.target.value)}
                      placeholder="Any additional notes on this admin's leadership, responsiveness, or team management…"
                      className="w-full bg-[#F5F0F3] border rounded-xl p-3 sm:p-4 text-[#2D0A1A] text-sm leading-relaxed resize-y outline-none font-sans box-border transition-colors"
                      style={{ borderColor: comment.length > 0 ? `${BRAND.pink}66` : BRAND.cardBorder }}
                    />
                  </div>

                  {/* Monthly note */}
                  <div className="flex items-start gap-2.5 p-3 rounded-lg bg-[#FFFBEB] border border-[#F0D89A] text-xs text-[#7A5C1A] leading-relaxed">
                    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" className="mt-0.5 shrink-0">
                      <path d="M7 3v4M7 9v.5" stroke="#F59E0B" strokeWidth="1.5" strokeLinecap="round" />
                      <circle cx="7" cy="7" r="5.5" stroke="#F59E0B" strokeWidth="1.2" />
                    </svg>
                    You can submit one review per admin per month. Make it count.
                  </div>

                  <div className="h-px bg-[#E8D5DF]" />

                  {/* Submit button */}
                  <button
                    type="button"
                    onClick={handleSubmit}
                    disabled={!canSubmit}
                    className={`w-full flex items-center justify-center gap-2.5 py-3 sm:py-4 rounded-xl text-sm font-medium tracking-[0.02em] transition-all duration-200 border-none ${
                      canSubmit ? "cursor-pointer text-white opacity-100 shadow-md hover:brightness-105" : "cursor-not-allowed text-[#9B7A8A] opacity-60"
                    }`}
                    style={{
                      background: canSubmit ? `linear-gradient(135deg,${BRAND.maroon} 0%,${BRAND.pink} 100%)` : BRAND.cardBg,
                      boxShadow: canSubmit ? "0 4px 16px rgba(91,14,48,0.3)" : "none",
                    }}
                  >
                    {isPending ? (
                      <>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" className="animate-spin">
                          <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" opacity="0.3" />
                          <path d="M12 2a10 10 0 0 1 10 10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                        </svg>
                        Submitting…
                      </>
                    ) : (
                      <>
                        Submit Review
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                          <path d="M5 12h14M12 5l7 7-7 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                      </>
                    )}
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        .animate-spin { animation: spin 1s linear infinite; }
        textarea::placeholder { color: ${BRAND.mutedText}; }
        textarea:focus { border-color: ${BRAND.pink} !important; }
        input::placeholder { color: ${BRAND.mutedText}; }
        input:focus { border-color: ${BRAND.pink} !important; outline: none; }
        ::-webkit-scrollbar { width: 4px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: ${BRAND.cardBorder}; border-radius: 4px; }
      `}</style>
    </div>
  );
}