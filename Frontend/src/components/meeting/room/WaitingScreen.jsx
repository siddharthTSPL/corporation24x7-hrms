import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { FaHourglassHalf, FaDoorOpen, FaClock, FaSyncAlt, FaShieldAlt, FaCheck, FaVideo, FaUserTie, FaLock } from "react-icons/fa";
import useCall from "../../../realtime/useCall";
import talentLogo from "../../../assets/Talent.png";
import techTorchLogo from "../../../assets/TechTorchLogo.png";

const COPY = {
  LOBBY: {
    icon: FaDoorOpen,
    title: "Waiting to be let in",
    body: "The host has been notified of your request. You'll join automatically as soon as they admit you.",
    tip: "Your camera and microphone stay off until you're admitted.",
    status: "Waiting for admission",
    steps: ["You're in the waiting room", "Host has been notified", "Admission by host"],
    active: 2,
  },
  WAITING_FOR_HOST: {
    icon: FaHourglassHalf,
    title: "Waiting for the host",
    body: "This meeting hasn't started yet. You'll be taken in the moment the host opens it.",
    tip: "No need to refresh. We'll connect you automatically.",
    status: "Host hasn't started yet",
    steps: ["You're in the waiting room", "Host starts the meeting", "You're connected automatically"],
    active: 1,
  },
  TOO_EARLY: {
    icon: FaClock,
    title: "The room isn't open yet",
    body: "The room opens a few minutes before the start time. We'll let you in when it does.",
    tip: "You can keep this tab open in the background.",
    status: "Room opens shortly",
    steps: ["You're checked in", "Room opens before start time", "You're connected automatically"],
    active: 1,
  },
  RESUME: {
    icon: FaSyncAlt,
    title: "Rejoining your meeting",
    body: "Picking up right where you left off.",
    tip: "This only takes a moment.",
    status: "Reconnecting",
    steps: ["Session found", "Restoring your connection", "Back in the meeting"],
    active: 1,
  },
};

