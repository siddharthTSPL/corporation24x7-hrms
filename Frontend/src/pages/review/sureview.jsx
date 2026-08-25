import React, { useState } from "react";
import {
  useGetAllAdmins,
  useReviewToAdmin,
  useGetAllReviews,
  useSuperAdminAcknowledgeReview,
} from "../../auth/server-state/superadmin/other/suother.hook";
import ReviewHistoryPanel from "./Reviewhistorypanel";
import ReviewGradingForm from "./ReviewGradingForm";
import HrApprovalsPanel from "./HrApprovalsPanel";
import HrRoleManagementPanel from "./HrRoleManagementPanel";

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

function getFullName(a) {
  return a?.f_name ? `${a.f_name} ${a.l_name ?? ""}`.trim() : "Unknown";
}
function getInitials(a) {
  const f = (a?.f_name ?? "").charAt(0);
  const l = (a?.l_name ?? "").charAt(0);
  return (f + l).toUpperCase() || "AD";
}
function getEmail(a) {
  return a?.work_email ?? a?.email ?? "";
}

function AdminCard({ admin, selected, onClick }) {
  const isSelected = selected?._id === admin._id;
  return (
    <button
      type="button"
      onClick={() => onClick(admin)}
      className="w-full flex items-center gap-3 p-3 rounded-xl border transition-all duration-200 text-left relative overflow-hidden"
      style={{
        background: isSelected ? "linear-gradient(135deg, #F5E8EF, #EDD5E3)" : "#fff",
        borderColor: isSelected ? BRAND.pink : BRAND.cardBorder,
        boxShadow: isSelected ? `0 0 0 3px ${BRAND.pink}22, 0 4px 24px #00000015` : "0 2px 8px #00000010",
      }}
    >
      <div
        className="w-9 h-9 sm:w-10 sm:h-10 rounded-full flex items-center justify-center text-white text-xs sm:text-sm font-bold shrink-0 border"
        style={{
          background: isSelected ? `linear-gradient(135deg, ${BRAND.maroon}, ${BRAND.pink})` : `linear-gradient(135deg, #C9829E, ${BRAND.pink})`,
          fontFamily: "'Playfair Display', Georgia, serif",
          borderColor: isSelected ? BRAND.pink : BRAND.accentBorder,
        }}
      >
        {getInitials(admin)}
      </div>
      <div className="text-left min-w-0 flex-1">
        <p className="m-0 text-sm font-semibold truncate" style={{ color: BRAND.textPrimary, fontFamily: "'Playfair Display', Georgia, serif" }}>
          {getFullName(admin)}
        </p>
        <p className="m-0 mt-0.5 text-[11px] truncate" style={{ color: BRAND.mutedText }}>{getEmail(admin)}</p>
        {admin.isHR && (
          <p className="m-0 mt-0.5 text-[10px] font-medium" style={{ color: "#1E7A3D" }}>HR Approver</p>
        )}
      </div>
    </button>
  );
}

const TABS = [
  { key: "give", label: "Review an Admin" },
  { key: "history", label: "Review History" },
  { key: "approvals", label: "Approve Reviews" },
  { key: "hr", label: "HR Management" },
];

export default function SuperAdminReviews() {
  const { data, isLoading, isError, error, refetch } = useGetAllAdmins();
  const admins = Array.isArray(data) ? data : data?.admins ?? data?.data?.admins ?? [];

  const { mutate: submitReview, isPending, error: submitError } = useReviewToAdmin();
  const { mutate: acknowledgeReview, isPending: ackPending } = useSuperAdminAcknowledgeReview();

  const [selected, setSelected] = useState(null);
  const [submitted, setSubmitted] = useState(false);
  const [tab, setTab] = useState("give");

  const handleSubmit = (payload) => {
    submitReview(
      { adminid: selected._id, ...payload },
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
          <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold m-0 mb-2 tracking-tight" style={{ fontFamily: "'Playfair Display', Georgia, serif", color: BRAND.textPrimary }}>
            Organisation Reviews
          </h1>
          <p className="text-sm sm:text-base m-auto max-w-md leading-relaxed" style={{ color: BRAND.mutedText }}>
            Review admins, manage HR approvers, and give the final word when needed.
          </p>
        </div>

        <div className="flex justify-center flex-wrap gap-2 mb-6 sm:mb-8">
          {TABS.map((t) => (
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
          <ReviewHistoryPanel useGetAllReviews={useGetAllReviews} revieweeRoleModel="Admin" revieweeLabel="Admin" csvFilePrefix="admin-reviews" />
        )}

        {tab === "approvals" && (
          <HrApprovalsPanel useGetAllReviews={useGetAllReviews} onHrDecision={acknowledgeReview} isPending={ackPending} />
        )}

        {tab === "hr" && <HrRoleManagementPanel />}

        {tab === "give" && (
          <>
            {submitted && (
              <div
                className="p-4 rounded-xl border mb-6 text-sm"
                style={{ background: "linear-gradient(135deg, #EDD5E3, #F5E8EF)", borderColor: `${BRAND.pink}55`, color: BRAND.textPrimary }}
              >
                Review submitted successfully. It now needs the admin's acknowledgement and HR's final approval.
              </div>
            )}

            {!selected ? (
              <div className="bg-white rounded-2xl border-2 border-[#5C0F30] shadow-md overflow-hidden">
                <div className="p-4 border-b border-[#E8D5DF] flex justify-between items-center">
                  <p className="m-0 text-[11px] tracking-[0.1em] uppercase text-[#9B7A8A] font-medium">Select Admin</p>
                  {admins.length > 0 && (
                    <span className="text-[11px] text-[#8B1A4A] bg-[#8B1A4A]/10 px-2.5 py-0.5 rounded-full">{admins.length} available</span>
                  )}
                </div>
                <div className="p-3 flex flex-col gap-2 max-h-[70vh] overflow-y-auto">
                  {isLoading && <div className="text-[#9B7A8A] text-sm py-4 px-2">Loading admins…</div>}
                  {isError && (
                    <div className="p-3 px-2">
                      <div className="text-[#8B1A2A] text-[13px] mb-1.5">
                        {error?.response?.data?.message ?? error?.message ?? "Failed to load admins."}
                      </div>
                      <button type="button" onClick={() => refetch()} className="bg-transparent cursor-pointer text-xs text-[#8B1A4A] border border-[#8B1A4A]/50 rounded-lg py-1.5 px-3.5 bg-[#FAF0F5]">
                        Retry
                      </button>
                    </div>
                  )}
                  {!isLoading && !isError && admins.map((a) => <AdminCard key={a._id} admin={a} selected={selected} onClick={setSelected} />)}
                  {!isLoading && !isError && admins.length === 0 && <div className="text-[#9B7A8A] text-sm py-4 px-2">No admins found.</div>}
                </div>
              </div>
            ) : (
              <div className="bg-white rounded-2xl border-2 border-[#5C0F30] shadow-md overflow-hidden p-4 sm:p-5">
                <button type="button" onClick={() => setSelected(null)} className="text-[12px] mb-4 cursor-pointer" style={{ color: BRAND.pink }}>
                  ← Back to admin list
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