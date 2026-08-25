import React, { useState } from "react";
import { useFindAllManagerswithoutAdmin, useGetMeAdmin } from "../../auth/server-state/adminauth/adminauth.hook";
import {
  useReviewToManager,
  useGetAllReviews,
  useRespondToMyReviewAsAdmin,
  useHrAcknowledgeReview,
} from "../../auth/server-state/adminother/adminother.hook";
import ReviewHistoryPanel from "./Reviewhistorypanel";
import ReviewGradingForm from "./ReviewGradingForm";
import MyReviewsList from "./MyReviewsList";
import HrApprovalsPanel from "./HrApprovalsPanel";

const BRAND = {
  pink: "#8B1A4A",
  maroon: "#5C0F30",
  cardBorder: "#E8D5DF",
  mutedText: "#9B7A8A",
  pageBackground: "#F2EEF0",
  textPrimary: "#2D0A1A",
  accentLight: "#FAF0F5",
  accentBorder: "#D4A0B8",
};

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

function ManagerCard({ manager, selected, onClick }) {
  const isSelected = selected?._id === manager._id;
  return (
    <button
      type="button"
      onClick={() => onClick(manager)}
      className="w-full flex items-center gap-3 p-3 rounded-xl border transition-all duration-200 text-left relative overflow-hidden"
      style={{
        background: isSelected ? "linear-gradient(135deg, #F5E8EF 0%, #EDD5E3 100%)" : "#FFFFFF",
        borderColor: isSelected ? BRAND.pink : BRAND.cardBorder,
        boxShadow: isSelected ? `0 0 0 3px ${BRAND.pink}22, 0 4px 24px #00000015` : "0 2px 8px #00000010",
      }}
    >
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
        <p className="m-0 text-sm font-semibold text-[#2D0A1A] truncate" style={{ fontFamily: "'Playfair Display', Georgia, serif" }}>
          {getFullName(manager)}
        </p>
        <p className="m-0 mt-0.5 text-[11px] text-[#9B7A8A] truncate">{getEmail(manager)}</p>
        {manager.designation && (
          <p className="m-0 mt-0.5 text-[10px] sm:text-[11px] text-[#8B1A4A] capitalize truncate">
            {manager.designation}
            {manager.department ? ` · ${getDepartmentName(manager.department)}` : ""}
          </p>
        )}
      </div>
    </button>
  );
}

const TABS = [
  { key: "give", label: "Give Review" },
  { key: "history", label: "Review History" },
  { key: "mine", label: "My Review" },
];

