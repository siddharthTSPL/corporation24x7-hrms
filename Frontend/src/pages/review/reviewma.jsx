import React, { useState } from "react";
import { useReviewEmployee, useGetUsersUnderManager } from "../../auth/server-state/manager/managgerother/managerother.hook";

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
    <div className="flex gap-1 sm:gap-1.5">
      {[1, 2, 3, 4, 5].map((star) => {
        const filled = star <= (hovered || value);
        return (
          <button
            key={star}
            type="button"
            onClick={() => onChange(star)}
            onMouseEnter={() => setHovered(star)}
            onMouseLeave={() => setHovered(0)}
            className={`bg-transparent border-none cursor-pointer p-0.5 transition-transform duration-150 ${filled ? "scale-110" : "scale-100"}`}
          >
            <svg width="24" height="24" viewBox="0 0 24 24" className="sm:w-7 sm:h-7">
              <polygon
                points="12,2 15.09,8.26 22,9.27 17,14.14 18.18,21.02 12,17.77 5.82,21.02 7,14.14 2,9.27 8.91,8.26"
                fill={filled ? "#8B1A4A" : "transparent"}
                stroke={filled ? "#8B1A4A" : "#9B7A8A"}
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

function EmployeeCard({ employee, selected, onClick }) {
  const isSelected = selected?._id === employee._id;
  return (
    <button
      type="button"
      onClick={() => onClick(employee)}
      className={[
        "w-full text-left cursor-pointer flex items-center gap-3 sm:gap-3.5 py-3 px-3.5 sm:px-[18px] rounded-2xl border relative overflow-hidden transition-all duration-200 min-w-0",
        isSelected
          ? "border-[#8B1A4A] bg-gradient-to-br from-[#F5E8EF] to-[#EDD5E3] shadow-[0_0_0_3px_rgba(139,26,74,0.13),0_4px_24px_rgba(0,0,0,0.08)]"
          : "border-[#E8D5DF] bg-white shadow-[0_2px_8px_rgba(0,0,0,0.06)]",
      ].join(" ")}
    >
      {isSelected && (
        <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-[#5C0F30] to-[#8B1A4A]" />
      )}
      <div
        className={[
          "w-10 h-10 sm:w-11 sm:h-11 rounded-full flex items-center justify-center font-bold text-sm sm:text-[15px] text-white shrink-0 border",
          isSelected ? "bg-gradient-to-br from-[#5C0F30] to-[#8B1A4A] border-[#8B1A4A]" : "bg-gradient-to-br from-[#C9829E] to-[#8B1A4A] border-[#D4A0B8]",
        ].join(" ")}
        style={{ fontFamily: "'Playfair Display', Georgia, serif" }}
      >
        {getInitials(employee)}
      </div>
      <div className="text-left min-w-0 flex-1">
        <p
          className="m-0 text-sm sm:text-[15px] font-semibold text-[#2D0A1A] whitespace-nowrap overflow-hidden text-ellipsis"
          style={{ fontFamily: "'Playfair Display', Georgia, serif" }}
        >
          {getFullName(employee)}
        </p>
        <p className="mt-0.5 mb-0 text-[11px] sm:text-xs text-[#9B7A8A] tracking-wide truncate">
          {getEmail(employee)}
        </p>
        {employee.designation && (
          <p className="mt-0.5 mb-0 text-[10px] sm:text-[11px] text-[#8B1A4A] capitalize truncate">
            {employee.designation}{employee.department ? ` · ${employee.department}` : ""}
          </p>
        )}
      </div>
      {isSelected && (
        <div className="ml-auto w-5 h-5 rounded-full bg-[#8B1A4A] flex items-center justify-center shrink-0">
          <svg width="11" height="11" viewBox="0 0 12 12">
            <polyline points="2,6 5,9 10,3" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>
      )}
    </button>
  );
}

const ratingLabels = { 1: "Poor", 2: "Fair", 3: "Good", 4: "Very Good", 5: "Excellent" };

export default function ReviewEmployee() {
  const { data, isLoading, isError, error, refetch } = useGetUsersUnderManager();

  const employees = Array.isArray(data) ? data : data?.users ?? data?.data ?? [];

  const { mutate: submitReview, isPending, error: submitError } = useReviewEmployee();

  const [selected, setSelected] = useState(null);
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [search, setSearch] = useState("");

  const filtered = employees.filter((e) =>
    getFullName(e).toLowerCase().includes(search.toLowerCase()) ||
    getEmail(e).toLowerCase().includes(search.toLowerCase())
  );

  const canSubmit = selected && rating > 0 && comment.trim().length >= 10 && !isPending;

  const handleSubmit = () => {
    if (!canSubmit) return;
    submitReview(
      { employeeid: selected._id, rating, comment },
      {
        onSuccess: () => {
          setSubmitted(true);
          setSelected(null);
          setRating(0);
          setComment("");
          setTimeout(() => setSubmitted(false), 4000);
        },
      }
    );
  };

  return (
    <div className="min-h-screen bg-[#F2EEF0] font-['Inter','Helvetica_Neue',sans-serif] px-3 py-8 sm:px-6 sm:py-10 md:px-6 md:py-12 flex justify-center overflow-x-hidden">
      <link
        href="https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;600;700&family=Inter:wght@300;400;500&display=swap"
        rel="stylesheet"
      />

      <div className="w-full max-w-[960px] min-w-0">

        <div className="mb-8 sm:mb-12 text-center px-1">
          <div className="inline-block px-3 py-1 sm:px-4 border border-[#D4A0B8] rounded-full text-[10px] sm:text-[11px] tracking-[0.12em] uppercase text-[#8B1A4A] mb-4 bg-[#FAF0F5]">
            Performance Review
          </div>
          <h1
            className="text-[26px] sm:text-4xl md:text-[44px] font-bold text-[#2D0A1A] m-0 mb-3 tracking-[-0.01em] leading-tight"
            style={{ fontFamily: "'Playfair Display', Georgia, serif" }}
          >
            Review an Employee
          </h1>
          <p className="text-sm sm:text-[15px] text-[#9B7A8A] m-0 max-w-[440px] mx-auto leading-relaxed">
            Evaluate your team members and help them grow with honest, constructive feedback.
          </p>
        </div>

        {submitted && (
          <div className="bg-gradient-to-br from-[#EDD5E3] to-[#F5E8EF] border border-[#8B1A4A]/35 rounded-xl px-4 py-3.5 sm:px-5 mb-6 sm:mb-7 flex items-center gap-3 text-[#2D0A1A] text-[13px] sm:text-sm">
            <div className="w-[22px] h-[22px] rounded-full bg-[#8B1A4A] flex items-center justify-center shrink-0">
              <svg width="12" height="12" viewBox="0 0 12 12">
                <polyline points="2,6 5,9 10,3" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
            Review submitted successfully. Thank you for your feedback.
          </div>
        )}

        {submitError && (
          <div className="bg-[#FFF0F0] border border-[#cc3355] rounded-xl px-4 py-3.5 sm:px-5 mb-6 sm:mb-7 text-[#8B1A2A] text-[13px] sm:text-sm break-words">
            {submitError?.response?.data?.message ?? "Something went wrong. Please try again."}
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-[1fr_1.1fr] gap-5 sm:gap-6 lg:gap-7 items-start">

          <div className="bg-white rounded-[20px] border border-[#E8D5DF] overflow-hidden shadow-[0_2px_16px_rgba(0,0,0,0.06)] min-w-0">
            <div className="px-4 sm:px-5 pt-4 sm:pt-5 pb-3.5 border-b border-[#E8D5DF]">
              <div className={`flex justify-between items-center ${employees.length > 0 ? "mb-3" : ""}`}>
                <p className="m-0 text-[11px] tracking-[0.1em] uppercase text-[#9B7A8A] font-medium">
                  Your Team
                </p>
                {employees.length > 0 && (
                  <span className="text-[11px] text-[#8B1A4A] bg-[#8B1A4A]/[0.08] px-2.5 py-0.5 rounded-full whitespace-nowrap">
                    {employees.length} members
                  </span>
                )}
              </div>

              {employees.length > 3 && (
                <div className="relative">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" className="absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none">
                    <circle cx="11" cy="11" r="8" stroke="#9B7A8A" strokeWidth="2" />
                    <path d="M21 21l-4.35-4.35" stroke="#9B7A8A" strokeWidth="2" strokeLinecap="round" />
                  </svg>
                  <input
                    type="text"
                    placeholder="Search employees…"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="w-full box-border bg-[#F5F0F3] border border-[#E8D5DF] rounded-[10px] py-2 pl-8 pr-3 text-[#2D0A1A] text-[13px] outline-none font-['Inter',sans-serif] focus:border-[#8B1A4A]"
                  />
                </div>
              )}
            </div>

            <div className="p-3.5 flex flex-col gap-2 max-h-[300px] sm:max-h-[380px] lg:max-h-[440px] overflow-y-auto">
              {isLoading && (
                <div className="text-[#9B7A8A] text-sm py-4 px-2 flex items-center gap-2">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" className="animate-spin">
                    <circle cx="12" cy="12" r="10" stroke="#9B7A8A" strokeWidth="2" opacity="0.3" />
                    <path d="M12 2a10 10 0 0 1 10 10" stroke="#9B7A8A" strokeWidth="2" strokeLinecap="round" />
                  </svg>
                  Loading your team…
                </div>
              )}

              {isError && (
                <div className="py-3 px-2">
                  <div className="text-[#8B1A2A] text-[13px] mb-1.5 break-words">
                    {error?.response?.data?.message ?? error?.message ?? "Failed to load employees."}
                  </div>
                  <button
                    type="button"
                    onClick={() => refetch()}
                    className="cursor-pointer text-xs text-[#8B1A4A] border border-[#8B1A4A]/35 rounded-lg py-1.5 px-3.5 bg-[#FAF0F5]"
                  >
                    Retry
                  </button>
                </div>
              )}

              {!isLoading && !isError && filtered.map((e) => (
                <EmployeeCard key={e._id} employee={e} selected={selected} onClick={setSelected} />
              ))}

              {!isLoading && !isError && employees.length > 0 && filtered.length === 0 && (
                <div className="text-[#9B7A8A] text-[13px] py-3 px-2 break-words">
                  No results for "{search}"
                </div>
              )}

              {!isLoading && !isError && employees.length === 0 && (
                <div className="text-[#9B7A8A] text-sm py-4 px-2">
                  No employees found under your management.
                </div>
              )}
            </div>
          </div>

          <div className="bg-white rounded-[20px] border border-[#E8D5DF] overflow-hidden shadow-[0_2px_16px_rgba(0,0,0,0.06)] min-w-0">
            <div className="px-4 sm:px-6 pt-4 sm:pt-5 pb-3.5 border-b border-[#E8D5DF] flex justify-between items-center gap-2 flex-wrap">
              <p className="m-0 text-[11px] tracking-[0.1em] uppercase text-[#9B7A8A] font-medium">
                Your Review
              </p>
              {selected && (
                <span
                  className="text-[13px] text-[#8B1A4A] italic truncate max-w-[60%]"
                  style={{ fontFamily: "'Playfair Display', Georgia, serif" }}
                >
                  {getFullName(selected)}
                </span>
              )}
            </div>

            <div className="px-4 sm:px-6 pt-5 sm:pt-6 pb-6 sm:pb-7">
              {!selected ? (
                <div className="text-center py-8 sm:py-9 px-4 sm:px-5 text-[#9B7A8A] text-sm leading-relaxed">
                  <div className="w-14 h-14 rounded-full bg-[#FAF0F5] border border-dashed border-[#D4A0B8] flex items-center justify-center mx-auto mb-4">
                    <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
                      <path
                        d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"
                        stroke="#9B7A8A" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"
                      />
                    </svg>
                  </div>
                  Select a team member from the left to begin your review.
                </div>
              ) : (
                <div className="flex flex-col gap-6 sm:gap-7">

                  <div className="flex items-center gap-3 py-3 px-3.5 bg-[#FAF0F5] rounded-xl border border-[#D4A0B8] min-w-0">
                    <div
                      className="w-9 h-9 sm:w-[38px] sm:h-[38px] rounded-full bg-gradient-to-br from-[#5C0F30] to-[#8B1A4A] flex items-center justify-center text-[13px] font-bold text-white shrink-0"
                      style={{ fontFamily: "'Playfair Display', Georgia, serif" }}
                    >
                      {getInitials(selected)}
                    </div>
                    <div className="min-w-0">
                      <p className="m-0 text-sm font-medium text-[#2D0A1A] truncate">
                        {getFullName(selected)}
                      </p>
                      <p className="m-0 text-[11px] text-[#9B7A8A] capitalize truncate">
                        {selected.designation}{selected.department ? ` · ${selected.department}` : ""}
                      </p>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs tracking-[0.08em] uppercase text-[#9B7A8A] mb-3 font-medium">
                      Rating
                    </label>
                    <div className="flex flex-wrap items-center gap-3 sm:gap-4">
                      <StarRating value={rating} onChange={setRating} />
                      {rating > 0 && (
                        <span className="text-[13px] text-[#8B1A4A] italic" style={{ fontFamily: "'Playfair Display', Georgia, serif" }}>
                          {ratingLabels[rating]}
                        </span>
                      )}
                    </div>
                    {rating > 0 && (
                      <div className="flex gap-1 mt-3">
                        {[1, 2, 3, 4, 5].map((i) => (
                          <div
                            key={i}
                            className={`flex-1 h-[3px] rounded transition-colors duration-200 ${i <= rating ? "bg-[#8B1A4A]" : "bg-[#E8D5DF]"}`}
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
                      placeholder="Describe this employee's performance, collaboration, reliability, and areas for growth…"
                      className={`w-full box-border bg-[#F5F0F3] rounded-xl py-3.5 px-4 text-[#2D0A1A] text-sm leading-relaxed resize-y outline-none font-['Inter',sans-serif] transition-colors duration-200 border ${comment.length > 0 ? "border-[#8B1A4A]/40" : "border-[#E8D5DF]"} focus:border-[#8B1A4A]`}
                    />
                    <div className={`mt-1.5 text-[11px] text-right transition-colors duration-200 ${comment.trim().length < 10 ? "text-[#9B7A8A]" : "text-[#8B1A4A]"}`}>
                      {comment.trim().length} / 10 min chars
                    </div>
                  </div>

                  <div className="h-px bg-[#E8D5DF]" />

                  <button
                    type="button"
                    onClick={handleSubmit}
                    disabled={!canSubmit}
                    className={[
                      "w-full sm:w-auto self-stretch sm:self-auto flex items-center justify-center gap-2.5 py-3.5 px-7 rounded-xl text-sm font-medium tracking-wide transition-all duration-200",
                      canSubmit
                        ? "cursor-pointer bg-gradient-to-br from-[#5C0F30] to-[#8B1A4A] text-white opacity-100 hover:brightness-105"
                        : "cursor-not-allowed bg-[#F5F0F3] text-[#9B7A8A] opacity-60",
                    ].join(" ")}
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
        ::-webkit-scrollbar { width: 4px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: #E8D5DF; border-radius: 4px; }
      `}</style>
    </div>
  );
}