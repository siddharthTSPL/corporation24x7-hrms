import { useState } from "react";
import {
  useGetAllPersonalDocuments,
  useGetDocumentDetails,
} from "../../auth/server-state/manager/managgerother/managerother.hook";

// ─── DESIGN TOKENS ────────────────────────────────────────────────────────
const C = {
  brand:      "#730042",
  brandLight: "rgba(115,0,66,0.08)",
  brandMid:   "rgba(115,0,66,0.15)",
  green:      "#1D9E75",
  greenBg:    "#e8f5e9",
  blue:       "#378ADD",
  blueBg:     "#e6f1fb",
  amber:      "#BA7517",
  amberBg:    "#faeeda",
  red:        "#E24B4A",
  redBg:      "#fcebeb",
  surface:    "#ffffff",
  page:       "#f9f8f2",
  border:     "#ede5e0",
  text:       "#2a1a16",
  muted:      "#b0948a",
  mutedMid:   "#c9bab5",
};

// ─── UTILS ────────────────────────────────────────────────────────────────
function fmtDate(iso) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-IN", {
    day: "numeric", month: "short", year: "numeric",
  });
}

function fmtSize(kb) {
  if (!kb) return "—";
  return kb >= 1024 ? `${(kb / 1024).toFixed(1)} MB` : `${kb} KB`;
}

function getInitials(name = "") {
  return name.split(" ").map(w => w[0] || "").join("").toUpperCase().slice(0, 2);
}

// ─── SPINNER ──────────────────────────────────────────────────────────────
function Spinner({ size = 28, color = C.brand }) {
  return (
    <div style={{
      width: size, height: size, borderRadius: "50%",
      border: `2px solid ${color}33`,
      borderTop: `2px solid ${color}`,
      animation: "spin 0.7s linear infinite",
      flexShrink: 0,
    }} />
  );
}

// ─── BADGE ────────────────────────────────────────────────────────────────
function Badge({ children, color = C.brand, bg = C.brandLight }) {
  return (
    <span style={{
      display: "inline-flex", alignItems: "center",
      padding: "2px 10px", borderRadius: 20,
      fontSize: 11, fontWeight: 500, color, background: bg,
    }}>
      {children}
    </span>
  );
}

// ─── EMPTY STATE ──────────────────────────────────────────────────────────
function EmptyState({ message }) {
  return (
    <div style={{
      display: "flex", flexDirection: "column", alignItems: "center",
      justifyContent: "center", padding: "60px 24px", gap: 14,
    }}>
      <div style={{
        width: 56, height: 56, borderRadius: "50%",
        background: C.brandLight,
        display: "flex", alignItems: "center", justifyContent: "center",
      }}>
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"
            stroke={C.brand} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          <polyline points="14 2 14 8 20 8"
            stroke={C.brand} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </div>
      <div style={{ fontSize: 14, fontWeight: 500, color: C.text }}>No documents found</div>
      <div style={{ fontSize: 12, color: C.muted }}>{message}</div>
    </div>
  );
}

