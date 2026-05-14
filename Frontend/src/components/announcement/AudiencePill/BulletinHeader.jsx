import { C } from "./constants";

/* Top eyebrow row: "Company Bulletin" label + live badge */
export default function BulletinHeader({ count, children }) {
  return (
    <>
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

      {/* Divider row — children slot for optional filter pills */}
      <div style={{
        display: "flex", alignItems: "center", gap: 14,
        margin: "1.25rem 0 2rem", animation: "fadeUp .55s ease both", flexWrap: "wrap",
      }}>
        <div style={{ flex: 1, height: .5, background: C.deepA25, minWidth: 40 }} />
        {children || (
          <span style={{ fontSize: 11, color: C.deepA45, letterSpacing: ".08em" }}>
            {count} {count === 1 ? "post" : "posts"}
          </span>
        )}
        <div style={{ flex: 1, height: .5, background: C.deepA25, minWidth: 40 }} />
      </div>
    </>
  );
}