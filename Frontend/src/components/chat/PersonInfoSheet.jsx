import { FaArrowLeft, FaBriefcase, FaBuilding, FaUserTie, FaCalendarAlt, FaPhoneAlt, FaVideo, FaCommentDots, FaEnvelope, FaBellSlash, FaThumbtack, FaEraser, FaInfoCircle, FaFlag } from "react-icons/fa";
import { useState } from "react";
import toast from "react-hot-toast";
import Avatar from "./Avatar";
import useCall from "../../realtime/useCall";
import {
  useIsOnline,
  useIsInCall,
  useLastSeen,
  usePresenceSync,
  useMuteConversation,
  usePinConversation,
  useClearChat,
} from "../../auth/server-state/chat/chat.hook";
import { formatLastSeen } from "./chatUtils";
import ReportUserDialog from "./ReportUserDialog";

const displayDate = (value) => {
  if (!value) return "";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "" : date.toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" });
};

function ActionTile({ icon: Icon, label, onClick, disabled, title }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={title || label}
      className="flex flex-col items-center gap-1.5 rounded-xl border border-gray-200 bg-white px-2 py-3 text-[#730042] transition hover:bg-[#F6E8EF] disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-white"
    >
      <Icon className="text-lg" />
      <span className="text-xs font-medium">{label}</span>
    </button>
  );
}

