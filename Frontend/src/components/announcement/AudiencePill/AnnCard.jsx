import { C } from "../shared/constants";
import { fmtDate, excerpt } from "../shared/helpers";

/* AnnCard is used in both employee and manager views.
   Pass `badges` as a JSX node to render priority/audience pills. */
export default function AnnCard({ ann, index, onClick, badges }) {
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
      }}>

      {isFeatured && (
        <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 2, background: C.mid }} />
      )}

      <div style={{
        display: "flex", alignItems: "center",
        justifyContent: "space-between", gap: 8,
        marginBottom: 14, flexWrap: "wrap",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
          {badges}
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
        color: C.deep, lineHeight: 1.3, marginBottom: 10, letterSpacing: "-0.2px",
      }}>
        {ann.title || "Untitled Announcement"}
      </h3>

      <p style={{ fontSize: 13.5, color: C.deepA55, lineHeight: 1.75, marginBottom: 18 }}>
        {excerpt(ann.content || ann.message || ann.description, isFeatured ? 200 : 100)}
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
        <span className="read-more-btn" style={{
          marginLeft: "auto", fontSize: 11.5, fontWeight: 500,
          color: C.mid, letterSpacing: ".06em", textTransform: "uppercase",
          display: "flex", alignItems: "center", gap: 3, transition: "color .15s",
        }}>
          Read more ›
        </span>
      </div>
    </div>
  );
}