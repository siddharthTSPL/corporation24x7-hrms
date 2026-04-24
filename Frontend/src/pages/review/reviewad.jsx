import React, { useState } from "react";
import { useFindAllManagers } from "../../auth/server-state/adminauth/adminauth.hook";
import { useReviewToManager } from "../../auth/server-state/adminother/adminother.hook";

const BRAND = {
  pink: "#CD166E",
  maroon: "#730042",
  cream: "#F9F8F2",
  dark: "#1A0010",
  darkSurface: "#23001A",
  cardBg: "#2D0020",
  cardBorder: "#5a0038",
  mutedText: "#c49fb5",
};

// field helpers — handles f_name/l_name/work_email from your API
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
    <div style={{ display: "flex", gap: 6 }}>
      {[1, 2, 3, 4, 5].map((star) => {
        const filled = star <= (hovered || value);
        return (
          <button
            key={star}
            type="button"
            onClick={() => onChange(star)}
            onMouseEnter={() => setHovered(star)}
            onMouseLeave={() => setHovered(0)}
            style={{
              background: "none",
              border: "none",
              cursor: "pointer",
              padding: 2,
              transition: "transform 0.15s",
              transform: filled ? "scale(1.15)" : "scale(1)",
            }}
          >
            <svg width="28" height="28" viewBox="0 0 24 24">
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
      style={{
        all: "unset",
        cursor: "pointer",
        display: "flex",
        alignItems: "center",
        gap: 14,
        padding: "14px 18px",
        borderRadius: 14,
        border: `1.5px solid ${isSelected ? BRAND.pink : BRAND.cardBorder}`,
        background: isSelected
          ? `linear-gradient(135deg, #3d0028 0%, #580035 100%)`
          : BRAND.cardBg,
        transition: "all 0.2s",
        boxShadow: isSelected
          ? `0 0 0 3px ${BRAND.pink}33, 0 4px 24px #00000060`
          : "0 2px 8px #00000030",
        position: "relative",
        overflow: "hidden",
      }}
    >
      {isSelected && (
        <div
          style={{
            position: "absolute",
            top: 0, left: 0, right: 0,
            height: 2,
            background: `linear-gradient(90deg, ${BRAND.maroon}, ${BRAND.pink})`,
          }}
        />
      )}
      <div
        style={{
          width: 44, height: 44,
          borderRadius: "50%",
          background: isSelected
            ? `linear-gradient(135deg, ${BRAND.maroon}, ${BRAND.pink})`
            : `#4a0032`,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontFamily: "'Playfair Display', Georgia, serif",
          fontWeight: 700,
          fontSize: 15,
          color: BRAND.cream,
          flexShrink: 0,
          border: `1px solid ${isSelected ? BRAND.pink : "#6a0045"}`,
        }}
      >
        {getInitials(manager)}
      </div>
      <div style={{ textAlign: "left", minWidth: 0 }}>
        <p
          style={{
            margin: 0,
            fontFamily: "'Playfair Display', Georgia, serif",
            fontSize: 15,
            fontWeight: 600,
            color: BRAND.cream,
            whiteSpace: "nowrap",
            overflow: "hidden",
            textOverflow: "ellipsis",
          }}
        >
          {getFullName(manager)}
        </p>
        <p style={{ margin: "2px 0 0", fontSize: 12, color: BRAND.mutedText, letterSpacing: "0.03em" }}>
          {getEmail(manager)}
        </p>
        {manager.designation && (
          <p style={{ margin: "2px 0 0", fontSize: 11, color: BRAND.pink, textTransform: "capitalize" }}>
            {manager.designation} · {manager.department}
          </p>
        )}
      </div>
      {isSelected && (
        <div
          style={{
            marginLeft: "auto",
            width: 20, height: 20,
            borderRadius: "50%",
            background: BRAND.pink,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0,
          }}
        >
          <svg width="11" height="11" viewBox="0 0 12 12">
            <polyline points="2,6 5,9 10,3" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>
      )}
    </button>
  );
}

const ratingLabels = { 1: "Poor", 2: "Fair", 3: "Good", 4: "Very Good", 5: "Excellent" };

export default function ReviewManager() {
  const { data, isLoading, isError, error, refetch } = useFindAllManagers();

  // handles { managers: [...] } shape from your API
  const managers = Array.isArray(data)
    ? data
    : data?.managers ?? data?.data?.managers ?? [];

  const { mutate: submitReview, isPending, error: submitError } = useReviewToManager();

  const [selected, setSelected] = useState(null);
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState("");
  const [submitted, setSubmitted] = useState(false);

  const canSubmit = selected && rating > 0 && comment.trim().length >= 10 && !isPending;

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
          setTimeout(() => setSubmitted(false), 4000);
        },
      }
    );
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        background: `radial-gradient(ellipse at top left, #3d0028 0%, ${BRAND.dark} 55%)`,
        fontFamily: "'Inter', 'Helvetica Neue', sans-serif",
        padding: "48px 24px",
        display: "flex",
        justifyContent: "center",
      }}
    >
      <link
        href="https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;600;700&family=Inter:wght@300;400;500&display=swap"
        rel="stylesheet"
      />

      <div style={{ width: "100%", maxWidth: 960 }}>
        {/* Header */}
        <div style={{ marginBottom: 48, textAlign: "center" }}>
          <div style={{ display: "inline-block", padding: "4px 16px", border: `1px solid ${BRAND.cardBorder}`, borderRadius: 20, fontSize: 11, letterSpacing: "0.12em", textTransform: "uppercase", color: BRAND.pink, marginBottom: 16 }}>
            Performance Review
          </div>
          <h1 style={{ fontFamily: "'Playfair Display', Georgia, serif", fontSize: "clamp(28px, 5vw, 44px)", fontWeight: 700, color: BRAND.cream, margin: "0 0 12px", letterSpacing: "-0.01em" }}>
            Review a Manager
          </h1>
          <p style={{ fontSize: 15, color: BRAND.mutedText, margin: 0, maxWidth: 440, marginLeft: "auto", marginRight: "auto", lineHeight: 1.6 }}>
            Share your experience and help drive meaningful growth within the team.
          </p>
        </div>

        {submitted && (
          <div style={{ background: `linear-gradient(135deg, ${BRAND.maroon}, #4a0032)`, border: `1px solid ${BRAND.pink}55`, borderRadius: 12, padding: "14px 20px", marginBottom: 28, display: "flex", alignItems: "center", gap: 12, color: BRAND.cream, fontSize: 14 }}>
            <div style={{ width: 22, height: 22, borderRadius: "50%", background: BRAND.pink, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
              <svg width="12" height="12" viewBox="0 0 12 12"><polyline points="2,6 5,9 10,3" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
            </div>
            Review submitted successfully. Thank you for your feedback.
          </div>
        )}

        {submitError && (
          <div style={{ background: "#2a0010", border: "1px solid #cc3355", borderRadius: 12, padding: "14px 20px", marginBottom: 28, color: "#f9c0cc", fontSize: 14 }}>
            {submitError?.response?.data?.message ?? "Something went wrong. Please try again."}
          </div>
        )}

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1.1fr", gap: 28, alignItems: "start" }}>

          {/* Left — Manager List */}
          <div style={{ background: BRAND.darkSurface, borderRadius: 20, border: `1px solid ${BRAND.cardBorder}`, overflow: "hidden" }}>
            <div style={{ padding: "20px 20px 14px", borderBottom: `1px solid ${BRAND.cardBorder}`, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <p style={{ margin: 0, fontSize: 11, letterSpacing: "0.1em", textTransform: "uppercase", color: BRAND.mutedText, fontWeight: 500 }}>Select Manager</p>
              {managers.length > 0 && (
                <span style={{ fontSize: 11, color: BRAND.pink, background: `${BRAND.pink}18`, padding: "2px 10px", borderRadius: 20 }}>
                  {managers.length} available
                </span>
              )}
            </div>
            <div style={{ padding: 14, display: "flex", flexDirection: "column", gap: 8 }}>
              {isLoading && (
                <div style={{ color: BRAND.mutedText, fontSize: 14, padding: "16px 8px", display: "flex", alignItems: "center", gap: 8 }}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" style={{ animation: "spin 1s linear infinite" }}>
                    <circle cx="12" cy="12" r="10" stroke={BRAND.mutedText} strokeWidth="2" opacity="0.3" />
                    <path d="M12 2a10 10 0 0 1 10 10" stroke={BRAND.mutedText} strokeWidth="2" strokeLinecap="round" />
                  </svg>
                  Loading managers…
                </div>
              )}
              {isError && (
                <div style={{ padding: "12px 8px" }}>
                  <div style={{ color: "#f9c0cc", fontSize: 13, marginBottom: 6 }}>
                    {error?.response?.data?.message ?? error?.message ?? "Failed to load managers."}
                  </div>
                  <button type="button" onClick={() => refetch()} style={{ all: "unset", cursor: "pointer", fontSize: 12, color: BRAND.pink, border: `1px solid ${BRAND.pink}55`, borderRadius: 8, padding: "6px 14px" }}>
                    Retry
                  </button>
                </div>
              )}
              {!isLoading && !isError && managers.map((m) => (
                <ManagerCard key={m._id} manager={m} selected={selected} onClick={setSelected} />
              ))}
              {!isLoading && !isError && managers.length === 0 && (
                <div style={{ color: BRAND.mutedText, fontSize: 14, padding: "16px 8px" }}>No managers found.</div>
              )}
            </div>
          </div>

          {/* Right — Review Form */}
          <div style={{ background: BRAND.darkSurface, borderRadius: 20, border: `1px solid ${BRAND.cardBorder}`, overflow: "hidden" }}>
            <div style={{ padding: "20px 24px 14px", borderBottom: `1px solid ${BRAND.cardBorder}`, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <p style={{ margin: 0, fontSize: 11, letterSpacing: "0.1em", textTransform: "uppercase", color: BRAND.mutedText, fontWeight: 500 }}>Your Review</p>
              {selected && (
                <span style={{ fontSize: 13, color: BRAND.pink, fontFamily: "'Playfair Display', Georgia, serif", fontStyle: "italic" }}>
                  {getFullName(selected)}
                </span>
              )}
            </div>

            <div style={{ padding: "24px 24px 28px" }}>
              {!selected ? (
                <div style={{ textAlign: "center", padding: "36px 20px", color: BRAND.mutedText, fontSize: 14, lineHeight: 1.6 }}>
                  <div style={{ width: 56, height: 56, borderRadius: "50%", background: "#3d0028", border: `1px dashed ${BRAND.cardBorder}`, display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px" }}>
                    <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
                      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2M12 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8z" stroke={BRAND.mutedText} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </div>
                  Select a manager from the left to begin your review.
                </div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 28 }}>

                  {/* Selected manager pill */}
                  <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 14px", background: `${BRAND.pink}12`, borderRadius: 12, border: `1px solid ${BRAND.pink}30` }}>
                    <div style={{ width: 38, height: 38, borderRadius: "50%", background: `linear-gradient(135deg, ${BRAND.maroon}, ${BRAND.pink})`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, fontWeight: 700, color: BRAND.cream, fontFamily: "'Playfair Display', Georgia, serif", flexShrink: 0 }}>
                      {getInitials(selected)}
                    </div>
                    <div>
                      <p style={{ margin: 0, fontSize: 14, fontWeight: 500, color: BRAND.cream }}>{getFullName(selected)}</p>
                      <p style={{ margin: 0, fontSize: 11, color: BRAND.mutedText, textTransform: "capitalize" }}>
                        {selected.designation} · {selected.department}
                      </p>
                    </div>
                  </div>

                  {/* Rating */}
                  <div>
                    <label style={{ display: "block", fontSize: 12, letterSpacing: "0.08em", textTransform: "uppercase", color: BRAND.mutedText, marginBottom: 12, fontWeight: 500 }}>Rating</label>
                    <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
                      <StarRating value={rating} onChange={setRating} />
                      {rating > 0 && (
                        <span style={{ fontSize: 13, color: BRAND.pink, fontFamily: "'Playfair Display', Georgia, serif", fontStyle: "italic" }}>
                          {ratingLabels[rating]}
                        </span>
                      )}
                    </div>
                    {rating > 0 && (
                      <div style={{ display: "flex", gap: 4, marginTop: 12 }}>
                        {[1, 2, 3, 4, 5].map((i) => (
                          <div key={i} style={{ flex: 1, height: 3, borderRadius: 4, background: i <= rating ? BRAND.pink : BRAND.cardBorder, transition: "background 0.2s" }} />
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Comment */}
                  <div>
                    <label style={{ display: "block", fontSize: 12, letterSpacing: "0.08em", textTransform: "uppercase", color: BRAND.mutedText, marginBottom: 12, fontWeight: 500 }}>Feedback</label>
                    <textarea
                      rows={5}
                      value={comment}
                      onChange={(e) => setComment(e.target.value)}
                      placeholder="Share your honest observations about this manager's performance, leadership, and communication…"
                      style={{
                        width: "100%",
                        background: BRAND.cardBg,
                        border: `1px solid ${comment.length > 0 ? BRAND.pink + "66" : BRAND.cardBorder}`,
                        borderRadius: 12,
                        padding: "14px 16px",
                        color: BRAND.cream,
                        fontSize: 14,
                        lineHeight: 1.6,
                        resize: "vertical",
                        outline: "none",
                        fontFamily: "'Inter', sans-serif",
                        boxSizing: "border-box",
                        transition: "border-color 0.2s",
                      }}
                    />
                    <div style={{ marginTop: 6, fontSize: 11, color: comment.trim().length < 10 ? BRAND.mutedText : BRAND.pink, textAlign: "right", transition: "color 0.2s" }}>
                      {comment.trim().length} / 10 min chars
                    </div>
                  </div>

                  <div style={{ height: 1, background: BRAND.cardBorder }} />

                  {/* Submit */}
                  <button
                    type="button"
                    onClick={handleSubmit}
                    disabled={!canSubmit}
                    style={{
                      all: "unset",
                      cursor: canSubmit ? "pointer" : "not-allowed",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: 10,
                      padding: "14px 28px",
                      borderRadius: 12,
                      background: canSubmit
                        ? `linear-gradient(135deg, ${BRAND.maroon} 0%, ${BRAND.pink} 100%)`
                        : "#3d0028",
                      color: canSubmit ? BRAND.cream : BRAND.mutedText,
                      fontSize: 14,
                      fontWeight: 500,
                      letterSpacing: "0.02em",
                      transition: "all 0.2s",
                      opacity: canSubmit ? 1 : 0.6,
                    }}
                  >
                    {isPending ? (
                      <>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" style={{ animation: "spin 1s linear infinite" }}>
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
        textarea::placeholder { color: #7a4060; }
        textarea:focus { border-color: ${BRAND.pink} !important; }
        button:not([disabled]):hover { filter: brightness(1.08); }
      `}</style>
    </div>
  );
}