import { useRef, useState, useEffect, useCallback } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  kioskMe,
  getKioskToken,
  setKioskToken,
  clearKioskToken,
} from "../../auth/api/faceattendance/faceattendance.api";
import {
  useKioskLogin,
  useKioskLogout,
  useScanFace,
} from "../../auth/server-state/faceattendance/faceattendance.hook";

const MAROON = "#7B1C3E";
const GOLD = "#F4B942";
const SCAN_INTERVAL_MS = 2200; // how often a frame is sent while scanning
const RESULT_HOLD_MS = 4000; // how long a result banner stays up before scanning resumes
const GATE_OPTIONS = ["Gate 1", "Gate 2", "Gate 3", "Gate 4", "Gate 5", "Other"];
const GATE_STORAGE_KEY = "kiosk_gate";

// Kinds where the camera genuinely couldn't do its job (no match found) —
// these get the "try again" retry prompt, a buzz, and a spoken nudge.
const FAILURE_KINDS = new Set(["not_registered", "error"]);
// Kinds worth a little celebration — a real, positive, completed scan.
const CELEBRATE_KINDS = new Set(["checkin_on_time", "checkout_on_time", "checkout_overtime"]);

// Visual theme per outcome, kept separate from the scan logic so the
// backend can add new "reason"/"action" values without breaking the UI —
// anything unrecognised just falls back to the neutral style.
const RESULT_STYLES = {
  checkin_on_time: { bg: "bg-green-50", border: "border-green-300", text: "text-green-800", icon: "✅" },
  checkin_late: { bg: "bg-amber-50", border: "border-amber-300", text: "text-amber-800", icon: "⏰" },
  checkout_on_time: { bg: "bg-blue-50", border: "border-blue-300", text: "text-blue-800", icon: "✅" },
  checkout_overtime: { bg: "bg-purple-50", border: "border-purple-300", text: "text-purple-800", icon: "🌙" },
  checkout_auto_overtime: { bg: "bg-red-50", border: "border-red-300", text: "text-red-800", icon: "⏱️" },
  checkout_early: { bg: "bg-amber-50", border: "border-amber-300", text: "text-amber-800", icon: "⚠️" },
  checkout_absent: { bg: "bg-red-50", border: "border-red-300", text: "text-red-800", icon: "🚫" },
  blocked: { bg: "bg-red-50", border: "border-red-300", text: "text-red-800", icon: "⛔" },
  too_early: { bg: "bg-gray-100", border: "border-gray-300", text: "text-gray-700", icon: "⏳" },
  cross_channel: { bg: "bg-indigo-50", border: "border-indigo-300", text: "text-indigo-800", icon: "🔀" },
  not_registered: { bg: "bg-gray-100", border: "border-gray-300", text: "text-gray-700", icon: "🙈" },
  checkin_already_done: { bg: "bg-blue-50", border: "border-blue-300", text: "text-blue-800", icon: "🕒" },
  attendance_completed: { bg: "bg-gray-100", border: "border-gray-300", text: "text-gray-700", icon: "✅" },
  already_done: { bg: "bg-gray-100", border: "border-gray-300", text: "text-gray-700", icon: "ℹ️" },
  error: { bg: "bg-red-50", border: "border-red-300", text: "text-red-800", icon: "⚠️" },
};

const minutesToLabel = (mins) => {
  const m = Math.round(mins);
  if (m < 60) return `${m} min`;
  const h = Math.floor(m / 60);
  const rem = m % 60;
  return rem ? `${h}h ${rem}m` : `${h}h`;
};