// ─── DOCUMENT DETAIL DRAWER ───────────────────────────────────────────────
function DetailDrawer({ documentId, onClose }) {
  const { data, isLoading, isError } = useGetDocumentDetails(documentId);
  const doc = data?.document;

  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 50,
      display: "flex", justifyContent: "flex-end",
    }}>
      {/* Backdrop */}
      <div
        onClick={onClose}
        style={{ position: "absolute", inset: 0, background: "rgba(42,26,22,0.35)" }}
      />
      {/* Panel */}
      <div style={{
        position: "relative", width: 420, height: "100%",
        background: C.surface, overflowY: "auto",
        display: "flex", flexDirection: "column",
        boxShadow: "-4px 0 32px rgba(115,0,66,0.10)",
      }}>
        {/* Header */}
        <div style={{
          padding: "20px 24px", borderBottom: `0.5px solid ${C.border}`,
          display: "flex", alignItems: "center", justifyContent: "space-between",
          position: "sticky", top: 0, background: C.surface, zIndex: 1,
        }}>
          <div>
            <div style={{ fontSize: 15, fontWeight: 500, color: C.text }}>Document details</div>
            <div style={{ fontSize: 12, color: C.muted, marginTop: 2 }}>Personal document</div>
          </div>
          <button onClick={onClose} style={{
            background: "none", border: `0.5px solid ${C.border}`,
            borderRadius: 8, cursor: "pointer", padding: "6px 10px",
            color: C.muted, fontSize: 18, lineHeight: 1,
          }}>×</button>
        </div>

        {/* Body */}
        <div style={{ flex: 1, padding: "24px" }}>
          {isLoading && (
            <div style={{ display: "flex", justifyContent: "center", paddingTop: 60 }}>
              <Spinner />
            </div>
          )}
          {isError && (
            <div style={{
              padding: "14px 16px", background: C.redBg,
              borderRadius: 10, fontSize: 13, color: C.red,
            }}>
              Failed to load document details.
            </div>
          )}
          {doc && (
            <>
              {/* File preview card */}
              <div style={{
                background: C.brandLight, borderRadius: 14,
                padding: "24px", marginBottom: 20,
                display: "flex", flexDirection: "column", alignItems: "center", gap: 12,
                border: `0.5px solid ${C.brandMid}`,
              }}>
                <div style={{
                  width: 56, height: 56, borderRadius: 14,
                  background: C.brand,
                  display: "flex", alignItems: "center", justifyContent: "center",
                }}>
                  <svg width="26" height="26" viewBox="0 0 24 24" fill="none">
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"
                      stroke="#fff" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
                    <polyline points="14 2 14 8 20 8"
                      stroke="#fff" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </div>
                <div style={{ textAlign: "center" }}>
                  <div style={{ fontSize: 14, fontWeight: 500, color: C.text, marginBottom: 4 }}>
                    {doc.title}
                  </div>
                  <Badge color={C.brand} bg={C.brandLight}>Personal</Badge>
                </div>
                <a
                  href={doc.fileUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    display: "inline-flex", alignItems: "center", gap: 6,
                    padding: "9px 18px", background: C.brand, color: "#fff",
                    borderRadius: 9, fontSize: 13, fontWeight: 500,
                    textDecoration: "none", marginTop: 4,
                  }}
                >
                  <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                    <path d="M7 1v8M4 6l3 3 3-3M2 11h10" stroke="#fff" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                  Open / Download
                </a>
              </div>

              {/* Meta rows */}
              {[
                ["File size",    fmtSize(doc.sizeKB)],
                ["Uploaded on",  fmtDate(doc.uploadedAt)],
                ["Viewed",       doc.viewedByManager ? "✓ Viewed by you" : "Not viewed yet"],
              ].map(([label, val]) => (
                <div key={label} style={{
                  display: "flex", justifyContent: "space-between",
                  padding: "12px 0", borderBottom: `0.5px solid ${C.border}`,
                  fontSize: 13,
                }}>
                  <span style={{ color: C.muted }}>{label}</span>
                  <span style={{ color: C.text, fontWeight: 500 }}>{val}</span>
                </div>
              ))}

              {/* Employee card */}
              <div style={{
                marginTop: 24, background: C.page,
                borderRadius: 12, padding: "16px",
                border: `0.5px solid ${C.border}`,
              }}>
                <div style={{ fontSize: 12, fontWeight: 500, color: C.muted, marginBottom: 12 }}>
                  Uploaded by
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <div style={{
                    width: 40, height: 40, borderRadius: "50%",
                    background: C.brand,
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontSize: 14, fontWeight: 500, color: "#fff", flexShrink: 0,
                  }}>
                    {getInitials(doc.employee.name)}
                  </div>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 500, color: C.text }}>
                      {doc.employee.name}
                    </div>
                    <div style={{ fontSize: 12, color: C.muted, marginTop: 2 }}>
                      {doc.employee.email}
                    </div>
                    <div style={{ fontSize: 12, color: C.muted, marginTop: 1 }}>
                      {doc.employee.contact}
                    </div>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── DOCUMENT CARD ────────────────────────────────────────────────────────
function DocCard({ doc, onClick }) {
  return (
    <div
      onClick={onClick}
      style={{
        background: C.surface, borderRadius: 14,
        border: `0.5px solid ${C.border}`,
        padding: "18px 20px", cursor: "pointer",
        transition: "border-color 0.15s, box-shadow 0.15s",
        position: "relative", overflow: "hidden",
      }}
      onMouseEnter={e => {
        e.currentTarget.style.borderColor = C.brand;
        e.currentTarget.style.boxShadow = `0 0 0 3px ${C.brandLight}`;
      }}
      onMouseLeave={e => {
        e.currentTarget.style.borderColor = C.border;
        e.currentTarget.style.boxShadow = "none";
      }}
    >
      {/* Accent top bar */}
      <div style={{
        position: "absolute", top: 0, left: 0, right: 0, height: 3,
        background: C.brand, borderRadius: "14px 14px 0 0",
      }} />

      <div style={{ display: "flex", alignItems: "flex-start", gap: 14 }}>
        {/* File icon */}
        <div style={{
          width: 44, height: 44, borderRadius: 11,
          background: C.brandLight, flexShrink: 0,
          display: "flex", alignItems: "center", justifyContent: "center",
        }}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"
              stroke={C.brand} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
            <polyline points="14 2 14 8 20 8"
              stroke={C.brand} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>

        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{
            fontSize: 13, fontWeight: 500, color: C.text,
            marginBottom: 4, overflow: "hidden",
            textOverflow: "ellipsis", whiteSpace: "nowrap",
          }}>
            {doc.title}
          </div>
          <div style={{ fontSize: 12, color: C.muted, marginBottom: 10 }}>
            {doc.employee.name} · {doc.employee.email}
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
            <Badge color={C.brand} bg={C.brandLight}>Personal</Badge>
            {!doc.viewedByManager && (
              <Badge color={C.amber} bg={C.amberBg}>New</Badge>
            )}
            <span style={{ fontSize: 11, color: C.mutedMid }}>
              {fmtSize(doc.sizeKB)} · {fmtDate(doc.uploadedAt)}
            </span>
          </div>
        </div>

        {/* Arrow */}
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" style={{ flexShrink: 0, marginTop: 2 }}>
          <path d="M6 4l4 4-4 4" stroke={C.mutedMid} strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </div>
    </div>
  );
}

