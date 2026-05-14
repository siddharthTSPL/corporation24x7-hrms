import { useGetAnnouncement } from "../../../auth/server-state/employee/employeeannounce/employeeannounce.hook";
import DetailModalShell from "../../../components/announcement/AudiencePill/DetailModalShell";
import { ModalSpinner } from "../../../components/announcement/AudiencePill/Spinner";
import { PriorityPill } from "../../../components/announcement/shared/Badges";
import { fmtDate, fmtTime } from "../../../components/announcement/shared/helpers";
import { C } from "../../../components/announcement/shared/constants";

export default function EmployeeDetailModal({ id, onClose }) {
  const { data, isLoading } = useGetAnnouncement(id);
  const ann = data?.announcement;

  return (
    <DetailModalShell onClose={onClose}>
      {isLoading ? (
        <ModalSpinner />
      ) : ann ? (
        <>
          <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap", marginBottom: 16 }}>
            {ann.priority && <PriorityPill priority={ann.priority} />}
            {ann.category && (
              <span style={{ fontSize: 10.5, letterSpacing: ".1em", textTransform: "uppercase", color: C.deepA45 }}>
                {ann.category}
              </span>
            )}
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
            {ann.content || ann.message || ann.description || "No content available."}
          </p>

          {ann.postedBy && (
            <div style={{
              marginTop: 24, paddingTop: 18,
              borderTop: `.5px solid ${C.deepA10}`,
              display: "flex", alignItems: "center", gap: 12,
            }}>
              <div style={{
                width: 36, height: 36, borderRadius: "50%",
                background: C.midA10, border: `.5px solid ${C.midA25}`,
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: 15, fontWeight: 600, color: C.deep,
              }}>
                {(ann.postedBy?.f_name || ann.postedBy?.name || "A")[0].toUpperCase()}
              </div>
              <div>
                <p style={{ fontSize: 13, fontWeight: 500, color: C.deep, margin: 0 }}>
                  {ann.postedBy?.f_name
                    ? `${ann.postedBy.f_name} ${ann.postedBy.l_name || ""}`
                    : ann.postedBy?.name || "Admin"}
                </p>
                <p style={{ fontSize: 11, color: C.deepA45, margin: 0 }}>
                  {ann.postedBy?.role || "Management"}
                </p>
              </div>
            </div>
          )}
        </>
      ) : (
        <p style={{ color: C.deepA45, textAlign: "center", padding: "32px 0" }}>
          Announcement not found.
        </p>
      )}
    </DetailModalShell>
  );
}