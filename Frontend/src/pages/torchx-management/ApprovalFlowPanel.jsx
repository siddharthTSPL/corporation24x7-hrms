import React, { useMemo, useState } from "react";
import {
  CalendarDays,
  Building2,
  Clock,
  ShieldCheck,
  Check,
  AlertTriangle,
  Loader2,
} from "lucide-react";
import {
  useGetApprovalFlows,
  useSaveApprovalFlow,
  useResetApprovalFlow,
} from "../../auth/server-state/approvalFlow/approvalFlow.hook";

const MODULES = [
  {
    key: "leave",
    title: "Leave approval",
    icon: CalendarDays,
    defaultText:
      "Employee leave goes to their manager, manager leave goes to their reporting manager.",
  },
  {
    key: "wfh",
    title: "Work from home approval",
    icon: Building2,
    defaultText:
      "Employee WFH requests go to their manager, manager requests go to their reporting manager.",
  },
  {
    key: "timesheet",
    title: "Timesheet approval",
    icon: Clock,
    defaultText:
      "Submitted timesheets go to the employee's manager, and a manager's timesheet to their reporting manager.",
  },
];

const errMsg = (e, fallback) => e?.response?.data?.message || fallback;

const adminName = (a) =>
  `${a.f_name || ""} ${a.l_name || ""}`.trim() || a.work_email || "Admin";

const toForm = (flow) => ({
  useAdmins: !!(flow?.enabled && flow?.firstApprover === "admin"),
  admins: (flow?.admins || []).map(String),
  applyToEmployees: flow?.applyToEmployees !== false,
  applyToManagers: flow?.applyToManagers !== false,
});

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

function CheckRow({ checked, onChange, children, disabled }) {
  return (
    <label
      className={`flex items-center gap-2.5 rounded-lg border px-3 py-2.5 text-sm cursor-pointer transition-colors ${
        checked
          ? "border-[#730042] bg-[#F9F0F5] text-[#730042]"
          : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
      } ${disabled ? "opacity-50 cursor-not-allowed" : ""}`}
    >
      <input
        type="checkbox"
        checked={checked}
        disabled={disabled}
        onChange={(e) => onChange(e.target.checked)}
        className="h-4 w-4 accent-[#730042] shrink-0"
      />
      <span className="min-w-0">{children}</span>
    </label>
  );
}

