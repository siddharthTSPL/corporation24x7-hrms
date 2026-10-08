import React, { useState } from "react";
import toast from "react-hot-toast";
import { FaPaperPlane, FaTimes, FaUserShield, FaHourglassHalf, FaCheckCircle, FaTimesCircle, FaUndo, FaRedo } from "react-icons/fa";
import { useApprovers, useSubmitForApproval, useWithdrawApproval } from "../../auth/server-state/adminrecruitment/adrecruitment.hook";

const primaryBtn = "flex items-center justify-center gap-2 px-4 py-2 bg-[#730042] text-white text-xs font-semibold rounded-xl hover:bg-[#4a0029] disabled:opacity-60 disabled:cursor-not-allowed transition-all";
const ghostBtn = "flex items-center justify-center gap-2 px-4 py-2 text-xs font-semibold text-gray-600 border border-gray-200 rounded-xl hover:border-[#730042] hover:text-[#730042] disabled:opacity-60 disabled:cursor-not-allowed transition-all";

const fmtDateTime = (iso) =>
  iso ? new Date(iso).toLocaleString("en-IN", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit", timeZone: "Asia/Kolkata" }) : "—";

const LABEL = { offer: "offer letter", appointment: "appointment letter" };

const SendForApprovalModal = ({ kind, letter, onClose }) => {
  const { data, isLoading } = useApprovers(true);
  const submitMut = useSubmitForApproval();
  const [selected, setSelected] = useState("");
  const approvers = data?.data || [];

  const submit = async () => {
    const person = approvers.find((a) => `${a.model}:${a.id}` === selected);
    if (!person) return toast.error("Choose who should approve this letter");
    try {
      const res = await submitMut.mutateAsync({ kind, id: letter._id, approver_id: person.id, approver_model: person.model });
      toast.success(res?.message || "Sent for approval");
      onClose();
    } catch (err) {
      toast.error(err?.message || "Could not send for approval");
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[1200] flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl">
        <div className="flex items-center justify-between px-6 py-5 border-b border-gray-100">
          <h2 className="text-lg font-bold text-gray-900" style={{ fontFamily: "'Cormorant Garamond', serif" }}>Send for approval</h2>
          <button onClick={onClose} className="text-gray-400 hover:bg-gray-100 p-2 rounded-lg transition-colors"><FaTimes size={13} /></button>
        </div>
        <div className="p-6 space-y-4">
          <p className="text-xs text-gray-500 leading-relaxed">
            Choose an Admin or the Super Admin. They will receive this {LABEL[kind]} in their Recruitment, Offer Approvals section, and can finalize it with their signature or reject it with a reason.
          </p>
          <div>
            <label className="block text-[10px] font-semibold tracking-widest text-gray-400 uppercase mb-1.5">Approver</label>
            <select
              className="w-full px-3 py-2.5 bg-[#fdf5f9] border border-[#eedde8] rounded-xl text-sm text-gray-800 outline-none focus:border-[#730042] focus:ring-2 focus:ring-[#730042]/10 transition-all"
              value={selected}
              onChange={(e) => setSelected(e.target.value)}
              disabled={isLoading}
            >
              <option value="">{isLoading ? "Loading…" : "Select Admin / Super Admin"}</option>
              {approvers.some((a) => a.model === "SuperAdmin") && (
                <optgroup label="Super Admin">
                  {approvers.filter((a) => a.model === "SuperAdmin").map((a) => (
                    <option key={a.id} value={`${a.model}:${a.id}`}>{a.name}{a.designation ? ` · ${a.designation}` : ""}</option>
                  ))}
                </optgroup>
              )}
              {approvers.some((a) => a.model === "Admin") && (
                <optgroup label="Admins">
                  {approvers.filter((a) => a.model === "Admin").map((a) => (
                    <option key={a.id} value={`${a.model}:${a.id}`}>{a.name}{a.designation ? ` · ${a.designation}` : ""}</option>
                  ))}
                </optgroup>
              )}
            </select>
            {!isLoading && approvers.length === 0 && <p className="text-[11px] text-amber-600 mt-2">No other active Admin or Super Admin found in your organisation.</p>}
          </div>
        </div>
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-100">
          <button onClick={onClose} className="px-4 py-2 text-sm font-medium text-gray-600 border border-gray-200 rounded-xl hover:border-[#730042] hover:text-[#730042] transition-colors">Cancel</button>
          <button onClick={submit} disabled={!selected || submitMut.isPending} className={primaryBtn}>
            <FaPaperPlane size={10} /> {submitMut.isPending ? "Sending…" : "Send"}
          </button>
        </div>
      </div>
    </div>
  );
};

/**
 * Creator-side approval controls for an offer or appointment letter.
 * Renders the state (pending / rejected / approved) and the matching action.
 *  - `showSend`: show the "Send for approval" / "Regenerate" button (letter is a draft)
 *  - `onRegenerate`: opens the letter editor so the creator can fix it after a rejection
 */
const ApprovalPanel = ({ kind, letter, canAct, showSend, onRegenerate }) => {
  const [open, setOpen] = useState(false);
  const withdrawMut = useWithdrawApproval();
  const ap = letter.approval || {};
  const rejected = ap.status === "REJECTED" && letter.status === "DRAFT";
  const pending = letter.status === "PENDING_APPROVAL";
  const approved = ap.status === "APPROVED" && letter.status !== "DRAFT" && letter.status !== "PENDING_APPROVAL";

  const withdraw = async () => {
    try {
      const res = await withdrawMut.mutateAsync({ kind, id: letter._id });
      toast.success(res?.message || "Withdrawn");
    } catch (err) {
      toast.error(err?.message || "Could not withdraw");
    }
  };

  return (
    <div className="space-y-3">
      {pending && (
        <div className="bg-blue-50 border border-blue-100 rounded-xl p-4">
          <div className="flex items-center gap-2 text-xs font-bold text-blue-700 mb-1"><FaHourglassHalf size={11} /> Waiting for approval</div>
          <p className="text-xs text-blue-800 leading-relaxed">
            Sent to <strong>{ap.approver_name}</strong>{ap.approver_designation ? ` (${ap.approver_designation})` : ""} on {fmtDateTime(ap.requested_at)}. The letter is locked until they approve or reject it.
          </p>
          {canAct && (
            <button onClick={withdraw} disabled={withdrawMut.isPending} className={`${ghostBtn} mt-3`}>
              <FaUndo size={10} /> {withdrawMut.isPending ? "Withdrawing…" : "Withdraw request"}
            </button>
          )}
        </div>
      )}

      {rejected && (
        <div className="bg-red-50 border-l-4 border-red-400 rounded-xl p-4">
          <div className="flex items-center gap-2 text-[10px] font-semibold tracking-widest text-red-400 uppercase mb-1"><FaTimesCircle size={11} /> Rejected by {ap.approver_name} · {fmtDateTime(ap.decided_at)}</div>
          <p className="text-sm text-red-600 font-semibold leading-snug">{ap.rejection_reason}</p>
          <p className="text-[11px] text-red-400 mt-2">Regenerate the {LABEL[kind]} with the requested changes and send it for approval again.</p>
          {canAct && onRegenerate && (
            <button onClick={onRegenerate} className={`${primaryBtn} mt-3`}><FaRedo size={10} /> Regenerate {LABEL[kind]}</button>
          )}
        </div>
      )}

      {approved && (
        <div className="bg-emerald-50 border border-emerald-100 rounded-xl p-4 flex items-start justify-between gap-3 flex-wrap">
          <div>
            <div className="flex items-center gap-2 text-xs font-bold text-emerald-700 mb-1"><FaCheckCircle size={11} /> Finalized and signed</div>
            <p className="text-xs text-emerald-800 leading-relaxed">
              Approved by <strong>{ap.approver_name}</strong> on {fmtDateTime(ap.decided_at)}. Their signature is attached to the letter.
            </p>
          </div>
          {ap.signature_url && <img src={ap.signature_url} alt="Approver signature" className="h-10 max-w-[140px] object-contain bg-white rounded-md border border-emerald-100 px-2 py-1" />}
        </div>
      )}

      {showSend && canAct && !pending && (
        <div className="flex flex-wrap items-center gap-2">
          <button onClick={() => setOpen(true)} className={primaryBtn}>
            <FaUserShield size={11} /> {rejected ? "Send for approval again" : "Send for approval"}
          </button>
          <span className="text-[11px] text-gray-400">An Admin or the Super Admin finalizes it with their signature.</span>
        </div>
      )}

      {open && <SendForApprovalModal kind={kind} letter={letter} onClose={() => setOpen(false)} />}
    </div>
  );
};

export default ApprovalPanel;