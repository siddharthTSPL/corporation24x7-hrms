import { useState } from "react";
import {
  useManagerAnnouncements,
  useParticularAnnouncement,
} from "../../auth/server-state/manager/managerannounce/managerannounce.hook";

/* ── COLOR PALETTE ─────────────────────────── */
const C = {
  deep:    "#730042",
  mid:     "#CD166E",
  cream:   "#F9F8F2",
  white:   "#ffffff",
  deepA10: "rgba(115,0,66,0.10)",
  deepA15: "rgba(115,0,66,0.15)",
  deepA25: "rgba(115,0,66,0.25)",
  deepA45: "rgba(115,0,66,0.45)",
  deepA55: "rgba(115,0,66,0.55)",
  midA10:  "rgba(205,22,110,0.10)",
  midA20:  "rgba(205,22,110,0.20)",
  midA25:  "rgba(205,22,110,0.25)",
};

/* ── FONTS & ANIMATIONS ────────────────────── */
const FontInjector = () => (
  <style>{`
    * { -webkit-font-smoothing: antialiased; -moz-osx-font-smoothing: grayscale; }
    @keyframes blink  { 0%,100%{opacity:1} 50%{opacity:.25} }
    @keyframes fadeUp { from{opacity:0;transform:translateY(16px)} to{opacity:1;transform:none} }
    @keyframes spin   { to{transform:rotate(360deg)} }
    .ann-card-hover:hover { border-color: rgba(205,22,110,0.45) !important; transform: translateY(-3px); }
    .read-more-btn:hover  { color: #730042 !important; }
    .filter-btn:hover     { background: rgba(115,0,66,0.08) !important; }
  `}</style>
);

/* ── HELPERS ───────────────────────────────── */
const fmtDate = (d) => {
  if (!d) return "";
  return new Date(d).toLocaleDateString("en-IN", {
    day: "2-digit", month: "long", year: "numeric",
  });
};
const fmtTime = (d) => {
  if (!d) return "";
  return new Date(d).toLocaleTimeString("en-IN", {
    hour: "2-digit", minute: "2-digit",
  });
};
const excerpt = (text, len = 130) => {
  if (!text) return "";
  return text.length > len ? text.slice(0, len).trimEnd() + "…" : text;
};

/* ── PRIORITY PILL ─────────────────────────── */
const PRIORITY_STYLES = {
  high:   { label: "Urgent",  bg: C.midA10,  border: C.midA25,  color: C.deep },
  medium: { label: "Info",    bg: C.deepA10, border: C.deepA15, color: C.deep },
  low:    { label: "General", bg: "rgba(249,248,242,0.9)", border: C.deepA15, color: C.deep },
};

const PriorityPill = ({ priority }) => {
  const s = PRIORITY_STYLES[(priority || "low").toLowerCase()] || PRIORITY_STYLES.low;
  return (
    <span style={{
      display: "inline-flex", alignItems: "center",
      padding: "3px 10px", borderRadius: 99,
      fontSize: 10, fontWeight: 500, letterSpacing: ".1em",
      textTransform: "uppercase", fontFamily: "'Segoe UI', sans-serif",
      background: s.bg, border: `1px solid ${s.border}`, color: s.color,
    }}>
      {s.label}
    </span>
  );
};

/* ── AUDIENCE PILL ─────────────────────────── */
const AudiencePill = ({ audience }) => {
  const isManagers = (audience || "").toLowerCase() === "managers";
  return (
    <span style={{
      display: "inline-flex", alignItems: "center",
      padding: "3px 10px", borderRadius: 99,
      fontSize: 10, fontWeight: 500, letterSpacing: ".1em",
      textTransform: "uppercase", fontFamily: "'Segoe UI', sans-serif",
      background: isManagers ? C.midA10 : C.deepA10,
      border: `1px solid ${isManagers ? C.midA25 : C.deepA15}`,
      color: C.deep,
    }}>
      {isManagers ? "Managers" : "All Staff"}
    </span>
  );
};

