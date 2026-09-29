import React, { useState } from "react";
import { LogOut, ShieldCheck, AlertTriangle, Loader2, Check } from "lucide-react";
import {
  useGetAttendanceSettings,
  useUpdateAttendanceSettings,
} from "../../auth/server-state/attendanceSettings/attendanceSettings.hook";

const errMsg = (e, fallback) => e?.response?.data?.message || e?.message || fallback;

function Switch({ checked, onChange, disabled, label }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors disabled:opacity-50 focus:outline-none focus:ring-2 focus:ring-[#730042]/30 ${
        checked ? "bg-[#730042]" : "bg-slate-300"
      }`}
    >
      <span
        className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform ${
          checked ? "translate-x-5" : "translate-x-0.5"
        }`}
      />
    </button>
  );
}

function AutoCheckoutCard({ settings, notify }) {
  const saved = settings?.autoCheckoutEnabled !== false;
  const [enabled, setEnabled] = useState(saved);
  const update = useUpdateAttendanceSettings();

  const dirty = enabled !== saved;

  const onSave = async () => {
    try {
      await update.mutateAsync({ autoCheckoutEnabled: enabled });
      notify("success", "Attendance settings saved");
    } catch (e) {
      notify("error", errMsg(e, "Could not save attendance settings"));
    }
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm min-w-0">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-4 sm:px-5 md:px-6 py-4 border-b border-slate-100">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-9 h-9 rounded-xl bg-[#F9F0F5] text-[#730042] flex items-center justify-center shrink-0">
            <LogOut className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <h2 className="text-sm md:text-base font-semibold text-slate-800">
              Auto check-out
            </h2>
            <p className="text-xs md:text-sm text-slate-400 mt-0.5">
              What happens when someone forgets to check out.
            </p>
          </div>
        </div>
        <span
          className={`self-start sm:self-auto inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium shrink-0 ${
            saved
              ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
              : "bg-amber-50 text-amber-700 border border-amber-200"
          }`}
        >
          {saved ? (
            <>
              <Check className="w-3 h-3" /> On (default)
            </>
          ) : (
            "Off"
          )}
        </span>
      </div>

      <div className="p-4 sm:p-5 md:p-6 space-y-5">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <p className="text-sm font-medium text-slate-800">
              Automatically check members out
            </p>
            <p className="text-xs md:text-sm text-slate-500 mt-0.5">
              When on, anyone still checked in is checked out automatically once
              their shift's overtime limit is over.
            </p>
          </div>
          <Switch
            checked={enabled}
            disabled={update.isPending}
            label="Auto check-out"
            onChange={setEnabled}
          />
        </div>

        {!enabled && (
          <div className="flex items-start gap-2.5 rounded-xl border border-amber-200 bg-amber-50 px-3.5 py-3 text-sm text-amber-800">
            <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
            <p>
              Members must check out themselves. If they don't check out before
              the overtime limit, that day is marked as a Half Day.
            </p>
          </div>
        )}

        <div className="flex sm:justify-end pt-1">
          <button
            type="button"
            onClick={onSave}
            disabled={update.isPending || !dirty}
            className="inline-flex items-center justify-center gap-1.5 rounded-lg px-3.5 py-2.5 sm:py-2 min-h-[44px] sm:min-h-0 w-full sm:w-auto text-sm font-medium bg-[#730042] text-white hover:bg-[#5A0033] shadow-sm shadow-[#730042]/10 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {update.isPending && <Loader2 className="w-4 h-4 animate-spin" />}
            Save changes
          </button>
        </div>
      </div>
    </div>
  );
}

export default function AttendanceSettingsPanel({ notify }) {
  const { data, isLoading, isError, refetch } = useGetAttendanceSettings();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-16 text-slate-400">
        <Loader2 className="w-5 h-5 animate-spin" />
      </div>
    );
  }

  if (isError) {
    return (
      <div className="flex flex-col items-center gap-3 py-12 text-sm text-slate-500 border border-dashed border-slate-200 rounded-xl bg-white">
        <AlertTriangle className="w-5 h-5 text-rose-500" />
        Could not load attendance settings.
        <button
          type="button"
          onClick={() => refetch()}
          className="rounded-lg px-3.5 py-2 text-sm font-medium bg-[#F9F0F5] text-[#730042] hover:bg-[#F3D9E7]"
        >
          Try again
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="flex items-start gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3.5">
        <ShieldCheck className="w-5 h-5 text-[#730042] shrink-0 mt-0.5" />
        <p className="text-sm text-slate-600">
          Auto check-out is on by default. Turn it off if your organisation wants
          members to check out themselves. The change applies to sessions that
          are <span className="font-medium">still open</span>; days already
          closed are not changed.
        </p>
      </div>

      <AutoCheckoutCard
        key={String(data?.attendanceSettings?.autoCheckoutEnabled)}
        settings={data?.attendanceSettings}
        notify={notify}
      />
    </div>
  );
}