// ─── MAIN PAGE ────────────────────────────────────────────────────────────
export default function Docma() {
  const { data, isLoading, isError, error } = useGetAllPersonalDocuments();
  const [selectedId, setSelectedId] = useState(null);
  const [search, setSearch] = useState("");

  const docs = data?.documents ?? [];

  const filtered = docs.filter(d =>
    d.title.toLowerCase().includes(search.toLowerCase()) ||
    d.employee.name.toLowerCase().includes(search.toLowerCase()) ||
    d.employee.email.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div style={{
      fontFamily: "'DM Sans','Segoe UI',sans-serif",
      background: C.page, minHeight: "100vh",
      padding: "28px 32px", color: C.text,
    }}>
      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>

      {/* Header */}
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 22, fontWeight: 500, margin: 0, letterSpacing: "-0.3px" }}>
          Personal Documents
        </h1>
        <p style={{ fontSize: 13, color: C.muted, marginTop: 4 }}>
          Documents submitted by your team members
        </p>
      </div>

      {/* Stats + Search row */}
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 20, flexWrap: "wrap" }}>
        <div style={{
          background: C.surface, borderRadius: 12,
          border: `0.5px solid ${C.border}`,
          padding: "10px 16px", display: "flex", alignItems: "center", gap: 10,
        }}>
          <div style={{ width: 8, height: 8, borderRadius: "50%", background: C.brand }} />
          <span style={{ fontSize: 13, color: C.muted }}>Total</span>
          <span style={{ fontSize: 14, fontWeight: 500, color: C.text }}>{data?.total ?? 0}</span>
        </div>

        <div style={{
          background: C.surface, borderRadius: 12,
          border: `0.5px solid ${C.border}`,
          padding: "10px 16px", display: "flex", alignItems: "center", gap: 10,
        }}>
          <div style={{ width: 8, height: 8, borderRadius: "50%", background: C.amber }} />
          <span style={{ fontSize: 13, color: C.muted }}>Unviewed</span>
          <span style={{ fontSize: 14, fontWeight: 500, color: C.text }}>
            {docs.filter(d => !d.viewedByManager).length}
          </span>
        </div>

        {/* Search */}
        <div style={{ marginLeft: "auto", position: "relative" }}>
          <svg width="15" height="15" viewBox="0 0 15 15" fill="none"
            style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)" }}>
            <circle cx="6.5" cy="6.5" r="4.5" stroke={C.muted} strokeWidth="1.3" />
            <path d="M10 10l3 3" stroke={C.muted} strokeWidth="1.3" strokeLinecap="round" />
          </svg>
          <input
            type="text"
            placeholder="Search documents or employees..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{
              padding: "10px 14px 10px 36px", borderRadius: 10,
              border: `0.5px solid ${C.border}`, fontSize: 13,
              color: C.text, background: C.surface,
              outline: "none", width: 260, fontFamily: "inherit",
            }}
            onFocus={e => e.target.style.borderColor = C.brand}
            onBlur={e => e.target.style.borderColor = C.border}
          />
        </div>
      </div>

      {/* Content */}
      <div style={{
        background: C.surface, borderRadius: 16,
        border: `0.5px solid ${C.border}`, overflow: "hidden",
      }}>
        <div style={{ position: "relative", height: 3, background: C.brand }} />

        {isLoading && (
          <div style={{ display: "flex", justifyContent: "center", alignItems: "center", padding: "60px 0", gap: 12 }}>
            <Spinner />
            <span style={{ fontSize: 13, color: C.muted }}>Loading documents...</span>
          </div>
        )}

        {isError && (
          <div style={{ padding: "20px 24px" }}>
            <div style={{
              padding: "14px 16px", background: C.redBg,
              borderRadius: 10, fontSize: 13, color: C.red,
            }}>
              {error?.response?.data?.message || "Failed to load documents."}
            </div>
          </div>
        )}

        {!isLoading && !isError && filtered.length === 0 && (
          <EmptyState message={search ? "No results match your search." : "No personal documents submitted yet."} />
        )}

        {!isLoading && !isError && filtered.length > 0 && (
          <div style={{ padding: "20px", display: "flex", flexDirection: "column", gap: 12 }}>
            {filtered.map(doc => (
              <DocCard
                key={doc.id}
                doc={doc}
                onClick={() => setSelectedId(doc.id)}
              />
            ))}
          </div>
        )}
      </div>

      {/* Detail drawer */}
      {selectedId && (
        <DetailDrawer
          documentId={selectedId}
          onClose={() => setSelectedId(null)}
        />
      )}
    </div>
  );
}