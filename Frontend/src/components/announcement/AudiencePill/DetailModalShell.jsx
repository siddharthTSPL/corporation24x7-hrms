import { C } from "../shared/constants";

/* Reusable modal shell for both employee and manager detail views */
export default function DetailModalShell({ onClose, children }) {
  return (
    <div
      onClick={(e) => e.target === e.currentTarget && onClose()}
      style={{
        position: "fixed", inset: 0, zIndex: 9999,
        background: "rgba(115,0,66,0.18)",
        display: "flex", alignItems: "center", justifyContent: "center",
        padding: 20, backdropFilter: "blur(4px)",
      }}>
      <div style={{
        background: C.cream, borderRadius: 20,
        border: `.5px solid ${C.midA25}`,
        width: "100%", maxWidth: 600,
        maxHeight: "88vh", overflowY: "auto",
        fontFamily: "'Segoe UI', sans-serif",
        boxShadow: "0 24px 48px rgba(115,0,66,0.12)",
      }}>

        {/* Header bar */}
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
          <button onClick={onClose}
            style={{
              width: 30, height: 30, borderRadius: 8,
              background: C.deepA10, border: "none", cursor: "pointer",
              color: C.deep, fontSize: 16, display: "flex",
              alignItems: "center", justifyContent: "center",
              transition: "background .2s",
            }}
            onMouseEnter={(e) => (e.currentTarget.style.background = C.deepA15)}
            onMouseLeave={(e) => (e.currentTarget.style.background = C.deepA10)}>
            ✕
          </button>
        </div>

        {/* Body slot */}
        <div style={{ padding: "28px 28px 32px" }}>
          {children}
        </div>
      </div>
    </div>
  );
}