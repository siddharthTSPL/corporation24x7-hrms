import { useState } from "react";
import toast from "react-hot-toast";
import {
  useFieldSettings,
  useUpdateFieldSettings,
} from "../../auth/server-state/fieldOperations/Fieldoperations.hook";

// Field Work org-level settings card.
// Rendered inside the nav Settings pages (Super Admin + Admin) so the on/off
// toggle is always reachable — even when Field Work is currently disabled —
// alongside the face-verification option. Seat limits / data retention are
// intentionally not exposed here; they are platform-level concerns.
export default function FieldWorkSettingsCard({ onSaved, canToggleEnabled = false }) {
  const { data, isLoading } = useFieldSettings(true);
  const updateSettings = useUpdateFieldSettings();

  // `settings` loads async; `overrides` holds local edits. `form` is the
  // merged view — mutating overrides (never settings) avoids mirroring
  // remote state into local state inside an effect.
  const settings = data?.settings ?? null;
  const [overrides, setOverrides] = useState({});
  const form = settings ? { ...settings, ...overrides } : null;

  const setChecked = (key) => (e) =>
    setOverrides((prev) => ({ ...prev, [key]: e.target.checked }));

  const submit = async (e) => {
    e.preventDefault();
    try {
      const adminSettings = { ...form };
      delete adminSettings.enabled;
      await updateSettings.mutateAsync(canToggleEnabled ? form : adminSettings);
      toast.success(
        form.enabled
          ? "Field Operations is now on for your organisation"
          : "Field Operations settings saved",
      );
      setOverrides({});
      onSaved?.();
    } catch (error) {
      toast.error(error?.response?.data?.message || "Could not save settings");
    }
  };

  if (isLoading || !form) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-5">
        <div className="flex items-center gap-2.5 text-sm text-slate-500">
          <div className="h-4 w-4 animate-spin rounded-full border-2 border-slate-300 border-t-transparent" />
          Loading Field Operations settings…
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      {canToggleEnabled && <label className="flex items-center justify-between rounded-xl border border-slate-200 p-3">
        <span>
          <span className="block font-bold text-slate-900">
            Field Operations enabled
          </span>
          <span className="text-xs text-slate-500">
            Turn on to start tracking field employees, teams, duty, and visits.
          </span>
        </span>
        <input
          type="checkbox"
          checked={!!form.enabled}
          onChange={setChecked("enabled")}
          className="h-5 w-5 accent-[#7A004B]"
        />
      </label>}

      <label className="flex items-center justify-between rounded-xl border border-slate-200 p-3">
        <span>
          <span className="block font-bold text-slate-900">
            Require face verification
          </span>
          <span className="text-xs text-slate-500">
            Employees must verify their face before starting field duty.
          </span>
        </span>
        <input
          type="checkbox"
          checked={!!form.require_face_verification}
          onChange={setChecked("require_face_verification")}
          className="h-5 w-5 accent-[#7A004B]"
        />
      </label>

      <button
        type="submit"
        disabled={updateSettings.isPending}
        className="inline-flex w-full items-center justify-center rounded-xl bg-[#7A004B] px-4 py-2.5 text-sm font-bold text-white disabled:opacity-50"
      >
        {updateSettings.isPending ? "Saving…" : "Save settings"}
      </button>
    </form>
  );
}
