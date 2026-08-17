import { useState, useMemo } from "react";
import { useAuth } from "../../auth/store/getmeauth/getmeauth";
import { downloadCsv } from "../dashboard/Exportcsv";

// ---------------------------------------------------------------------------
// Shared design tokens — mirrors pages/payroll/Payroll.jsx so this module
// doesn't introduce a visually inconsistent look.
// ---------------------------------------------------------------------------
const C = {
  brand: "#CD166E",
  brandDark: "#730042",
  brandLight: "rgba(205,22,110,0.08)",
  green: "#1D9E75",
  greenBg: "#e8f5e9",
  blue: "#378ADD",
  blueBg: "#e6f1fb",
  amber: "#BA7517",
  amberBg: "#faeeda",
  red: "#E24B4A",
  redBg: "#fcebeb",
  slate: "#6b7280",
  slateBg: "#f1f2f4",
  surface: "#ffffff",
  page: "#F9F8F2",
  border: "#ede5e0",
  text: "#2a1a16",
  muted: "#b0948a",
  mutedMid: "#c9bab5",
};

const TYPES = ["Travel", "Food", "Medical", "Internet", "Office Supplies", "Training", "Other"];
const PAYMENT_METHODS = ["Bank Transfer", "UPI", "Cash", "Cheque"];

const STATUS_META = {
  draft: { label: "Draft", bg: C.slateBg, color: C.slate },
  submitted: { label: "Pending Review", bg: C.amberBg, color: C.amber },
  approved: { label: "Approved", bg: C.blueBg, color: C.blue },
  rejected: { label: "Rejected", bg: C.redBg, color: C.red },
  paid: { label: "Paid", bg: C.greenBg, color: C.green },
};

function fmtMoney(n, currency = "INR") {
  const num = Number(n) || 0;
  try {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency,
      maximumFractionDigits: 2,
    }).format(num);
  } catch {
    return `${currency} ${num.toFixed(2)}`;
  }
}

function fmtDate(d) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
}

function getErrorMessage(e) {
  return e?.response?.data?.message || e?.message || "Something went wrong";
}

function fmtDateTime(d) {
  if (!d) return "";
  return new Date(d).toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function claimAmountSummary(claims) {
  const totals = claims.reduce((acc, claim) => {
    const currency = claim?.currency || "INR";
    acc[currency] = (acc[currency] || 0) + (Number(claim?.amountClaimed) || 0);
    return acc;
  }, {});
  const entries = Object.entries(totals);
  if (!entries.length) return fmtMoney(0, "INR");
  return entries.map(([currency, amount]) => fmtMoney(amount, currency)).join(" + ");
}

const CLAIM_CSV_COLUMNS = [
  { key: "claimNumber", label: "Claim Number" },
  { key: "employeeName", label: "Employee" },
  { key: "empid", label: "Employee ID" },
  { key: "submitterModel", label: "Submitted By Role" },
  { key: "department", label: "Department" },
  { key: "designation", label: "Designation" },
  { key: "reimbursementType", label: "Reimbursement Type" },
  { key: "expenseDate", label: "Expense Date" },
  { key: "amountClaimed", label: "Amount Claimed" },
  { key: "project", label: "Project / Client" },
  { key: "costCenter", label: "Cost Center" },
  { key: "paymentMethod", label: "Payment Method" },
  { key: "statusLabel", label: "Status" },
  { key: "submissionDate", label: "Submitted On" },
  { key: "approvedAt", label: "Approved On" },
  { key: "rejectedAt", label: "Rejected On" },
  { key: "paidAt", label: "Paid On" },
  { key: "approverComments", label: "Approver Comments" },
  { key: "rejectionReason", label: "Rejection Reason" },
  { key: "financeNotes", label: "Finance Notes" },
  { key: "paymentReference", label: "Payment Reference" },
  { key: "description", label: "Description" },
];

function buildClaimCsvRows(claims) {
  return claims.map((claim) => ({
    claimNumber: claim.claimNumber || "",
    employeeName: claim.employeeName || "",
    empid: claim.empid || "",
    submitterModel: claim.submitterModel || "",
    department: claim.department || "",
    designation: claim.designation || "",
    reimbursementType: claim.reimbursementType || "",
    expenseDate: fmtDate(claim.expenseDate),
    amountClaimed: fmtMoney(claim.amountClaimed, claim.currency),
    project: claim.project || "",
    costCenter: claim.costCenter || "",
    paymentMethod: claim.paymentMethod || "",
    statusLabel: STATUS_META[claim.status]?.label || claim.status || "",
    submissionDate: fmtDateTime(claim.submissionDate || claim.createdAt),
    approvedAt: fmtDateTime(claim.approvedAt),
    rejectedAt: fmtDateTime(claim.rejectedAt),
    paidAt: fmtDateTime(claim.paidAt),
    approverComments: claim.approverComments || "",
    rejectionReason: claim.rejectionReason || "",
    financeNotes: claim.financeNotes || "",
    paymentReference: claim.paymentReference || "",
    description: claim.description || "",
  }));
}

function Spinner({ size = 16, color = "#fff" }) {
  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: "50%",
        border: `2px solid ${color}33`,
        borderTop: `2px solid ${color}`,
        animation: "reimb-spin 0.7s linear infinite",
        flexShrink: 0,
      }}
    />
  );
}

