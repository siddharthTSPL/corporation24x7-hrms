import { useParticularAnnouncement } from "../../../auth/server-state/manager/managerannounce/managerannounce.hook";
import DetailModalShell from "../../../components/announcement/AudiencePill/DetailModalShell";
import { ModalSpinner } from "../../../components/announcement/AudiencePill/Spinner";
import { PriorityPill, AudiencePill } from "../../../components/announcement/shared/Badges";
import { fmtDate, fmtTime } from "../../../components/announcement/shared/helpers";
import { C } from "../../../components/announcement/shared/constants";

export default function ManagerDetailModal({ id, onClose }) {
  const { data, isLoading, error } = useParticularAnnouncement(id);
  const ann = data?.announcement;

  return (
    <DetailModalShell onClose={onClose}>
      {isLoading ? (
        <ModalSpinner />
      ) : error || !ann ? (
        <p style={{ color: C.deepA45, textAlign: "center", padding: "32px 0" }}>Announcement not found.</p>
      ) : (
        <>
          <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap", marginBottom: 16 }}>
            {ann.priority && <PriorityPill priority={ann.priority} />}
            {ann.audience && <AudiencePill audience={ann.audience} />}
            <span style={{ marginLeft: "auto", fontSize: 11, color: C.deepA45 }}>
              {fmtDate(ann.createdAt)} · {fmtTime(ann.createdAt)}
            </span>
          </div>

          <h2 style={{
            fontFamily: "'Segoe UI', sans-serif", fontSize: 28, fontWeight: 600,
            color: C.deep, lineHeight: 1.3, margin: 0, letterSpacing: "-0.3px",
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
              <span style={{ fontSize: 12, color: C.deep }}>Expires {fmtDate(ann.expiresAt)}</span>
            </div>
          )}
        </>
      )}
    </DetailModalShell>
  );
}