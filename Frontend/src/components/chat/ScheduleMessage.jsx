import { useState } from "react";
import toast from "react-hot-toast";
import { FaClock, FaTimes, FaTrash, FaPaperPlane } from "react-icons/fa";
import { useScheduleMessage, useScheduledMessages, useCancelScheduled, useSendScheduledNow } from "../../auth/server-state/chat/chatExtras.hook";

const pad = (n) => String(n).padStart(2, "0");
const toLocalInput = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
const fmt = (d) => new Date(d).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" });

const QUICK = [
  ["In 1 hour", () => new Date(Date.now() + 60 * 60 * 1000)],
  ["Tomorrow 9 AM", () => { const d = new Date(); d.setDate(d.getDate() + 1); d.setHours(9, 0, 0, 0); return d; }],
  ["Monday 9 AM", () => { const d = new Date(); d.setDate(d.getDate() + (((8 - d.getDay()) % 7) || 7)); d.setHours(9, 0, 0, 0); return d; }],
];

// "Schedule message": write now, it is sent later as you. Also lists what is still waiting in this chat.
export default function ScheduleMessage({ conversationId, initialText = "", replyTo, hasFiles, onClose, onScheduled }) {
  const [text, setText] = useState(initialText);
  const [when, setWhen] = useState(() => toLocalInput(QUICK[0][1]()));
  const schedule = useScheduleMessage();
  const cancel = useCancelScheduled();
  const sendNow = useSendScheduledNow();
  const { data: waiting = [] } = useScheduledMessages({ conversationId, enabled: !!conversationId });

  const submit = () => {
    const body = text.trim();
    const at = new Date(when);
    if (!body) return toast.error("Write the message to schedule.");
    if (isNaN(at) || at.getTime() < Date.now() + 30 * 1000) return toast.error("Pick a time in the future.");
    return schedule.mutate(
      { id: conversationId, text: body, sendAt: at.toISOString(), replyTo: replyTo?.id },
      {
        onSuccess: () => {
          toast.success(`Scheduled for ${fmt(at)}`);
          onScheduled?.();
          onClose();
        },
        onError: (e) => toast.error(e.message || "Could not schedule the message."),
      },
    );
  };

  return (
    <div className="max-h-[60vh] overflow-y-auto border-b border-gray-200 bg-[#FBF3F7] px-4 py-3">
      <div className="flex items-center justify-between">
        <p className="flex items-center gap-2 text-sm font-semibold text-[#730042]">
          <FaClock className="text-xs" /> Schedule message
        </p>
        <button type="button" onClick={onClose} title="Close" className="flex h-6 w-6 items-center justify-center rounded-full text-gray-500 hover:bg-white">
          <FaTimes className="text-xs" />
        </button>
      </div>

      <textarea
        value={text}
        onChange={(e) => setText(e.target.value.slice(0, 5000))}
        rows={2}
        placeholder="Message to send later…"
        className="mt-2 w-full resize-none rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm outline-none focus:border-[#730042]"
      />
      {hasFiles && <p className="mt-1 text-[11px] text-amber-700">Only text can be scheduled. Attached files are not included.</p>}

      <div className="mt-2 flex flex-wrap gap-1.5">
        {QUICK.map(([label, fn]) => (
          <button key={label} type="button" onClick={() => setWhen(toLocalInput(fn()))} className="rounded-full border border-[#730042]/25 bg-white px-3 py-1 text-xs font-medium text-[#730042] hover:bg-[#F6E8EF]">
            {label}
          </button>
        ))}
      </div>

      <div className="mt-2 flex items-center gap-2">
        <input type="datetime-local" value={when} min={toLocalInput(new Date())} onChange={(e) => setWhen(e.target.value)} className="min-w-0 flex-1 rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm outline-none focus:border-[#730042]" />
        <button type="button" onClick={submit} disabled={schedule.isPending} className="flex shrink-0 items-center gap-2 rounded-xl bg-gradient-to-br from-[#8A0A52] to-[#68003B] px-4 py-2 text-sm font-semibold text-white shadow-md shadow-[#730042]/25 disabled:opacity-50">
          <FaClock className="text-xs" /> Schedule
        </button>
      </div>

      {waiting.length > 0 && (
        <div className="mt-3 border-t border-[#730042]/15 pt-2">
          <p className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-gray-500">Waiting in this chat ({waiting.length})</p>
          <ul className="space-y-1.5">
            {waiting.map((w) => (
              <li key={w.id} className="flex items-start gap-2 rounded-xl bg-white px-3 py-2 text-sm shadow-sm">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-gray-800">{w.text}</p>
                  <p className={`text-[11px] ${w.status === "failed" ? "text-red-600" : "text-gray-500"}`}>{w.status === "failed" ? `Failed: ${w.error || "could not be sent"}` : fmt(w.sendAt)}</p>
                </div>
                <button type="button" title="Send now" disabled={sendNow.isPending} onClick={() => sendNow.mutate(w.id, { onError: (e) => toast.error(e.message || "Could not send.") })} className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[#730042] hover:bg-[#F6E8EF]">
                  <FaPaperPlane className="text-[11px]" />
                </button>
                <button type="button" title="Cancel" disabled={cancel.isPending} onClick={() => cancel.mutate(w.id, { onSuccess: () => toast.success("Scheduled message cancelled") })} className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-red-500 hover:bg-red-50">
                  <FaTrash className="text-[11px]" />
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
