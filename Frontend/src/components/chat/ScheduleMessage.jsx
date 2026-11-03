import { useState } from "react";
import toast from "react-hot-toast";
import { FaClock, FaTimes, FaTrash, FaPaperPlane, FaRegCalendarAlt, FaExclamationCircle } from "react-icons/fa";
import { useScheduleMessage, useScheduledMessages, useCancelScheduled, useSendScheduledNow } from "../../auth/server-state/chat/chatExtras.hook";

const pad = (n) => String(n).padStart(2, "0");
const toLocalInput = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
const fmt = (d) => new Date(d).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" });

const relative = (d) => {
  const ms = new Date(d).getTime() - Date.now();
  if (ms <= 0) return "sending shortly";
  const m = Math.round(ms / 60000);
  if (m < 60) return `in ${m} min`;
  const h = Math.floor(m / 60);
  if (h < 24) return `in ${h} h${m % 60 ? ` ${m % 60} min` : ""}`;
  const days = Math.floor(h / 24);
  return `in ${days} day${days > 1 ? "s" : ""}`;
};

const QUICK = [
  ["In 1 hour", () => new Date(Date.now() + 60 * 60 * 1000)],
  ["Tomorrow 9 AM", () => { const d = new Date(); d.setDate(d.getDate() + 1); d.setHours(9, 0, 0, 0); return d; }],
  ["Monday 9 AM", () => { const d = new Date(); d.setDate(d.getDate() + (((8 - d.getDay()) % 7) || 7)); d.setHours(9, 0, 0, 0); return d; }],
];

const LABEL = "text-[10.5px] font-semibold uppercase tracking-wider text-gray-500";

