import React, { useState } from "react";
import { useGetMeManager } from "../../auth/server-state/manager/managerauth/managerauth.hook";
import {
  useReviewEmployee,
  useReviewSubManager,
  useGetUsersUnderManager,
  useGetSubManagers,
  useGetMyTeamReviews,
  useRespondToMyReviewAsManager,
} from "../../auth/server-state/manager/managgerother/managerother.hook";
import ReviewGradingForm from "./ReviewGradingForm";
import MyReviewsList from "./MyReviewsList";
import { ratingColor } from "./ReviewGradingForm";

const BRAND = {
  pink: "#8B1A4A",
  maroon: "#5C0F30",
  cardBorder: "#E8D5DF",
  mutedText: "#9B7A8A",
  textPrimary: "#2D0A1A",
  accentLight: "#FAF0F5",
  accentBorder: "#D4A0B8",
};

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

function PersonCard({ person, selected, onClick }) {
  const isSelected = selected?._id === person._id;
  return (
    <button
      type="button"
      onClick={() => onClick(person)}
      className="w-full text-left cursor-pointer flex items-center gap-3 py-3 px-3.5 rounded-2xl border relative overflow-hidden transition-all duration-200 min-w-0"
      style={{
        background: isSelected ? "linear-gradient(135deg, #F5E8EF, #EDD5E3)" : "#fff",
        borderColor: isSelected ? BRAND.pink : BRAND.cardBorder,
        boxShadow: isSelected ? `0 0 0 3px ${BRAND.pink}22, 0 4px 24px #00000015` : "0 2px 8px #00000010",
      }}
    >
      <div
        className="w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm text-white shrink-0 border"
        style={{
          background: isSelected ? `linear-gradient(135deg, ${BRAND.maroon}, ${BRAND.pink})` : `linear-gradient(135deg, #C9829E, ${BRAND.pink})`,
          fontFamily: "'Playfair Display', Georgia, serif",
          borderColor: isSelected ? BRAND.pink : BRAND.accentBorder,
        }}
      >
        {getInitials(person)}
      </div>
      <div className="text-left min-w-0 flex-1">
        <p className="m-0 text-sm font-semibold truncate" style={{ color: BRAND.textPrimary, fontFamily: "'Playfair Display', Georgia, serif" }}>
          {getFullName(person)}
        </p>
        <p className="m-0 mt-0.5 text-[11px] truncate" style={{ color: BRAND.mutedText }}>
          {getEmail(person)}
        </p>
        {person.designation && (
          <p className="m-0 mt-0.5 text-[10px] truncate" style={{ color: BRAND.pink }}>
            {person.designation}
          </p>
        )}
      </div>
    </button>
  );
}

function PersonPicker({ people, isLoading, isError, error, refetch, selected, onSelect, emptyLabel, countLabel }) {
  const [search, setSearch] = useState("");
  const filtered = people.filter(
    (p) => getFullName(p).toLowerCase().includes(search.toLowerCase()) || getEmail(p).toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="bg-white rounded-2xl border overflow-hidden shadow-sm" style={{ borderColor: BRAND.cardBorder }}>
      <div className="p-4 border-b flex justify-between items-center" style={{ borderColor: BRAND.cardBorder }}>
        <p className="m-0 text-[11px] tracking-[0.1em] uppercase font-medium" style={{ color: BRAND.mutedText }}>
          {countLabel}
        </p>
        {people.length > 0 && (
          <span className="text-[11px] py-0.5 px-2.5 rounded-full" style={{ color: BRAND.pink, background: `${BRAND.pink}1A` }}>
            {people.length}
          </span>
        )}
      </div>
      {people.length > 3 && (
        <div className="p-3 pb-0">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by name or email…"
            className="w-full box-border bg-[#F5F0F3] border rounded-lg py-2 px-3 text-[13px] outline-none"
            style={{ borderColor: BRAND.cardBorder, color: BRAND.textPrimary }}
          />
        </div>
      )}
      <div className="p-3 flex flex-col gap-2 max-h-[60vh] overflow-y-auto">
        {isLoading && <div className="text-sm py-4 px-2" style={{ color: BRAND.mutedText }}>Loading…</div>}
        {isError && (
          <div className="p-3 px-2">
            <div className="text-[13px] mb-1.5" style={{ color: "#8B1A2A" }}>
              {error?.response?.data?.message ?? error?.message ?? "Failed to load."}
            </div>
            <button type="button" onClick={() => refetch()} className="text-xs py-1.5 px-3.5 rounded-lg border cursor-pointer" style={{ borderColor: BRAND.pink, color: BRAND.pink, background: BRAND.accentLight }}>
              Retry
            </button>
          </div>
        )}
        {!isLoading && !isError && filtered.map((p) => <PersonCard key={p._id} person={p} selected={selected} onClick={onSelect} />)}
        {!isLoading && !isError && filtered.length === 0 && <div className="text-sm py-4 px-2" style={{ color: BRAND.mutedText }}>{emptyLabel}</div>}
      </div>
    </div>
  );
}

