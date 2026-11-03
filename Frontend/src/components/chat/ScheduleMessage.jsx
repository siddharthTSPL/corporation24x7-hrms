import { useState } from "react";
import toast from "react-hot-toast";
import { FaRegClock, FaClock, FaTimes, FaTrash, FaPaperPlane, FaRegCalendarAlt, FaExclamationCircle, FaBolt, FaSun, FaCalendarWeek } from "react-icons/fa";
import { useScheduleMessage, useScheduledMessages, useCancelScheduled, useSendScheduledNow } from "../../auth/server-state/chat/chatExtras.hook";

const pad = (n) => String(n).padStart(2, "0");
const toLocalInput = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
const fmt = (d) => new Date(d).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" });
const clock = (d) => new Date(d).toLocaleTimeString("en-IN", { hour: "numeric", minute: "2-digit" });

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
  { label: "In 1 hour", icon: FaBolt, at: () => new Date(Date.now() + 60 * 60 * 1000) },
  { label: "Tomorrow", icon: FaSun, at: () => { const d = new Date(); d.setDate(d.getDate() + 1); d.setHours(9, 0, 0, 0); return d; } },
  { label: "Monday", icon: FaCalendarWeek, at: () => { const d = new Date(); d.setDate(d.getDate() + (((8 - d.getDay()) % 7) || 7)); d.setHours(9, 0, 0, 0); return d; } },
];

const LABEL = "text-[10.5px] font-semibold uppercase tracking-wider text-gray-500";

