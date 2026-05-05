import React, { useState } from "react";
import { useGetForwardedLeaves, useAcceptLeave, useRejectLeave } from "../../auth/server-state/adminleave/adminleave.hook";

const palette = {
  pink: "#CD166E",
  maroon: "#730042",
  cream: "#F9F8F2",
  darkMaroon: "#4a0029",
  softPink: "rgba(205,22,110,0.12)",
  softMaroon: "rgba(115,0,66,0.35)",
};

const styles = {
  wrapper: {
    minHeight: "100vh",
    background: `linear-gradient(135deg, #1a0010 0%, #2d0020 50%, #1a0010 100%)`,
    fontFamily: "'DM Sans', 'Segoe UI', sans-serif",
    padding: "40px 32px",
    color: palette.cream,
  },
  header: {
    display: "flex",
    alignItems: "flex-end",
    justifyContent: "space-between",
    marginBottom: "36px",
    borderBottom: `1px solid ${palette.softMaroon}`,
    paddingBottom: "24px",
  },
  titleGroup: {},
  eyebrow: {
    fontSize: "11px",
    letterSpacing: "3px",
    textTransform: "uppercase",
    color: palette.pink,
    marginBottom: "6px",
    fontWeight: 500,
  },
  title: {
    fontSize: "30px",
    fontWeight: 700,
    color: palette.cream,
    margin: 0,
    lineHeight: 1.1,
    letterSpacing: "-0.5px",
  },
  badge: {
    background: palette.softPink,
    border: `1px solid ${palette.pink}`,
    color: palette.pink,
    borderRadius: "20px",
    padding: "6px 16px",
    fontSize: "13px",
    fontWeight: 600,
    letterSpacing: "0.5px",
  },
  sectionLabel: {
    fontSize: "11px",
    letterSpacing: "3px",
    textTransform: "uppercase",
    color: palette.pink,
    marginBottom: "12px",
    fontWeight: 500,
  },
  tableContainer: {
    background: "rgba(255,255,255,0.03)",
    borderRadius: "16px",
    border: `1px solid rgba(115,0,66,0.4)`,
    overflow: "hidden",
    boxShadow: "0 8px 48px rgba(0,0,0,0.5)",
  },
  table: {
    width: "100%",
    borderCollapse: "collapse",
  },
  thead: {
    background: `linear-gradient(90deg, ${palette.maroon}, #5a0035)`,
  },
  th: {
    padding: "14px 20px",
    textAlign: "left",
    fontSize: "10px",
    fontWeight: 700,
    letterSpacing: "2px",
    textTransform: "uppercase",
    color: "rgba(249,248,242,0.6)",
    whiteSpace: "nowrap",
  },
  row: (isEven) => ({
    background: isEven ? "rgba(255,255,255,0.015)" : "transparent",
    transition: "background 0.2s",
    borderBottom: "1px solid rgba(115,0,66,0.2)",
  }),
  td: {
    padding: "16px 20px",
    fontSize: "14px",
    color: palette.cream,
    verticalAlign: "middle",
  },
  employeeCell: {
    display: "flex",
    alignItems: "center",
    gap: "12px",
  },
  avatarBox: {
    width: "36px",
    height: "36px",
    borderRadius: "10px",
    background: `linear-gradient(135deg, ${palette.pink}, ${palette.maroon})`,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: "12px",
    fontWeight: 700,
    color: palette.cream,
    flexShrink: 0,
  },
  managerAvatarBox: {
    width: "30px",
    height: "30px",
    borderRadius: "8px",
    background: `linear-gradient(135deg, ${palette.maroon}, #4a0029)`,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: "10px",
    fontWeight: 700,
    color: palette.cream,
    flexShrink: 0,
  },
  nameText: {
    fontWeight: 600,
    fontSize: "14px",
    color: palette.cream,
  },
  emailText: {
    fontSize: "12px",
    color: "rgba(249,248,242,0.45)",
    marginTop: "2px",
  },
  leaveTypeBadge: (type) => {
    const colors = {
      ml: { bg: "rgba(205,22,110,0.15)", color: palette.pink, border: `1px solid rgba(205,22,110,0.4)` },
      cl: { bg: "rgba(115,0,66,0.3)", color: "#e8a0c8", border: "1px solid rgba(232,160,200,0.3)" },
      sl: { bg: "rgba(249,248,242,0.08)", color: palette.cream, border: "1px solid rgba(249,248,242,0.2)" },
      el: { bg: "rgba(180,50,100,0.2)", color: "#f0b0d0", border: "1px solid rgba(240,176,208,0.3)" },
    };
    const c = colors[type?.toLowerCase()] || colors.sl;
    return {
      display: "inline-block",
      padding: "3px 10px",
      borderRadius: "6px",
      fontSize: "11px",
      fontWeight: 700,
      letterSpacing: "1px",
      textTransform: "uppercase",
      ...c,
    };
  },
  statusBadge: (status) => {
    const s = status?.toLowerCase() || "";
    const base = {
      display: "inline-flex",
      alignItems: "center",
      gap: "5px",
      padding: "4px 12px",
      borderRadius: "20px",
      fontSize: "11px",
      fontWeight: 600,
      letterSpacing: "0.5px",
    };
    if (s.includes("forwarded"))
      return { ...base, background: "rgba(255,190,0,0.12)", color: "#ffd966", border: "1px solid rgba(255,217,102,0.3)" };
    if (s.includes("pending"))
      return { ...base, background: "rgba(255,140,0,0.12)", color: "#ffb066", border: "1px solid rgba(255,176,102,0.3)" };
    if (s.includes("approved"))
      return { ...base, background: "rgba(0,200,100,0.12)", color: "#66e0a0", border: "1px solid rgba(102,224,160,0.3)" };
    if (s.includes("rejected"))
      return { ...base, background: "rgba(255,60,60,0.12)", color: "#ff9090", border: "1px solid rgba(255,144,144,0.3)" };
    return { ...base, background: "rgba(249,248,242,0.08)", color: palette.cream };
  },
  dateText: {
    fontSize: "13px",
    color: "rgba(249,248,242,0.8)",
  },
  dateRange: {
    fontSize: "11px",
    color: "rgba(249,248,242,0.4)",
    marginTop: "2px",
  },
  actionGroup: {
    display: "flex",
    gap: "8px",
    alignItems: "center",
  },
  acceptBtn: {
    padding: "7px 16px",
    borderRadius: "8px",
    border: "none",
    background: `linear-gradient(135deg, ${palette.pink}, #a0104e)`,
    color: palette.cream,
    fontSize: "12px",
    fontWeight: 700,
    cursor: "pointer",
    letterSpacing: "0.5px",
    transition: "opacity 0.2s, transform 0.1s",
    whiteSpace: "nowrap",
  },
  rejectBtn: {
    padding: "7px 16px",
    borderRadius: "8px",
    border: `1px solid rgba(249,248,242,0.2)`,
    background: "rgba(249,248,242,0.05)",
    color: "rgba(249,248,242,0.6)",
    fontSize: "12px",
    fontWeight: 600,
    cursor: "pointer",
    letterSpacing: "0.5px",
    transition: "all 0.2s",
    whiteSpace: "nowrap",
  },
  loadingState: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    padding: "80px 40px",
    gap: "16px",
  },
  spinner: {
    width: "40px",
    height: "40px",
    borderRadius: "50%",
    border: `3px solid rgba(205,22,110,0.2)`,
    borderTop: `3px solid ${palette.pink}`,
    animation: "spin 0.8s linear infinite",
  },
  emptyState: {
    textAlign: "center",
    padding: "60px 40px",
    color: "rgba(249,248,242,0.35)",
  },
  emptyIcon: {
    fontSize: "40px",
    marginBottom: "12px",
    opacity: 0.4,
  },
  emptyText: {
    fontSize: "15px",
    fontWeight: 500,
  },
  errorState: {
    background: "rgba(255,60,60,0.08)",
    border: "1px solid rgba(255,60,60,0.3)",
    borderRadius: "12px",
    padding: "20px 24px",
    color: "#ff9090",
    fontSize: "14px",
    marginBottom: "24px",
  },
  toastContainer: {
    position: "fixed",
    bottom: "32px",
    right: "32px",
    display: "flex",
    flexDirection: "column",
    gap: "10px",
    zIndex: 9999,
  },
  toast: (type) => ({
    padding: "12px 20px",
    borderRadius: "10px",
    fontSize: "13px",
    fontWeight: 600,
    color: palette.cream,
    background:
      type === "success"
        ? `linear-gradient(135deg, ${palette.maroon}, ${palette.pink})`
        : "linear-gradient(135deg, #600000, #a00000)",
    boxShadow: "0 4px 20px rgba(0,0,0,0.4)",
    animation: "slideIn 0.3s ease",
    display: "flex",
    alignItems: "center",
    gap: "8px",
  }),
  confirmOverlay: {
    position: "fixed",
    inset: 0,
    background: "rgba(0,0,0,0.7)",
    backdropFilter: "blur(4px)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 9998,
  },
  confirmModal: {
    background: `linear-gradient(145deg, #2d0020, #1a0010)`,
    border: `1px solid rgba(205,22,110,0.3)`,
    borderRadius: "20px",
    padding: "36px 40px",
    maxWidth: "400px",
    width: "90%",
    boxShadow: "0 24px 80px rgba(0,0,0,0.6)",
    textAlign: "center",
  },
  modalIcon: { fontSize: "40px", marginBottom: "16px" },
  modalTitle: {
    fontSize: "20px",
    fontWeight: 700,
    color: palette.cream,
    marginBottom: "8px",
  },
  modalDesc: {
    fontSize: "14px",
    color: "rgba(249,248,242,0.55)",
    marginBottom: "28px",
    lineHeight: 1.6,
  },
  modalActions: {
    display: "flex",
    gap: "12px",
    justifyContent: "center",
  },
  modalConfirmBtn: (action) => ({
    padding: "10px 28px",
    borderRadius: "10px",
    border: "none",
    background:
      action === "accept"
        ? `linear-gradient(135deg, ${palette.pink}, #a0104e)`
        : "linear-gradient(135deg, #a00030, #600020)",
    color: palette.cream,
    fontSize: "14px",
    fontWeight: 700,
    cursor: "pointer",
  }),
  modalCancelBtn: {
    padding: "10px 28px",
    borderRadius: "10px",
    border: `1px solid rgba(249,248,242,0.15)`,
    background: "transparent",
    color: "rgba(249,248,242,0.55)",
    fontSize: "14px",
    fontWeight: 600,
    cursor: "pointer",
  },
};

