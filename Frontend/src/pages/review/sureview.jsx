import React, { useState } from "react";
import {
  useGetAllAdmins,
  useReviewToAdmin,
} from "../../auth/server-state/superadmin/other/suother.hook";

/* ─────────────────────────────────────────────
   BRAND TOKENS  (same palette as manager review)
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

const RATING_LABELS = { 1: "Poor", 2: "Fair", 3: "Good", 4: "Very Good", 5: "Excellent" };

/* ─────────────────────────────────────────────
   STAR RATING
───────────────────────────────────────────── */
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
              background: "none", border: "none", cursor: "pointer", padding: 2,
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

/* ─────────────────────────────────────────────
   ADMIN CARD
───────────────────────────────────────────── */
function AdminCard({ admin, selected, onClick }) {
  const isSelected = selected?._id === admin._id;
  return (
    <button
      type="button"
      onClick={() => onClick(admin)}
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
          ? "linear-gradient(135deg,#F5E8EF 0%,#EDD5E3 100%)"
          : BRAND.darkSurface,
        transition: "all 0.2s",
        boxShadow: isSelected
          ? `0 0 0 3px ${BRAND.pink}22, 0 4px 24px #00000015`
          : "0 2px 8px #00000010",
        position: "relative",
        overflow: "hidden",
        width: "100%",
        boxSizing: "border-box",
      }}
    >
      {/* Top accent line when selected */}
      {isSelected && (
        <div style={{
          position: "absolute", top: 0, left: 0, right: 0, height: 2,
          background: `linear-gradient(90deg,${BRAND.maroon},${BRAND.pink})`,
        }} />
      )}

      {/* Avatar */}
      <div style={{
        width: 44, height: 44, borderRadius: "50%",
        background: isSelected
          ? `linear-gradient(135deg,${BRAND.maroon},${BRAND.pink})`
          : `linear-gradient(135deg,#C9829E,${BRAND.pink})`,
        display: "flex", alignItems: "center", justifyContent: "center",
        fontFamily: "'Playfair Display',Georgia,serif",
        fontWeight: 700, fontSize: 15, color: "#fff", flexShrink: 0,
        border: `1px solid ${isSelected ? BRAND.pink : BRAND.accentBorder}`,
      }}>
        {getInitials(admin)}
      </div>

      {/* Info */}
      <div style={{ textAlign: "left", minWidth: 0, flex: 1 }}>
        <p style={{
          margin: 0,
          fontFamily: "'Playfair Display',Georgia,serif",
          fontSize: 14, fontWeight: 600, color: BRAND.textPrimary,
          whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
        }}>
          {getFullName(admin)}
        </p>
        <p style={{ margin: "2px 0 0", fontSize: 12, color: BRAND.mutedText, letterSpacing: "0.03em" }}>
          {getEmail(admin)}
        </p>
        <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 3 }}>
          {admin.designation && (
            <span style={{ fontSize: 11, color: BRAND.pink, textTransform: "capitalize" }}>
              {admin.designation}
            </span>
          )}
          {/* Admin badge */}
          <span style={{
            fontSize: 10, fontWeight: 700, padding: "1px 7px", borderRadius: 10,
            background: isSelected ? `${BRAND.pink}22` : "#F5E8EF",
            color: BRAND.pink, letterSpacing: "0.05em",
          }}>
            Admin
          </span>
          {/* Status dot */}
          {admin.status && (
            <span style={{
              width: 6, height: 6, borderRadius: "50%", flexShrink: 0,
              background: admin.status === "active" ? "#22C55E" : "#9B8BAE",
            }} />
          )}
        </div>
      </div>

      {/* Checkmark when selected */}
      {isSelected && (
        <div style={{
          marginLeft: "auto", width: 20, height: 20, borderRadius: "50%",
          background: BRAND.pink, display: "flex", alignItems: "center",
          justifyContent: "center", flexShrink: 0,
        }}>
          <svg width="11" height="11" viewBox="0 0 12 12">
            <polyline points="2,6 5,9 10,3" fill="none" stroke="white"
              strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
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

  const [selected,  setSelected]  = useState(null);
  const [rating,    setRating]    = useState(0);
  const [comment,   setComment]   = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [search,    setSearch]    = useState("");

  const filtered = admins.filter((a) =>
    getFullName(a).toLowerCase().includes(search.toLowerCase()) ||
    getEmail(a).toLowerCase().includes(search.toLowerCase())
  );

  const canSubmit = selected && rating > 0 && comment.trim().length >= 10 && !isPending;

  const handleSubmit = () => {
    if (!canSubmit) return;
    submitReview(
      { adminid: selected._id, rating, comment },
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
    <div style={{
      minHeight: "100vh",
      background: BRAND.pageBackground,
      fontFamily: "'Inter','Helvetica Neue',sans-serif",
      padding: "48px 24px",
      display: "flex",
      justifyContent: "center",
    }}>
      <link
        href="https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;600;700&family=Inter:wght@300;400;500&display=swap"
        rel="stylesheet"
      />

      <div style={{ width: "100%", maxWidth: 960 }}>

        {/* ── Page Header ── */}
        <div style={{ marginBottom: 48, textAlign: "center" }}>
          <div style={{
            display: "inline-flex", alignItems: "center", gap: 6,
            padding: "4px 16px",
            border: `1px solid ${BRAND.accentBorder}`, borderRadius: 20,
            fontSize: 11, letterSpacing: "0.12em", textTransform: "uppercase",
            color: BRAND.pink, marginBottom: 16, background: BRAND.accentLight,
          }}>
            {/* Crown icon */}
            <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
              <path d="M1 8L2.5 3L5 6L7.5 2L9 8H1Z" fill={BRAND.pink} />
            </svg>
            Super Admin · Admin Review
          </div>

          <h1 style={{
            fontFamily: "'Playfair Display',Georgia,serif",
            fontSize: "clamp(28px,5vw,44px)", fontWeight: 700,
            color: BRAND.textPrimary, margin: "0 0 12px", letterSpacing: "-0.01em",
          }}>
            Review an Admin
          </h1>
          <p style={{
            fontSize: 15, color: BRAND.mutedText, margin: 0,
            maxWidth: 460, marginLeft: "auto", marginRight: "auto", lineHeight: 1.6,
          }}>
            Evaluate admins in your organisation. Your feedback helps shape
            leadership quality and operational excellence.
          </p>
        </div>

        {/* ── Success Toast ── */}
        {submitted && (
          <div style={{
            background: "linear-gradient(135deg,#EDD5E3,#F5E8EF)",
            border: `1px solid ${BRAND.pink}55`, borderRadius: 12,
            padding: "14px 20px", marginBottom: 28,
            display: "flex", alignItems: "center", gap: 12,
            color: BRAND.textPrimary, fontSize: 14,
          }}>
            <div style={{
              width: 22, height: 22, borderRadius: "50%", background: BRAND.pink,
              display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
            }}>
              <svg width="12" height="12" viewBox="0 0 12 12">
                <polyline points="2,6 5,9 10,3" fill="none" stroke="white"
                  strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
            Review submitted successfully. Thank you for your feedback.
          </div>
        )}

        {/* ── Submit Error ── */}
        {submitError && (
          <div style={{
            background: "#FFF0F0", border: "1px solid #cc3355", borderRadius: 12,
            padding: "14px 20px", marginBottom: 28, color: "#8B1A2A", fontSize: 14,
          }}>
            {submitError?.response?.data?.message ?? "Something went wrong. Please try again."}
          </div>
        )}

        {/* ── Two-column layout ── */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1.1fr", gap: 28, alignItems: "start" }}>

          {/* ── LEFT: Admin List ── */}
          <div style={{
            background: BRAND.darkSurface, borderRadius: 20,
            border: `1px solid ${BRAND.cardBorder}`, overflow: "hidden",
            boxShadow: "0 2px 16px #00000010",
          }}>
            <div style={{ padding: "20px 20px 14px", borderBottom: `1px solid ${BRAND.cardBorder}` }}>
              <div style={{
                display: "flex", justifyContent: "space-between", alignItems: "center",
                marginBottom: admins.length > 0 ? 12 : 0,
              }}>
                <p style={{
                  margin: 0, fontSize: 11, letterSpacing: "0.1em",
                  textTransform: "uppercase", color: BRAND.mutedText, fontWeight: 500,
                }}>
                  Your Admins
                </p>
                {admins.length > 0 && (
                  <span style={{
                    fontSize: 11, color: BRAND.pink,
                    background: `${BRAND.pink}15`, padding: "2px 10px", borderRadius: 20,
                  }}>
                    {admins.length} admin{admins.length !== 1 ? "s" : ""}
                  </span>
                )}
              </div>

              {/* Search — only when > 3 admins */}
              {admins.length > 3 && (
                <div style={{ position: "relative" }}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" style={{
                    position: "absolute", left: 10, top: "50%",
                    transform: "translateY(-50%)", pointerEvents: "none",
                  }}>
                    <circle cx="11" cy="11" r="8" stroke={BRAND.mutedText} strokeWidth="2" />
                    <path d="M21 21l-4.35-4.35" stroke={BRAND.mutedText} strokeWidth="2" strokeLinecap="round" />
                  </svg>
                  <input
                    type="text"
                    placeholder="Search admins…"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    style={{
                      width: "100%", boxSizing: "border-box",
                      background: BRAND.cardBg, border: `1px solid ${BRAND.cardBorder}`,
                      borderRadius: 10, padding: "8px 12px 8px 32px",
                      color: BRAND.textPrimary, fontSize: 13, outline: "none",
                      fontFamily: "'Inter',sans-serif",
                    }}
                  />
                </div>
              )}
            </div>

            {/* Admin list scroll area */}
            <div style={{
              padding: 14, display: "flex", flexDirection: "column", gap: 8,
              maxHeight: 480, overflowY: "auto",
            }}>
              {isLoading && (
                <div style={{
                  color: BRAND.mutedText, fontSize: 14, padding: "16px 8px",
                  display: "flex", alignItems: "center", gap: 8,
                }}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
                    style={{ animation: "spin 1s linear infinite" }}>
                    <circle cx="12" cy="12" r="10" stroke={BRAND.mutedText} strokeWidth="2" opacity="0.3" />
                    <path d="M12 2a10 10 0 0 1 10 10" stroke={BRAND.mutedText} strokeWidth="2" strokeLinecap="round" />
                  </svg>
                  Loading admins…
                </div>
              )}

              {isError && (
                <div style={{ padding: "12px 8px" }}>
                  <div style={{ color: "#8B1A2A", fontSize: 13, marginBottom: 6 }}>
                    {error?.response?.data?.message ?? error?.message ?? "Failed to load admins."}
                  </div>
                  <button
                    type="button"
                    onClick={() => refetch()}
                    style={{
                      all: "unset", cursor: "pointer", fontSize: 12,
                      color: BRAND.pink, border: `1px solid ${BRAND.pink}55`,
                      borderRadius: 8, padding: "6px 14px",
                      background: BRAND.accentLight,
                    }}
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
                <div style={{ color: BRAND.mutedText, fontSize: 13, padding: "12px 8px" }}>
                  No results for "{search}"
                </div>
              )}

              {!isLoading && !isError && admins.length === 0 && (
                <div style={{ color: BRAND.mutedText, fontSize: 14, padding: "16px 8px" }}>
                  No admins found in your organisation.
                </div>
              )}
            </div>
          </div>

          {/* ── RIGHT: Review Form ── */}
          <div style={{
            background: BRAND.darkSurface, borderRadius: 20,
            border: `1px solid ${BRAND.cardBorder}`, overflow: "hidden",
            boxShadow: "0 2px 16px #00000010",
          }}>
            <div style={{
              padding: "20px 24px 14px", borderBottom: `1px solid ${BRAND.cardBorder}`,
              display: "flex", justifyContent: "space-between", alignItems: "center",
            }}>
              <p style={{
                margin: 0, fontSize: 11, letterSpacing: "0.1em",
                textTransform: "uppercase", color: BRAND.mutedText, fontWeight: 500,
              }}>
                Your Review
              </p>
              {selected && (
                <span style={{
                  fontSize: 13, color: BRAND.pink,
                  fontFamily: "'Playfair Display',Georgia,serif", fontStyle: "italic",
                }}>
                  {getFullName(selected)}
                </span>
              )}
            </div>

            <div style={{ padding: "24px 24px 28px" }}>
              {!selected ? (
                /* Empty state */
                <div style={{
                  textAlign: "center", padding: "48px 20px",
                  color: BRAND.mutedText, fontSize: 14, lineHeight: 1.6,
                }}>
                  <div style={{
                    width: 60, height: 60, borderRadius: "50%",
                    background: BRAND.accentLight,
                    border: `1px dashed ${BRAND.accentBorder}`,
                    display: "flex", alignItems: "center", justifyContent: "center",
                    margin: "0 auto 18px",
                  }}>
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                      <circle cx="12" cy="8" r="4" stroke={BRAND.mutedText} strokeWidth="1.5" />
                      <path d="M4 20c0-4 3.6-7 8-7s8 3 8 7" stroke={BRAND.mutedText} strokeWidth="1.5" strokeLinecap="round" />
                      <path d="M16 3l1.5 1.5M19.5 6.5L21 8" stroke={BRAND.pink} strokeWidth="1.3" strokeLinecap="round" opacity="0.6" />
                    </svg>
                  </div>
                  Select an admin from the left<br />to begin your review.
                </div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 28 }}>

                  {/* Selected admin pill */}
                  <div style={{
                    display: "flex", alignItems: "center", gap: 12,
                    padding: "12px 14px", background: BRAND.accentLight,
                    borderRadius: 12, border: `1px solid ${BRAND.accentBorder}`,
                  }}>
                    <div style={{
                      width: 40, height: 40, borderRadius: "50%",
                      background: `linear-gradient(135deg,${BRAND.maroon},${BRAND.pink})`,
                      display: "flex", alignItems: "center", justifyContent: "center",
                      fontSize: 13, fontWeight: 700, color: "#fff",
                      fontFamily: "'Playfair Display',Georgia,serif", flexShrink: 0,
                    }}>
                      {getInitials(selected)}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ margin: 0, fontSize: 14, fontWeight: 500, color: BRAND.textPrimary }}>
                        {getFullName(selected)}
                      </p>
                      <p style={{ margin: "2px 0 0", fontSize: 11, color: BRAND.mutedText }}>
                        {selected.designation || "Admin"} · {getEmail(selected)}
                      </p>
                    </div>
                    {/* Admin crown badge */}
                    <div style={{
                      padding: "3px 10px", borderRadius: 10, fontSize: 10, fontWeight: 700,
                      background: `linear-gradient(135deg,${BRAND.maroon},${BRAND.pink})`,
                      color: "#fff", letterSpacing: "0.05em", flexShrink: 0,
                      display: "flex", alignItems: "center", gap: 4,
                    }}>
                      <svg width="8" height="8" viewBox="0 0 10 10" fill="none">
                        <path d="M1 8L2.5 3L5 6L7.5 2L9 8H1Z" fill="rgba(255,255,255,0.9)" />
                      </svg>
                      Admin
                    </div>
                  </div>

                  {/* Rating */}
                  <div>
                    <label style={{
                      display: "block", fontSize: 12, letterSpacing: "0.08em",
                      textTransform: "uppercase", color: BRAND.mutedText,
                      marginBottom: 12, fontWeight: 500,
                    }}>
                      Rating
                    </label>
                    <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
                      <StarRating value={rating} onChange={setRating} />
                      {rating > 0 && (
                        <span style={{
                          fontSize: 13, color: BRAND.pink,
                          fontFamily: "'Playfair Display',Georgia,serif", fontStyle: "italic",
                        }}>
                          {RATING_LABELS[rating]}
                        </span>
                      )}
                    </div>
                    {/* Progress bar */}
                    {rating > 0 && (
                      <div style={{ display: "flex", gap: 4, marginTop: 12 }}>
                        {[1, 2, 3, 4, 5].map((i) => (
                          <div key={i} style={{
                            flex: 1, height: 3, borderRadius: 4,
                            background: i <= rating ? BRAND.pink : BRAND.cardBorder,
                            transition: "background 0.2s",
                          }} />
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Comment */}
                  <div>
                    <label style={{
                      display: "block", fontSize: 12, letterSpacing: "0.08em",
                      textTransform: "uppercase", color: BRAND.mutedText,
                      marginBottom: 12, fontWeight: 500,
                    }}>
                      Feedback
                    </label>
                    <textarea
                      rows={5}
                      value={comment}
                      onChange={(e) => setComment(e.target.value)}
                      placeholder="Describe this admin's leadership, responsiveness, team management, and areas for improvement…"
                      style={{
                        width: "100%",
                        background: BRAND.cardBg,
                        border: `1px solid ${comment.length > 0 ? BRAND.pink + "66" : BRAND.cardBorder}`,
                        borderRadius: 12, padding: "14px 16px",
                        color: BRAND.textPrimary, fontSize: 14, lineHeight: 1.6,
                        resize: "vertical", outline: "none",
                        fontFamily: "'Inter',sans-serif",
                        boxSizing: "border-box", transition: "border-color 0.2s",
                      }}
                    />
                    <div style={{
                      marginTop: 6, fontSize: 11,
                      color: comment.trim().length < 10 ? BRAND.mutedText : BRAND.pink,
                      textAlign: "right", transition: "color 0.2s",
                    }}>
                      {comment.trim().length} / 10 min chars
                    </div>
                  </div>

                  {/* Monthly note */}
                  <div style={{
                    display: "flex", alignItems: "flex-start", gap: 10,
                    padding: "10px 14px", borderRadius: 10,
                    background: "#FFFBEB", border: "1px solid #F0D89A",
                    fontSize: 12, color: "#7A5C1A", lineHeight: 1.6,
                  }}>
                    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" style={{ marginTop: 1, flexShrink: 0 }}>
                      <path d="M7 3v4M7 9v.5" stroke="#F59E0B" strokeWidth="1.5" strokeLinecap="round" />
                      <circle cx="7" cy="7" r="5.5" stroke="#F59E0B" strokeWidth="1.2" />
                    </svg>
                    You can submit one review per admin per month. Make it count.
                  </div>

                  <div style={{ height: 1, background: BRAND.cardBorder }} />

                  {/* Submit button */}
                  <button
                    type="button"
                    onClick={handleSubmit}
                    disabled={!canSubmit}
                    style={{
                      all: "unset",
                      cursor: canSubmit ? "pointer" : "not-allowed",
                      display: "flex", alignItems: "center",
                      justifyContent: "center", gap: 10,
                      padding: "14px 28px", borderRadius: 12,
                      background: canSubmit
                        ? `linear-gradient(135deg,${BRAND.maroon} 0%,${BRAND.pink} 100%)`
                        : BRAND.cardBg,
                      color: canSubmit ? "#fff" : BRAND.mutedText,
                      fontSize: 14, fontWeight: 500, letterSpacing: "0.02em",
                      transition: "all 0.2s", opacity: canSubmit ? 1 : 0.6,
                      boxShadow: canSubmit ? "0 4px 16px rgba(91,14,48,0.3)" : "none",
                    }}
                  >
                    {isPending ? (
                      <>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
                          style={{ animation: "spin 1s linear infinite" }}>
                          <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" opacity="0.3" />
                          <path d="M12 2a10 10 0 0 1 10 10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                        </svg>
                        Submitting…
                      </>
                    ) : (
                      <>
                        Submit Review
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                          <path d="M5 12h14M12 5l7 7-7 7" stroke="currentColor"
                            strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
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
        textarea::placeholder { color: ${BRAND.mutedText}; }
        textarea:focus        { border-color: ${BRAND.pink} !important; }
        input::placeholder    { color: ${BRAND.mutedText}; }
        input:focus           { border-color: ${BRAND.pink} !important; outline: none; }
        button:not([disabled]):hover { filter: brightness(1.05); }
        ::-webkit-scrollbar       { width: 4px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: ${BRAND.cardBorder}; border-radius: 4px; }
      `}</style>
    </div>
  );
}