function ModuleCard({ meta, flow, admins, notify }) {
  const Icon = meta.icon;
  const saved = useMemo(() => toForm(flow), [flow]);
  const [form, setForm] = useState(saved);
  const save = useSaveApprovalFlow();
  const reset = useResetApprovalFlow();

  const dirty = JSON.stringify(form) !== JSON.stringify(saved);
  const isCustomActive = saved.useAdmins;
  const hasSavedConfig = !!flow?._id;
  const busy = save.isPending || reset.isPending;
  const noTarget = !form.applyToEmployees && !form.applyToManagers;

  const toggleAdmin = (id) =>
    setForm((f) => ({
      ...f,
      admins: f.admins.includes(id)
        ? f.admins.filter((x) => x !== id)
        : [...f.admins, id],
    }));

  const onSave = async () => {
    if (form.useAdmins && !form.admins.length) {
      notify("error", "Select at least one admin to approve these requests");
      return;
    }
    if (form.useAdmins && noTarget) {
      notify("error", "Choose whether this applies to employees, managers or both");
      return;
    }
    try {
      await save.mutateAsync({
        module: meta.key,
        data: {
          enabled: form.useAdmins,
          firstApprover: form.useAdmins ? "admin" : "reporting_manager",
          admins: form.admins,
          applyToEmployees: form.applyToEmployees,
          applyToManagers: form.applyToManagers,
        },
      });
      notify("success", `${meta.title} settings saved`);
    } catch (e) {
      notify("error", errMsg(e, "Could not save approval flow"));
    }
  };

  const onReset = async () => {
    try {
      await reset.mutateAsync(meta.key);
      notify("success", "Back to the default approval flow");
    } catch (e) {
      notify("error", errMsg(e, "Could not reset approval flow"));
    }
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm min-w-0">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-4 sm:px-5 md:px-6 py-4 border-b border-slate-100">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-9 h-9 rounded-xl bg-[#F9F0F5] text-[#730042] flex items-center justify-center shrink-0">
            <Icon className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <h2 className="text-sm md:text-base font-semibold text-slate-800">
              {meta.title}
            </h2>
            <p className="text-xs md:text-sm text-slate-400 mt-0.5">
              {meta.defaultText}
            </p>
          </div>
        </div>
        <span
          className={`self-start sm:self-auto inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium shrink-0 ${
            isCustomActive
              ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
              : "bg-slate-100 text-slate-500 border border-slate-200"
          }`}
        >
          {isCustomActive ? (
            <>
              <Check className="w-3 h-3" /> Custom flow active
            </>
          ) : (
            "Default flow"
          )}
        </span>
      </div>

      <div className="p-4 sm:p-5 md:p-6 space-y-5">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <p className="text-sm font-medium text-slate-800">
              Send requests first to selected admins
            </p>
            <p className="text-xs md:text-sm text-slate-500 mt-0.5">
              Skips the reporting manager. Any one of the selected admins can
              approve or reject the request.
            </p>
          </div>
          <Switch
            checked={form.useAdmins}
            disabled={busy}
            label={`Custom flow for ${meta.title}`}
            onChange={(v) => setForm((f) => ({ ...f, useAdmins: v }))}
          />
        </div>

        {form.useAdmins && (
          <>
            <div>
              <p className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-2">
                Approving admins
              </p>
              {admins.length ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {admins.map((a) => {
                    const id = String(a._id);
                    return (
                      <CheckRow
                        key={id}
                        checked={form.admins.includes(id)}
                        onChange={() => toggleAdmin(id)}
                        disabled={busy}
                      >
                        <span className="block font-medium truncate">
                          {adminName(a)}
                        </span>
                        {(a.designation || a.work_email) && (
                          <span className="block text-xs opacity-70 truncate">
                            {a.designation || a.work_email}
                          </span>
                        )}
                      </CheckRow>
                    );
                  })}
                </div>
              ) : (
                <div className="text-sm text-slate-400 text-center py-6 px-4 border border-dashed border-slate-200 rounded-xl">
                  No active admins found. Add an admin first.
                </div>
              )}
            </div>

            <div>
              <p className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-2">
                Applies to
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <CheckRow
                  checked={form.applyToEmployees}
                  disabled={busy}
                  onChange={(v) => setForm((f) => ({ ...f, applyToEmployees: v }))}
                >
                  Employees
                </CheckRow>
                <CheckRow
                  checked={form.applyToManagers}
                  disabled={busy}
                  onChange={(v) => setForm((f) => ({ ...f, applyToManagers: v }))}
                >
                  Managers
                </CheckRow>
              </div>
              <p className="text-xs text-slate-400 mt-2">
                Admin requests always go to the Super Admin.
              </p>
            </div>
          </>
        )}

        <div className="flex flex-col-reverse sm:flex-row sm:items-center sm:justify-end gap-2 pt-1">
          {hasSavedConfig && (
            <button
              type="button"
              onClick={onReset}
              disabled={busy}
              className="inline-flex items-center justify-center gap-1.5 rounded-lg px-3.5 py-2.5 sm:py-2 min-h-[44px] sm:min-h-0 text-sm font-medium bg-white text-rose-600 border border-rose-200 hover:bg-rose-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {reset.isPending && <Loader2 className="w-4 h-4 animate-spin" />}
              Reset to default
            </button>
          )}
          <button
            type="button"
            onClick={onSave}
            disabled={busy || !dirty}
            className="inline-flex items-center justify-center gap-1.5 rounded-lg px-3.5 py-2.5 sm:py-2 min-h-[44px] sm:min-h-0 text-sm font-medium bg-[#730042] text-white hover:bg-[#5A0033] shadow-sm shadow-[#730042]/10 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {save.isPending && <Loader2 className="w-4 h-4 animate-spin" />}
            Save changes
          </button>
        </div>
      </div>
    </div>
  );
}

export default function ApprovalFlowPanel({ notify }) {
  const { data, isLoading, isError, refetch } = useGetApprovalFlows();
  const flows = data?.flows || [];
  const admins = data?.admins || [];

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
        Could not load approval flow settings.
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
          By default, requests follow the reporting hierarchy. Turn on a custom
          flow to route a request type straight to the admins you choose. Changes
          apply to <span className="font-medium">new requests only</span>;
          requests already pending finish on the flow they started with.
        </p>
      </div>

      {MODULES.map((m) => (
        <ModuleCard
          // Remount when the saved copy changes so the form re-syncs with the server.
          key={`${m.key}:${JSON.stringify(flows.find((f) => f.module === m.key) || {})}`}
          meta={m}
          flow={flows.find((f) => f.module === m.key)}
          admins={admins}
          notify={notify}
        />
      ))}
    </div>
  );
}