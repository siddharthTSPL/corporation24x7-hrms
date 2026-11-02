import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { FaHourglassHalf, FaDoorOpen, FaClock, FaSyncAlt, FaShieldAlt, FaVideo } from "react-icons/fa";
import useCall from "../../../realtime/useCall";
import logo from "../../../assets/TorchX Favicon.png";

const COPY = {
  LOBBY: {
    icon: FaDoorOpen,
    title: "Waiting to be let in",
    body: "The host has been notified. You'll join automatically as soon as they admit you.",
    tip: "Keep this tab open. Your camera and microphone stay off until you're in.",
    status: "Waiting for admission",
  },
  WAITING_FOR_HOST: {
    icon: FaHourglassHalf,
    title: "Waiting for the host",
    body: "This meeting hasn't started yet. You'll be taken in the moment the host opens it.",
    tip: "No need to refresh. We'll connect you automatically.",
    status: "Host hasn't started yet",
  },
  TOO_EARLY: {
    icon: FaClock,
    title: "Not open yet",
    body: "The room opens a few minutes before the start time. We'll let you in when it does.",
    tip: "You can leave this tab open in the background.",
    status: "Room opens shortly",
  },
  RESUME: {
    icon: FaSyncAlt,
    title: "Rejoining your meeting",
    body: "Picking up right where you left off.",
    tip: "This takes a moment.",
    status: "Reconnecting",
  },
};