const formatDate = (dateStr) => {
  if (!dateStr) return "—";
  return new Date(dateStr).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

const getInitials = (fName = "", lName = "") =>
  `${fName?.[0] || ""}${lName?.[0] || ""}`.toUpperCase() || "??";

const getStatusLabel = (status) => {
  const map = {
    forwarded_admin: "Forwarded",
    pending_admin: "Pending",
    approved_admin: "Approved",
    rejected_admin: "Rejected",
  };
  return map[status] || status;
};

const Toast = ({ toasts }) => (
  <div style={styles.toastContainer}>
    {toasts.map((t) => (
      <div key={t.id} style={styles.toast(t.type)}>
        <span>{t.type === "success" ? "✓" : "✕"}</span>
        {t.message}
      </div>
    ))}
  </div>
);

const ConfirmModal = ({ confirm, onClose, onConfirm, isLoading }) => {
  if (!confirm) return null;
  const isAccept = confirm.action === "accept";
  return (
    <div style={styles.confirmOverlay} onClick={onClose}>
      <div style={styles.confirmModal} onClick={(e) => e.stopPropagation()}>
        <div style={styles.modalIcon}>{isAccept ? "✅" : "🚫"}</div>
        <div style={styles.modalTitle}>
          {isAccept ? "Approve Leave" : "Reject Leave"}
        </div>
        <div style={styles.modalDesc}>
          Are you sure you want to{" "}
          <strong style={{ color: isAccept ? palette.pink : "#ff9090" }}>
            {isAccept ? "approve" : "reject"}
          </strong>{" "}
          the leave request for{" "}
          <strong style={{ color: palette.cream }}>{confirm.personName}</strong>?
          {!isAccept && (
            <div style={{ marginTop: "8px", fontSize: "12px", color: "rgba(249,248,242,0.4)" }}>
              This leave will be auto-deleted after 24 hours.
            </div>
          )}
        </div>
        <div style={styles.modalActions}>
          <button style={styles.modalCancelBtn} onClick={onClose}>
            Cancel
          </button>
          <button
            style={styles.modalConfirmBtn(confirm.action)}
            onClick={onConfirm}
            disabled={isLoading}
          >
            {isLoading ? "Processing…" : isAccept ? "Approve" : "Reject"}
          </button>
        </div>
      </div>
    </div>
  );
};

// ─── Reusable Leave Table ────────────────────────────────────────────────────
const LeaveTable = ({ leaves, leaveFor, hoveredRow, setHoveredRow, isProcessing, onAction }) => {
  const isManager = leaveFor === "manager";
  const headers = isManager
    ? ["Manager", "Leave Type", "Duration", "Status", "Actions"]
    : ["Employee", "Manager", "Leave Type", "Duration", "Status", "Actions"];

  return (
    <table style={styles.table}>
      <thead style={styles.thead}>
        <tr>
          {headers.map((h) => (
            <th key={h} style={styles.th}>{h}</th>
          ))}
        </tr>
      </thead>
      <tbody>
        {leaves.map((leave, idx) => {
          const emp = leave.employee || {};
          const mgr = leave.manager || {};
          const person = isManager ? mgr : emp;
          const personName = `${person.f_name || ""} ${person.l_name || ""}`.trim() || "Unknown";
          const initials = getInitials(person.f_name, person.l_name);
          const mgrInitials = getInitials(mgr.f_name, mgr.l_name);
          const mgrName = `${mgr.f_name || ""} ${mgr.l_name || ""}`.trim() || "—";
          const isHovered = hoveredRow === leave._id;
          const alreadyDone =
            leave.status?.startsWith("approved") || leave.status?.startsWith("rejected");

          return (
            <tr
              key={leave._id}
              className="leave-row"
              style={{
                ...styles.row(idx % 2 === 0),
                animationDelay: `${idx * 50}ms`,
                background: isHovered
                  ? "rgba(205,22,110,0.06)"
                  : idx % 2 === 0
                  ? "rgba(255,255,255,0.015)"
                  : "transparent",
              }}
              onMouseEnter={() => setHoveredRow(leave._id)}
              onMouseLeave={() => setHoveredRow(null)}
            >
              {/* Primary person cell (Employee or Manager) */}
              <td style={styles.td}>
                <div style={styles.employeeCell}>
                  <div style={styles.avatarBox}>{initials}</div>
                  <div>
                    <div style={styles.nameText}>{personName}</div>
                    <div style={styles.emailText}>{person.work_email || "—"}</div>
                  </div>
                </div>
              </td>

              {/* Manager cell — employee leaves only */}
              {!isManager && (
                <td style={styles.td}>
                  <div style={styles.employeeCell}>
                    <div style={styles.managerAvatarBox}>{mgrInitials}</div>
                    <div>
                      <div style={{ ...styles.nameText, fontSize: "13px" }}>{mgrName}</div>
                      <div style={styles.emailText}>{mgr.work_email || "—"}</div>
                    </div>
                  </div>
                </td>
              )}

              {/* Leave Type */}
              <td style={styles.td}>
                <span style={styles.leaveTypeBadge(leave.leaveType)}>
                  {leave.leaveType?.toUpperCase() || "—"}
                </span>
              </td>

              {/* Duration */}
              <td style={styles.td}>
                <div style={styles.dateText}>{formatDate(leave.startDate)}</div>
                <div style={styles.dateRange}>→ {formatDate(leave.endDate)}</div>
                <div style={{ ...styles.dateRange, marginTop: "4px" }}>
                  {leave.days} day{leave.days !== 1 ? "s" : ""}
                </div>
              </td>

              {/* Status */}
              <td style={styles.td}>
                <span style={styles.statusBadge(leave.status)}>
                  <span
                    style={{
                      width: "5px",
                      height: "5px",
                      borderRadius: "50%",
                      background: "currentColor",
                      display: "inline-block",
                    }}
                  />
                  {getStatusLabel(leave.status)}
                </span>
              </td>

              {/* Actions */}
              <td style={styles.td}>
                {alreadyDone ? (
                  <span style={{ fontSize: "12px", color: "rgba(249,248,242,0.3)", fontStyle: "italic" }}>
                    Processed
                  </span>
                ) : (
                  <div style={styles.actionGroup}>
                    <button
                      className="accept-btn"
                      style={styles.acceptBtn}
                      onClick={() => onAction(leave, "accept", leaveFor)}
                      disabled={isProcessing}
                    >
                      Approve
                    </button>
                    <button
                      className="reject-btn"
                      style={styles.rejectBtn}
                      onClick={() => onAction(leave, "reject", leaveFor)}
                      disabled={isProcessing}
                    >
                      Reject
                    </button>
                  </div>
                )}
              </td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
};

// ─── Main Component ──────────────────────────────────────────────────────────
const LeaveTablead = () => {
  const { data, isLoading, isError, error } = useGetForwardedLeaves();
  const acceptMutation = useAcceptLeave();
  const rejectMutation = useRejectLeave();

  const [confirm, setConfirm] = useState(null);
  const [toasts, setToasts] = useState([]);
  const [hoveredRow, setHoveredRow] = useState(null);

  const addToast = (message, type = "success") => {
    const id = Date.now();
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 3500);
  };

  // ← leaveFor: "employee" | "manager"
  const handleAction = (leave, action, leaveFor) => {
    const person = leaveFor === "manager" ? leave.manager : leave.employee;
    const personName = person
      ? `${person.f_name || ""} ${person.l_name || ""}`.trim()
      : "this person";
    setConfirm({ leaveId: leave._id, action, personName, leaveFor });
  };

  const handleConfirm = async () => {
    if (!confirm) return;
    const { leaveId, action, personName, leaveFor } = confirm;
    try {
      if (action === "accept") {
        await acceptMutation.mutateAsync({ id: leaveId, leaveFor }); // ← pass both
        addToast(`Leave approved for ${personName}`, "success");
      } else {
        await rejectMutation.mutateAsync({ id: leaveId, leaveFor }); // ← pass both
        addToast(`Leave rejected for ${personName}`, "error");
      }
    } catch (err) {
      addToast(err?.message || "Something went wrong", "error");
    } finally {
      setConfirm(null);
    }
  };

  // ← pull from correct response keys
  const employeeLeaves = data?.employeeLeaves?.leaves || [];
  const managerLeaves = data?.managerLeaves?.leaves || [];
  const totalCount =
    (data?.employeeLeaves?.count || 0) + (data?.managerLeaves?.count || 0);
  const isProcessing = acceptMutation.isPending || rejectMutation.isPending;

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&display=swap');
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes slideIn { from { transform: translateX(20px); opacity: 0; } to { transform: translateX(0); opacity: 1; } }
        @keyframes fadeIn { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }
        .leave-row { animation: fadeIn 0.3s ease both; }
        .accept-btn:hover { opacity: 0.85 !important; transform: translateY(-1px) !important; }
        .reject-btn:hover { background: rgba(249,248,242,0.1) !important; color: rgba(249,248,242,0.9) !important; border-color: rgba(249,248,242,0.35) !important; }
      `}</style>

      <div style={styles.wrapper}>
        {/* Header */}
        <div style={styles.header}>
          <div style={styles.titleGroup}>
            <div style={styles.eyebrow}>Leave Management</div>
            <h1 style={styles.title}>Pending Requests</h1>
          </div>
          {!isLoading && (
            <span style={styles.badge}>{totalCount} Requests</span>
          )}
        </div>

        {/* Error */}
        {isError && (
          <div style={styles.errorState}>
            ⚠️ {error?.message || "Failed to load leave requests."}
          </div>
        )}

        {/* Loading */}
        {isLoading ? (
          <div style={styles.tableContainer}>
            <div style={styles.loadingState}>
              <div style={styles.spinner} />
              <span style={{ color: "rgba(249,248,242,0.4)", fontSize: "14px" }}>
                Loading leave requests…
              </span>
            </div>
          </div>
        ) : (
          <>
            {/* ── Employee Leaves ── */}
            <div style={{ marginBottom: "32px" }}>
              <div style={styles.sectionLabel}>
                Employee Leaves ({data?.employeeLeaves?.count || 0})
              </div>
              <div style={styles.tableContainer}>
                {employeeLeaves.length === 0 ? (
                  <div style={styles.emptyState}>
                    <div style={styles.emptyIcon}>📭</div>
                    <div style={styles.emptyText}>No pending employee leave requests</div>
                  </div>
                ) : (
                  <LeaveTable
                    leaves={employeeLeaves}
                    leaveFor="employee"
                    hoveredRow={hoveredRow}
                    setHoveredRow={setHoveredRow}
                    isProcessing={isProcessing}
                    onAction={handleAction}
                  />
                )}
              </div>
            </div>

            {/* ── Manager Leaves ── */}
            <div>
              <div style={styles.sectionLabel}>
                Manager Leaves ({data?.managerLeaves?.count || 0})
              </div>
              <div style={styles.tableContainer}>
                {managerLeaves.length === 0 ? (
                  <div style={styles.emptyState}>
                    <div style={styles.emptyIcon}>📭</div>
                    <div style={styles.emptyText}>No pending manager leave requests</div>
                  </div>
                ) : (
                  <LeaveTable
                    leaves={managerLeaves}
                    leaveFor="manager"
                    hoveredRow={hoveredRow}
                    setHoveredRow={setHoveredRow}
                    isProcessing={isProcessing}
                    onAction={handleAction}
                  />
                )}
              </div>
            </div>
          </>
        )}
      </div>

      {/* Confirm Modal */}
      <ConfirmModal
        confirm={confirm}
        onClose={() => setConfirm(null)}
        onConfirm={handleConfirm}
        isLoading={isProcessing}
      />

      {/* Toasts */}
      <Toast toasts={toasts} />
    </>
  );
};

export default LeaveTablead;