import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { getSsoSettings, updateSsoSettings } from "../../auth/api/sso/sso.api";

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

// SuperAdmin: choose which external identity providers employees of this
// organisation may use on the login screen.
export default function ExternalSsoSettingsCard({ onSuccess, onError }) {
  const queryClient = useQueryClient();
  const { data, isLoading } = useQuery({ queryKey: ["external-sso-settings"], queryFn: getSsoSettings });

  const [msEnabled, setMsEnabled] = useState(false);
  const [tenantId, setTenantId] = useState("");
  const [zohoEnabled, setZohoEnabled] = useState(false);

  useEffect(() => {
    if (!data?.settings) return;
    setMsEnabled(!!data.settings.microsoft.enabled);
    setTenantId(data.settings.microsoft.tenantId || "");
    setZohoEnabled(!!data.settings.zoho.enabled);
  }, [data]);

  const { mutate: save, isPending } = useMutation({
    mutationFn: updateSsoSettings,
    onSuccess: (res) => {
      queryClient.setQueryData(["external-sso-settings"], (old) => ({ ...old, settings: res.settings }));
      onSuccess?.("SSO settings updated");
    },
    onError: (err) => {
      if (data?.settings) {
        setMsEnabled(!!data.settings.microsoft.enabled);
        setZohoEnabled(!!data.settings.zoho.enabled);
      }
      onError?.(err.message || "Could not update SSO settings");
    },
  });

  if (isLoading) return null;
  const available = data?.available || {};
  if (!available.microsoft && !available.zoho) return null; // platform has no provider configured

  return (
    <div className="bg-white rounded-xl border border-[#e8dcd6] p-6 mt-4">
      <h3 className="text-base font-semibold text-[#2a1a16] mb-1">Sign in with Microsoft / Zoho</h3>
      <p className="text-sm text-[#8a7a75] max-w-md mb-5">
        Let employees sign in with their work Microsoft or Zoho account. Only people already added in
        Talent can sign in — this never creates accounts. Password login keeps working.
      </p>

      {available.microsoft && (
        <div className="mb-5">
          <div className="flex items-start justify-between gap-4">
            <p className="text-sm font-medium text-[#2a1a16]">Microsoft</p>
            <ToggleSwitch
              checked={msEnabled}
              disabled={isPending}
              onChange={(next) => {
                setMsEnabled(next);
                save({ microsoft: { enabled: next, tenantId } });
              }}
            />
          </div>
          <label className="block text-xs font-medium text-[#8a7a75] mt-3 mb-1">Microsoft tenant ID</label>
          <div className="flex gap-2">
            <input
              value={tenantId}
              onChange={(e) => setTenantId(e.target.value)}
              placeholder="11111111-2222-3333-4444-555555555555"
              className="flex-1 border border-[#e8dcd6] rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-[#730042] outline-none"
            />
            <button
              type="button"
              disabled={isPending}
              onClick={() => save({ microsoft: { tenantId } })}
              className="px-4 py-2 rounded-lg text-sm bg-[#730042] text-white disabled:opacity-50"
            >
              Save
            </button>
          </div>
          <p className="text-xs text-[#b0948a] mt-1">
            Found in Microsoft Entra admin center → Overview. Only accounts from this tenant are accepted.
          </p>
        </div>
      )}

      {available.zoho && (
        <div className="flex items-start justify-between gap-4">
          <p className="text-sm font-medium text-[#2a1a16]">Zoho</p>
          <ToggleSwitch
            checked={zohoEnabled}
            disabled={isPending}
            onChange={(next) => {
              setZohoEnabled(next);
              save({ zoho: { enabled: next } });
            }}
          />
        </div>
      )}
    </div>
  );
}