function PickCard({ icon: Icon, label, sub, active, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex flex-col items-start gap-1.5 rounded-2xl border p-3 text-left transition-all duration-200 ${active ? "border-transparent bg-gradient-to-br from-[#8A0A52] to-[#68003B] text-white shadow-lg shadow-[#730042]/25" : "border-gray-200 bg-white hover:-translate-y-0.5 hover:border-[#730042]/40 hover:shadow-md"}`}
    >
      <span className={`flex h-7 w-7 items-center justify-center rounded-lg text-xs ${active ? "bg-white/20 text-white" : "bg-[#F6E8EF] text-[#730042]"}`}>
        <Icon />
      </span>
      <span className="text-[13px] font-semibold leading-tight">{label}</span>
      <span className={`text-[11px] ${active ? "text-white/75" : "text-gray-500"}`}>{sub}</span>
    </button>
  );
}

export default function ScheduleMessage({ conversationId, initialText = "", replyTo, hasFiles, onClose, onScheduled }) {
  const [text, setText] = useState(initialText);
  const [when, setWhen] = useState(() => toLocalInput(QUICK[0].at()));
  const [picked, setPicked] = useState(QUICK[0].label);
  const schedule = useScheduleMessage();
  const cancel = useCancelScheduled();
  const sendNow = useSendScheduledNow();
  const { data: waiting = [] } = useScheduledMessages({ conversationId, enabled: !!conversationId });

  const body = text.trim();
  const whenDate = new Date(when);
  const validWhen = !isNaN(whenDate) && whenDate.getTime() >= Date.now() + 30 * 1000;
  const cards = QUICK.map((q) => ({ ...q, date: q.at() }));

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
    <div className="chat-pop border-t border-gray-200 bg-white">
      <div className="relative overflow-hidden bg-gradient-to-br from-[#8A0A52] via-[#730042] to-[#4E002C] px-4 py-3.5 text-white">
        <span className="pointer-events-none absolute -right-6 -top-9 h-28 w-28 rounded-full bg-white/10" />
        <span className="pointer-events-none absolute right-16 top-7 h-12 w-12 rounded-full bg-white/10" />
        <div className="relative flex items-center gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-white/15 ring-1 ring-white/25 backdrop-blur">
            <FaRegClock className="text-base" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-[15px] font-semibold tracking-tight">Schedule message</p>
            <p className="text-xs text-white/70">Write it now, it goes out later as you</p>
          </div>
          <button type="button" onClick={onClose} title="Close" aria-label="Close" className="flex h-8 w-8 items-center justify-center rounded-full bg-white/10 text-white/80 transition-colors hover:bg-white/20 hover:text-white">
            <FaTimes className="text-xs" />
          </button>
        </div>
      </div>

      <div className="chat-scroll max-h-[52vh] overflow-y-auto px-4 pb-4 pt-4">
        <p className={`mb-2 ${LABEL}`}>Message</p>
        <div className="rounded-2xl border border-gray-200 bg-gray-50 transition-all focus-within:border-[#730042]/40 focus-within:bg-white focus-within:ring-4 focus-within:ring-[#730042]/10">
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

        {body && (
          <div className="mt-3 flex justify-end">
            <div className="chat-message-bubble chat-message-bubble-mine max-w-[85%] rounded-2xl rounded-br-md bg-gradient-to-br from-[#8A0A52] to-[#68003B] px-3.5 py-2 text-[13.5px] leading-[1.5] text-white">
              <span className="mb-1 flex w-fit items-center gap-1 rounded-full bg-white/15 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-white/85">
                <FaRegClock className="text-[8px]" /> Scheduled
              </span>
              <p className="whitespace-pre-wrap">{body}</p>
            </div>
          </div>
        )}

        <p className={`mb-2 mt-5 ${LABEL}`}>Send at</p>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {cards.map((q) => (
            <PickCard
              key={q.label}
              icon={q.icon}
              label={q.label}
              sub={clock(q.date)}
              active={picked === q.label}
              onClick={() => { setWhen(toLocalInput(q.date)); setPicked(q.label); }}
            />
          ))}
          <PickCard icon={FaRegCalendarAlt} label="Custom" sub="Date & time" active={picked === "Custom"} onClick={() => setPicked("Custom")} />
        </div>

        {picked === "Custom" && (
          <div className="chat-fade mt-2.5 flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-3 py-2.5 transition-all focus-within:border-[#730042]/40 focus-within:ring-4 focus-within:ring-[#730042]/10">
            <FaRegCalendarAlt className="shrink-0 text-sm text-[#730042]" />
            <input
              type="datetime-local"
              value={when}
              min={toLocalInput(new Date())}
              onChange={(e) => setWhen(e.target.value)}
              className="min-w-0 flex-1 bg-transparent text-sm text-gray-900 outline-none"
            />
          </div>
        )}

        {validWhen && (
          <p className="mt-3 flex items-center gap-2 rounded-xl bg-[#FBF3F7] px-3 py-2 text-xs text-gray-600">
            <FaRegClock className="shrink-0 text-[#730042]" />
            <span>
              Sends <span className="font-semibold text-gray-900">{fmt(whenDate)}</span> · {relative(whenDate)}
            </span>
          </p>
        )}

        <div className="mt-4 flex items-center gap-2">
          <button type="button" onClick={onClose} className="rounded-xl px-4 py-2.5 text-sm font-semibold text-gray-600 transition-colors hover:bg-gray-100">
            Cancel
          </button>
          <button
            type="button"
            onClick={submit}
            disabled={schedule.isPending || !body}
            className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-gradient-to-br from-[#8A0A52] to-[#68003B] px-5 py-2.5 text-sm font-semibold text-white shadow-lg shadow-[#730042]/25 transition-all hover:brightness-110 active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-40 disabled:shadow-none"
          >
            <FaPaperPlane className="text-xs" /> {schedule.isPending ? "Scheduling…" : "Schedule message"}
          </button>
        </div>

        {waiting.length > 0 && (
          <div className="mt-5 border-t border-gray-100 pt-4">
            <div className="mb-2.5 flex items-center justify-between">
              <p className={LABEL}>Waiting in this chat</p>
              <span className="rounded-full bg-[#F6E8EF] px-2 py-0.5 text-[10px] font-bold text-[#730042]">{waiting.length}</span>
            </div>
            <ul className="space-y-2">
              {waiting.map((w) => {
                const failed = w.status === "failed";
                return (
                  <li key={w.id} className={`flex items-center gap-3 rounded-2xl border-l-4 bg-gray-50/80 py-2.5 pl-3 pr-2.5 ${failed ? "border-red-500" : "border-[#730042]"}`}>
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
                      disabled={sendNow.isPending}
                      onClick={() => sendNow.mutate(w.id, { onError: (e) => toast.error(e.message || "Could not send.") })}
                      className="flex shrink-0 items-center gap-1.5 rounded-full bg-[#F6E8EF] px-3 py-1.5 text-[11px] font-semibold text-[#730042] transition-colors hover:bg-[#730042] hover:text-white disabled:opacity-50"
                    >
                      <FaPaperPlane className="text-[9px]" /> Send now
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
