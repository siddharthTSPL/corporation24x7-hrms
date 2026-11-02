import { FaHourglassHalf, FaDoorOpen, FaClock, FaSyncAlt } from "react-icons/fa";
import useCall from "../../../realtime/useCall";

const COPY = {
  LOBBY: {
    icon: FaDoorOpen,
    title: "Waiting to be let in",
    body: "The host has been notified. You'll join automatically as soon as they admit you.",
    tip: "Keep this tab open. Your camera and microphone stay off until you're in.",
  },
  WAITING_FOR_HOST: {
    icon: FaHourglassHalf,
    title: "Waiting for the host",
    body: "This meeting hasn't started yet. You'll be taken in the moment the host opens it.",
    tip: "No need to refresh. We'll connect you automatically.",
  },
  TOO_EARLY: {
    icon: FaClock,
    title: "Not open yet",
    body: "The room opens a few minutes before the start time. We'll let you in when it does.",
    tip: "You can leave this tab open in the background.",
  },
  RESUME: {
    icon: FaSyncAlt,
    title: "Rejoining your meeting",
    body: "Picking up right where you left off.",
    tip: "This takes a moment.",
  },
};

export default function WaitingScreen({ title: titleOverride, hostName, onCancel }) {
  const { waiting, cancelWaiting, active } = useCall();
  if (!waiting || active) return null;

  const copy = COPY[waiting.code] || COPY.WAITING_FOR_HOST;
  const Icon = copy.icon;
  const title = titleOverride || waiting.title || "Meeting";
  const spin = waiting.code === "RESUME";

  return (
    <div className="fixed inset-0 z-[92] flex flex-col items-center justify-center bg-[#101013] px-6 text-center text-white">
      <style>{`
        @keyframes torchx-ring { 0% { transform: scale(.7); opacity: .55; } 100% { transform: scale(1.9); opacity: 0; } }
      `}</style>
      <div className="relative mb-8 flex h-28 w-28 items-center justify-center">
        <span className="absolute inset-0 rounded-full bg-[#CD166E]/40" style={{ animation: "torchx-ring 2.4s ease-out infinite" }} />
        <span className="absolute inset-0 rounded-full bg-[#CD166E]/30" style={{ animation: "torchx-ring 2.4s ease-out .8s infinite" }} />
        <span className="relative flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br from-[#730042] to-[#CD166E] text-3xl shadow-xl">
          <Icon className={spin ? "animate-spin" : ""} />
        </span>
      </div>

      <p className="text-xs font-medium uppercase tracking-[0.2em] text-[#f08bbd]">{title}</p>
      <h1 className="mt-3 text-2xl font-semibold sm:text-3xl">{copy.title}</h1>
      <p className="mt-3 max-w-md text-sm leading-relaxed text-gray-400">{copy.body}</p>
      {hostName && <p className="mt-2 text-xs text-gray-500">Hosted by {hostName}</p>}

      {waiting.position ? (
        <p className="mt-5 rounded-full bg-white/10 px-4 py-1.5 text-xs text-gray-300">You're number {waiting.position} in line</p>
      ) : null}

      <p className="mt-6 max-w-sm text-xs text-gray-500">{copy.tip}</p>

      <button type="button" onClick={onCancel || cancelWaiting} className="mt-8 rounded-full border border-white/20 px-6 py-2.5 text-sm font-medium text-gray-200 hover:bg-white/10">
        {waiting.code === "RESUME" ? "Cancel" : "Leave waiting room"}
      </button>
    </div>
  );
}