// Builds the small secondary line shown under the main result message —
// shift time range, plus late/overtime minutes when relevant.
function buildSubDetail(data) {
  if (data?.reason === "checkin_already_done" && data?.minutesUntilCheckoutOpens) {
    return `Checkout opens in ${data.minutesUntilCheckoutOpens} minute(s)`;
  }
  if (data?.reason === "checked_in_by_system" && data?.checkIn) {
    return `Checked in at ${new Date(data.checkIn).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })} via System`;
  }
  if (data?.action === "checkout" && data?.isBelowHalfShift && data?.workedMinutes != null) {
    return `Worked only ${minutesToLabel(data.workedMinutes)}`;
  }
  if (!data?.shift?.startTime || !data?.shift?.endTime) return "";
  const range = `Shift ${data.shift.startTime} – ${data.shift.endTime}`;

  if (data.action === "checkin" && data.isLate && data.lateMinutes > 0)
    return `${range} · Late by ${minutesToLabel(data.lateMinutes)}`;

  if (data.action === "checkout" && (data.checkoutRemark === "overtime" || data.checkoutRemark === "auto_overtime") && data.overtimeMinutes > 0)
    return `${range} · Overtime of ${minutesToLabel(data.overtimeMinutes)}`;

  return range;
}

function classifyResult(data, err) {
  if (err) {
    if (err.reason === "not_registered")
      return { kind: "not_registered", title: "Not registered", detail: "This face isn't registered yet. Please ask your admin to register you first, then try again." };
    if (err.reason === "too_late")
      return { kind: "checkin_late", title: "Quite late, but welcome!", detail: err.message, subDetail: buildSubDetail(err.data) };
    if (err.reason === "too_early")
      return { kind: "too_early", title: "Too early", detail: err.message, subDetail: buildSubDetail(err.data) };
    if (err.reason === "checked_in_by_system")
      return { kind: "cross_channel", title: "Checked in via System", detail: err.message, subDetail: buildSubDetail(err.data) };
    if (err.status === 400)
      return { kind: "already_done", title: "Already done", detail: err.message, subDetail: buildSubDetail(err.data) };
    return { kind: "error", title: "Scan failed", detail: err.message || "Please try again." };
  }
  if (data.action === "checkin") {
    return {
      kind: data.isLate ? "checkin_late" : "checkin_on_time",
      title: data.employeeName ? `Welcome, ${data.employeeName}` : "Checked in",
      detail: data.message,
      subDetail: buildSubDetail(data),
    };
  }
  if (data.action === "checkout") {
    const kind =
      data.status === "absent" ? "checkout_absent" :
      data.checkoutRemark === "auto_overtime" ? "checkout_auto_overtime" :
      data.checkoutRemark === "overtime" ? "checkout_overtime" :
      data.checkoutRemark === "early_checkout" ? "checkout_early" :
      "checkout_on_time";
    return {
      kind,
      title: data.employeeName ? `Bye, ${data.employeeName}` : "Checked out",
      detail: data.message,
      subDetail: buildSubDetail(data),
    };
  }
  return { kind: "error", title: "Unrecognised response", detail: data.message || "" };
}

// ---------------------------------------------------------------- sound --
// Tiny Web Audio beeps — no assets to load, works instantly on any kiosk.
function useKioskSound() {
  const ctxRef = useRef(null);
  const getCtx = () => {
    if (!ctxRef.current) {
      const Ctx = window.AudioContext || window.webkitAudioContext;
      if (Ctx) ctxRef.current = new Ctx();
    }
    if (ctxRef.current?.state === "suspended") ctxRef.current.resume().catch(() => {});
    return ctxRef.current;
  };

  const tone = useCallback((freq, duration, type = "sine", peak = 0.16, delay = 0) => {
    try {
      const ctx = getCtx();
      if (!ctx) return;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = type;
      osc.frequency.value = freq;
      const t0 = ctx.currentTime + delay;
      gain.gain.setValueAtTime(0.0001, t0);
      gain.gain.linearRampToValueAtTime(peak, t0 + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, t0 + duration);
      osc.connect(gain).connect(ctx.destination);
      osc.start(t0);
      osc.stop(t0 + duration + 0.05);
    } catch { /* audio unavailable on this device — fail silently */ }
  }, []);

  const chime = useCallback(() => {
    tone(659, 0.12, "sine", 0.16);
    tone(880, 0.18, "sine", 0.16, 0.13);
  }, [tone]);

  // Two short low pulses — the "haptic-style" buzz for a failed scan.
  const buzz = useCallback(() => {
    tone(180, 0.14, "sawtooth", 0.12);
    tone(160, 0.14, "sawtooth", 0.12, 0.19);
  }, [tone]);

  const tick = useCallback(() => tone(440, 0.07, "sine", 0.08), [tone]);

  return { chime, buzz, tick, unlock: getCtx };
}