const fmt = (s) => `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;

function Steps({ steps, active }) {
  return (
    <ol className="w-full space-y-3 text-left">
      {steps.map((label, i) => {
        const done = i < active;
        const current = i === active;
        return (
          <li key={label} className="flex items-center gap-3">
            <span
              className={`relative flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[10px] font-bold ${
                done ? "bg-emerald-500 text-white" : current ? "bg-[#CD166E] text-white" : "bg-gray-200 text-gray-400"
              }`}
            >
              {done ? <FaCheck /> : i + 1}
              {current && <span className="absolute inset-0 rounded-full bg-[#CD166E]/50" style={{ animation: "torchx-step 1.8s ease-out infinite" }} />}
            </span>
            <span className={`text-sm ${done ? "text-gray-500" : current ? "font-semibold text-gray-900" : "text-gray-400"}`}>{label}</span>
          </li>
        );
      })}
    </ol>
  );
}

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
    <div className="fixed inset-0 z-[92] overflow-y-auto bg-[#fbf7f9] text-gray-900">
      <style>{`
        @keyframes torchx-ring { 0% { transform: scale(1); opacity: .55; } 100% { transform: scale(1.9); opacity: 0; } }
        @keyframes torchx-breathe { 0%, 100% { transform: scale(1); } 50% { transform: scale(1.06); } }
        @keyframes torchx-shimmer { 0% { transform: translateX(-100%); } 100% { transform: translateX(400%); } }
        @keyframes torchx-step { 0% { transform: scale(1); opacity: .6; } 100% { transform: scale(2.1); opacity: 0; } }
        @keyframes torchx-rise { 0% { opacity: 0; transform: translateY(16px); } 100% { opacity: 1; transform: translateY(0); } }
        @keyframes torchx-float { 0%, 100% { transform: translate(0, 0); } 50% { transform: translate(30px, -24px); } }
      `}</style>

      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -left-40 -top-40 h-[34rem] w-[34rem] rounded-full bg-[#CD166E]/10 blur-3xl" style={{ animation: "torchx-float 12s ease-in-out infinite" }} />
        <div className="absolute -bottom-48 -right-40 h-[38rem] w-[38rem] rounded-full bg-[#730042]/10 blur-3xl" style={{ animation: "torchx-float 14s ease-in-out infinite reverse" }} />
        <div className="absolute inset-0 opacity-60 [background-image:radial-gradient(#d9c7d1_1px,transparent_1px)] [background-size:26px_26px] [mask-image:radial-gradient(ellipse_at_center,black_30%,transparent_75%)]" />
      </div>

      <div className="relative z-10 flex min-h-full flex-col items-center px-4 py-6 sm:py-10">
        <header className="flex w-full max-w-5xl items-center justify-between" style={{ animation: "torchx-rise .5s ease-out both" }}>
          <img src={talentLogo} alt="TorchX Talent" className="h-10 w-auto sm:h-12" />
          <span className="flex items-center gap-1.5 rounded-full border border-gray-200 bg-white px-3 py-1.5 text-[11px] font-medium text-gray-600 shadow-sm">
            <FaLock className="text-[#730042]" /> End-to-end secure meeting
          </span>
        </header>

        <main className="flex w-full flex-1 items-center justify-center py-6">
          <div className="w-full max-w-4xl overflow-hidden rounded-[28px] border border-white bg-white shadow-[0_30px_80px_-20px_rgba(115,0,66,0.25)] ring-1 ring-gray-200/70 md:grid md:grid-cols-[1.1fr_1fr]" style={{ animation: "torchx-rise .6s ease-out .1s both" }}>
            <section className="relative flex flex-col items-center justify-center overflow-hidden bg-gradient-to-br from-[#730042] via-[#8f0a52] to-[#CD166E] px-8 py-10 text-center text-white">
              <div className="pointer-events-none absolute -right-16 -top-16 h-56 w-56 rounded-full bg-white/10 blur-2xl" />
              <div className="pointer-events-none absolute -bottom-20 -left-12 h-56 w-56 rounded-full bg-black/20 blur-2xl" />

              <div className="relative flex h-44 w-44 items-center justify-center">
                <span className="absolute h-[92px] w-[92px] rounded-full border border-white/50 bg-white/10" style={{ animation: "torchx-ring 3s ease-out infinite" }} />
                <span className="absolute h-[92px] w-[92px] rounded-full border border-white/40 bg-white/10" style={{ animation: "torchx-ring 3s ease-out 1s infinite" }} />
                <span className="absolute h-[92px] w-[92px] rounded-full border border-white/30 bg-white/10" style={{ animation: "torchx-ring 3s ease-out 2s infinite" }} />
                <span className="relative flex h-[92px] w-[92px] items-center justify-center rounded-full bg-white text-[#730042] shadow-2xl" style={{ animation: "torchx-breathe 2.6s ease-in-out infinite" }}>
                  <Icon className={`text-4xl ${spin ? "animate-spin" : ""}`} />
                </span>
              </div>

              <span className="mt-4 inline-flex items-center gap-2 rounded-full bg-white/15 px-3.5 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] backdrop-blur">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-300" />
                {copy.status}
              </span>

              <h1 className="mt-4 text-2xl font-semibold leading-tight sm:text-3xl">{copy.title}</h1>
              <p className="mt-3 max-w-xs text-sm leading-relaxed text-white/80">{copy.body}</p>

              <div className="mt-7 h-1.5 w-full max-w-xs overflow-hidden rounded-full bg-white/20">
                <span className="block h-full w-1/4 rounded-full bg-white" style={{ animation: "torchx-shimmer 1.8s ease-in-out infinite" }} />
              </div>
              <p className="mt-3 font-mono text-xs tracking-widest text-white/70">WAITING {fmt(elapsed)}</p>
            </section>

            <section className="flex flex-col justify-center gap-6 px-7 py-8 sm:px-9">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-gray-400">Meeting</p>
                <div className="mt-2 flex items-center gap-3 rounded-2xl border border-gray-200 bg-gray-50 p-3.5">
                  <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-[#730042] to-[#CD166E] text-white">
                    <FaVideo />
                  </span>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-gray-900">{title}</p>
                    <p className="flex items-center gap-1.5 truncate text-xs text-gray-500">
                      <FaUserTie className="shrink-0 text-gray-400" />
                      {hostName ? `Hosted by ${hostName}` : "TorchX Talent Meetings"}
                    </p>
                  </div>
                </div>
              </div>

              <div>
                <p className="mb-3 text-[11px] font-semibold uppercase tracking-[0.16em] text-gray-400">Progress</p>
                <Steps steps={copy.steps} active={copy.active} />
              </div>

              {waiting.position ? (
                <p className="rounded-xl border border-[#CD166E]/20 bg-[#CD166E]/5 px-4 py-2.5 text-center text-xs font-medium text-[#730042]">You're number {waiting.position} in line</p>
              ) : null}

              <div className="flex items-start gap-2.5 rounded-xl bg-gray-50 px-3.5 py-3 text-xs leading-relaxed text-gray-500">
                <FaShieldAlt className="mt-0.5 shrink-0 text-[#730042]" />
                <span>{copy.tip}</span>
              </div>

              <button type="button" onClick={onCancel || cancelWaiting} className="rounded-full border border-gray-300 bg-white px-6 py-3 text-sm font-semibold text-gray-700 transition hover:border-[#730042] hover:bg-[#730042] hover:text-white">
                {waiting.code === "RESUME" ? "Cancel" : "Leave waiting room"}
              </button>
            </section>
          </div>
        </main>

        <footer className="flex items-center gap-2 text-[11px] text-gray-400">
          <span>Powered by</span>
          <img src={techTorchLogo} alt="TechTorch Solutions" className="h-4 w-auto opacity-70" />
        </footer>
      </div>
    </div>,
    document.body,
  );
}