export default function ReviewManager() {
  const { data, isLoading, isError, error, refetch } = useFindAllManagerswithoutAdmin();
  const managers = Array.isArray(data) ? data : data?.managers ?? data?.data?.managers ?? [];

  const { data: meData } = useGetMeAdmin();
  const me = meData?.user ?? {};
  const myReviews = meData?.reviews ?? [];
  const isHR = !!me?.isHR;

  const { mutate: submitReview, isPending, error: submitError } = useReviewToManager();
  const { mutate: respond, isPending: respondPending } = useRespondToMyReviewAsAdmin();
  const { mutate: hrDecide, isPending: hrPending } = useHrAcknowledgeReview();

  const [selected, setSelected] = useState(null);
  const [submitted, setSubmitted] = useState(false);
  const [tab, setTab] = useState("give");

  const tabs = isHR ? [...TABS, { key: "hr", label: "HR Approvals" }] : TABS;

  const handleSubmit = (payload) => {
    submitReview(
      { managerid: selected._id, ...payload },
      {
        onSuccess: () => {
          setSubmitted(true);
          setSelected(null);
          setTimeout(() => setSubmitted(false), 4000);
        },
      }
    );
  };

  return (
    <div className="min-h-screen w-full overflow-x-hidden bg-[#F2EEF0] font-sans text-[#2D0A1A]" style={{ padding: "clamp(16px, 4vw, 40px)" }}>
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
            Manager Reviews
          </h1>
          <p className="text-sm sm:text-base text-[#9B7A8A] m-auto max-w-md leading-relaxed">
            Review your managers, track history, and manage HR approvals.
          </p>
        </div>

        <div className="flex justify-center flex-wrap gap-2 mb-6 sm:mb-8">
          {tabs.map((t) => (
            <button
              key={t.key}
              type="button"
              onClick={() => setTab(t.key)}
              className="py-2 px-4 rounded-full text-[13px] font-medium transition-all duration-200 border cursor-pointer"
              style={{
                background: tab === t.key ? `linear-gradient(135deg, ${BRAND.maroon}, ${BRAND.pink})` : "#FFFFFF",
                color: tab === t.key ? "#FFFFFF" : BRAND.mutedText,
                borderColor: tab === t.key ? BRAND.pink : BRAND.cardBorder,
              }}
            >
              {t.label}
            </button>
          ))}
        </div>

        {tab === "history" && (
          <ReviewHistoryPanel useGetAllReviews={useGetAllReviews} revieweeRoleModel="Manager" revieweeLabel="Manager" csvFilePrefix="manager-reviews" />
        )}

        {tab === "mine" && <MyReviewsList reviews={myReviews} onRespond={respond} respondPending={respondPending} />}

        {tab === "hr" && isHR && <HrApprovalsPanel useGetAllReviews={useGetAllReviews} onHrDecision={hrDecide} isPending={hrPending} />}

        {tab === "give" && (
          <>
            {submitted && (
              <div
                className="p-4 rounded-xl border mb-6 flex items-center gap-3 text-sm"
                style={{ background: "linear-gradient(135deg, #EDD5E3, #F5E8EF)", borderColor: `${BRAND.pink}55`, color: BRAND.textPrimary }}
              >
                Review submitted successfully. It now needs the manager's acknowledgement and HR's final approval.
              </div>
            )}

            {!selected ? (
              <div className="bg-white rounded-2xl border-2 border-[#5C0F30] shadow-md overflow-hidden">
                <div className="p-4 border-b border-[#E8D5DF] flex justify-between items-center">
                  <p className="m-0 text-[11px] tracking-[0.1em] uppercase text-[#9B7A8A] font-medium">Select Manager</p>
                  {managers.length > 0 && (
                    <span className="text-[11px] text-[#8B1A4A] bg-[#8B1A4A]/10 px-2.5 py-0.5 rounded-full">{managers.length} available</span>
                  )}
                </div>
                <div className="p-3 flex flex-col gap-2 max-h-[70vh] overflow-y-auto">
                  {isLoading && <div className="text-[#9B7A8A] text-sm py-4 px-2">Loading managers…</div>}
                  {isError && (
                    <div className="p-3 px-2">
                      <div className="text-[#8B1A2A] text-[13px] mb-1.5">
                        {error?.response?.data?.message ?? error?.message ?? "Failed to load managers."}
                      </div>
                      <button
                        type="button"
                        onClick={() => refetch()}
                        className="bg-transparent cursor-pointer text-xs text-[#8B1A4A] border border-[#8B1A4A]/50 rounded-lg py-1.5 px-3.5 bg-[#FAF0F5]"
                      >
                        Retry
                      </button>
                    </div>
                  )}
                  {!isLoading && !isError && managers.map((m) => <ManagerCard key={m._id} manager={m} selected={selected} onClick={setSelected} />)}
                  {!isLoading && !isError && managers.length === 0 && <div className="text-[#9B7A8A] text-sm py-4 px-2">No managers found.</div>}
                </div>
              </div>
            ) : (
              <div className="bg-white rounded-2xl border-2 border-[#5C0F30] shadow-md overflow-hidden p-4 sm:p-5">
                <button
                  type="button"
                  onClick={() => setSelected(null)}
                  className="text-[12px] mb-4 cursor-pointer"
                  style={{ color: BRAND.pink }}
                >
                  ← Back to manager list
                </button>
                <ReviewGradingForm
                  revieweeName={getFullName(selected)}
                  onSubmit={handleSubmit}
                  isPending={isPending}
                  submitError={submitError}
                  onCancel={() => setSelected(null)}
                />
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}