const fmt = (s) => `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;

export default function WaitingScreen({ title: titleOverride, hostName, onCancel }) {
  const { waiting, cancelWaiting, active } = useCall();
  const [elapsed, setElapsed] = useState(0);
  const waitingCode = waiting?.code;

  useEffect(() => {
    setElapsed(0);
    const t = setInterval(() => setElapsed((n) => n + 1), 1000);
    return () => clearInterval(t);
  }, [waitingCode]);

  if (!waiting || active) return null;

  const copy = COPY[waiting.code] || COPY.WAITING_FOR_HOST;
  const Icon = copy.icon;
  const title = titleOverride || waiting.title || "Meeting";
  const spin = waiting.code === "RESUME";

  return createPortal(
    <div className="fixed inset-0 z-[92] flex flex-col items-center justify-center overflow-hidden bg-[#0b0509] px-6 text-center text-white">
      <style>{`
        @keyframes torchx-ring { 0% { transform: scale(.6); opacity: .6; } 100% { transform: scale(2.3); opacity: 0; } }
        @keyframes torchx-breathe { 0%, 100% { transform: scale(1); box-shadow: 0 0 40px rgba(205,22,110,.45); } 50% { transform: scale(1.07); box-shadow: 0 0 80px rgba(205,22,110,.75); } }
        @keyframes torchx-orb { 0%, 100% { transform: translate(0, 0) scale(1); } 50% { transform: translate(40px, -30px) scale(1.15); } }
        @keyframes torchx-orb2 { 0%, 100% { transform: translate(0, 0) scale(1); } 50% { transform: translate(-50px, 30px) scale(1.2); } }
        @keyframes torchx-shimmer { 0% { transform: translateX(-100%); } 100% { transform: translateX(350%); } }
        @keyframes torchx-dot { 0%, 80%, 100% { transform: translateY(0); opacity: .35; } 40% { transform: translateY(-6px); opacity: 1; } }
        @keyframes torchx-rise { 0% { opacity: 0; transform: translateY(14px); } 100% { opacity: 1; transform: translateY(0); } }
      `}</style>

      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,#3a0b24_0%,#14070e_45%,#0b0509_80%)]" />
      <div className="pointer-events-none absolute -left-24 -top-24 h-96 w-96 rounded-full bg-[#CD166E]/25 blur-3xl" style={{ animation: "torchx-orb 9s ease-in-out infinite" }} />
      <div className="pointer-events-none absolute -bottom-32 -right-24 h-[26rem] w-[26rem] rounded-full bg-[#730042]/40 blur-3xl" style={{ animation: "torchx-orb2 11s ease-in-out infinite" }} />
      <div className="pointer-events-none absolute inset-0 opacity-[0.07] [background-image:radial-gradient(#fff_1px,transparent_1px)] [background-size:28px_28px]" />

      <div className="absolute left-0 right-0 top-0 flex items-center justify-between px-5 py-4 sm:px-8" style={{ animation: "torchx-rise .6s ease-out both" }}>
        <div className="flex items-center gap-2.5">
          <img src={logo} alt="TorchX" className="h-8 w-8 rounded-lg object-contain" />
          <span className="text-sm font-semibold tracking-wide">TorchX <span className="text-[#f08bbd]">Suite</span></span>
        </div>
        <span className="flex items-center gap-1.5 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[11px] text-gray-300 backdrop-blur">
          <FaShieldAlt className="text-[#f08bbd]" /> Secure meeting
        </span>
      </div>

      <div className="relative z-10 flex flex-col items-center" style={{ animation: "torchx-rise .7s ease-out .1s both" }}>
        <div className="relative mb-9 flex h-40 w-40 items-center justify-center">
          <span className="absolute inset-0 rounded-full border border-[#CD166E]/60 bg-[#CD166E]/20" style={{ animation: "torchx-ring 3s ease-out infinite" }} />
          <span className="absolute inset-0 rounded-full border border-[#CD166E]/50 bg-[#CD166E]/15" style={{ animation: "torchx-ring 3s ease-out 1s infinite" }} />
          <span className="absolute inset-0 rounded-full border border-[#CD166E]/40 bg-[#CD166E]/10" style={{ animation: "torchx-ring 3s ease-out 2s infinite" }} />
          <span className="relative flex h-24 w-24 items-center justify-center rounded-full bg-gradient-to-br from-[#730042] via-[#a3105a] to-[#CD166E] ring-4 ring-white/10" style={{ animation: "torchx-breathe 2.6s ease-in-out infinite" }}>
            <Icon className={`text-4xl ${spin ? "animate-spin" : ""}`} />
          </span>
          <span className="absolute -bottom-1 -right-1 flex h-9 w-9 items-center justify-center rounded-full border border-white/10 bg-[#1b0e15] shadow-lg">
            <img src={logo} alt="" className="h-5 w-5 object-contain" />
          </span>
        </div>

        <span className="flex items-center gap-2 rounded-full border border-[#CD166E]/30 bg-[#CD166E]/10 px-3.5 py-1 text-[11px] font-medium uppercase tracking-[0.18em] text-[#f08bbd]">
          <span className="h-1.5 w-1.5 rounded-full bg-[#f08bbd]" style={{ animation: "torchx-dot 1.4s ease-in-out infinite" }} />
          {copy.status}
        </span>

        <h1 className="mt-5 text-3xl font-semibold tracking-tight sm:text-4xl">{copy.title}</h1>
        <p className="mt-3 max-w-md text-sm leading-relaxed text-gray-300">{copy.body}</p>

        <div className="mt-7 flex w-full max-w-sm items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.06] p-3.5 text-left shadow-xl backdrop-blur">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-[#730042] to-[#CD166E]">
            <FaVideo />
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold">{title}</p>
            <p className="truncate text-xs text-gray-400">{hostName ? `Hosted by ${hostName}` : "TorchX Meetings"}</p>
          </div>
          <span className="rounded-lg bg-black/30 px-2.5 py-1 font-mono text-xs text-gray-200">{fmt(elapsed)}</span>
        </div>

        <div className="mt-6 h-1 w-full max-w-sm overflow-hidden rounded-full bg-white/10">
          <span className="block h-full w-1/3 rounded-full bg-gradient-to-r from-transparent via-[#CD166E] to-transparent" style={{ animation: "torchx-shimmer 1.8s ease-in-out infinite" }} />
        </div>

        {waiting.position ? (
          <p className="mt-5 rounded-full border border-white/10 bg-white/10 px-4 py-1.5 text-xs text-gray-200">You're number {waiting.position} in line</p>
        ) : null}

        <p className="mt-5 max-w-sm text-xs text-gray-400">{copy.tip}</p>

        <button type="button" onClick={onCancel || cancelWaiting} className="mt-7 rounded-full border border-white/20 bg-white/5 px-7 py-2.5 text-sm font-medium text-gray-100 backdrop-blur transition hover:border-[#CD166E]/60 hover:bg-[#CD166E]/20">
          {waiting.code === "RESUME" ? "Cancel" : "Leave waiting room"}
        </button>
      </div>

      <p className="absolute bottom-4 text-[11px] text-gray-500">Powered by TorchX Suite · TechTorch Solutions</p>
    </div>,
    document.body,
  );
}