/* ── DETAIL MODAL ──────────────────────────── */
const DetailModal = ({ id, onClose }) => {
  const { data, isLoading, error } = useParticularAnnouncement(id);
  const ann = data?.announcement;

  return (
    <div
      onClick={(e) => e.target === e.currentTarget && onClose()}
      style={{
        position: "fixed", inset: 0, zIndex: 9999,
        background: "rgba(115,0,66,0.18)",
        display: "flex", alignItems: "center", justifyContent: "center",
        padding: 20, backdropFilter: "blur(4px)",
      }}
    >
      <div style={{
        background: C.cream, borderRadius: 20,
        border: `.5px solid ${C.midA25}`,
        width: "100%", maxWidth: 600,
        maxHeight: "88vh", overflowY: "auto",
        fontFamily: "'Segoe UI', sans-serif",
        boxShadow: "0 24px 48px rgba(115,0,66,0.12)",
      }}>
        {/* Modal header */}
        <div style={{
          background: C.white, padding: "18px 24px",
          borderBottom: `.5px solid ${C.deepA10}`,
          display: "flex", alignItems: "center", justifyContent: "space-between",
          borderRadius: "20px 20px 0 0",
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{
              width: 32, height: 32, borderRadius: 9,
              background: C.midA10, border: `.5px solid ${C.midA25}`,
              display: "flex", alignItems: "center", justifyContent: "center",
            }}>
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none"
                stroke={C.mid} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M22 12h-4l-3 9L9 3l-3 9H2"/>
              </svg>
            </div>
            <span style={{
              fontSize: 11, fontWeight: 500, letterSpacing: ".14em",
              textTransform: "uppercase", color: C.deep,
            }}>
              Announcement detail
            </span>
          </div>
          <button
            onClick={onClose}
            style={{
              width: 30, height: 30, borderRadius: 8,
              background: C.deepA10, border: "none", cursor: "pointer",
              color: C.deep, fontSize: 16, display: "flex",
              alignItems: "center", justifyContent: "center",
              transition: "background .2s",
            }}
            onMouseEnter={(e) => e.currentTarget.style.background = C.deepA15}
            onMouseLeave={(e) => e.currentTarget.style.background = C.deepA10}
          >✕</button>
        </div>

        {/* Modal body */}
        <div style={{ padding: "28px 28px 32px" }}>
          {isLoading ? (
            <div style={{ textAlign: "center", padding: "48px 0" }}>
              <div style={{
                width: 36, height: 36,
                border: `3px solid ${C.deepA10}`,
                borderTopColor: C.mid, borderRadius: "50%",
                animation: "spin 0.8s linear infinite",
                margin: "0 auto 12px",
              }} />
              <p style={{ color: C.deepA45, fontSize: 13, margin: 0 }}>Loading…</p>
            </div>
          ) : error || !ann ? (
            <p style={{ color: C.deepA45, textAlign: "center", padding: "32px 0" }}>
              Announcement not found.
            </p>
          ) : (
            <>
              <div style={{
                display: "flex", alignItems: "center",
                gap: 10, flexWrap: "wrap", marginBottom: 16,
              }}>
                {ann.priority && <PriorityPill priority={ann.priority} />}
                {ann.audience && <AudiencePill audience={ann.audience} />}
                <span style={{ marginLeft: "auto", fontSize: 11, color: C.deepA45 }}>
                  {fmtDate(ann.createdAt)} · {fmtTime(ann.createdAt)}
                </span>
              </div>

              <h2 style={{
                fontFamily: "'Segoe UI', sans-serif",
                fontSize: 28, fontWeight: 600, color: C.deep,
                lineHeight: 1.3, margin: 0, letterSpacing: "-0.3px",
              }}>
                {ann.title}
              </h2>

              <div style={{ height: .5, background: C.midA20, margin: "18px 0 22px" }} />

              <p style={{ fontSize: 15, color: C.deepA55, lineHeight: 1.85, margin: 0 }}>
                {ann.body || ann.content || ann.message || ann.description || "No content available."}
              </p>

              {ann.expiresAt && (
                <div style={{
                  marginTop: 20, padding: "12px 16px",
                  background: C.deepA10, borderRadius: 10,
                  border: `.5px solid ${C.deepA15}`,
                  display: "flex", alignItems: "center", gap: 8,
                }}>
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none"
                    stroke={C.deep} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/>
                  </svg>
                  <span style={{ fontSize: 12, color: C.deep }}>
                    Expires {fmtDate(ann.expiresAt)}
                  </span>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};

/* ── CARD ──────────────────────────────────── */
const AnnCard = ({ ann, index, onClick }) => {
  const isFeatured = index === 0;

  return (
    <div
      onClick={() => onClick(ann._id)}
      className="ann-card-hover"
      style={{
        background: C.white,
        border: `.5px solid ${C.deepA15}`,
        borderRadius: 16,
        padding: isFeatured ? "30px 28px 24px" : "22px 22px 20px",
        cursor: "pointer",
        transition: "border-color .2s, transform .2s",
        gridColumn: isFeatured ? "span 2" : "span 1",
        position: "relative",
        overflow: "hidden",
        animation: `fadeUp 0.4s ease both`,
        animationDelay: `${index * 0.06}s`,
        fontFamily: "'Segoe UI', sans-serif",
      }}
    >
      {isFeatured && (
        <div style={{
          position: "absolute", top: 0, left: 0, right: 0,
          height: 2, background: C.mid,
        }} />
      )}

      <div style={{
        display: "flex", alignItems: "center",
        justifyContent: "space-between", gap: 8,
        marginBottom: 14, flexWrap: "wrap",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
          {ann.priority && <PriorityPill priority={ann.priority} />}
          {ann.audience && <AudiencePill audience={ann.audience} />}
          {isFeatured && (
            <span style={{
              fontSize: 10, fontWeight: 500, color: C.mid,
              letterSpacing: ".14em", textTransform: "uppercase",
              display: "flex", alignItems: "center", gap: 4,
            }}>
              <svg width="8" height="8" viewBox="0 0 10 10" fill={C.mid}><circle cx="5" cy="5" r="5"/></svg>
              Featured
            </span>
          )}
        </div>
        <span style={{ fontSize: 11, color: C.deepA45, letterSpacing: ".03em" }}>
          {fmtDate(ann.createdAt)}
        </span>
      </div>

      <h3 style={{
        fontFamily: "'Segoe UI', sans-serif",
        fontSize: isFeatured ? 22 : 17, fontWeight: 600,
        color: C.deep, lineHeight: 1.3, marginBottom: 10,
        letterSpacing: "-0.2px",
      }}>
        {ann.title || "Untitled Announcement"}
      </h3>

      <p style={{
        fontSize: 13.5, color: C.deepA55, lineHeight: 1.75, marginBottom: 18,
      }}>
        {excerpt(ann.body || ann.content || ann.message || ann.description, isFeatured ? 200 : 100)}
      </p>

      <div style={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
        paddingTop: 14, borderTop: `.5px solid ${C.deepA10}`,
      }}>
        {ann.expiresAt && (
          <span style={{ fontSize: 10.5, color: C.deepA45, letterSpacing: ".06em" }}>
            Expires {fmtDate(ann.expiresAt)}
          </span>
        )}
        <span
          className="read-more-btn"
          style={{
            marginLeft: "auto", fontSize: 11.5, fontWeight: 500,
            color: C.mid, letterSpacing: ".06em", textTransform: "uppercase",
            display: "flex", alignItems: "center", gap: 3,
            transition: "color .15s",
          }}
        >
          Read more ›
        </span>
      </div>
    </div>
  );
};

/* ── MAIN ──────────────────────────────────── */
const Announcema = () => {
  const { data, isLoading, isError: error } = useManagerAnnouncements();
  const [selectedId, setSelectedId] = useState(null);
  const [filter, setFilter] = useState("all");

  const allAnnouncements = data || [];

  const filtered = allAnnouncements
    .filter((ann) => {
      if (filter === "high")     return (ann.priority || "").toLowerCase() === "high";
      if (filter === "managers") return (ann.audience || "").toLowerCase() === "managers";
      return true;
    })
    .sort((a, b) => {
      const order = { high: 0, medium: 1, low: 2 };
      const ap = order[(a.priority || "low").toLowerCase()] ?? 2;
      const bp = order[(b.priority || "low").toLowerCase()] ?? 2;
      if (ap !== bp) return ap - bp;
      return new Date(b.createdAt) - new Date(a.createdAt);
    });

  const urgentCount   = allAnnouncements.filter((a) => (a.priority || "").toLowerCase() === "high").length;
  const managersCount = allAnnouncements.filter((a) => (a.audience || "").toLowerCase() === "managers").length;

  const FILTERS = [
    { id: "all",      label: `All`,           count: allAnnouncements.length },
    { id: "high",     label: `Urgent`,        count: urgentCount },
    { id: "managers", label: `Managers only`, count: managersCount },
  ];

  return (
    <div style={{
      background: C.cream, minHeight: "100vh",
      fontFamily: "'Segoe UI', sans-serif",
    }}>
      <FontInjector />

      <div style={{ maxWidth: 1100, margin: "0 auto", padding: "40px 24px" }}>

        {/* Eyebrow */}
        <div style={{
          display: "flex", alignItems: "center", gap: 10,
          marginBottom: "1.25rem", animation: "fadeUp .45s ease both",
        }}>
          <div style={{ width: 32, height: 1, background: C.deep }} />
          <span style={{
            fontSize: 11, fontWeight: 500, letterSpacing: ".18em",
            textTransform: "uppercase", color: C.deep,
          }}>
            Company Bulletin
          </span>
          <div style={{
            marginLeft: "auto", display: "flex", alignItems: "center", gap: 6,
            background: C.deepA10, border: `1px solid ${C.deepA25}`,
            padding: "4px 11px", borderRadius: 99,
          }}>
            <div style={{
              width: 6, height: 6, borderRadius: "50%", background: C.mid,
              animation: "blink 1.8s ease-in-out infinite",
            }} />
            <span style={{
              fontSize: 10, fontWeight: 500, letterSpacing: ".14em",
              textTransform: "uppercase", color: C.deep,
            }}>
              Live
            </span>
          </div>
        </div>

        {/* Title */}
        <h1 style={{
          fontFamily: "'Segoe UI', sans-serif",
          fontSize: 48, fontWeight: 600, color: C.deep,
          letterSpacing: "-1px", lineHeight: 1.1,
          margin: "0 0 .35rem", animation: "fadeUp .5s ease both",
        }}>
          Announce<span style={{ fontWeight: 600, color: C.mid }}>ments</span>
        </h1>

        {/* Rule + filters */}
        <div style={{
          display: "flex", alignItems: "center", gap: 14,
          margin: "1.25rem 0 2rem", animation: "fadeUp .55s ease both",
          flexWrap: "wrap",
        }}>
          <div style={{ flex: 1, height: .5, background: C.deepA25, minWidth: 40 }} />

          {/* Filter pills */}
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
            {FILTERS.map((f) => (
              <button
                key={f.id}
                className="filter-btn"
                onClick={() => setFilter(f.id)}
                style={{
                  padding: "5px 14px", borderRadius: 99, cursor: "pointer",
                  fontSize: 11, fontWeight: 500, letterSpacing: ".08em",
                  textTransform: "uppercase", transition: "all .2s",
                  background: filter === f.id ? C.deep : "transparent",
                  color:      filter === f.id ? C.white : C.deepA45,
                  border: `1px solid ${filter === f.id ? C.deep : C.deepA25}`,
                }}
              >
                {f.label} · {f.count}
              </button>
            ))}
          </div>

          <div style={{ flex: 1, height: .5, background: C.deepA25, minWidth: 40 }} />
        </div>

        {/* Loading */}
        {isLoading && (
          <div style={{
            display: "flex", flexDirection: "column",
            alignItems: "center", justifyContent: "center",
            padding: "80px 0", gap: 16,
          }}>
            <div style={{
              width: 38, height: 38,
              border: `3px solid ${C.deepA10}`,
              borderTopColor: C.mid, borderRadius: "50%",
              animation: "spin .8s linear infinite",
            }} />
            <p style={{ color: C.deepA45, fontSize: 13, margin: 0 }}>
              Loading announcements…
            </p>
          </div>
        )}

        {/* Error */}
        {error && (
          <div style={{ textAlign: "center", padding: "64px 0" }}>
            <p style={{ color: C.mid, fontWeight: 500, fontSize: 15, margin: "0 0 6px" }}>
              Failed to load announcements
            </p>
            <p style={{ color: C.deepA45, fontSize: 13, margin: 0 }}>
              Please try refreshing the page.
            </p>
          </div>
        )}

        {/* Empty */}
        {!isLoading && !error && filtered.length === 0 && (
          <div style={{ textAlign: "center", padding: "5rem 1rem" }}>
            <div style={{
              width: 60, height: 60, borderRadius: "50%",
              border: `1.5px solid ${C.midA25}`,
              display: "flex", alignItems: "center", justifyContent: "center",
              margin: "0 auto 1.25rem",
            }}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none"
                stroke={C.mid} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M22 12h-4l-3 9L9 3l-3 9H2"/>
              </svg>
            </div>
            <h3 style={{
              fontFamily: "'Segoe UI', sans-serif",
              fontSize: 24, fontWeight: 600,
              color: C.deep, marginBottom: ".5rem",
            }}>
              Nothing yet
            </h3>
            <p style={{ fontSize: 13, color: C.deepA45, margin: 0 }}>
              {filter !== "all" ? "Try a different filter." : "New announcements will appear here."}
            </p>
          </div>
        )}

        {/* Grid */}
        {!isLoading && filtered.length > 0 && (
          <div style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(290px, 1fr))",
            gap: 14,
          }}>
            {filtered.map((ann, i) => (
              <AnnCard key={ann._id} ann={ann} index={i} onClick={setSelectedId} />
            ))}
          </div>
        )}
      </div>

      {selectedId && (
        <DetailModal id={selectedId} onClose={() => setSelectedId(null)} />
      )}
    </div>
  );
};

export default Announcema;