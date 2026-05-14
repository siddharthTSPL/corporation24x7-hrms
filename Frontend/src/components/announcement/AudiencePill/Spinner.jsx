import { C } from "./constants";

/* ── Inline-style spinner (employee / manager) ────────────────────────────── */
export function Spinner({ size = 38 }) {
  return (
    <div style={{
      display: "flex", flexDirection: "column",
      alignItems: "center", justifyContent: "center",
      padding: "80px 0", gap: 16,
    }}>
      <div style={{
        width: size, height: size,
        border: `3px solid ${C.deepA10}`,
        borderTopColor: C.mid, borderRadius: "50%",
        animation: "spin .8s linear infinite",
      }} />
      <p style={{ color: C.deepA45, fontSize: 13, margin: 0 }}>Loading announcements…</p>
    </div>
  );
}

/* ── Inline-style small spinner (inside modal) ────────────────────────────── */
export function ModalSpinner() {
  return (
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
  );
}