function StatusBadge({ status }) {
  const meta = STATUS_META[status] || STATUS_META.draft;
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 6,
        padding: "3px 10px",
        borderRadius: 999,
        fontSize: 12,
        fontWeight: 600,
        background: meta.bg,
        color: meta.color,
        whiteSpace: "nowrap",
      }}
    >
      {meta.label}
    </span>
  );
}

function Btn({ children, onClick, variant = "primary", disabled, loading, type = "button", style, ...rest }) {
  const variants = {
    primary: { background: C.brand, color: "#fff", border: `1px solid ${C.brand}` },
    outline: { background: "#fff", color: C.brand, border: `1px solid ${C.brand}` },
    green: { background: C.green, color: "#fff", border: `1px solid ${C.green}` },
    red: { background: C.red, color: "#fff", border: `1px solid ${C.red}` },
    ghost: { background: "transparent", color: C.text, border: `1px solid ${C.border}` },
  };
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled || loading}
      {...rest}
      style={{
        ...variants[variant],
        padding: "8px 16px",
        borderRadius: 8,
        fontSize: 13,
        fontWeight: 600,
        cursor: disabled || loading ? "not-allowed" : "pointer",
        opacity: disabled ? 0.55 : 1,
        display: "inline-flex",
        alignItems: "center",
        gap: 8,
        transition: "opacity .15s",
        ...style,
      }}
    >
      {loading && <Spinner color={variant === "outline" || variant === "ghost" ? C.brand : "#fff"} />}
      {children}
    </button>
  );
}

function Field({ label, required, children }) {
  return (
    <label style={{ display: "flex", flexDirection: "column", gap: 6, fontSize: 13, color: C.text }}>
      <span style={{ fontWeight: 600 }}>
        {label} {required && <span style={{ color: C.red }}>*</span>}
      </span>
      {children}
    </label>
  );
}

const inputStyle = {
  padding: "9px 12px",
  borderRadius: 8,
  border: `1px solid ${C.border}`,
  fontSize: 13,
  color: C.text,
  background: "#fff",
  outline: "none",
  width: "100%",
  boxSizing: "border-box",
};