function speak(text) {
  try {
    if (!("speechSynthesis" in window) || !text) return;
    window.speechSynthesis.cancel();
    const utter = new SpeechSynthesisUtterance(text);
    utter.rate = 1.03;
    utter.pitch = 1.05;
    utter.volume = 0.9;
    window.speechSynthesis.speak(utter);
  } catch { /* speech unavailable — fail silently */ }
}

// -------------------------------------------------------------- confetti --
const CONFETTI_COLORS = [MAROON, GOLD, "#3BA776", "#4C8BF5", "#E85D75"];
function Confetti({ burstKey }) {
  if (!burstKey) return null;
  const pieces = Array.from({ length: 22 });
  return (
    <div key={burstKey} className="pointer-events-none absolute inset-0 overflow-hidden rounded-3xl">
      {pieces.map((_, i) => {
        const left = Math.random() * 100;
        const delay = Math.random() * 0.15;
        const duration = 0.9 + Math.random() * 0.7;
        const w = 5 + Math.random() * 4;
        const h = w * 1.7;
        const color = CONFETTI_COLORS[i % CONFETTI_COLORS.length];
        const rotate = Math.round(Math.random() * 360);
        return (
          <span
            key={i}
            className="absolute top-0 kiosk-confetti-piece rounded-sm"
            style={{
              left: `${left}%`,
              width: w,
              height: h,
              background: color,
              animationDelay: `${delay}s`,
              animationDuration: `${duration}s`,
              transform: `rotate(${rotate}deg)`,
            }}
          />
        );
      })}
    </div>
  );
}

