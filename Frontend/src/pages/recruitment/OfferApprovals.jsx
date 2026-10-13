import React, { useRef, useState } from "react";
import toast from "react-hot-toast";
import { FaCheckCircle, FaTimesCircle, FaEye, FaSignature, FaTimes, FaFileSignature, FaInbox, FaUpload } from "react-icons/fa";
import { useMyApprovals, useApproveLetter, useRejectLetter } from "../../auth/server-state/adminrecruitment/adrecruitment.hook";
import { fetchApprovalPreview } from "../../auth/api/adminapi/recruitment/recruitment.api";

const fmtDate = (iso) => (iso ? new Date(iso).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric", timeZone: "Asia/Kolkata" }) : "—");
const fmtDateTime = (iso) =>
  iso ? new Date(iso).toLocaleString("en-IN", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit", timeZone: "Asia/Kolkata" }) : "—";
const inr = (n) => (n ? `₹ ${Number(n).toLocaleString("en-IN")}` : "—");
const KIND_LABEL = { offer: "Offer Letter", appointment: "Appointment Letter" };

const primaryBtn = "flex items-center justify-center gap-2 px-4 py-2 bg-[#730042] text-white text-xs font-semibold rounded-xl hover:bg-[#4a0029] disabled:opacity-60 disabled:cursor-not-allowed transition-all";
const ghostBtn = "flex items-center justify-center gap-2 px-4 py-2 text-xs font-semibold text-gray-600 border border-gray-200 rounded-xl hover:border-[#730042] hover:text-[#730042] disabled:opacity-60 disabled:cursor-not-allowed transition-all";

const openPreview = async (row) => {
  // Open the tab synchronously so popup blockers allow it, then point it at the PDF.
  const win = window.open("", "_blank");
  try {
    const blob = await fetchApprovalPreview({ kind: row.kind, id: row.id });
    const url = URL.createObjectURL(blob);
    if (win) win.location.href = url;
    else window.location.href = url;
    setTimeout(() => URL.revokeObjectURL(url), 60000);
  } catch (err) {
    if (win) win.close();
    toast.error(err?.message || "Could not open the letter");
  }
};

const ApproveModal = ({ row, lastSignatureUrl, onClose }) => {
  const approveMut = useApproveLetter();
  const fileRef = useRef(null);
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [useSaved, setUseSaved] = useState(!!lastSignatureUrl);

  const pick = (e) => {
    const f = e.target.files?.[0];
    if (!f) return;
    if (!["image/png", "image/jpeg"].includes(f.type)) return toast.error("Only PNG or JPG signature images are allowed");
    if (f.size > 1024 * 1024) return toast.error("Signature image must be under 1 MB");
    setFile(f);
    setUseSaved(false);
    setPreview(URL.createObjectURL(f));
  };

  const signatureShown = useSaved ? lastSignatureUrl : preview;
  const ready = useSaved ? !!lastSignatureUrl : !!file;

  const submit = async () => {
    try {
      const res = await approveMut.mutateAsync({
        kind: row.kind,
        id: row.id,
        signatureFile: useSaved ? null : file,
        reuseSignatureUrl: useSaved ? lastSignatureUrl : null,
      });
      toast.success(res?.message || "Approved");
      onClose();
    } catch (err) {
      toast.error(err?.message || "Could not approve");
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[1200] flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl">
        <div className="flex items-center justify-between px-6 py-5 border-b border-gray-100">
          <h2 className="text-lg font-bold text-gray-900" style={{ fontFamily: "'Cormorant Garamond', serif" }}>Approve and sign</h2>
          <button onClick={onClose} className="text-gray-400 hover:bg-gray-100 p-2 rounded-lg transition-colors"><FaTimes size={13} /></button>
        </div>
        <div className="p-6 space-y-4">
          <p className="text-xs text-gray-500 leading-relaxed">
            Your signature will be attached to the {KIND_LABEL[row.kind].toLowerCase()} for <strong>{row.candidate_name}</strong>, and the letter will be finalized and sent back to <strong>{row.requested_by_name || "the requester"}</strong>.
          </p>

          {lastSignatureUrl && (
            <div className="flex gap-2">
              <button onClick={() => setUseSaved(true)} className={`flex-1 text-xs font-semibold px-3 py-2 rounded-xl border-2 ${useSaved ? "border-[#730042] bg-[#fdf5f9] text-[#730042]" : "border-gray-100 text-gray-500"}`}>Use my last signature</button>
              <button onClick={() => { setUseSaved(false); fileRef.current?.click(); }} className={`flex-1 text-xs font-semibold px-3 py-2 rounded-xl border-2 ${!useSaved ? "border-[#730042] bg-[#fdf5f9] text-[#730042]" : "border-gray-100 text-gray-500"}`}>Upload new</button>
            </div>
          )}

          <div
            onClick={() => fileRef.current?.click()}
            className="cursor-pointer border-2 border-dashed border-[#eedde8] rounded-xl bg-[#fdf5f9] hover:border-[#730042] transition-colors flex flex-col items-center justify-center py-6 px-4 text-center"
          >
            {signatureShown ? (
              <img src={signatureShown} alt="Signature preview" className="max-h-20 max-w-full object-contain bg-white rounded-md px-3 py-2 border border-gray-100" />
            ) : (
              <>
                <FaUpload className="text-[#730042] mb-2" size={18} />
                <div className="text-xs font-semibold text-gray-700">Upload your signature</div>
                <div className="text-[11px] text-gray-400 mt-1">PNG or JPG, up to 1 MB. A transparent PNG looks best.</div>
              </>
            )}
          </div>
          <input ref={fileRef} type="file" accept="image/png,image/jpeg" className="hidden" onChange={pick} />
        </div>
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-100">
          <button onClick={onClose} className="px-4 py-2 text-sm font-medium text-gray-600 border border-gray-200 rounded-xl hover:border-[#730042] hover:text-[#730042] transition-colors">Cancel</button>
          <button onClick={submit} disabled={!ready || approveMut.isPending} className={primaryBtn}>
            <FaSignature size={11} /> {approveMut.isPending ? "Approving…" : "Approve and finalize"}
          </button>
        </div>
      </div>
    </div>
  );
};

const RejectModal = ({ row, onClose }) => {
  const rejectMut = useRejectLetter();
  const [reason, setReason] = useState("");

  const submit = async () => {
    try {
      const res = await rejectMut.mutateAsync({ kind: row.kind, id: row.id, reason });
      toast.success(res?.message || "Rejected");
      onClose();
    } catch (err) {
      toast.error(err?.message || "Could not reject");
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[1200] flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl">
        <div className="flex items-center justify-between px-6 py-5 border-b border-gray-100">
          <h2 className="text-lg font-bold text-gray-900" style={{ fontFamily: "'Cormorant Garamond', serif" }}>Reject letter</h2>
          <button onClick={onClose} className="text-gray-400 hover:bg-gray-100 p-2 rounded-lg transition-colors"><FaTimes size={13} /></button>
        </div>
        <div className="p-6 space-y-3">
          <p className="text-xs text-gray-500 leading-relaxed">The {KIND_LABEL[row.kind].toLowerCase()} for <strong>{row.candidate_name}</strong> goes back to {row.requested_by_name || "the requester"} to regenerate. Tell them what to change.</p>
          <textarea
            rows={4}
            autoFocus
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="e.g. CTC break-up is incorrect, joining date should be 1 Nov"
            className="w-full px-3 py-2.5 bg-[#fdf5f9] border border-[#eedde8] rounded-xl text-sm text-gray-800 outline-none focus:border-[#730042] focus:ring-2 focus:ring-[#730042]/10 transition-all resize-y"
          />
        </div>
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-100">
          <button onClick={onClose} className="px-4 py-2 text-sm font-medium text-gray-600 border border-gray-200 rounded-xl hover:border-[#730042] hover:text-[#730042] transition-colors">Cancel</button>
          <button onClick={submit} disabled={reason.trim().length < 3 || rejectMut.isPending} className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white text-xs font-semibold rounded-xl hover:bg-red-700 disabled:opacity-60 disabled:cursor-not-allowed transition-all">
            <FaTimesCircle size={11} /> {rejectMut.isPending ? "Rejecting…" : "Reject"}
          </button>
        </div>
      </div>
    </div>
  );
};

const Meta = ({ label, value }) => (
  <div>
    <div className="text-[10px] font-semibold tracking-widest text-gray-400 uppercase mb-0.5">{label}</div>
    <div className="text-sm font-semibold text-gray-800">{value || "—"}</div>
  </div>
);

const OfferApprovals = () => {
  const { data, isLoading, isError } = useMyApprovals();
  const [approveRow, setApproveRow] = useState(null);
  const [rejectRow, setRejectRow] = useState(null);
  const [tab, setTab] = useState("pending");

  const pending = data?.data?.pending || [];
  const history = data?.data?.history || [];
  const lastSignatureUrl = data?.data?.last_signature_url || null;
  const rows = tab === "pending" ? pending : history;

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-2 border-b border-gray-200">
        {[
          { key: "pending", label: `Waiting for me (${pending.length})` },
          { key: "history", label: "Decided" },
        ].map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`py-3 px-4 text-xs font-semibold border-b-2 transition-all -mb-px ${tab === t.key ? "border-[#730042] text-[#730042]" : "border-transparent text-gray-500 hover:text-gray-800"}`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {isLoading && <div className="py-12 text-center text-sm text-gray-400">Loading approvals…</div>}
      {isError && <div className="py-12 text-center text-sm text-red-400">Could not load approvals.</div>}

      {!isLoading && !isError && rows.length === 0 && (
        <div className="text-center py-14 text-gray-400">
          <FaInbox size={30} className="mx-auto mb-3 opacity-40" />
          <p className="text-sm">{tab === "pending" ? "Nothing is waiting for your approval." : "No decisions yet."}</p>
        </div>
      )}

      <div className="space-y-3">
        {rows.map((row) => (
          <div key={`${row.kind}-${row.id}`} className="bg-white border border-gray-100 rounded-2xl p-5 shadow-sm">
            <div className="flex items-start justify-between gap-3 flex-wrap mb-4">
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-sm font-bold text-gray-900">{row.candidate_name}</span>
                  <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-[#f7edf3] text-[#730042]">{KIND_LABEL[row.kind]}</span>
                  {row.resubmission && row.approval_status === "PENDING" && <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-amber-50 text-amber-700">Regenerated</span>}
                </div>
                <div className="text-xs text-gray-400 mt-0.5">{row.ref_no} · {row.designation}</div>
              </div>
              {row.approval_status === "APPROVED" && <span className="flex items-center gap-1.5 text-[10px] font-bold px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700"><FaCheckCircle size={10} /> Approved</span>}
              {row.approval_status === "REJECTED" && <span className="flex items-center gap-1.5 text-[10px] font-bold px-2.5 py-1 rounded-full bg-red-50 text-red-600"><FaTimesCircle size={10} /> Rejected</span>}
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-4">
              <Meta label="Annual CTC" value={inr(row.annual_ctc)} />
              <Meta label="Joining date" value={fmtDate(row.joining_date)} />
              <Meta label="Requested by" value={row.requested_by_name} />
              <Meta label={row.approval_status === "PENDING" ? "Requested on" : "Decided on"} value={fmtDateTime(row.approval_status === "PENDING" ? row.requested_at : row.decided_at)} />
            </div>

            {row.approval_status === "REJECTED" && row.rejection_reason && (
              <div className="bg-red-50 border-l-4 border-red-300 rounded-lg px-3 py-2 text-xs text-red-600 mb-4">{row.rejection_reason}</div>
            )}

            <div className="flex flex-wrap gap-2 items-center">
              <button onClick={() => openPreview(row)} className={ghostBtn}><FaEye size={10} /> View letter</button>
              {row.approval_status === "PENDING" && (
                <>
                  <button onClick={() => setApproveRow(row)} className={primaryBtn}><FaSignature size={11} /> Approve with signature</button>
                  <button onClick={() => setRejectRow(row)} className="flex items-center gap-2 px-4 py-2 text-xs font-semibold text-red-600 border border-red-200 rounded-xl hover:bg-red-50 transition-all"><FaTimesCircle size={10} /> Reject</button>
                </>
              )}
              {row.approval_status === "APPROVED" && row.signature_url && (
                <img src={row.signature_url} alt="Your signature" className="h-8 max-w-[120px] object-contain ml-auto bg-white border border-gray-100 rounded-md px-2 py-0.5" />
              )}
            </div>
          </div>
        ))}
      </div>

      {approveRow && <ApproveModal row={approveRow} lastSignatureUrl={lastSignatureUrl} onClose={() => setApproveRow(null)} />}
      {rejectRow && <RejectModal row={rejectRow} onClose={() => setRejectRow(null)} />}
    </div>
  );
};

export const OfferApprovalsHeader = () => (
  <div className="bg-gradient-to-br from-[#2e0019] via-[#4a0029] to-[#CD166E] rounded-2xl px-4 sm:px-8 py-6 mb-6 relative overflow-hidden shadow-xl">
    <div className="absolute w-72 h-72 rounded-full -top-36 -right-16 bg-white/5 pointer-events-none" />
    <div className="relative z-10 flex items-center gap-3">
      <div className="w-11 h-11 rounded-xl bg-white/10 border border-white/15 flex items-center justify-center text-white"><FaFileSignature size={18} /></div>
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold text-white" style={{ fontFamily: "'Cormorant Garamond', serif" }}>Offer Approvals</h1>
        <p className="text-xs text-white/60 font-light">Offer and appointment letters sent to you. Review, sign and finalize, or send back with a reason.</p>
      </div>
    </div>
  </div>
);

export default OfferApprovals;