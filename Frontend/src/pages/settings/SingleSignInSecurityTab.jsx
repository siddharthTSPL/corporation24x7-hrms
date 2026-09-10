import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { usePlanFeatures } from "../../auth/server-state/planFeature/planFeature.hook";
import {
  getSingleSignInSettings,
  updateSingleSignInSettings,
  listActiveSessions,
  signOutAllOtherSessions,
} from "../../auth/api/singleSignIn/singleSignIn.api";

// Small on/off pill switch, styled to match the rest of susetting.jsx
// (brand color #730042, neutral borders #e8dcd6).
function ToggleSwitch({ checked, onChange, disabled }) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={`relative w-11 h-6 rounded-full transition-colors shrink-0 ${
        checked ? "bg-[#730042]" : "bg-[#e0d6d2]"
      } ${disabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}`}
    >
      <span
        className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${
          checked ? "translate-x-5" : "translate-x-0"
        }`}
      />
    </button>
  );
}

export default function SingleSignInSecurityTab({ onSuccess, onError }) {
  const queryClient = useQueryClient();
  const { data: planFeatures, isLoading: planLoading } = usePlanFeatures();
  const unlocked = !!planFeatures?.features?.single_sign_in;

  const { data, isLoading } = useQuery({
    queryKey: ["single-sign-in-settings"],
    queryFn: getSingleSignInSettings,
  });

  const [enabled, setEnabled] = useState(false);
  const [mode, setMode] = useState("approval");

  useEffect(() => {
    if (data?.singleSignIn) {
      setEnabled(!!data.singleSignIn.enabled);
      setMode(data.singleSignIn.mode || "approval");
    }
  }, [data]);

  const { mutate: save, isPending: isSaving } = useMutation({
    mutationFn: updateSingleSignInSettings,
    onSuccess: (res) => {
      queryClient.setQueryData(["single-sign-in-settings"], { success: true, singleSignIn: res.singleSignIn });
      onSuccess?.("Single Sign-In settings updated");
    },
    onError: (err) => {
      // revert optimistic UI on failure
      if (data?.singleSignIn) {
        setEnabled(!!data.singleSignIn.enabled);
        setMode(data.singleSignIn.mode || "approval");
      }
      onError?.(err.message || "Could not update Single Sign-In settings");
    },
  });

  const handleToggle = (next) => {
    setEnabled(next);
    save({ enabled: next, mode });
  };

  const handleModeChange = (next) => {
    setMode(next);
    save({ enabled, mode: next });
  };

  if (planLoading || isLoading) {
    return <div className="text-sm text-[#b0948a]">Loading security settings...</div>;
  }

  if (!unlocked) {
    return (
      <div className="bg-white rounded-xl border border-[#e8dcd6] p-6">
        <h3 className="text-base font-semibold text-[#2a1a16] mb-1">Single Sign-In</h3>
        <p className="text-sm text-[#8a7a75] mb-4">
          Restrict every account to one active device at a time, with an approve/deny prompt when someone tries to sign in elsewhere.
        </p>
        <div className="p-3 bg-[#fdf6f2] border border-[#f0dcd0] rounded-lg text-sm text-[#8a5a3a]">
          This is available on the Advance and Enterprise plans. Upgrade your plan to turn it on.
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl border border-[#e8dcd6] p-6">
      <div className="flex items-start justify-between gap-4 mb-4">
        <div>
          <h3 className="text-base font-semibold text-[#2a1a16] mb-1">Single Sign-In</h3>
          <p className="text-sm text-[#8a7a75] max-w-md">
            When on, every account in your organisation can only be signed in on one device at a time.
          </p>
        </div>
        <ToggleSwitch checked={enabled} onChange={handleToggle} disabled={isSaving} />
      </div>

      {enabled && (
        <div className="pt-4 border-t border-[#f0e8e4]">
          <p className="text-sm font-medium text-[#2a1a16] mb-2">When someone signs in on a new device</p>
          <div className="flex flex-col gap-2">
            <label className="flex items-start gap-2 cursor-pointer">
              <input
                type="radio"
                name="sso-mode"
                checked={mode === "approval"}
                onChange={() => handleModeChange("approval")}
                disabled={isSaving}
                className="mt-1"
              />
              <span className="text-sm text-[#2a1a16]">
                <span className="font-medium">Ask for approval</span>
                <span className="block text-[#8a7a75] text-xs">The existing device gets an approve/deny prompt before the new sign-in goes through.</span>
              </span>
            </label>
            <label className="flex items-start gap-2 cursor-pointer">
              <input
                type="radio"
                name="sso-mode"
                checked={mode === "strict"}
                onChange={() => handleModeChange("strict")}
                disabled={isSaving}
                className="mt-1"
              />
              <span className="text-sm text-[#2a1a16]">
                <span className="font-medium">Block outright</span>
                <span className="block text-[#8a7a75] text-xs">The new sign-in is rejected — they must sign out of the other device first.</span>
              </span>
            </label>
          </div>
        </div>
      )}

      {enabled && <ActiveSessionsPanel onSuccess={onSuccess} onError={onError} />}
    </div>
  );
}

// Org-wide audit list (SuperAdmin) + a self-service "sign out my other
// sessions" action, both scoped under the same Security tab.
function ActiveSessionsPanel({ onSuccess, onError }) {
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ["single-sign-in-sessions"],
    queryFn: listActiveSessions,
  });

  const { mutate: signOutOthers, isPending: isSigningOut } = useMutation({
    mutationFn: signOutAllOtherSessions,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["single-sign-in-sessions"] });
      onSuccess?.("Signed out of all other sessions");
    },
    onError: (err) => onError?.(err.message || "Could not sign out other sessions"),
  });

  const formatWhen = (iso) => {
    if (!iso) return "—";
    const diffMs = Date.now() - new Date(iso).getTime();
    const mins = Math.round(diffMs / 60000);
    if (mins < 1) return "just now";
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.round(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    return new Date(iso).toLocaleDateString();
  };

  return (
    <div className="pt-4 mt-4 border-t border-[#f0e8e4]">
      <div className="flex items-center justify-between mb-3">
        <p className="text-sm font-medium text-[#2a1a16]">Active sessions across your organisation</p>
        <button
          onClick={() => signOutOthers()}
          disabled={isSigningOut}
          className="text-xs font-medium text-[#730042] border border-[#730042]/30 rounded-lg px-3 py-1.5 hover:bg-[#730042]/5 disabled:opacity-50"
        >
          Sign out my other sessions
        </button>
      </div>

      {isLoading ? (
        <div className="text-sm text-[#b0948a]">Loading sessions...</div>
      ) : !data?.sessions?.length ? (
        <div className="text-sm text-[#b0948a]">No other active sessions right now.</div>
      ) : (
        <div className="divide-y divide-[#f0e8e4]">
          {data.sessions.map((s) => (
            <div key={s._id} className="flex items-center justify-between py-2 text-sm">
              <div>
                <span className="font-medium text-[#2a1a16]">{s.device_info?.label || "Unknown device"}</span>
                <span className="text-[#8a7a75]"> · {s.account_model}</span>
              </div>
              <span className="text-xs text-[#b0948a]">{formatWhen(s.last_seen_at)}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}