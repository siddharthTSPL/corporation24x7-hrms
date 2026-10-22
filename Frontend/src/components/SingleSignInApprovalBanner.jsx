import { useEffect, useState, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import {
  FaShieldAlt,
  FaDesktop,
  FaMapMarkerAlt,
  FaCheck,
  FaTimes,
  FaExclamationTriangle,
} from "react-icons/fa";
import {
  getMyPendingChallenge,
  respondToChallenge,
} from "../auth/api/singleSignIn/singleSignIn.api";
import { usePermissionStore } from "../auth/store/permission/permissionStore";
import { clearAgentToken } from "../pages/utils/Desktopagent";

// Matches the backend's CHALLENGE_TTL_MS (utils/singleSignIn.utils.js) —
// used only to size the countdown progress bar, not to decide expiry.
// The server remains the source of truth; this is a visual aid.
const CHALLENGE_TTL_SECONDS = 90;

const formatCountdown = (seconds) => {
  const clamped = Math.max(0, seconds);
  const mins = Math.floor(clamped / 60);
  const secs = clamped % 60;
  return `${mins}:${String(secs).padStart(2, "0")}`;
};

// Mount once inside an already-authenticated layout (e.g. MainLayout).
// Polls every 5s for a pending sign-in request raised against this
// account's active session, and lets the person approve/deny it right
// from wherever they're currently working — no page navigation needed.
export default function SingleSignInApprovalBanner() {
  const [pending, setPending] = useState(null); // { deviceInfo, expiresAt }
  const [busy, setBusy] = useState(false);
  const [stage, setStage] = useState("prompt"); // prompt | signing-out
  const [secondsLeft, setSecondsLeft] = useState(CHALLENGE_TTL_SECONDS);
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const clearPermissions = usePermissionStore((state) => state.clearPermissions);
  const signOutTimer = useRef(null);

  useEffect(() => () => clearTimeout(signOutTimer.current), []);

  const checkPending = useCallback(async () => {
    // Don't let a background poll interrupt the sign-out animation that's
    // already playing after an approve.
    if (stage === "signing-out") return;
    try {
      const res = await getMyPendingChallenge();
      if (res?.pending) {
        setPending({ deviceInfo: res.deviceInfo, expiresAt: res.expiresAt });
      } else {
        setPending(null);
      }
    } catch {
      // ignore transient failures — next poll will retry
    }
  }, [stage]);

  useEffect(() => {
    checkPending();
    const interval = setInterval(checkPending, 5000);
    return () => clearInterval(interval);
  }, [checkPending]);

  // Live countdown to the request's expiry, recalculated from the
  // server-provided expiresAt every second so it can't drift.
  useEffect(() => {
    if (!pending?.expiresAt || stage !== "prompt") return;

    const tick = () => {
      const msLeft = new Date(pending.expiresAt).getTime() - Date.now();
      setSecondsLeft(Math.max(0, Math.round(msLeft / 1000)));
    };

    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, [pending?.expiresAt, stage]);

  const signOutThisDevice = () => {
    localStorage.removeItem("role");
    clearPermissions();
    clearAgentToken();
    queryClient.setQueryData(["auth"], null);
    queryClient.removeQueries({ queryKey: ["auth"] });
    navigate("/login", {
      replace: true,
      state: {
        notice:
          "You have been signed out of this device because you approved a sign-in request from another device.",
      },
    });
  };

  const decide = async (decision) => {
    setBusy(true);
    try {
      await respondToChallenge(decision);

      // Approving hands this account's active session to the other
      // device — the backend revokes THIS device's session as soon as
      // the request lands. Play a short confirmation animation, then
      // sign this device out rather than leaving it sitting on a
      // session that's already dead until some later request 401s.
      if (decision === "approve") {
        setStage("signing-out");
        signOutTimer.current = setTimeout(signOutThisDevice, 1800);
        return;
      }

      setPending(null);
    } catch {
      // ignore — banner will just re-poll and show current true state
    } finally {
      setBusy(false);
    }
  };

  if (!pending) return null;

  const progressPct = Math.min(100, Math.max(0, (secondsLeft / CHALLENGE_TTL_SECONDS) * 100));

  return (
    <div className="fixed top-4 right-4 z-[9999] w-[380px] max-w-[calc(100vw-2rem)] bg-white border border-[#e8dcd6] rounded-2xl shadow-2xl overflow-hidden animate-[slideIn_0.25s_ease-out]">
      <style>{`
        @keyframes ssiCircleDraw { to { stroke-dashoffset: 0; } }
        @keyframes ssiCheckDraw { to { stroke-dashoffset: 0; } }
        @keyframes ssiFadeUp { from { opacity: 0; transform: translateY(4px); } to { opacity: 1; transform: translateY(0); } }
      `}</style>

      {stage === "prompt" ? (
        <>
          <div className="flex items-start gap-3 p-4 pb-3">
            <div className="shrink-0 w-10 h-10 rounded-full bg-[#730042]/10 flex items-center justify-center">
              <FaShieldAlt className="text-[#730042] text-base" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-[#2a1a16]">New sign-in request</p>
              <p className="text-xs text-[#8a7a75] mt-0.5 leading-relaxed">
                We detected an attempt to sign in to your account from a device we don't
                recognize. Please review the details below and confirm whether this was you.
              </p>
            </div>
          </div>

          <div className="mx-4 mb-3 rounded-xl border border-[#f0e8e4] bg-[#faf8f6] divide-y divide-[#f0e8e4]">
            <div className="flex items-center gap-2.5 px-3 py-2.5">
              <FaDesktop className="text-[#b0948a] text-xs shrink-0" />
              <div className="min-w-0">
                <p className="text-[10px] uppercase tracking-wide text-[#b0948a]">Device</p>
                <p className="text-xs font-medium text-[#2a1a16] truncate">
                  {pending.deviceInfo?.label || "Unrecognized device"}
                </p>
              </div>
            </div>
            {pending.deviceInfo?.ip && (
              <div className="flex items-center gap-2.5 px-3 py-2.5">
                <FaMapMarkerAlt className="text-[#b0948a] text-xs shrink-0" />
                <div className="min-w-0">
                  <p className="text-[10px] uppercase tracking-wide text-[#b0948a]">IP address</p>
                  <p className="text-xs font-medium text-[#2a1a16] truncate">
                    {pending.deviceInfo.ip}
                  </p>
                </div>
              </div>
            )}
          </div>

          <div className="mx-4 mb-3 flex items-start gap-2 text-[11px] text-[#8a5a3a] bg-[#fdf6f2] border border-[#f0dcd0] rounded-lg px-3 py-2">
            <FaExclamationTriangle className="shrink-0 mt-0.5" />
            <p className="leading-relaxed">
              If you don't recognize this activity, choose "Deny" to block the request and keep
              your account secure. If you approve it, this device will be signed out
              automatically, since only one device can be signed in at a time.
            </p>
          </div>

          <div className="px-4 pb-4">
            <div className="flex gap-2">
              <button
                disabled={busy}
                onClick={() => decide("approve")}
                className="flex-1 flex items-center justify-center gap-1.5 text-sm font-medium py-2 rounded-lg bg-[#730042] text-white hover:opacity-90 disabled:opacity-50 transition"
              >
                <FaCheck className="text-xs" />
                {busy ? "Confirming..." : "Yes, this was me"}
              </button>
              <button
                disabled={busy}
                onClick={() => decide("deny")}
                className="flex-1 flex items-center justify-center gap-1.5 text-sm font-medium py-2 rounded-lg border border-[#e8dcd6] text-[#2a1a16] hover:bg-[#f9f8f2] disabled:opacity-50 transition"
              >
                <FaTimes className="text-xs" />
                {busy ? "Denying..." : "No, deny access"}
              </button>
            </div>

            <div className="mt-2.5">
              <div className="flex items-center justify-between text-[10px] text-[#b0948a] mb-1">
                <span>This request expires automatically</span>
                <span className="font-medium tabular-nums">{formatCountdown(secondsLeft)}</span>
              </div>
              <div className="h-1 rounded-full bg-[#f0e8e4] overflow-hidden">
                <div
                  className="h-full bg-[#730042] rounded-full transition-[width] duration-1000 ease-linear"
                  style={{ width: `${progressPct}%` }}
                />
              </div>
            </div>
          </div>
        </>
      ) : (
        <div className="flex flex-col items-center text-center py-8 px-4">
          <svg viewBox="0 0 52 52" className="w-14 h-14 mb-3">
            <circle
              cx="26" cy="26" r="23" fill="none" stroke="#730042" strokeWidth="3"
              style={{ strokeDasharray: 145, strokeDashoffset: 145, animation: "ssiCircleDraw 0.45s ease-out forwards" }}
            />
            <path
              d="M15 27l7 7 15-15" fill="none" stroke="#730042" strokeWidth="3"
              strokeLinecap="round" strokeLinejoin="round"
              style={{ strokeDasharray: 34, strokeDashoffset: 34, animation: "ssiCheckDraw 0.3s 0.45s ease-out forwards" }}
            />
          </svg>
          <p
            className="text-sm font-semibold text-[#2a1a16] mb-1 opacity-0"
            style={{ animation: "ssiFadeUp 0.3s 0.7s ease-out forwards" }}
          >
            Sign-in confirmed
          </p>
          <p
            className="text-xs text-[#8a7a75] max-w-[260px] opacity-0"
            style={{ animation: "ssiFadeUp 0.3s 0.9s ease-out forwards" }}
          >
            The other device now has your active session. For your security, you're being
            signed out of this device automatically.
          </p>
        </div>
      )}
    </div>
  );
}