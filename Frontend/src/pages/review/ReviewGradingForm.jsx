import React, { useMemo, useState } from "react";
import { useReviewCriteria } from "./useReviewCriteria";

const BRAND = {
  pink: "#8B1A4A",
  maroon: "#5C0F30",
  cardBorder: "#E8D5DF",
  mutedText: "#9B7A8A",
  textPrimary: "#2D0A1A",
  accentLight: "#FAF0F5",
  accentBorder: "#D4A0B8",
};

const RECOMMENDATIONS = ["No Change", "Increment", "Promotion", "Training", "PIP"];

// Mirrors backend utils/reviewScoring.utils.js — live preview only, server
// always recomputes and is the source of truth.
const OVERALL_BANDS = [
  { min: 4.5, rating: "Excellent" },
  { min: 3.5, rating: "Very Good" },
  { min: 2.5, rating: "Good" },
  { min: 1.5, rating: "Average" },
  { min: -Infinity, rating: "Poor" },
];

function ratingColor(rating) {
  if (rating === "Excellent" || rating === "Very Good") return "#1E7A3D";
  if (rating === "Good") return BRAND.pink;
  if (rating === "Average") return "#B8860B";
  return "#B0233A";
}

function computeLiveScore(plusGrades, minusGrades, totalCriteria) {
  const plusValues = Object.values(plusGrades);
  const minusValues = Object.values(minusGrades);
  if (plusValues.length + minusValues.length === 0) return null;

  const plusSum = plusValues.reduce((s, g) => s + g, 0);
  const invertedMinusSum = minusValues.reduce((s, g) => s + (6 - g), 0);
  const answered = plusValues.length + minusValues.length;
  const overallScore = Math.round(((plusSum + invertedMinusSum) / answered) * 10) / 10;
  const band = OVERALL_BANDS.find((b) => overallScore >= b.min);
  const complete = answered === totalCriteria;

  return { overallScore, rating: band.rating, answered, complete };
}

function GradePicker({ value, onChange, tone }) {
  return (
    <div className="flex gap-1">
      {[1, 2, 3, 4, 5].map((n) => {
        const active = value === n;
        return (
          <button
            key={n}
            type="button"
            onClick={() => onChange(n)}
            className="w-7 h-7 rounded-lg text-[12px] font-semibold flex items-center justify-center border transition-all cursor-pointer shrink-0"
            style={{
              background: active
                ? tone === "minus"
                  ? "linear-gradient(135deg, #B0233A, #D94F63)"
                  : `linear-gradient(135deg, ${BRAND.maroon}, ${BRAND.pink})`
                : "#FFFFFF",
              color: active ? "#fff" : BRAND.mutedText,
              borderColor: active ? "transparent" : BRAND.cardBorder,
            }}
          >
            {n}
          </button>
        );
      })}
    </div>
  );
}

function CriteriaTable({ title, subtitle, criteria, grades, onGrade, tone }) {
  return (
    <div className="bg-white rounded-2xl border shadow-sm overflow-hidden" style={{ borderColor: BRAND.cardBorder }}>
      <div className="p-3.5 border-b" style={{ borderColor: BRAND.cardBorder, background: tone === "minus" ? "#FCEEF0" : BRAND.accentLight }}>
        <p className="m-0 text-[13px] font-semibold" style={{ color: tone === "minus" ? "#B0233A" : BRAND.pink }}>
          {title}
        </p>
        <p className="m-0 mt-0.5 text-[11px]" style={{ color: BRAND.mutedText }}>
          {subtitle}
        </p>
      </div>
      <div className="divide-y" style={{ borderColor: BRAND.cardBorder }}>
        {criteria.map((c) => (
          <div key={c.key} className="flex items-center justify-between gap-3 py-2.5 px-3.5" style={{ borderColor: BRAND.cardBorder }}>
            <div className="min-w-0">
              <p className="m-0 text-[13px] font-medium truncate" style={{ color: BRAND.textPrimary }}>
                {c.label}
              </p>
              <p className="m-0 text-[10.5px] truncate" style={{ color: BRAND.mutedText }}>
                {c.description}
              </p>
            </div>
            <GradePicker value={grades[c.key]} onChange={(n) => onGrade(c.key, n)} tone={tone} />
          </div>
        ))}
      </div>
    </div>
  );
}

