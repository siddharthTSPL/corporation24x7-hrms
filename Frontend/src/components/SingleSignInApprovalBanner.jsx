import { useEffect, useState, useCallback } from "react";
import {
  getMyPendingChallenge,
  respondToChallenge,
} from "../auth/api/singleSignIn/singleSignIn.api";

// Mount once inside an already-authenticated layout (e.g. MainLayout).
// Polls every 5s for a pending sign-in request raised against this
// account's active session, and lets the person approve/deny it right
// from wherever they're currently working — no page navigation needed.
export default function SingleSignInApprovalBanner() {
  const [pending, setPending] = useState(null); // { deviceInfo, expiresAt }
  const [busy, setBusy] = useState(false);

  const checkPending = useCallback(async () => {
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
  }, []);

  useEffect(() => {
    checkPending();
    const interval = setInterval(checkPending, 5000);
    return () => clearInterval(interval);
  }, [checkPending]);

  const decide = async (decision) => {
    setBusy(true);
    try {
      await respondToChallenge(decision);
    } catch {
      // ignore — banner will just re-poll and show current true state
    } finally {
      setPending(null);
      setBusy(false);
    }
  };

  if (!pending) return null;

  return (
    <div className="fixed top-4 right-4 z-[9999] w-[340px] bg-white border border-[#e8dcd6] rounded-xl shadow-xl p-4 animate-[slideIn_0.2s_ease-out]">
      <p className="text-sm font-semibold text-[#2a1a16] mb-1">New sign-in attempt</p>
      <p className="text-xs text-[#8a7a75] mb-3">
        Someone is trying to sign in to your account from{" "}
        <span className="font-medium text-[#2a1a16]">{pending.deviceInfo?.label || "another device"}</span>
        {pending.deviceInfo?.ip ? ` (${pending.deviceInfo.ip})` : ""}. Was this you?
      </p>
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
    </div>
  );
}