export default function FaceKiosk() {
  const queryClient = useQueryClient();
  const kioskLoginMutation = useKioskLogin();
  const kioskLogoutMutation = useKioskLogout();
  const scanMutation = useScanFace();
  const sound = useKioskSound();

  // checking | login | scanning | paused
  const [stage, setStage] = useState("checking");
  const [kioskInfo, setKioskInfo] = useState(null);
  const [loginForm, setLoginForm] = useState({ organisation_id: "", password: "", device_name: "" });
  const [loginError, setLoginError] = useState("");
  const [loggingIn, setLoggingIn] = useState(false);

  const [result, setResult] = useState(null); // { kind, title, detail, subDetail }
  const [resultKey, setResultKey] = useState(0); // bump to replay pop/shake animation
  const [confettiKey, setConfettiKey] = useState(null);
  const [recentScans, setRecentScans] = useState([]);
  const [cameraError, setCameraError] = useState("");
  const [cameraReady, setCameraReady] = useState(false);
  const [gatePickerOpen, setGatePickerOpen] = useState(false);

  const [gateChoice, setGateChoice] = useState("Gate 1");
  const [customGate, setCustomGate] = useState("");
  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(GATE_STORAGE_KEY) || "null");
      if (saved?.gateChoice) setGateChoice(saved.gateChoice);
      if (saved?.customGate) setCustomGate(saved.customGate);
    } catch { /* ignore malformed storage */ }
  }, []);
  useEffect(() => {
    localStorage.setItem(GATE_STORAGE_KEY, JSON.stringify({ gateChoice, customGate }));
  }, [gateChoice, customGate]);
  const resolvedGate = gateChoice === "Other" ? (customGate.trim() || "Other") : gateChoice;

  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);
  const scanTimerRef = useRef(null);
  const busyRef = useRef(false); // guards against overlapping scan calls
  const pausedRef = useRef(false); // true while a result banner is being shown

  const startCamera = useCallback(async () => {
    setCameraError("");
    setCameraReady(false);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "user", width: { ideal: 640 }, height: { ideal: 640 } },
        audio: false,
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
        setCameraReady(true);
      }
    } catch (err) {
      setCameraError(
        err.name === "NotAllowedError"
          ? "Camera permission denied. Please allow camera access for this device."
          : "Could not start camera: " + err.message
      );
    }
  }, []);

  const stopCamera = useCallback(() => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    setCameraReady(false);
  }, []);

  const captureFrame = useCallback(() => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas || !video.videoWidth) return null;
    const size = 480;
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext("2d");
    const vw = video.videoWidth;
    const vh = video.videoHeight;
    const side = Math.min(vw, vh);
    const sx = (vw - side) / 2;
    const sy = (vh - side) / 2;
    ctx.drawImage(video, sx, sy, side, side, 0, 0, size, size);
    return canvas.toDataURL("image/jpeg", 0.85).split(",")[1]; // strip data: prefix
  }, []);

  const showResult = useCallback((classified, { celebrate = false, fail = false, speakText } = {}) => {
    setResult(classified);
    setResultKey((k) => k + 1);
    if (celebrate) {
      setConfettiKey(Date.now());
      sound.chime();
    } else if (fail) {
      setConfettiKey(null);
      sound.buzz();
    } else {
      setConfettiKey(null);
      sound.tick();
    }
    speak(speakText ?? classified.title);
  }, [sound]);

  const runScanTick = useCallback(async () => {
    if (busyRef.current || pausedRef.current) return;
    const frame = captureFrame();
    if (!frame) return;

    busyRef.current = true;
    try {
      const data = await scanMutation.mutateAsync({ image: frame, gate: resolvedGate });
      const classified = classifyResult(data, null);
      setRecentScans((prev) => [
        { time: new Date(), name: data.employeeName || "—", message: data.message, kind: classified.kind, gate: data.gate },
        ...prev.slice(0, 6),
      ]);
      showResult(classified, { celebrate: CELEBRATE_KINDS.has(classified.kind) });
    } catch (err) {
      // "no face in frame" / low-confidence misses happen constantly while
      // the kiosk is just idling — only surface genuine outcomes, not noise.
      if (err.status === 404 && err.reason !== "not_registered") {
        busyRef.current = false;
        return;
      }
      const classified = classifyResult(null, err);
      if (FAILURE_KINDS.has(classified.kind)) {
        showResult(classified, { fail: true, speakText: "Face not recognized. Please try again." });
      } else {
        showResult(classified);
      }
    } finally {
      pausedRef.current = true;
      setTimeout(() => {
        pausedRef.current = false;
        busyRef.current = false;
        setResult(null);
        setConfettiKey(null);
      }, RESULT_HOLD_MS);
    }
  }, [captureFrame, resolvedGate, scanMutation, showResult]);

  // Fully hands-free: scanning begins the instant the kiosk is ready — no
  // tap required. A tap is only ever needed to change the gate or to
  // pause/log out, never to start a scan.
  const beginKiosk = useCallback(async () => {
    setStage("scanning");
    setResult(null);
    await startCamera();
    scanTimerRef.current = setInterval(runScanTick, SCAN_INTERVAL_MS);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [startCamera]);

  useEffect(() => {
    // keep the interval callback fresh without restarting the camera
    if (stage === "scanning" && scanTimerRef.current) {
      clearInterval(scanTimerRef.current);
      scanTimerRef.current = setInterval(runScanTick, SCAN_INTERVAL_MS);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [runScanTick]);

  const pauseKiosk = useCallback(() => {
    clearInterval(scanTimerRef.current);
    scanTimerRef.current = null;
    stopCamera();
    setResult(null);
    setConfettiKey(null);
    setStage("paused");
  }, [stopCamera]);

  useEffect(() => () => {
    clearInterval(scanTimerRef.current);
    stopCamera();
  }, [stopCamera]);

  // ---- boot: is a kiosk token already stored & still valid? ----
  useEffect(() => {
    (async () => {
      const token = getKioskToken();
      if (!token) return setStage("login");
      try {
        const me = await queryClient.fetchQuery({ queryKey: ["kiosk", "me"], queryFn: kioskMe });
        setKioskInfo(me);
        beginKiosk();
      } catch {
        clearKioskToken();
        setStage("login");
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoginError("");
    if (!loginForm.organisation_id || !loginForm.password || !loginForm.device_name) {
      setLoginError("All fields are required.");
      return;
    }
    setLoggingIn(true);
    sound.unlock(); // form submit is a user gesture — safe place to unlock audio
    try {
      const data = await kioskLoginMutation.mutateAsync(loginForm);
      setKioskToken(data.token);
      const me = await queryClient.fetchQuery({ queryKey: ["kiosk", "me"], queryFn: kioskMe });
      setKioskInfo(me);
      beginKiosk();
    } catch (err) {
      setLoginError(err.response?.data?.message || err.message || "Login failed");
    } finally {
      setLoggingIn(false);
    }
  };

  const handleLogout = async () => {
    if (!window.confirm("Log this kiosk out? Employees won't be able to scan until an admin logs it back in.")) return;
    try { await kioskLogoutMutation.mutateAsync(); } catch { /* token may already be dead, ignore */ }
    clearKioskToken();
    pauseKiosk();
    setKioskInfo(null);
    setStage("login");
  };

  const isFailure = result && FAILURE_KINDS.has(result.kind);
  const isCelebrating = result && CELEBRATE_KINDS.has(result.kind) && confettiKey;
  const isActivelyLooking = stage === "scanning" && !result;

  // ---------------------------------------------------------------- UI ----
  const kioskStyles = (
    <style>{`
      @keyframes kiosk-confetti-fall {
        0%   { transform: translateY(-10%) rotate(0deg); opacity: 1; }
        100% { transform: translateY(340%) rotate(560deg); opacity: 0; }
      }
      .kiosk-confetti-piece { animation-name: kiosk-confetti-fall; animation-timing-function: ease-in; animation-fill-mode: forwards; }

      @keyframes kiosk-pop-in {
        0%   { transform: scale(0.55); opacity: 0; }
        65%  { transform: scale(1.08); opacity: 1; }
        100% { transform: scale(1); opacity: 1; }
      }
      .kiosk-pop { animation: kiosk-pop-in 0.42s cubic-bezier(.34,1.56,.64,1); }

      @keyframes kiosk-shake {
        0%, 100% { transform: translateX(0); }
        20% { transform: translateX(-8px); }
        40% { transform: translateX(7px); }
        60% { transform: translateX(-5px); }
        80% { transform: translateX(5px); }
      }
      .kiosk-shake { animation: kiosk-shake 0.4s ease-in-out; }

      @keyframes kiosk-ring-pulse {
        0%   { transform: scale(1);    opacity: 0.55; }
        100% { transform: scale(1.4);  opacity: 0; }
      }
      .kiosk-ring { animation: kiosk-ring-pulse 1.9s cubic-bezier(0,0,0.2,1) infinite; }

      @keyframes kiosk-retry-pulse {
        0%, 100% { opacity: 1; transform: scale(1); }
        50%      { opacity: 0.55; transform: scale(1.04); }
      }
      .kiosk-retry-pulse { animation: kiosk-retry-pulse 1s ease-in-out infinite; }
    `}</style>
  );

  if (stage === "checking") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        {kioskStyles}
        <div className="w-8 h-8 border-[3px] border-gray-200 border-t-[#7B1C3E] rounded-full animate-spin" />
      </div>
    );
  }

  if (stage === "login") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
        {kioskStyles}
        <form onSubmit={handleLogin} className="bg-white border border-gray-200 rounded-3xl shadow-xl p-8 w-full max-w-sm flex flex-col gap-4">
          <div className="text-center mb-2">
            <span className="text-4xl">🪪</span>
            <h1 className="text-xl font-bold text-gray-900 mt-2">Live Face Attendance</h1>
            <p className="text-sm text-gray-500 mt-1">Sign this device in once as your organisation. It'll scan automatically after that — no tapping needed.</p>
          </div>

          <label className="text-sm font-semibold text-gray-700">
            Organisation ID
            <input
              type="text"
              className="mt-1 w-full border border-gray-300 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#7B1C3E]/30"
              value={loginForm.organisation_id}
              onChange={(e) => setLoginForm((f) => ({ ...f, organisation_id: e.target.value }))}
              placeholder="e.g. TECHTORCH01"
              autoComplete="username"
            />
          </label>

          <label className="text-sm font-semibold text-gray-700">
            Password
            <input
              type="password"
              className="mt-1 w-full border border-gray-300 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#7B1C3E]/30"
              value={loginForm.password}
              onChange={(e) => setLoginForm((f) => ({ ...f, password: e.target.value }))}
              placeholder="••••••••"
              autoComplete="current-password"
            />
          </label>

          <label className="text-sm font-semibold text-gray-700">
            Device name
            <input
              type="text"
              className="mt-1 w-full border border-gray-300 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#7B1C3E]/30"
              value={loginForm.device_name}
              onChange={(e) => setLoginForm((f) => ({ ...f, device_name: e.target.value }))}
              placeholder="e.g. Main Gate Tablet"
            />
          </label>

          {loginError && <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{loginError}</p>}

          <button
            type="submit"
            disabled={loggingIn}
            className="mt-2 text-white font-bold rounded-xl py-3 text-sm disabled:opacity-60"
            style={{ background: `linear-gradient(135deg, ${MAROON} 0%, #9B2554 100%)` }}
          >
            {loggingIn ? "Signing in…" : "Sign in this device"}
          </button>
        </form>
      </div>
    );
  }

  // stage: scanning | paused
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center p-4 sm:p-8">
      {kioskStyles}
      <div className="w-full max-w-md flex items-center justify-between mb-4">
        <div>
          <p className="text-xs text-gray-400 font-semibold uppercase tracking-wide">{kioskInfo?.organisation_name || "Kiosk"}</p>
          <p className="text-sm text-gray-700 font-semibold">{kioskInfo?.device_name}</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setGatePickerOpen((v) => !v)}
            className="text-xs font-semibold text-gray-500 bg-white border border-gray-200 rounded-full px-3 py-1.5 hover:border-gray-300"
          >
            📍 {resolvedGate}
          </button>
          {stage === "scanning" ? (
            <button
              onClick={pauseKiosk}
              title="Pause scanning"
              className="text-xs text-gray-400 hover:text-red-600 border border-gray-200 rounded-lg px-2.5 py-1.5"
            >
              ⏸
            </button>
          ) : (
            <button
              onClick={beginKiosk}
              title="Resume scanning"
              className="text-xs text-white rounded-lg px-2.5 py-1.5"
              style={{ background: MAROON }}
            >
              ▶
            </button>
          )}
          <button onClick={handleLogout} className="text-xs text-gray-400 hover:text-red-600 border border-gray-200 rounded-lg px-2.5 py-1.5">
            Log out
          </button>
        </div>
      </div>

      {gatePickerOpen && (
        <div className="w-full max-w-md bg-white border border-gray-200 rounded-2xl p-4 mb-4 flex gap-2">
          <select
            value={gateChoice}
            onChange={(e) => setGateChoice(e.target.value)}
            className="flex-1 border border-gray-300 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#7B1C3E]/30 bg-white"
          >
            {GATE_OPTIONS.map((g) => (
              <option key={g} value={g}>{g}</option>
            ))}
          </select>
          {gateChoice === "Other" && (
            <input
              type="text"
              value={customGate}
              onChange={(e) => setCustomGate(e.target.value)}
              placeholder="Gate name"
              maxLength={40}
              className="flex-1 border border-gray-300 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#7B1C3E]/30"
            />
          )}
          <button
            onClick={() => setGatePickerOpen(false)}
            className="text-white font-semibold rounded-xl px-4 text-sm"
            style={{ background: MAROON }}
          >
            Done
          </button>
        </div>
      )}

      <div className="bg-white border border-gray-200 rounded-3xl shadow-xl p-6 w-full max-w-md flex flex-col items-center gap-4">
        {stage === "scanning" && (
          <div className="w-full flex items-center justify-center">
            <span className="bg-gray-100 text-gray-600 text-xs font-semibold px-3 py-1.5 rounded-full border border-gray-200">
              {isActivelyLooking ? "👀 Watching for a face…" : "📍 " + resolvedGate}
            </span>
          </div>
        )}

        <div className="relative w-64 h-64">
          {/* Radar pulse rings — only while actively looking, not while a result is showing */}
          {isActivelyLooking && (
            <>
              <span className="absolute inset-0 rounded-full border-2 kiosk-ring" style={{ borderColor: MAROON }} />
              <span className="absolute inset-0 rounded-full border-2 kiosk-ring" style={{ borderColor: MAROON, animationDelay: "0.9s" }} />
            </>
          )}

          <div className="relative w-64 h-64 rounded-full overflow-hidden bg-gray-100 border-[3px] border-gray-200">
            <video
              ref={videoRef}
              className={`w-full h-full object-cover ${stage === "scanning" ? "block" : "hidden"}`}
              style={{ transform: "scaleX(-1)" }}
              playsInline muted
            />
            {stage === "paused" && (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-gray-400">
                <span className="text-5xl">⏸</span>
                <p className="text-xs text-center px-6">Scanning paused. Tap ▶ above to resume.</p>
              </div>
            )}
            {stage === "scanning" && !cameraReady && !cameraError && (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-gray-400">
                <div className="w-6 h-6 border-[3px] border-gray-200 border-t-[#7B1C3E] rounded-full animate-spin" />
                <p className="text-xs text-center px-6">Warming up camera…</p>
              </div>
            )}
          </div>
        </div>
        <canvas ref={canvasRef} className="hidden" />

        {cameraError && (
          <div className="w-full flex flex-col items-center gap-2">
            <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2 text-center">{cameraError}</p>
            <button
              onClick={startCamera}
              className="text-white font-semibold rounded-xl px-4 py-2 text-sm"
              style={{ background: MAROON }}
            >
              Enable camera
            </button>
          </div>
        )}

        {result && (
          <div className="relative w-full">
            <Confetti burstKey={isCelebrating ? confettiKey : null} />
            <div
              key={resultKey}
              className={`w-full rounded-2xl border px-4 py-3 text-center kiosk-pop ${isFailure ? "kiosk-shake" : ""} ${RESULT_STYLES[result.kind]?.bg} ${RESULT_STYLES[result.kind]?.border}`}
            >
              <p className={`font-bold text-base ${RESULT_STYLES[result.kind]?.text}`}>
                {RESULT_STYLES[result.kind]?.icon} {result.title}
              </p>
              <p className={`text-sm mt-1 ${RESULT_STYLES[result.kind]?.text}`}>{result.detail}</p>
              {result.subDetail && (
                <p className={`text-xs mt-1 opacity-75 ${RESULT_STYLES[result.kind]?.text}`}>{result.subDetail}</p>
              )}
              {isFailure && (
                <p className="text-xs font-bold mt-2 text-gray-500 kiosk-retry-pulse">🔁 Please look at the camera and try again</p>
              )}
            </div>
          </div>
        )}

        <p className="text-xs text-gray-400 text-center">
          {stage === "scanning"
            ? "Fully automatic — just look at the camera. No need to tap anything."
            : "New here? Ask an admin to register your face from the Face Attendance settings page."}
        </p>
      </div>

      {recentScans.length > 0 && (
        <div className="w-full max-w-md mt-4 bg-white border border-gray-200 rounded-2xl p-4">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Recent scans</p>
          <div className="flex flex-col gap-2">
            {recentScans.map((s, i) => (
              <div key={i} className="flex items-center justify-between text-sm">
                <span className="text-gray-700 font-medium truncate">{s.name}</span>
                <span className="flex items-center gap-2 flex-shrink-0">
                  {s.gate && <span className="text-gray-400 text-[11px] bg-gray-50 border border-gray-200 rounded-full px-2 py-0.5">{s.gate}</span>}
                  <span className="text-gray-400 text-xs">{s.time.toLocaleTimeString()}</span>
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}