// A small "add row / remove row" editable table for goals & development plan.
// All optional — the backend defaults these to [] if omitted.
function DynamicRows({ label, fields, rows, setRows }) {
  const emptyRow = () => Object.fromEntries(fields.map((f) => [f.key, ""]));

  const updateRow = (idx, key, value) => {
    setRows((prev) => prev.map((r, i) => (i === idx ? { ...r, [key]: value } : r)));
  };
  const addRow = () => setRows((prev) => [...prev, emptyRow()]);
  const removeRow = (idx) => setRows((prev) => prev.filter((_, i) => i !== idx));

  return (
    <div className="bg-white rounded-2xl border shadow-sm overflow-hidden" style={{ borderColor: BRAND.cardBorder }}>
      <div className="p-3.5 border-b flex items-center justify-between" style={{ borderColor: BRAND.cardBorder, background: BRAND.accentLight }}>
        <p className="m-0 text-[13px] font-semibold" style={{ color: BRAND.pink }}>
          {label}
        </p>
        <button
          type="button"
          onClick={addRow}
          className="text-[11px] font-medium py-1 px-2.5 rounded-full border cursor-pointer"
          style={{ borderColor: BRAND.accentBorder, color: BRAND.pink, background: "#fff" }}
        >
          + Add
        </button>
      </div>
      {rows.length === 0 ? (
        <p className="m-0 text-[12px] py-4 text-center" style={{ color: BRAND.mutedText }}>
          Optional — add a row if applicable.
        </p>
      ) : (
        <div className="p-3 flex flex-col gap-2.5">
          {rows.map((row, idx) => (
            <div key={idx} className="flex flex-wrap gap-2 p-2.5 rounded-xl" style={{ background: "#F9F6F7" }}>
              {fields.map((f) => (
                <input
                  key={f.key}
                  type={f.type || "text"}
                  placeholder={f.placeholder}
                  value={row[f.key] ?? ""}
                  onChange={(e) => updateRow(idx, f.key, e.target.value)}
                  className="flex-1 min-w-[110px] box-border bg-white border rounded-lg py-1.5 px-2.5 text-[12px] outline-none"
                  style={{ borderColor: BRAND.cardBorder, color: BRAND.textPrimary }}
                />
              ))}
              <button
                type="button"
                onClick={() => removeRow(idx)}
                className="text-[11px] px-2 rounded-lg cursor-pointer"
                style={{ color: "#B0233A" }}
              >
                Remove
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function ReviewGradingForm({ revieweeName, onSubmit, isPending, submitError, onCancel }) {
  const { data: criteriaData, isLoading: criteriaLoading } = useReviewCriteria();
  const plusCriteria = criteriaData?.plusPoints ?? [];
  const minusCriteria = criteriaData?.minusPoints ?? [];

  const [plusGrades, setPlusGrades] = useState({});
  const [minusGrades, setMinusGrades] = useState({});
  const [achievedGoals, setAchievedGoals] = useState([]);
  const [nextGoals, setNextGoals] = useState([]);
  const [developmentPlan, setDevelopmentPlan] = useState([]);
  const [employeeComments, setEmployeeComments] = useState("");
  const [reviewerComments, setReviewerComments] = useState("");
  const [recommendation, setRecommendation] = useState("No Change");
  const [showGoals, setShowGoals] = useState(false);

  const totalCriteria = plusCriteria.length + minusCriteria.length;
  const live = useMemo(
    () => computeLiveScore(plusGrades, minusGrades, totalCriteria),
    [plusGrades, minusGrades, totalCriteria]
  );

  const canSubmit = live?.complete && !isPending;

  const handleSubmit = () => {
    if (!canSubmit) return;
    onSubmit({
      plusPoints: plusCriteria.map((c) => ({ key: c.key, grade: plusGrades[c.key] })),
      minusPoints: minusCriteria.map((c) => ({ key: c.key, grade: minusGrades[c.key] })),
      achievedGoals,
      nextGoals,
      developmentPlan,
      employeeComments,
      reviewerComments,
      recommendation,
    });
  };

  if (criteriaLoading) {
    return (
      <div className="text-center py-10 text-sm" style={{ color: BRAND.mutedText }}>
        Loading review form…
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {submitError && (
        <div className="bg-[#FFF0F0] border border-[#cc3355] rounded-xl p-3.5 text-[#8B1A2A] text-[13px]">
          {submitError?.response?.data?.message ?? "Something went wrong. Please try again."}
        </div>
      )}

      {/* Live overall score */}
      <div
        className="rounded-2xl p-4 flex items-center justify-between flex-wrap gap-3"
        style={{ background: `linear-gradient(135deg, ${BRAND.maroon}, ${BRAND.pink})` }}
      >
        <div>
          <p className="m-0 text-[11px] uppercase tracking-[0.1em] text-white/70">
            Reviewing
          </p>
          <p className="m-0 text-[16px] font-semibold text-white" style={{ fontFamily: "'Playfair Display', Georgia, serif" }}>
            {revieweeName}
          </p>
        </div>
        <div className="text-right">
          <p className="m-0 text-[11px] uppercase tracking-[0.1em] text-white/70">
            Overall score {live ? `(${live.answered}/${totalCriteria})` : ""}
          </p>
          <p className="m-0 text-2xl font-bold text-white">
            {live ? `${live.overallScore} / 5` : "— / 5"}
            {live && (
              <span className="ml-2 text-[13px] font-medium align-middle" style={{ color: "#FFE8EF" }}>
                {live.rating}
              </span>
            )}
          </p>
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        <CriteriaTable
          title="Plus Points"
          subtitle="Grade each 1 (poor) to 5 (excellent)"
          criteria={plusCriteria}
          grades={plusGrades}
          onGrade={(key, n) => setPlusGrades((p) => ({ ...p, [key]: n }))}
          tone="plus"
        />
        <CriteriaTable
          title="Minus Points"
          subtitle="Grade each 1 (rarely/never) to 5 (severe/frequent)"
          criteria={minusCriteria}
          grades={minusGrades}
          onGrade={(key, n) => setMinusGrades((p) => ({ ...p, [key]: n }))}
          tone="minus"
        />
      </div>

      <button
        type="button"
        onClick={() => setShowGoals((s) => !s)}
        className="self-start text-[12px] font-medium py-1.5 px-3 rounded-full border cursor-pointer"
        style={{ borderColor: BRAND.accentBorder, color: BRAND.pink, background: BRAND.accentLight }}
      >
        {showGoals ? "Hide" : "+ Add"} Goals &amp; Development Plan (optional)
      </button>

      {showGoals && (
        <div className="flex flex-col gap-3">
          <DynamicRows
            label="Achieved Goals (previous period)"
            fields={[
              { key: "goal", placeholder: "Goal" },
              { key: "target", placeholder: "Target" },
              { key: "achievement", placeholder: "Achievement" },
            ]}
            rows={achievedGoals}
            setRows={setAchievedGoals}
          />
          <DynamicRows
            label="Next Goals"
            fields={[
              { key: "goal", placeholder: "Goal" },
              { key: "target", placeholder: "Target" },
              { key: "dueDate", placeholder: "Due date", type: "date" },
            ]}
            rows={nextGoals}
            setRows={setNextGoals}
          />
          <DynamicRows
            label="Development Plan"
            fields={[
              { key: "area", placeholder: "Area" },
              { key: "trainingRequired", placeholder: "Training required" },
              { key: "targetDate", placeholder: "Target date", type: "date" },
            ]}
            rows={developmentPlan}
            setRows={setDevelopmentPlan}
          />
        </div>
      )}

      <div className="grid md:grid-cols-2 gap-4">
        <div>
          <label className="block text-[11px] mb-1.5 uppercase tracking-[0.08em]" style={{ color: BRAND.mutedText }}>
            Reviewer Comments
          </label>
          <textarea
            value={reviewerComments}
            onChange={(e) => setReviewerComments(e.target.value)}
            rows={3}
            placeholder="Overall observations…"
            className="w-full box-border bg-white border rounded-xl py-2.5 px-3 text-[13px] outline-none resize-none"
            style={{ borderColor: BRAND.cardBorder, color: BRAND.textPrimary }}
          />
        </div>
        <div>
          <label className="block text-[11px] mb-1.5 uppercase tracking-[0.08em]" style={{ color: BRAND.mutedText }}>
            Employee Comments (if shared with you)
          </label>
          <textarea
            value={employeeComments}
            onChange={(e) => setEmployeeComments(e.target.value)}
            rows={3}
            placeholder="Optional…"
            className="w-full box-border bg-white border rounded-xl py-2.5 px-3 text-[13px] outline-none resize-none"
            style={{ borderColor: BRAND.cardBorder, color: BRAND.textPrimary }}
          />
        </div>
      </div>

      <div>
        <label className="block text-[11px] mb-1.5 uppercase tracking-[0.08em]" style={{ color: BRAND.mutedText }}>
          Recommendation
        </label>
        <div className="flex flex-wrap gap-2">
          {RECOMMENDATIONS.map((r) => (
            <button
              key={r}
              type="button"
              onClick={() => setRecommendation(r)}
              className="text-[12px] font-medium py-1.5 px-3.5 rounded-full border cursor-pointer transition-all"
              style={{
                background: recommendation === r ? `linear-gradient(135deg, ${BRAND.maroon}, ${BRAND.pink})` : "#fff",
                color: recommendation === r ? "#fff" : BRAND.mutedText,
                borderColor: recommendation === r ? "transparent" : BRAND.cardBorder,
              }}
            >
              {r}
            </button>
          ))}
        </div>
      </div>

      <div className="flex items-center gap-3 justify-end pt-2">
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="text-[13px] font-medium py-2.5 px-4 rounded-xl border cursor-pointer"
            style={{ borderColor: BRAND.cardBorder, color: BRAND.mutedText, background: "#fff" }}
          >
            Cancel
          </button>
        )}
        <button
          type="button"
          onClick={handleSubmit}
          disabled={!canSubmit}
          className="text-[13px] font-semibold py-2.5 px-5 rounded-xl text-white cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed transition-all"
          style={{ background: `linear-gradient(135deg, ${BRAND.maroon}, ${BRAND.pink})`, boxShadow: "0 3px 14px rgba(139,26,74,0.3)" }}
        >
          {isPending ? "Submitting…" : "Submit Review"}
        </button>
      </div>
      {!live?.complete && (
        <p className="m-0 text-[11px] text-right" style={{ color: BRAND.mutedText }}>
          Grade all {totalCriteria} criteria to enable submit ({live?.answered ?? 0}/{totalCriteria} done).
        </p>
      )}
    </div>
  );
}

export { ratingColor, OVERALL_BANDS };