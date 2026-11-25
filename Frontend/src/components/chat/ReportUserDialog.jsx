import { useState } from "react";
import { FaTimes } from "react-icons/fa";
import { useReportUser } from "../../auth/server-state/chat/chatSettings.hook";
import { REPORT_REASONS } from "../../auth/api/chat/chatSettings.api";

// <ReportUserDialog person={{key,name}} conversationId? messageId? onClose />
export default function ReportUserDialog({ person, conversationId, messageId, onClose }) {
  const [reason, setReason] = useState("");
  const [details, setDetails] = useState("");
  const report = useReportUser();

  const submit = () => {
    if (!reason) return;
    report.mutate({ targetKey: person.key, reason, details: details.trim() || undefined, conversationId, messageId }, { onSuccess: onClose });
  };

  return (
    <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div className="w-full max-w-sm rounded-2xl bg-white p-5 shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h3 className="text-base font-bold text-gray-900">Report {person.name || "user"}</h3>
            <p className="mt-0.5 text-xs text-gray-500">Only admins of your organisation will see this. The person is not notified.</p>
          </div>
          <button type="button" onClick={onClose} className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-gray-500 hover:bg-gray-100"><FaTimes className="text-xs" /></button>
        </div>

        <div className="mt-4 space-y-1">
          {REPORT_REASONS.map((r) => (
            <label key={r.id} className={`flex cursor-pointer items-center gap-3 rounded-xl px-3 py-2.5 text-sm ${reason === r.id ? "bg-[#F6E8EF] text-[#730042]" : "text-gray-800 hover:bg-gray-50"}`}>
              <input type="radio" name="report-reason" checked={reason === r.id} onChange={() => setReason(r.id)} className="accent-[#730042]" />
              {r.label}
            </label>
          ))}
        </div>

        <textarea
          value={details}
          onChange={(e) => setDetails(e.target.value.slice(0, 500))}
          rows={3}
          placeholder="Add details (optional)"
          className="mt-3 w-full resize-none rounded-xl border border-gray-200 px-3 py-2 text-sm outline-none focus:border-[#730042]"
        />
        <p className="text-right text-[11px] text-gray-400">{details.length}/500</p>

        <div className="mt-3 flex justify-end gap-2">
          <button type="button" onClick={onClose} className="rounded-full border border-gray-200 px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50">Cancel</button>
          <button type="button" onClick={submit} disabled={!reason || report.isPending} className="rounded-full bg-red-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-40">Report</button>
        </div>
      </div>
    </div>
  );
}
