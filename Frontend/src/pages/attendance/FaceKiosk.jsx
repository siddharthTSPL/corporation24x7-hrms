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
const SCAN_INTERVAL_MS = 2200; // how often a frame is sent while scanning
const RESULT_HOLD_MS = 4000; // how long a result banner stays up before scanning resumes

// Visual theme per outcome, kept separate from the scan logic so the
// backend can add new "reason"/"action" values without breaking the UI —
// anything unrecognised just falls back to the neutral style.
const RESULT_STYLES = {
  checkin_on_time: { bg: "bg-green-50", border: "border-green-300", text: "text-green-800", icon: "✅" },
  checkin_late: { bg: "bg-amber-50", border: "border-amber-300", text: "text-amber-800", icon: "⏰" },
  checkout_on_time: { bg: "bg-blue-50", border: "border-blue-300", text: "text-blue-800", icon: "✅" },
  checkout_overtime: { bg: "bg-purple-50", border: "border-purple-300", text: "text-purple-800", icon: "🌙" },
  checkout_early: { bg: "bg-amber-50", border: "border-amber-300", text: "text-amber-800", icon: "⚠️" },
  blocked: { bg: "bg-red-50", border: "border-red-300", text: "text-red-800", icon: "⛔" },
  not_registered: { bg: "bg-gray-100", border: "border-gray-300", text: "text-gray-700", icon: "🙈" },
  already_done: { bg: "bg-gray-100", border: "border-gray-300", text: "text-gray-700", icon: "ℹ️" },
  error: { bg: "bg-red-50", border: "border-red-300", text: "text-red-800", icon: "⚠️" },
};

function classifyResult(data, err) {
  if (err) {
    if (err.reason === "not_registered")
      return { kind: "not_registered", title: "Not registered", detail: "This face isn't registered yet. Please ask your admin to register you first, then try again." };
    if (err.reason === "shift_not_started")
      return { kind: "blocked", title: "Not allowed", detail: err.message };
    if (err.status === 400)
      return { kind: "already_done", title: "Already done", detail: err.message };
    return { kind: "error", title: "Scan failed", detail: err.message };
  }
  if (data.action === "checkin") {
    return {
      kind: data.isLate ? "checkin_late" : "checkin_on_time",
      title: data.employeeName ? `Welcome, ${data.employeeName}` : "Checked in",
      detail: data.message,
    };
  }
  if (data.action === "checkout") {
    const kind =
      data.checkoutRemark === "overtime" ? "checkout_overtime" :
      data.checkoutRemark === "early_checkout" ? "checkout_early" :
      "checkout_on_time";
    return {
      kind,
      title: data.employeeName ? `Bye, ${data.employeeName}` : "Checked out",
      detail: data.message,
    };
  }
  return { kind: "error", title: "Unrecognised response", detail: data.message || "" };
}