export default function ScheduleMessage({ conversationId, initialText = "", replyTo, hasFiles, onClose, onScheduled }) {
  const [text, setText] = useState(initialText);
  const [when, setWhen] = useState(() => toLocalInput(QUICK[0][1]()));
  const [picked, setPicked] = useState(QUICK[0][0]);
  const schedule = useScheduleMessage();
  const cancel = useCancelScheduled();
  const sendNow = useSendScheduledNow();
  const { data: waiting = [] } = useScheduledMessages({ conversationId, enabled: !!conversationId });

  const body = text.trim();
  const whenDate = new Date(when);
  const validWhen = !isNaN(whenDate) && whenDate.getTime() >= Date.now() + 30 * 1000;

  const submit = () => {
    if (!body) return toast.error("Write the message to schedule.");
    if (!validWhen) return toast.error("Pick a time in the future.");
    return schedule.mutate(
      { id: conversationId, text: body, sendAt: whenDate.toISOString(), replyTo: replyTo?.id },
      {
        onSuccess: () => {
          toast.success(`Scheduled for ${fmt(whenDate)}`);
          onScheduled?.();
          onClose();
        },
        onError: (e) => toast.error(e.message || "Could not schedule the message."),
      },
    );
  };

  return (
    <div className="chat-pop chat-scroll max-h-[65vh] overflow-y-auto border-t border-gray-200 bg-white">
      <div className="h-1 bg-gradient-to-r from-[#8A0A52] via-[#CD166E] to-[#68003B]" />
      <div className="px-4 pb-4 pt-3.5">
        <div className="flex items-center gap-3">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#F6E8EF] text-[#730042]">
            <FaClock className="text-sm" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold tracking-tight text-gray-900">Schedule message</p>
            <p className="text-xs text-gray-500">Write it now, it goes out later as you</p>
          </div>
          <button type="button" onClick={onClose} title="Close" aria-label="Close" className="flex h-8 w-8 items-center justify-center rounded-xl text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-700">
            <FaTimes className="text-xs" />
          </button>
        </div>

        <div className="mt-3.5 rounded-2xl border border-gray-200 bg-gray-50 transition-all focus-within:border-[#730042]/40 focus-within:bg-white focus-within:ring-4 focus-within:ring-[#730042]/10">
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value.slice(0, 5000))}
            rows={3}
            placeholder="Message to send later…"
            className="block w-full resize-none bg-transparent px-3.5 pt-3 text-sm text-gray-900 outline-none placeholder:text-gray-400"
          />
          <p className="px-3.5 pb-2 pt-1 text-right text-[11px] text-gray-400">{text.length}/5000</p>
        </div>
        {hasFiles && (
          <p className="mt-2 flex items-center gap-1.5 rounded-xl bg-amber-50 px-3 py-2 text-xs text-amber-800">
            <FaExclamationCircle className="shrink-0 text-[11px]" /> Only text can be scheduled. Attached files are not included.
          </p>
        )}

        <p className={`mb-2 mt-4 ${LABEL}`}>Send at</p>
        <div className="flex flex-wrap gap-1.5">
          {QUICK.map(([label, fn]) => (
            <button
              key={label}
              type="button"
              onClick={() => { setWhen(toLocalInput(fn())); setPicked(label); }}
              className={`rounded-full border px-3.5 py-1.5 text-xs font-medium transition-colors ${picked === label ? "border-[#730042] bg-[#730042] text-white shadow-sm" : "border-gray-200 bg-white text-gray-700 hover:border-[#730042]/40 hover:bg-[#FBF3F7] hover:text-[#730042]"}`}
            >
              {label}
            </button>
          ))}
        </div>

        <div className="mt-2.5 flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-3 py-2 transition-all focus-within:border-[#730042]/40 focus-within:ring-4 focus-within:ring-[#730042]/10">
          <FaRegCalendarAlt className="shrink-0 text-sm text-[#730042]" />
          <input
            type="datetime-local"
            value={when}
            min={toLocalInput(new Date())}
            onChange={(e) => { setWhen(e.target.value); setPicked(""); }}
            className="min-w-0 flex-1 bg-transparent text-sm text-gray-900 outline-none"
          />
        </div>
        {validWhen && (
          <p className="mt-1.5 text-xs text-gray-500">
            Will be sent <span className="font-medium text-gray-800">{fmt(whenDate)}</span> · {relative(whenDate)}
          </p>
        )}

        <div className="mt-4 flex items-center justify-end gap-2">
          <button type="button" onClick={onClose} className="rounded-xl px-4 py-2 text-sm font-semibold text-gray-600 transition-colors hover:bg-gray-100">
            Cancel
          </button>
          <button
            type="button"
            onClick={submit}
            disabled={schedule.isPending || !body}
            className="flex items-center gap-2 rounded-xl bg-gradient-to-br from-[#8A0A52] to-[#68003B] px-5 py-2 text-sm font-semibold text-white shadow-md shadow-[#730042]/25 transition-opacity disabled:cursor-not-allowed disabled:opacity-40 disabled:shadow-none"
          >
            <FaPaperPlane className="text-xs" /> {schedule.isPending ? "Scheduling…" : "Schedule"}
          </button>
        </div>

        {waiting.length > 0 && (
          <div className="mt-4 border-t border-gray-100 pt-3">
            <div className="mb-2 flex items-center justify-between">
              <p className={LABEL}>Waiting in this chat</p>
              <span className="rounded-full bg-[#F6E8EF] px-2 py-0.5 text-[10px] font-bold text-[#730042]">{waiting.length}</span>
            </div>
            <ul className="space-y-2">
              {waiting.map((w) => {
                const failed = w.status === "failed";
                return (
                  <li key={w.id} className={`flex items-center gap-3 rounded-2xl border px-3 py-2.5 ${failed ? "border-red-200 bg-red-50/60" : "border-gray-200 bg-gray-50/70"}`}>
                    <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${failed ? "bg-red-100 text-red-600" : "bg-[#F6E8EF] text-[#730042]"}`}>
                      {failed ? <FaExclamationCircle className="text-xs" /> : <FaClock className="text-xs" />}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm text-gray-900">{w.text}</p>
                      <p className={`mt-0.5 text-[11px] ${failed ? "text-red-600" : "text-gray-500"}`}>
                        {failed ? `Failed: ${w.error || "could not be sent"}` : `${fmt(w.sendAt)} · ${relative(w.sendAt)}`}
                      </p>
                    </div>
                    <button
                      type="button"
                      title="Send now"
                      aria-label="Send now"
                      disabled={sendNow.isPending}
                      onClick={() => sendNow.mutate(w.id, { onError: (e) => toast.error(e.message || "Could not send.") })}
                      className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[#730042] transition-colors hover:bg-[#F6E8EF] disabled:opacity-50"
                    >
                      <FaPaperPlane className="text-[11px]" />
                    </button>
                    <button
                      type="button"
                      title="Cancel"
                      aria-label="Cancel scheduled message"
                      disabled={cancel.isPending}
                      onClick={() => cancel.mutate(w.id, { onSuccess: () => toast.success("Scheduled message cancelled") })}
                      className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-red-500 transition-colors hover:bg-red-50 disabled:opacity-50"
                    >
                      <FaTrash className="text-[11px]" />
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}