function Switch({ on, onChange, label }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      aria-label={label}
      onClick={() => onChange(!on)}
      className={`relative h-6 w-10 shrink-0 rounded-full transition-colors ${on ? "bg-[#730042]" : "bg-gray-300"}`}
    >
      <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white transition-all ${on ? "left-[18px]" : "left-0.5"}`} />
    </button>
  );
}

function ToggleRow({ icon: Icon, label, hint, on, onChange }) {
  return (
    <div className="flex items-center gap-3 px-5 py-3.5">
      <Icon className="w-4 text-gray-400" />
      <div className="min-w-0 flex-1">
        <p className="text-sm text-gray-800">{label}</p>
        {hint ? <p className="text-xs text-gray-400">{hint}</p> : null}
      </div>
      <Switch on={on} onChange={onChange} label={label} />
    </div>
  );
}

export default function PersonInfoSheet({ person, conversation, onClose }) {
  const { startCall, inCall } = useCall();
  const online = useIsOnline(person?.key, !!person?.online);
  const otherInCall = useIsInCall(person?.key, !!person?.inCall);
  const lastSeen = useLastSeen(person?.key, person?.lastSeenAt || null);
  const muteMutation = useMuteConversation();
  const pinMutation = usePinConversation();
  const clearChat = useClearChat();
  usePresenceSync(person?.key ? [person.key] : []);
  const [reportOpen, setReportOpen] = useState(false);

  if (!person) return null;

  const conversationId = conversation?.id;
  const name = person.name || "Unknown";
  const callsBlocked = !conversationId || inCall || otherInCall || !online;
  const callTitle = (label) =>
    inCall ? "You're already in a call" : otherInCall ? `${name} is on another call` : !online ? `${name} is offline` : label;

  const status = otherInCall ? "On another call" : online ? "Online" : lastSeen ? `Last seen ${formatLastSeen(lastSeen)}` : "Offline";

  const call = (media) => {
    Promise.resolve(startCall({ conversationId, media }))
      .then(() => onClose())
      .catch((err) => toast.error(err?.message || "Couldn't start the call."));
  };

  const handleClear = () => {
    if (!window.confirm("Clear all messages in this chat? This only clears them for you.")) return;
    clearChat.mutate(conversationId, {
      onSuccess: () => toast.success("Chat cleared."),
      onError: (err) => toast.error(err.message || "Couldn't clear the chat."),
    });
  };

  const fields = [
    [FaBriefcase, "Designation", person.designation, false],
    [FaBuilding, "Department", person.department, false],
    [FaUserTie, "Reporting manager", person.reportingManager, false],
    [FaCalendarAlt, "Joining date", displayDate(person.joinedAt), false],
    [FaPhoneAlt, "Phone number", person.phone, "tel"],
    [FaEnvelope, "Email", person.email, "mailto"],
  ].filter(([, , value]) => !!value);

  return (
    <div className="flex flex-col h-full min-h-0 bg-[#f0f2f5]">
      <div className="flex items-center gap-2 px-3 py-3 border-b border-gray-100 bg-white">
        <button type="button" onClick={onClose} title="Back to chat" className="w-8 h-8 rounded-full text-gray-600 hover:bg-gray-100 flex items-center justify-center">
          <FaArrowLeft className="text-sm" />
        </button>
        <h3 className="text-base font-bold text-gray-900">Contact info</h3>
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto">
        <section className="flex flex-col items-center bg-white px-6 pb-5 pt-7 shadow-sm">
          <Avatar name={person.name} photo={person.photo} size={120} seed={person.key} online={online} />
          <p className="mt-4 text-center text-xl font-semibold text-gray-900">{name}</p>
          {person.phone ? <p className="mt-0.5 text-sm text-gray-500">{person.phone}</p> : person.role ? <p className="mt-0.5 text-sm text-gray-500">{person.role}</p> : null}
          <p className={`mt-1 text-xs font-medium ${online && !otherInCall ? "text-emerald-600" : "text-gray-500"}`}>{status}</p>

          <div className="mt-5 grid w-full grid-cols-3 gap-2.5">
            <ActionTile icon={FaCommentDots} label="Message" onClick={onClose} title={`Message ${name}`} />
            <ActionTile icon={FaPhoneAlt} label="Audio" onClick={() => call("audio")} disabled={callsBlocked} title={callTitle("Voice call")} />
            <ActionTile icon={FaVideo} label="Video" onClick={() => call("video")} disabled={callsBlocked} title={callTitle("Video call")} />
          </div>
        </section>

        {(person.designation || person.role) && (
          <section className="mt-2 bg-white px-5 py-4">
            <p className="flex items-center gap-2 text-xs font-medium text-[#730042]"><FaInfoCircle /> About</p>
            <p className="mt-1.5 text-sm text-gray-800">{person.designation || person.role}</p>
          </section>
        )}

        {fields.length > 0 && (
          <section className="mt-2 bg-white px-5 py-2">
            <p className="pt-2 text-xs font-medium text-[#730042]">Work details</p>
            <dl>
              {fields.map(([Icon, label, value, link]) => (
                <div key={label} className="flex items-start gap-3 border-b border-gray-100 py-3 last:border-0">
                  <Icon className="mt-1 w-4 text-gray-400" />
                  <span className="min-w-0 flex-1">
                    <dd className="text-sm text-gray-800 break-words">
                      {link ? <a className="hover:text-[#730042]" href={`${link}:${value}`}>{value}</a> : value}
                    </dd>
                    <dt className="text-xs text-gray-400">{label}</dt>
                  </span>
                </div>
              ))}
            </dl>
          </section>
        )}

        {conversationId && (
          <section className="mt-2 divide-y divide-gray-100 bg-white">
            <ToggleRow
              icon={FaBellSlash}
              label="Mute notifications"
              on={!!conversation?.muted}
              onChange={(muted) => muteMutation.mutate({ id: conversationId, muted })}
            />
            <ToggleRow
              icon={FaThumbtack}
              label="Pin chat"
              hint="Keep this chat at the top"
              on={!!conversation?.pinned}
              onChange={(pinned) => pinMutation.mutate({ id: conversationId, pinned }, { onError: (e) => toast.error(e.message || "Couldn't pin the chat.") })}
            />
          </section>
        )}

        {conversationId && (
          <section className="mb-4 mt-2 bg-white">
            <button type="button" onClick={handleClear} className="flex w-full items-center gap-3 px-5 py-3.5 text-left text-sm text-red-600 hover:bg-red-50">
              <FaEraser className="w-4" /> Clear chat
            </button>
            <button type="button" onClick={() => setReportOpen(true)} className="flex w-full items-center gap-3 border-t border-gray-100 px-5 py-3.5 text-left text-sm text-red-600 hover:bg-red-50">
              <FaFlag className="w-4" /> Report {name}
            </button>
          </section>
        )}
        {reportOpen && <ReportUserDialog person={person} conversationId={conversationId} onClose={() => setReportOpen(false)} />}
      </div>
    </div>
  );
}
