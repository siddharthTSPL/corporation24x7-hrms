import { useEffect, useState, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import {
  getMyPendingChallenge,
  respondToChallenge,
} from "../auth/api/singleSignIn/singleSignIn.api";
import { usePermissionStore } from "../auth/store/permission/permissionStore";
import { clearAgentToken } from "../pages/utils/Desktopagent";

// Mount once inside an already-authenticated layout (e.g. MainLayout).
// Polls every 5s for a pending sign-in request raised against this
// account's active session, and lets the person approve/deny it right
// from wherever they're currently working — no page navigation needed.
export default function SingleSignInApprovalBanner() {
  const [pending, setPending] = useState(null); // { deviceInfo, expiresAt }
  const [busy, setBusy] = useState(false);
  const [stage, setStage] = useState("prompt"); // prompt | signing-out
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

  const signOutThisDevice = () => {
    localStorage.removeItem("role");
    clearPermissions();
    clearAgentToken();
    queryClient.setQueryData(["auth"], null);
    queryClient.removeQueries({ queryKey: ["auth"] });
    navigate("/login", {
      replace: true,
      state: {
        notice: "You're signed out here since you approved the sign-in on your other device.",
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

  return (
    <div className="fixed top-4 right-4 z-[9999] w-[340px] bg-white border border-[#e8dcd6] rounded-xl shadow-xl p-4 animate-[slideIn_0.2s_ease-out]">
      <style>{`
        @keyframes ssiCircleDraw { to { stroke-dashoffset: 0; } }
        @keyframes ssiCheckDraw { to { stroke-dashoffset: 0; } }
        @keyframes ssiFadeUp { from { opacity: 0; transform: translateY(4px); } to { opacity: 1; transform: translateY(0); } }
      `}</style>

      {stage === "prompt" ? (
        <>
          <p className="text-sm font-semibold text-[#2a1a16] mb-1">New sign-in attempt</p>
          <p className="text-xs text-[#8a7a75] mb-0.5">
            Someone is trying to sign in to your account from{" "}
            <span className="font-medium text-[#2a1a16]">{pending.deviceInfo?.label || "another device"}</span>.
          </p>
          {pending.deviceInfo?.ip && (
            <p className="text-[11px] text-[#b0948a] mb-2">IP address: {pending.deviceInfo.ip}</p>
          )}
          <p className="text-xs text-[#8a7a75] mb-3">Was this you?</p>
          <div className="flex gap-2">
            <button
              disabled={busy}
              onClick={() => decide("approve")}
              className="flex-1 text-sm font-medium py-1.5 rounded-lg bg-[#730042] text-white hover:opacity-90 disabled:opacity-50"
            >
              Yes, it's me
            </button>
            <button
              disabled={busy}
              onClick={() => decide("deny")}
              className="flex-1 text-sm font-medium py-1.5 rounded-lg border border-[#e8dcd6] text-[#2a1a16] hover:bg-[#f9f8f2] disabled:opacity-50"
            >
              Not me
            </button>
          </div>
        </>
      ) : (
        <div className="flex flex-col items-center text-center py-2">
          <svg viewBox="0 0 52 52" className="w-12 h-12 mb-2">
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
            className="text-sm font-semibold text-[#2a1a16] mb-0.5 opacity-0"
            style={{ animation: "ssiFadeUp 0.3s 0.7s ease-out forwards" }}
          >
            Confirmed
          </p>
          <p
            className="text-xs text-[#8a7a75] opacity-0"
            style={{ animation: "ssiFadeUp 0.3s 0.9s ease-out forwards" }}
          >
            Signing you out of this device...
          </p>
        </div>
      )}
    </div>
  );
}