export default function FaceKiosk() {
  const queryClient = useQueryClient();
  const kioskLoginMutation = useKioskLogin();
  const kioskLogoutMutation = useKioskLogout();
  const scanMutation = useScanFace();

  const [stage, setStage] = useState("checking"); // checking | login | ready | scanning
  const [kioskInfo, setKioskInfo] = useState(null);
  const [loginForm, setLoginForm] = useState({ organisation_id: "", password: "", device_name: "" });
  const [loginError, setLoginError] = useState("");
  const [loggingIn, setLoggingIn] = useState(false);

  const [result, setResult] = useState(null); // { kind, title, detail }
  const [recentScans, setRecentScans] = useState([]);
  const [cameraError, setCameraError] = useState("");

  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);
  const scanTimerRef = useRef(null);
  const busyRef = useRef(false); // guards against overlapping scan calls
  const pausedRef = useRef(false); // true while a result banner is being shown

  // ---- boot: is a kiosk token already stored & still valid? ----
  useEffect(() => {
    (async () => {
      const token = getKioskToken();
      if (!token) return setStage("login");
      try {
        const me = await queryClient.fetchQuery({ queryKey: ["kiosk", "me"], queryFn: kioskMe });
        setKioskInfo(me);
        setStage("ready");
      } catch {
        clearKioskToken();
        setStage("login");
      }
    })();
  }, []);

  const startCamera = useCallback(async () => {
    setCameraError("");
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "user", width: { ideal: 640 }, height: { ideal: 640 } },
        audio: false,
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
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

  const runScanTick = useCallback(async () => {
    if (busyRef.current || pausedRef.current) return;
    const frame = captureFrame();
    if (!frame) return;

    busyRef.current = true;
    try {
      const data = await scanMutation.mutateAsync(frame);
      const classified = classifyResult(data, null);
      setResult(classified);
      setRecentScans((prev) => [
        { time: new Date(), name: data.employeeName || "—", message: data.message, kind: classified.kind },
        ...prev.slice(0, 6),
      ]);
    } catch (err) {
      // "no face in frame" / low-confidence misses happen constantly while
      // the kiosk is just idling — only surface genuine outcomes, not noise.
      if (err.status === 404 && err.reason !== "not_registered") {
        busyRef.current = false;
        return;
      }
      setResult(classifyResult(null, err));
    } finally {
      pausedRef.current = true;
      setTimeout(() => {
        pausedRef.current = false;
        busyRef.current = false;
      }, RESULT_HOLD_MS);
    }
  }, [captureFrame]);

  const startScanning = useCallback(async () => {
    await startCamera();
    setStage("scanning");
    setResult(null);
    scanTimerRef.current = setInterval(runScanTick, SCAN_INTERVAL_MS);
  }, [startCamera, runScanTick]);

  const stopScanning = useCallback(() => {
    clearInterval(scanTimerRef.current);
    scanTimerRef.current = null;
    stopCamera();
    setResult(null);
    setStage("ready");
  }, [stopCamera]);

  useEffect(() => () => {
    clearInterval(scanTimerRef.current);
    stopCamera();
  }, [stopCamera]);

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoginError("");
    if (!loginForm.organisation_id || !loginForm.password || !loginForm.device_name) {
      setLoginError("All fields are required.");
      return;
    }
    setLoggingIn(true);
    try {
      const data = await kioskLoginMutation.mutateAsync(loginForm);
      setKioskToken(data.token);
      const me = await queryClient.fetchQuery({ queryKey: ["kiosk", "me"], queryFn: kioskMe });
      setKioskInfo(me);
      setStage("ready");
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
    stopScanning();
    setKioskInfo(null);
    setStage("login");
  };

  // ---------------------------------------------------------------- UI ----
  if (stage === "checking") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="w-8 h-8 border-[3px] border-gray-200 border-t-[#7B1C3E] rounded-full animate-spin" />
      </div>
    );
  }

  if (stage === "login") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
        <form onSubmit={handleLogin} className="bg-white border border-gray-200 rounded-3xl shadow-xl p-8 w-full max-w-sm flex flex-col gap-4">
          <div className="text-center mb-2">
            <span className="text-4xl">🪪</span>
            <h1 className="text-xl font-bold text-gray-900 mt-2">Live Face Attendance</h1>
            <p className="text-sm text-gray-500 mt-1">Sign this device in once as your organisation. It will stay signed in.</p>
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

  // stage: ready | scanning
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center p-4 sm:p-8">
      <div className="w-full max-w-md flex items-center justify-between mb-4">
        <div>
          <p className="text-xs text-gray-400 font-semibold uppercase tracking-wide">{kioskInfo?.organisation_name || "Kiosk"}</p>
          <p className="text-sm text-gray-700 font-semibold">{kioskInfo?.device_name}</p>
        </div>
        <button onClick={handleLogout} className="text-xs text-gray-400 hover:text-red-600 border border-gray-200 rounded-lg px-3 py-1.5">
          Log out device
        </button>
      </div>

      <div className="bg-white border border-gray-200 rounded-3xl shadow-xl p-6 w-full max-w-md flex flex-col items-center gap-4">
        <div className="relative w-64 h-64 rounded-full overflow-hidden bg-gray-100 border-[3px] border-gray-200">
          <video
            ref={videoRef}
            className={`w-full h-full object-cover ${stage === "scanning" ? "block" : "hidden"}`}
            style={{ transform: "scaleX(-1)" }}
            playsInline muted
          />
          {stage !== "scanning" && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-gray-400">
              <span className="text-5xl">📷</span>
              <p className="text-xs text-center px-6">Camera is off. Tap “Scan People” to start.</p>
            </div>
          )}
          {stage === "scanning" && !result && (
            <div className="absolute inset-0 flex items-end justify-center pb-4">
              <span className="bg-black/50 text-white text-[11px] px-3 py-1 rounded-full animate-pulse">Looking for a face…</span>
            </div>
          )}
        </div>
        <canvas ref={canvasRef} className="hidden" />

        {cameraError && (
          <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2 text-center">{cameraError}</p>
        )}

        {result && (
          <div className={`w-full rounded-2xl border px-4 py-3 text-center ${RESULT_STYLES[result.kind]?.bg} ${RESULT_STYLES[result.kind]?.border}`}>
            <p className={`font-bold text-base ${RESULT_STYLES[result.kind]?.text}`}>
              {RESULT_STYLES[result.kind]?.icon} {result.title}
            </p>
            <p className={`text-sm mt-1 ${RESULT_STYLES[result.kind]?.text}`}>{result.detail}</p>
          </div>
        )}

        {stage === "ready" && (
          <button
            onClick={startScanning}
            className="w-full text-white font-bold rounded-xl py-3.5 text-base"
            style={{ background: `linear-gradient(135deg, ${MAROON} 0%, #9B2554 100%)` }}
          >
            ▶ Scan People
          </button>
        )}
        {stage === "scanning" && (
          <button
            onClick={stopScanning}
            className="w-full bg-gray-100 text-gray-700 font-semibold rounded-xl py-3 text-sm border border-gray-200"
          >
            ⏸ Stop scanning
          </button>
        )}

        <p className="text-xs text-gray-400 text-center">
          New here? Face not recognised means you haven't been registered yet — ask an admin to register your face from the Face Attendance settings page.
        </p>
      </div>

      {recentScans.length > 0 && (
        <div className="w-full max-w-md mt-4 bg-white border border-gray-200 rounded-2xl p-4">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Recent scans</p>
          <div className="flex flex-col gap-2">
            {recentScans.map((s, i) => (
              <div key={i} className="flex items-center justify-between text-sm">
                <span className="text-gray-700 font-medium truncate">{s.name}</span>
                <span className="text-gray-400 text-xs">{s.time.toLocaleTimeString()}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}