const TABS = [
  { key: "employee", label: "Review Employee" },
  { key: "submanager", label: "Review Sub-Manager" },
  { key: "team", label: "Team Reviews" },
  { key: "mine", label: "My Review" },
];

export default function ReviewEmployee() {
  const [tab, setTab] = useState("employee");
  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const [selectedSubManager, setSelectedSubManager] = useState(null);
  const [submitted, setSubmitted] = useState(false);

  const empList = useGetUsersUnderManager();
  const employees = Array.isArray(empList.data) ? empList.data : empList.data?.users ?? empList.data?.data ?? [];

  const subList = useGetSubManagers();
  const subManagers = subList.data?.managers ?? [];

  const { mutate: submitEmployeeReview, isPending: empPending, error: empError } = useReviewEmployee();
  const { mutate: submitSubManagerReview, isPending: subPending, error: subError } = useReviewSubManager();

  const teamReviews = useGetMyTeamReviews();
  const reviews = teamReviews.data?.reviews ?? [];

  const { data: meData } = useGetMeManager();
  const myReviews = meData?.reviews ?? [];
  const { mutate: respond, isPending: respondPending } = useRespondToMyReviewAsManager();

  const handleSubmitEmployee = (payload) => {
    submitEmployeeReview(
      { employeeid: selectedEmployee._id, ...payload },
      { onSuccess: () => { setSubmitted(true); setSelectedEmployee(null); setTimeout(() => setSubmitted(false), 4000); } }
    );
  };
  const handleSubmitSubManager = (payload) => {
    submitSubManagerReview(
      { managerid: selectedSubManager._id, ...payload },
      { onSuccess: () => { setSubmitted(true); setSelectedSubManager(null); setTimeout(() => setSubmitted(false), 4000); } }
    );
  };

  return (
    <div className="min-h-screen bg-[#F2EEF0] font-['Inter','Helvetica_Neue',sans-serif] px-3 py-8 sm:px-6 sm:py-10 md:px-6 md:py-12 flex justify-center overflow-x-hidden">
      <link href="https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;600;700&family=Inter:wght@300;400;500&display=swap" rel="stylesheet" />

      <div className="w-full max-w-[960px] min-w-0">
        <div className="mb-8 text-center px-1">
          <div className="inline-block px-4 py-1 border rounded-full text-[11px] tracking-[0.12em] uppercase mb-4" style={{ borderColor: BRAND.accentBorder, color: BRAND.pink, background: BRAND.accentLight }}>
            Performance Review
          </div>
          <h1 className="text-[26px] sm:text-4xl font-bold m-0 mb-3 tracking-[-0.01em]" style={{ fontFamily: "'Playfair Display', Georgia, serif", color: BRAND.textPrimary }}>
            Team Reviews
          </h1>
          <p className="text-sm m-0 max-w-[440px] mx-auto leading-relaxed" style={{ color: BRAND.mutedText }}>
            Review your employees and sub-managers, and track your own review status.
          </p>
        </div>

        <div className="flex justify-center flex-wrap gap-2 mb-7">
          {TABS.map((t) => (
            <button
              key={t.key}
              type="button"
              onClick={() => setTab(t.key)}
              className="py-2 px-4 rounded-full text-[13px] font-medium border cursor-pointer transition-all"
              style={{
                background: tab === t.key ? `linear-gradient(135deg, ${BRAND.maroon}, ${BRAND.pink})` : "#fff",
                color: tab === t.key ? "#fff" : BRAND.mutedText,
                borderColor: tab === t.key ? BRAND.pink : BRAND.cardBorder,
              }}
            >
              {t.label}
            </button>
          ))}
        </div>

        {submitted && (
          <div className="rounded-xl px-4 py-3.5 mb-6 text-[13px]" style={{ background: "linear-gradient(135deg, #EDD5E3, #F5E8EF)", border: `1px solid ${BRAND.pink}55`, color: BRAND.textPrimary }}>
            Review submitted successfully. It now needs their acknowledgement and HR's final approval.
          </div>
        )}

        {tab === "employee" && (
          <>
            {empError && (
              <div className="bg-[#FFF0F0] border border-[#cc3355] rounded-xl px-4 py-3.5 mb-6 text-[#8B1A2A] text-[13px]">
                {empError?.response?.data?.message ?? "Something went wrong."}
              </div>
            )}
            {!selectedEmployee ? (
              <PersonPicker
                people={employees}
                isLoading={empList.isLoading}
                isError={empList.isError}
                error={empList.error}
                refetch={empList.refetch}
                selected={selectedEmployee}
                onSelect={setSelectedEmployee}
                countLabel="Your Team"
                emptyLabel="No employees found."
              />
            ) : (
              <div className="bg-white rounded-2xl border-2 shadow-md overflow-hidden p-4 sm:p-5" style={{ borderColor: BRAND.maroon }}>
                <button type="button" onClick={() => setSelectedEmployee(null)} className="text-[12px] mb-4 cursor-pointer" style={{ color: BRAND.pink }}>
                  ← Back to team list
                </button>
                <ReviewGradingForm
                  revieweeName={getFullName(selectedEmployee)}
                  onSubmit={handleSubmitEmployee}
                  isPending={empPending}
                  submitError={empError}
                  onCancel={() => setSelectedEmployee(null)}
                />
              </div>
            )}
          </>
        )}

        {tab === "submanager" && (
          <>
            {subError && (
              <div className="bg-[#FFF0F0] border border-[#cc3355] rounded-xl px-4 py-3.5 mb-6 text-[#8B1A2A] text-[13px]">
                {subError?.response?.data?.message ?? "Something went wrong."}
              </div>
            )}
            {!selectedSubManager ? (
              <PersonPicker
                people={subManagers}
                isLoading={subList.isLoading}
                isError={subList.isError}
                error={subList.error}
                refetch={subList.refetch}
                selected={selectedSubManager}
                onSelect={setSelectedSubManager}
                countLabel="Managers Reporting To You"
                emptyLabel="No sub-managers found under you."
              />
            ) : (
              <div className="bg-white rounded-2xl border-2 shadow-md overflow-hidden p-4 sm:p-5" style={{ borderColor: BRAND.maroon }}>
                <button type="button" onClick={() => setSelectedSubManager(null)} className="text-[12px] mb-4 cursor-pointer" style={{ color: BRAND.pink }}>
                  ← Back to list
                </button>
                <ReviewGradingForm
                  revieweeName={getFullName(selectedSubManager)}
                  onSubmit={handleSubmitSubManager}
                  isPending={subPending}
                  submitError={subError}
                  onCancel={() => setSelectedSubManager(null)}
                />
              </div>
            )}
          </>
        )}

        {tab === "team" && (
          <div className="bg-white rounded-2xl border-2 shadow-md overflow-hidden" style={{ borderColor: BRAND.maroon }}>
            <div className="p-4 sm:p-5 border-b" style={{ borderColor: BRAND.cardBorder }}>
              <p className="m-0 text-[11px] tracking-[0.1em] uppercase font-medium" style={{ color: BRAND.mutedText }}>
                Reviews For Your Team
              </p>
            </div>
            <div className="p-3 sm:p-4">
              {teamReviews.isLoading && <div className="text-center py-8 text-sm" style={{ color: BRAND.mutedText }}>Loading…</div>}
              {!teamReviews.isLoading && reviews.length === 0 && (
                <div className="text-center py-10 text-sm" style={{ color: BRAND.mutedText }}>No reviews yet.</div>
              )}
              {!teamReviews.isLoading && reviews.length > 0 && (
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse text-[13px] min-w-[640px]">
                    <thead>
                      <tr style={{ background: BRAND.accentLight }}>
                        <th className="text-left py-2.5 px-3 text-[11px] uppercase" style={{ color: BRAND.mutedText }}>Reviewee</th>
                        <th className="text-left py-2.5 px-3 text-[11px] uppercase" style={{ color: BRAND.mutedText }}>Month</th>
                        <th className="text-left py-2.5 px-3 text-[11px] uppercase" style={{ color: BRAND.mutedText }}>Overall</th>
                        <th className="text-left py-2.5 px-3 text-[11px] uppercase" style={{ color: BRAND.mutedText }}>Status</th>
                        <th className="text-left py-2.5 px-3 text-[11px] uppercase" style={{ color: BRAND.mutedText }}>Reviewed By</th>
                      </tr>
                    </thead>
                    <tbody>
                      {reviews.map((r) => (
                        <tr key={r._id} className="border-b" style={{ borderColor: BRAND.cardBorder }}>
                          <td className="py-2.5 px-3" style={{ color: BRAND.textPrimary }}>{getFullName(r.reviewee)}</td>
                          <td className="py-2.5 px-3" style={{ color: BRAND.textPrimary }}>{r.monthYear}</td>
                          <td className="py-2.5 px-3 font-semibold" style={{ color: ratingColor(r.overallRating) }}>
                            {r.overallScore}/5 · {r.overallRating}
                          </td>
                          <td className="py-2.5 px-3" style={{ color: BRAND.mutedText }}>{r.status}</td>
                          <td className="py-2.5 px-3" style={{ color: BRAND.textPrimary }}>{getFullName(r.reviewer)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}

        {tab === "mine" && <MyReviewsList reviews={myReviews} onRespond={respond} respondPending={respondPending} />}
      </div>
    </div>
  );
}