function Modal({ title, onClose, children, width = 460 }) {
  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(42,26,22,0.45)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 1000,
        padding: 16,
      }}
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: "#fff",
          borderRadius: 14,
          width,
          maxWidth: "100%",
          maxHeight: "88vh",
          overflowY: "auto",
          padding: 24,
          boxShadow: "0 20px 60px rgba(42,26,22,0.25)",
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
          <h3 style={{ margin: 0, fontSize: 16, color: C.brandDark }}>{title}</h3>
          <button
            onClick={onClose}
            style={{ background: "none", border: "none", fontSize: 18, cursor: "pointer", color: C.muted }}
          >
            ✕
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Apply / Edit claim form
// ---------------------------------------------------------------------------
function ClaimForm({ onSubmit, submitting, initial, onCancel, bankDetailsAvailable = true }) {
  const [form, setForm] = useState({
    reimbursementType: initial?.reimbursementType || "Travel",
    expenseDate: initial?.expenseDate ? initial.expenseDate.slice(0, 10) : "",
    amountClaimed: initial?.amountClaimed || "",
    currency: initial?.currency || "INR",
    description: initial?.description || "",
    project: initial?.project || "",
    costCenter: initial?.costCenter || "",
    paymentMethod: initial?.paymentMethod || "Bank Transfer",
    reimbursementPolicyAcknowledged: initial?.reimbursementPolicyAcknowledged || false,
  });
  const [receipts, setReceipts] = useState([]);
  const [supportingDocuments, setSupportingDocuments] = useState([]);
  const [error, setError] = useState("");

  const update = (key) => (e) => {
    const val = e.target.type === "checkbox" ? e.target.checked : e.target.value;
    setForm((f) => ({ ...f, [key]: val }));
  };

  const buildFormData = (status) => {
    const fd = new FormData();
    Object.entries(form).forEach(([k, v]) => fd.append(k, v));
    fd.append("status", status);
    receipts.forEach((f) => fd.append("receipts", f));
    supportingDocuments.forEach((f) => fd.append("supportingDocuments", f));
    return fd;
  };

  const handleSubmit = (status) => async () => {
    setError("");
    if (status === "submitted") {
      if (!bankDetailsAvailable) {
        setError("Bank details is not available. Please add your bank details in Settings before submitting a reimbursement claim.");
        return;
      }
      if (!form.expenseDate || !form.amountClaimed || !form.description) {
        setError("Expense date, amount, and description are required.");
        return;
      }
      if (!initial && receipts.length === 0) {
        setError("Attach at least one receipt/invoice to submit.");
        return;
      }
    }
    try {
      await onSubmit(buildFormData(status), status);
    } catch (e) {
      setError(getErrorMessage(e));
    }
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      {!bankDetailsAvailable && (
        <div style={{ background: C.amberBg, color: C.amber, padding: "10px 12px", borderRadius: 8, fontSize: 13, fontWeight: 600 }}>
          Bank details is not available. Please add your bank details in Settings before submitting a claim. You can still save this as a draft.
        </div>
      )}
      {error && (
        <div style={{ background: C.redBg, color: C.red, padding: "8px 12px", borderRadius: 8, fontSize: 13 }}>
          {error}
        </div>
      )}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        <Field label="Reimbursement Type" required>
          <select style={inputStyle} value={form.reimbursementType} onChange={update("reimbursementType")}>
            {TYPES.map((t) => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>
        </Field>
        <Field label="Expense Date" required>
          <input type="date" style={inputStyle} value={form.expenseDate} onChange={update("expenseDate")} />
        </Field>
        <Field label="Amount Claimed" required>
          <input type="number" min="0" step="0.01" style={inputStyle} value={form.amountClaimed} onChange={update("amountClaimed")} placeholder="0.00" />
        </Field>
        <Field label="Currency">
          <input style={inputStyle} value={form.currency} onChange={update("currency")} placeholder="INR" />
        </Field>
        <Field label="Project / Client">
          <input style={inputStyle} value={form.project} onChange={update("project")} placeholder="Optional" />
        </Field>
        <Field label="Cost Center">
          <input style={inputStyle} value={form.costCenter} onChange={update("costCenter")} placeholder="Optional" />
        </Field>
        <Field label="Preferred Payment Method">
          <select style={inputStyle} value={form.paymentMethod} onChange={update("paymentMethod")}>
            {PAYMENT_METHODS.map((m) => (
              <option key={m} value={m}>{m}</option>
            ))}
          </select>
        </Field>
      </div>

      <Field label="Description / Purpose of Expense" required>
        <textarea style={{ ...inputStyle, minHeight: 70, resize: "vertical" }} value={form.description} onChange={update("description")} placeholder="What was this expense for?" />
      </Field>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        <Field label="Upload Receipt(s) / Invoice(s)" required={!initial}>
          <input type="file" multiple accept="image/*,.pdf,.doc,.docx,.xls,.xlsx" style={inputStyle} onChange={(e) => setReceipts(Array.from(e.target.files || []))} />
          {receipts.length > 0 && <span style={{ fontSize: 12, color: C.muted }}>{receipts.length} file(s) selected</span>}
          {initial?.receipts?.length > 0 && (
            <span style={{ fontSize: 12, color: C.muted }}>{initial.receipts.length} already attached</span>
          )}
        </Field>
        <Field label="Supporting Documents">
          <input type="file" multiple accept="image/*,.pdf,.doc,.docx,.xls,.xlsx" style={inputStyle} onChange={(e) => setSupportingDocuments(Array.from(e.target.files || []))} />
          {supportingDocuments.length > 0 && <span style={{ fontSize: 12, color: C.muted }}>{supportingDocuments.length} file(s) selected</span>}
        </Field>
      </div>

      <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, color: C.text }}>
        <input type="checkbox" checked={form.reimbursementPolicyAcknowledged} onChange={update("reimbursementPolicyAcknowledged")} />
        I acknowledge and agree to the company's reimbursement policy
      </label>

      <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", marginTop: 4 }}>
        {onCancel && <Btn variant="ghost" onClick={onCancel}>Cancel</Btn>}
        <Btn variant="outline" onClick={handleSubmit("draft")} loading={submitting === "draft"}>
          Save as Draft
        </Btn>
        <Btn variant="primary" onClick={handleSubmit("submitted")} loading={submitting === "submitted"} disabled={!bankDetailsAvailable}>
          Submit Claim
        </Btn>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Claim detail (read-only) — used inside modals for review / viewing
// ---------------------------------------------------------------------------
function ClaimDetail({ claim }) {
  const row = (label, value) =>
    value !== undefined && value !== null && value !== "" ? (
      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, padding: "6px 0", borderBottom: `1px solid ${C.border}` }}>
        <span style={{ color: C.muted }}>{label}</span>
        <span style={{ color: C.text, fontWeight: 600, textAlign: "right" }}>{value}</span>
      </div>
    ) : null;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
      {row("Claim Number", claim.claimNumber)}
      {row("Employee", claim.employeeName)}
      {row("Employee ID", claim.empid)}
      {row("Department", claim.department)}
      {row("Designation", claim.designation)}
      {row("Email", claim.email)}
      {row("Reporting Manager", claim.reportingManager ? `${claim.reportingManager.f_name} ${claim.reportingManager.l_name}` : null)}
      {row("Manager Contact", claim.reportingManager?.work_email || claim.reportingManager?.personal_contact)}
      {row("Type", claim.reimbursementType)}
      {row("Expense Date", fmtDate(claim.expenseDate))}
      {row("Amount", fmtMoney(claim.amountClaimed, claim.currency))}
      {row("Project / Client", claim.project)}
      {row("Cost Center", claim.costCenter)}
      {row("Payment Method", claim.paymentMethod)}
      {row("Submitted On", fmtDate(claim.submissionDate || claim.createdAt))}
      {(claim.bankAccount?.bankName || claim.bankAccount?.accountNumber) && (
        <div style={{ padding: "10px 0 4px" }}>
          <div style={{ color: C.muted, fontSize: 13, marginBottom: 4, fontWeight: 600 }}>Bank Details</div>
          {row("Bank Name", claim.bankAccount?.bankName)}
          {row("Account Holder Name", claim.bankAccount?.accountHolderName)}
          {row("Account Number", claim.bankAccount?.accountNumber)}
          {row("IFSC Code", claim.bankAccount?.ifscCode)}
        </div>
      )}
      <div style={{ padding: "10px 0 6px", fontSize: 13 }}>
        <div style={{ color: C.muted, marginBottom: 4 }}>Description</div>
        <div style={{ color: C.text }}>{claim.description}</div>
      </div>
      {claim.receipts?.length > 0 && (
        <div style={{ padding: "8px 0" }}>
          <div style={{ color: C.muted, fontSize: 13, marginBottom: 6 }}>Receipts / Invoices</div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
            {claim.receipts.map((r, i) => (
              <a key={i} href={r.url} target="_blank" rel="noreferrer" style={{ fontSize: 12, color: C.brand, background: C.brandLight, padding: "4px 10px", borderRadius: 6, textDecoration: "none" }}>
                📎 {r.originalName || `Receipt ${i + 1}`}
              </a>
            ))}
          </div>
        </div>
      )}
      {claim.supportingDocuments?.length > 0 && (
        <div style={{ padding: "8px 0" }}>
          <div style={{ color: C.muted, fontSize: 13, marginBottom: 6 }}>Supporting Documents</div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
            {claim.supportingDocuments.map((r, i) => (
              <a key={i} href={r.url} target="_blank" rel="noreferrer" style={{ fontSize: 12, color: C.blue, background: C.blueBg, padding: "4px 10px", borderRadius: 6, textDecoration: "none" }}>
                📎 {r.originalName || `Document ${i + 1}`}
              </a>
            ))}
          </div>
        </div>
      )}
      {claim.approverComments && row("Approver Comments", claim.approverComments)}
      {claim.rejectionReason && row("Rejection Reason", claim.rejectionReason)}
      {claim.financeNotes && row("Finance Notes", claim.financeNotes)}
      {claim.paymentReference && row("Payment Reference", claim.paymentReference)}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Claims table
// ---------------------------------------------------------------------------
function ClaimsTable({ claims, onView, showSubmitter, emptyText }) {
  if (!claims?.length) {
    return (
      <div style={{ padding: "48px 16px", textAlign: "center", color: C.muted, fontSize: 14 }}>
        {emptyText || "No reimbursement claims yet."}
      </div>
    );
  }
  return (
    <div style={{ overflowX: "auto" }}>
      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
        <thead>
          <tr style={{ textAlign: "left", color: C.muted, borderBottom: `1px solid ${C.border}` }}>
            <th style={{ padding: "10px 12px" }}>Claim #</th>
            {showSubmitter && <th style={{ padding: "10px 12px" }}>Submitted By</th>}
            <th style={{ padding: "10px 12px" }}>Type</th>
            <th style={{ padding: "10px 12px" }}>Expense Date</th>
            <th style={{ padding: "10px 12px" }}>Amount</th>
            <th style={{ padding: "10px 12px" }}>Status</th>
            <th style={{ padding: "10px 12px" }}></th>
          </tr>
        </thead>
        <tbody>
          {claims.map((c) => (
            <tr key={c._id} style={{ borderBottom: `1px solid ${C.border}` }}>
              <td style={{ padding: "10px 12px", fontWeight: 600, color: C.brandDark }}>{c.claimNumber}</td>
              {showSubmitter && (
                <td style={{ padding: "10px 12px" }}>
                  {c.employeeName}
                  <div style={{ fontSize: 11, color: C.muted }}>{c.submitterModel} · {c.empid}</div>
                </td>
              )}
              <td style={{ padding: "10px 12px" }}>{c.reimbursementType}</td>
              <td style={{ padding: "10px 12px" }}>{fmtDate(c.expenseDate)}</td>
              <td style={{ padding: "10px 12px", fontWeight: 600 }}>{fmtMoney(c.amountClaimed, c.currency)}</td>
              <td style={{ padding: "10px 12px" }}><StatusBadge status={c.status} /></td>
              <td style={{ padding: "10px 12px", textAlign: "right" }}>
                <Btn variant="outline" onClick={() => onView(c)} style={{ padding: "5px 12px" }}>View</Btn>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Decision modal — approve / reject / mark paid
// ---------------------------------------------------------------------------
function DecisionModal({ claim, mode, onClose, onApprove, onReject, onMarkPaid, deciding }) {
  const [comments, setComments] = useState("");
  const [reason, setReason] = useState("");
  const [paymentReference, setPaymentReference] = useState("");
  const [financeNotes, setFinanceNotes] = useState("");
  const [error, setError] = useState("");

  const run = async (fn) => {
    setError("");
    try {
      await fn();
      onClose();
    } catch (e) {
      setError(getErrorMessage(e));
    }
  };

  return (
    <Modal title={`Claim ${claim.claimNumber}`} onClose={onClose} width={520}>
      <ClaimDetail claim={claim} />
      {error && (
        <div style={{ background: C.redBg, color: C.red, padding: "8px 12px", borderRadius: 8, fontSize: 13, marginTop: 14 }}>
          {error}
        </div>
      )}

      {mode === "review" && claim.status === "submitted" && (
        <div style={{ marginTop: 18, display: "flex", flexDirection: "column", gap: 10 }}>
          <Field label="Comments (optional)">
            <textarea style={{ ...inputStyle, minHeight: 50 }} value={comments} onChange={(e) => setComments(e.target.value)} placeholder="Approver comments" />
          </Field>
          <Field label="Rejection reason (required to reject)">
            <textarea style={{ ...inputStyle, minHeight: 50 }} value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Why is this being rejected?" />
          </Field>
          <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
            <Btn
              variant="red"
              loading={deciding === "reject"}
              onClick={() => run(() => onReject({ id: claim._id, reason }))}
            >
              Reject
            </Btn>
            <Btn
              variant="green"
              loading={deciding === "approve"}
              onClick={() => run(() => onApprove({ id: claim._id, comments }))}
            >
              Approve
            </Btn>
          </div>
        </div>
      )}

      {mode === "review" && claim.status === "approved" && onMarkPaid && (
        <div style={{ marginTop: 18, display: "flex", flexDirection: "column", gap: 10 }}>
          <Field label="Payment Reference">
            <input style={inputStyle} value={paymentReference} onChange={(e) => setPaymentReference(e.target.value)} placeholder="UTR / transaction ID" />
          </Field>
          <Field label="Finance Notes">
            <textarea style={{ ...inputStyle, minHeight: 50 }} value={financeNotes} onChange={(e) => setFinanceNotes(e.target.value)} placeholder="Optional" />
          </Field>
          <div style={{ display: "flex", justifyContent: "flex-end" }}>
            <Btn
              variant="primary"
              loading={deciding === "paid"}
              onClick={() => run(() => onMarkPaid({ id: claim._id, paymentReference, financeNotes }))}
            >
              Mark as Paid
            </Btn>
          </div>
        </div>
      )}
    </Modal>
  );
}

// ---------------------------------------------------------------------------
// Base page — driven entirely by the hooks passed in from each thin
// role-specific wrapper (ReimbursementEmployee.jsx / Manager / Admin / SuperAdmin)
// ---------------------------------------------------------------------------
export default function ReimbursementBase({
  roleLabel,
  canApply = true,
  myClaims,
  applyMutation,
  updateMutation,
  deleteMutation,
  reviewQueue,   // { pending: {data, isLoading}, all: {data, isLoading}, approve, reject, markPaid }
}) {
  const [tab, setTab] = useState(canApply ? "apply" : "review");
  const [viewClaim, setViewClaim] = useState(null);
  const [viewIsReview, setViewIsReview] = useState(false);
  const [editClaim, setEditClaim] = useState(null);
  const [submitting, setSubmitting] = useState(null);
  const [deciding, setDeciding] = useState(null);
  const [reviewFilter, setReviewFilter] = useState("submitted");
  const [banner, setBanner] = useState(null);
  const [isExportHovered, setIsExportHovered] = useState(false);

  const { data: authData } = useAuth();
  const person =
    authData?.role === "employee" ? authData?.data?.employee
    : authData?.role === "manager" ? authData?.data?.manager
    : authData?.role === "admin" ? authData?.data?.user
    : null;
  const bankDetailsAvailable = !!(
    person?.bank_name?.trim() &&
    person?.account_holder_name?.trim() &&
    person?.account_number?.trim() &&
    person?.ifsc_code?.trim()
  );

  const my = myClaims?.data?.reimbursements || [];
  const pending = reviewQueue?.pending?.data?.reimbursements || [];
  const all = reviewQueue?.all?.data?.reimbursements || [];

  const flash = (msg) => {
    setBanner(msg);
    setTimeout(() => setBanner(null), 3500);
  };

  const handleApply = async (formData, status) => {
    setSubmitting(status);
    try {
      await applyMutation.mutateAsync(formData);
      flash(status === "draft" ? "Saved as draft." : "Reimbursement claim submitted.");
      setTab(canApply ? "mine" : "review");
    } finally {
      setSubmitting(null);
    }
  };

  const handleUpdate = async (formData, status) => {
    setSubmitting(status);
    try {
      await updateMutation.mutateAsync({ id: editClaim._id, data: formData });
      flash("Claim updated.");
      setEditClaim(null);
      setTab("mine");
    } finally {
      setSubmitting(null);
    }
  };

  const handleDelete = async (claim) => {
    if (!window.confirm(`Delete draft claim ${claim.claimNumber}?`)) return;
    await deleteMutation.mutateAsync(claim._id);
    flash("Draft deleted.");
  };

  const filteredAll = useMemo(() => {
    if (!reviewFilter) return all;
    return all.filter((c) => c.status === reviewFilter);
  }, [all, reviewFilter]);

  const reviewBuckets = useMemo(
    () =>
      ["", "draft", "submitted", "approved", "rejected", "paid"].map((status) => {
        const claims = status ? all.filter((claim) => claim.status === status) : all;
        return {
          key: status,
          label: status ? STATUS_META[status].label : "All",
          claims,
          count: claims.length,
          totalAmount: claimAmountSummary(claims),
        };
      }),
    [all]
  );

  const selectedReviewBucket =
    reviewBuckets.find((bucket) => bucket.key === reviewFilter) || reviewBuckets[0];

  const handleExportAllClaims = () => {
    if (!filteredAll.length) return;
    const safeLabel = selectedReviewBucket.label.toLowerCase().replace(/[^a-z0-9]+/g, "-");
    const filename = `reimbursements-${safeLabel}-${new Date().toISOString().slice(0, 10)}.csv`;
    downloadCsv(filename, CLAIM_CSV_COLUMNS, buildClaimCsvRows(filteredAll));
    flash(`${selectedReviewBucket.label} claims exported.`);
  };

  const tabBtn = (key, label) => (
    <button
      onClick={() => setTab(key)}
      style={{
        padding: "9px 18px",
        borderRadius: 999,
        border: `1px solid ${tab === key ? C.brand : C.border}`,
        background: tab === key ? C.brand : "#fff",
        color: tab === key ? "#fff" : C.text,
        fontSize: 13,
        fontWeight: 600,
        cursor: "pointer",
      }}
    >
      {label}
    </button>
  );

  return (
    <div style={{ background: C.page, minHeight: "100vh", padding: "28px 32px", fontFamily: "inherit" }}>
      <style>{`@keyframes reimb-spin { to { transform: rotate(360deg); } }`}</style>

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 22 }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 22, color: C.brandDark }}>Reimbursements</h1>
          <p style={{ margin: "4px 0 0", fontSize: 13, color: C.muted }}>{roleLabel}</p>
        </div>
      </div>

      {banner && (
        <div style={{ background: C.greenBg, color: C.green, padding: "10px 16px", borderRadius: 10, fontSize: 13, marginBottom: 16 }}>
          {banner}
        </div>
      )}

      <div style={{ display: "flex", gap: 10, marginBottom: 20, flexWrap: "wrap" }}>
        {canApply && tabBtn("apply", "Apply Claim")}
        {canApply && tabBtn("mine", "My Claims")}
        {reviewQueue && tabBtn("review", `Review Queue${pending.length ? ` (${pending.length})` : ""}`)}
        {reviewQueue && tabBtn("all", "All Claims")}
      </div>

      <div style={{ background: C.surface, borderRadius: 16, border: `1px solid ${C.border}`, padding: 22 }}>
        {tab === "apply" && canApply && (
          <ClaimForm onSubmit={handleApply} submitting={submitting} bankDetailsAvailable={bankDetailsAvailable} />
        )}

        {tab === "mine" && canApply && (
          <>
            {myClaims?.isLoading ? (
              <div style={{ padding: 40, textAlign: "center", color: C.muted }}>Loading…</div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                <ClaimsTable claims={my} onView={(c) => { setViewClaim(c); setViewIsReview(false); }} emptyText="You haven't submitted any claims yet." />
              </div>
            )}
          </>
        )}

        {tab === "review" && reviewQueue && (
          <>
            {reviewQueue.pending?.isLoading ? (
              <div style={{ padding: 40, textAlign: "center", color: C.muted }}>Loading…</div>
            ) : (
              <ClaimsTable claims={pending} onView={(c) => { setViewClaim(c); setViewIsReview(true); }} showSubmitter emptyText="Nothing pending review right now." />
            )}
          </>
        )}

        {tab === "all" && reviewQueue && (
          <>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                gap: 12,
                marginBottom: 16,
                flexWrap: "wrap",
              }}
            >
              <Btn
                variant="outline"
                onClick={handleExportAllClaims}
                disabled={!filteredAll.length || reviewQueue.all?.isLoading}
                onMouseEnter={() => setIsExportHovered(true)}
                onMouseLeave={() => setIsExportHovered(false)}
                style={{
                  background: isExportHovered ? C.brand : "#fff",
                  color: isExportHovered ? "#fff" : C.brand,
                }}
              >
                Export CSV
              </Btn>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  flexWrap: "wrap",
                  marginLeft: "auto",
                }}
              >
                <span
                  style={{
                    fontSize: 12,
                    fontWeight: 700,
                    color: C.brandDark,
                    background: C.brandLight,
                    padding: "7px 12px",
                    borderRadius: 999,
                  }}
                >
                  {selectedReviewBucket.label}: {selectedReviewBucket.totalAmount}
                </span>
                <span style={{ fontSize: 12, color: C.muted }}>
                  {selectedReviewBucket.count} claim{selectedReviewBucket.count === 1 ? "" : "s"}
                </span>
              </div>
            </div>
            <div style={{ display: "flex", gap: 8, marginBottom: 12, flexWrap: "wrap" }}>
              {["", "draft", "submitted", "approved", "rejected", "paid"].map((s) => (
                <button
                  key={s || "any"}
                  onClick={() => setReviewFilter(s)}
                  style={{
                    padding: "5px 12px",
                    borderRadius: 999,
                    fontSize: 12,
                    fontWeight: 600,
                    border: `1px solid ${reviewFilter === s ? C.brand : C.border}`,
                    background: reviewFilter === s ? C.brandLight : "#fff",
                    color: reviewFilter === s ? C.brandDark : C.muted,
                    cursor: "pointer",
                  }}
                >
                  {s ? STATUS_META[s].label : "All"}
                </button>
              ))}
            </div>
            {reviewQueue.all?.isLoading ? (
              <div style={{ padding: 40, textAlign: "center", color: C.muted }}>Loading…</div>
            ) : (
              <ClaimsTable claims={filteredAll} onView={(c) => { setViewClaim(c); setViewIsReview(true); }} showSubmitter emptyText="No claims found." />
            )}
          </>
        )}
      </div>

      {viewClaim && !viewIsReview && (
        <Modal title={`Claim ${viewClaim.claimNumber}`} onClose={() => { setViewClaim(null); setViewIsReview(false); }} width={520}>
          <ClaimDetail claim={viewClaim} />
          {viewClaim.status === "draft" && (
            <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", marginTop: 16 }}>
              <Btn variant="red" onClick={() => { handleDelete(viewClaim); setViewClaim(null); }}>Delete</Btn>
              <Btn variant="outline" onClick={() => { setEditClaim(viewClaim); setViewClaim(null); }}>Edit &amp; Submit</Btn>
            </div>
          )}
        </Modal>
      )}

      {viewClaim && viewIsReview && reviewQueue && (
        <DecisionModal
          claim={viewClaim}
          mode="review"
          onClose={() => { setViewClaim(null); setViewIsReview(false); }}
          onApprove={async (payload) => { setDeciding("approve"); try { await reviewQueue.approve.mutateAsync(payload); flash("Claim approved."); } finally { setDeciding(null); } }}
          onReject={async (payload) => { setDeciding("reject"); try { await reviewQueue.reject.mutateAsync(payload); flash("Claim rejected."); } finally { setDeciding(null); } }}
          onMarkPaid={reviewQueue.markPaid ? async (payload) => { setDeciding("paid"); try { await reviewQueue.markPaid.mutateAsync(payload); flash("Claim marked as paid."); } finally { setDeciding(null); } } : null}
          deciding={deciding}
        />
      )}

      {editClaim && (
        <Modal title={`Edit ${editClaim.claimNumber}`} onClose={() => setEditClaim(null)} width={560}>
          <ClaimForm initial={editClaim} onSubmit={handleUpdate} submitting={submitting} onCancel={() => setEditClaim(null)} bankDetailsAvailable={bankDetailsAvailable} />
        </Modal>
      )}
    </div>
  );
}
