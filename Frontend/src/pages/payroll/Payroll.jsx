import { useState, useEffect, useMemo, Fragment } from "react";
import {
  useGetPayrollPolicy,
  useSetPayrollPolicy,
  useResetPayrollPolicy,
  useAddPayrollAllowance,
  useUpdatePayrollAllowance,
  useRemovePayrollAllowance,
  useListSalaryStructures,
  useSetEmployeeCTC,
  useReapplyPolicy,
  useGeneratePayroll,
  useBulkGeneratePayroll,
  useListPayrolls,
  useUpdatePayrollStatus,
} from "../../auth/server-state/payroll/payroll.hook";
import {
  useGetAllEmployee,
  useGetAllAdmins,
} from "../../auth/server-state/adminother/adminother.hook";

const C = {
  brand: "#CD166E",
  brandDark: "#730042",
  brandLight: "rgba(205,22,110,0.08)",
  green: "#1D9E75",
  greenBg: "#e8f5e9",
  blue: "#378ADD",
  blueBg: "#e6f1fb",
  amber: "#BA7517",
  amberBg: "#faeeda",
  red: "#E24B4A",
  redBg: "#fcebeb",
  surface: "#ffffff",
  page: "#F9F8F2",
  border: "#ede5e0",
  text: "#2a1a16",
  muted: "#b0948a",
  mutedMid: "#c9bab5",
};

const TABS = [
  { key: "policy", label: "Payroll Policy" },
  { key: "structures", label: "Salary Structures" },
  { key: "generate", label: "Generate Payroll" },
  { key: "records", label: "Payroll Records" },
];

const MODEL_LABEL = { User: "Employee", Manager: "Manager", Admin: "Admin" };
const MODELS = ["User", "Manager", "Admin"];
const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

function fmtINR(n) {
  const num = Number(n) || 0;
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(num);
}

function getErrorMessage(err) {
  return err?.response?.data?.message || err?.message || "Something went wrong";
}

function Spinner({ size = 16, color = "#fff" }) {
  return (
    <div
      style={{
        width: size, height: size, borderRadius: "50%",
        border: `2px solid ${color}33`, borderTop: `2px solid ${color}`,
        animation: "payroll-spin 0.7s linear infinite", flexShrink: 0,
      }}
    />
  );
}

function Toast({ message, type, onClose }) {
  useEffect(() => {
    if (!message) return;
    const t = setTimeout(onClose, 3200);
    return () => clearTimeout(t);
  }, [message]);
  if (!message) return null;
  const ok = type === "success";
  return (
    <div
      className="fixed top-3 right-3 sm:top-4 sm:right-4 z-[999] flex items-center gap-2.5 rounded-xl shadow-lg"
      style={{
        background: ok ? "#f0faf5" : "#fff5f5",
        border: `1px solid ${ok ? "#a8dfc3" : "#f5c6c6"}`,
        padding: "12px 16px",
        minWidth: 0,
        maxWidth: "calc(100vw - 24px)",
        width: "min(380px, calc(100vw - 24px))",
        animation: "payroll-slideIn 0.25s ease",
      }}
    >
      <div
        style={{
          width: 26, height: 26, borderRadius: "50%",
          background: ok ? C.greenBg : C.redBg,
          display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
        }}
      >
        {ok ? (
          <svg width="13" height="13" viewBox="0 0 14 14">
            <polyline points="2,7 5.5,10.5 12,4" fill="none" stroke={C.green} strokeWidth="2" strokeLinecap="round" />
          </svg>
        ) : (
          <svg width="13" height="13" viewBox="0 0 14 14">
            <line x1="3" y1="3" x2="11" y2="11" stroke={C.red} strokeWidth="2" strokeLinecap="round" />
            <line x1="11" y1="3" x2="3" y2="11" stroke={C.red} strokeWidth="2" strokeLinecap="round" />
          </svg>
        )}
      </div>
      <span className="flex-1 min-w-0 break-words" style={{ fontSize: 13, fontWeight: 500, color: ok ? "#1a5c3a" : "#7a1a1a" }}>
        {message}
      </span>
      <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", color: C.muted, fontSize: 18, lineHeight: 1, padding: 0, flexShrink: 0 }}>
        ×
      </button>
    </div>
  );
}

function Card({ title, subtitle, children, right }) {
  return (
    <div
      className="min-w-0"
      style={{
        background: C.surface, borderRadius: 14,
        border: `1px solid ${C.border}`, overflow: "hidden",
        position: "relative", marginBottom: 16,
      }}
    >
      <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 3, background: `linear-gradient(90deg, ${C.brand}, ${C.brandDark})` }} />
      {(title || right) && (
        <div className="flex items-center justify-between gap-3 flex-wrap" style={{ padding: "16px 18px 0" }}>
          <div className="min-w-0">
            {title && <h3 style={{ margin: 0, fontSize: 15, fontWeight: 700, color: C.text }}>{title}</h3>}
            {subtitle && <p style={{ margin: "3px 0 0", fontSize: 12.5, color: C.muted }}>{subtitle}</p>}
          </div>
          {right}
        </div>
      )}
      <div className="p-3 sm:p-[18px]">{children}</div>
    </div>
  );
}

function Field({ label, children, hint }) {
  return (
    <div className="min-w-0">
      <label style={{ display: "block", fontSize: 12.5, fontWeight: 600, color: C.text, marginBottom: 6 }}>{label}</label>
      {children}
      {hint && <p style={{ margin: "4px 0 0", fontSize: 11.5, color: C.muted }}>{hint}</p>}
    </div>
  );
}

const inputStyle = {
  width: "100%", padding: "9px 11px", borderRadius: 9,
  border: `1px solid ${C.border}`, fontSize: 13.5, color: C.text,
  background: "#fff", outline: "none", fontFamily: "inherit",
};

function TextInput(props) {
  return <input {...props} className={`min-w-0 ${props.className || ""}`} style={{ ...inputStyle, ...(props.style || {}) }} />;
}
function Select(props) {
  return <select {...props} className={`min-w-0 ${props.className || ""}`} style={{ ...inputStyle, ...(props.style || {}) }} />;
}

function Toggle({ checked, onChange, disabled }) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={() => onChange(!checked)}
      style={{
        width: 38, height: 21, borderRadius: 999, border: "none", cursor: disabled ? "not-allowed" : "pointer",
        background: checked ? C.brand : "#ddd2cd", position: "relative", flexShrink: 0, transition: "background .15s",
        opacity: disabled ? 0.6 : 1,
      }}
    >
      <span
        style={{
          position: "absolute", top: 2, left: checked ? 19 : 2, width: 17, height: 17, borderRadius: "50%",
          background: "#fff", transition: "left .15s", boxShadow: "0 1px 3px rgba(0,0,0,0.25)",
        }}
      />
    </button>
  );
}

function Badge({ children, color, bg }) {
  return (
    <span style={{ display: "inline-block", padding: "3px 10px", borderRadius: 999, fontSize: 11.5, fontWeight: 700, color, background: bg, whiteSpace: "nowrap" }}>
      {children}
    </span>
  );
}

function statusBadge(status) {
  const map = {
    generated: { label: "Generated", color: C.blue, bg: C.blueBg },
    approved: { label: "Approved", color: C.amber, bg: C.amberBg },
    paid: { label: "Paid", color: C.green, bg: C.greenBg },
    on_hold: { label: "On Hold", color: C.red, bg: C.redBg },
  };
  const s = map[status] || { label: status, color: C.muted, bg: "#f2ece9" };
  return <Badge color={s.color} bg={s.bg}>{s.label}</Badge>;
}

function PrimaryButton({ children, loading, ...rest }) {
  return (
    <button
      {...rest}
      disabled={loading || rest.disabled}
      className={`w-full sm:w-auto ${rest.className || ""}`}
      style={{
        display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 8, padding: "10px 16px", borderRadius: 9,
        border: "none", background: C.brand, color: "#fff", fontSize: 13, fontWeight: 700,
        cursor: loading || rest.disabled ? "not-allowed" : "pointer", opacity: loading || rest.disabled ? 0.7 : 1,
        fontFamily: "inherit", minHeight: 40, ...(rest.style || {}),
      }}
    >
      {loading && <Spinner size={13} />}
      {children}
    </button>
  );
}

function GhostButton({ children, ...rest }) {
  return (
    <button
      {...rest}
      className={rest.className || ""}
      style={{
        display: "inline-flex", alignItems: "center", gap: 6, padding: "8px 14px", borderRadius: 9,
        border: `1px solid ${C.border}`, background: "#fff", color: C.text, fontSize: 12.5, fontWeight: 600,
        cursor: "pointer", fontFamily: "inherit", minHeight: 36, ...(rest.style || {}),
      }}
    >
      {children}
    </button>
  );
}


function useEmployeeDirectory() {
  const { data: empData, isLoading: empLoading } = useGetAllEmployee();
  const { data: adminData, isLoading: adminLoading } = useGetAllAdmins();

  return useMemo(() => {
    const users = (empData?.users || []).map((e) => ({
      _id: e._id,
      name: `${e.f_name || ""} ${e.l_name || ""}`.trim() || e.uid,
      uid: e.uid,
      model: e.type === "manager" ? "Manager" : "User",
    }));
    const admins = (adminData?.admins || []).map((a) => ({
      _id: a._id,
      name: `${a.f_name || ""} ${a.l_name || ""}`.trim() || a.uid,
      uid: a.uid,
      model: "Admin",
    }));
    const all = [...users, ...admins];
    const byId = new Map(all.map((p) => [String(p._id), p]));
    const byModel = {
      User: all.filter((p) => p.model === "User"),
      Manager: all.filter((p) => p.model === "Manager"),
      Admin: all.filter((p) => p.model === "Admin"),
    };
    return { byId, byModel, loading: empLoading || adminLoading };
  }, [empData, adminData]);
}

function resolveName(directory, id, fallbackModel) {
  const person = directory.byId.get(String(id));
  if (person) return `${person.name} (${person.uid})`;
  return `${MODEL_LABEL[fallbackModel] || fallbackModel} — ${String(id).slice(-6)}`;
}


function PolicyTab({ notify }) {
  const { data, isLoading } = useGetPayrollPolicy();
  const { mutate: savePolicy, isPending: saving } = useSetPayrollPolicy();
  const { mutate: resetPolicy, isPending: resetting } = useResetPayrollPolicy();
  const { mutate: addAllowance, isPending: adding } = useAddPayrollAllowance();
  const { mutate: updateAllowance } = useUpdatePayrollAllowance();
  const { mutate: removeAllowance } = useRemovePayrollAllowance();

  const [form, setForm] = useState(null);
  const [newAllowance, setNewAllowance] = useState({ name: "", percentOfBasic: 0, flatAmount: 0 });

  useEffect(() => {
    if (data?.policy) setForm(JSON.parse(JSON.stringify(data.policy)));
  }, [data]);

  if (isLoading || !form) {
    return <Card title="Payroll Policy"><div className="flex items-center gap-2" style={{ color: C.muted, fontSize: 13 }}><Spinner size={14} color={C.brand} /> Loading policy…</div></Card>;
  }

  const set = (path, value) => {
    setForm((prev) => {
      const next = { ...prev };
      const keys = path.split(".");
      let cur = next;
      for (let i = 0; i < keys.length - 1; i++) {
        cur[keys[i]] = { ...cur[keys[i]] };
        cur = cur[keys[i]];
      }
      cur[keys[keys.length - 1]] = value;
      return next;
    });
  };

  const handleSave = () => {
    savePolicy(
      {
        basic: form.basic,
        hra: form.hra,
        pf: form.pf,
        esi: form.esi,
        professionalTax: form.professionalTax,
        tds: form.tds,
      },
      {
        onSuccess: () => notify("Payroll policy updated", "success"),
        onError: (e) => notify(getErrorMessage(e), "error"),
      }
    );
  };

  const handleReset = () => {
    if (!window.confirm("Reset payroll policy to standard defaults? This affects new/reapplied salary structures only.")) return;
    resetPolicy(undefined, {
      onSuccess: () => notify("Policy reset to standard defaults", "success"),
      onError: (e) => notify(getErrorMessage(e), "error"),
    });
  };

  const handleAddAllowance = () => {
    if (!newAllowance.name.trim()) return notify("Allowance name is required", "error");
    addAllowance(newAllowance, {
      onSuccess: () => {
        notify("Allowance added", "success");
        setNewAllowance({ name: "", percentOfBasic: 0, flatAmount: 0 });
      },
      onError: (e) => notify(getErrorMessage(e), "error"),
    });
  };

  const handleAllowanceField = (name, field, value) => {
    setForm((prev) => ({
      ...prev,
      allowances: prev.allowances.map((a) => (a.name === name ? { ...a, [field]: value } : a)),
    }));
  };

  const commitAllowance = (allowance) => {
    updateAllowance(
      { name: allowance.name, data: { percentOfBasic: allowance.percentOfBasic, flatAmount: allowance.flatAmount, enabled: allowance.enabled } },
      { onSuccess: () => notify(`"${allowance.name}" updated`, "success"), onError: (e) => notify(getErrorMessage(e), "error") }
    );
  };

  const handleDeleteAllowance = (allowance) => {
    if (allowance.isBalancing) return;
    if (!window.confirm(`Remove allowance "${allowance.name}"?`)) return;
    removeAllowance(allowance.name, {
      onSuccess: () => notify("Allowance removed", "success"),
      onError: (e) => notify(getErrorMessage(e), "error"),
    });
  };

  return (
    <>
      <Card
        title="Salary Structure Rules"
        subtitle="Applies to all future salary structures for this organisation"
        right={
          <div className="flex items-center gap-2 flex-wrap w-full sm:w-auto">
            <GhostButton onClick={handleReset} disabled={resetting} className="flex-1 sm:flex-none justify-center">{resetting ? "Resetting…" : "Reset to Standard"}</GhostButton>
            <PrimaryButton onClick={handleSave} loading={saving} className="flex-1 sm:flex-none">Save Policy</PrimaryButton>
          </div>
        }
      >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <Field label="Basic % of Gross" hint="1–100">
            <TextInput
              type="number" min={1} max={100} value={form.basic?.percentOfGross ?? 0}
              onChange={(e) => set("basic.percentOfGross", Number(e.target.value))}
            />
          </Field>

          <Field label="HRA">
            <div className="flex items-center gap-3 flex-wrap">
              <Toggle checked={!!form.hra?.enabled} onChange={(v) => set("hra.enabled", v)} />
              <TextInput
                type="number" min={0} max={100} disabled={!form.hra?.enabled}
                value={form.hra?.percentOfBasic ?? 0}
                onChange={(e) => set("hra.percentOfBasic", Number(e.target.value))}
                style={{ maxWidth: 130 }}
              />
              <span style={{ fontSize: 12.5, color: C.muted }}>% of Basic</span>
            </div>
          </Field>

          <Field label="Provident Fund (PF)">
            <div className="flex items-center gap-3 flex-wrap">
              <Toggle checked={!!form.pf?.enabled} onChange={(v) => set("pf.enabled", v)} />
              <TextInput type="number" min={0} max={100} disabled={!form.pf?.enabled} value={form.pf?.employeePercent ?? 0} onChange={(e) => set("pf.employeePercent", Number(e.target.value))} style={{ maxWidth: 90 }} />
              <span style={{ fontSize: 12, color: C.muted }}>Employee %</span>
              <TextInput type="number" min={0} max={100} disabled={!form.pf?.enabled} value={form.pf?.employerPercent ?? 0} onChange={(e) => set("pf.employerPercent", Number(e.target.value))} style={{ maxWidth: 90 }} />
              <span style={{ fontSize: 12, color: C.muted }}>Employer %</span>
            </div>
            <div className="flex items-center gap-2 mt-2 flex-wrap">
              <Toggle checked={!!form.pf?.applyWageCeiling} onChange={(v) => set("pf.applyWageCeiling", v)} disabled={!form.pf?.enabled} />
              <span style={{ fontSize: 12, color: C.muted }}>Apply wage ceiling</span>
              <TextInput
                type="number" min={0} disabled={!form.pf?.enabled || !form.pf?.applyWageCeiling}
                value={form.pf?.wageCeiling ?? 0} onChange={(e) => set("pf.wageCeiling", Number(e.target.value))}
                style={{ maxWidth: 120 }}
              />
            </div>
          </Field>

          <Field label="ESI">
            <div className="flex items-center gap-3 flex-wrap">
              <Toggle checked={!!form.esi?.enabled} onChange={(v) => set("esi.enabled", v)} />
              <TextInput type="number" step="0.01" min={0} max={100} disabled={!form.esi?.enabled} value={form.esi?.employeePercent ?? 0} onChange={(e) => set("esi.employeePercent", Number(e.target.value))} style={{ maxWidth: 90 }} />
              <span style={{ fontSize: 12, color: C.muted }}>Employee %</span>
              <TextInput type="number" step="0.01" min={0} max={100} disabled={!form.esi?.enabled} value={form.esi?.employerPercent ?? 0} onChange={(e) => set("esi.employerPercent", Number(e.target.value))} style={{ maxWidth: 90 }} />
              <span style={{ fontSize: 12, color: C.muted }}>Employer %</span>
            </div>
            <div className="flex items-center gap-2 mt-2 flex-wrap">
              <span style={{ fontSize: 12, color: C.muted }}>Wage threshold</span>
              <TextInput type="number" min={0} disabled={!form.esi?.enabled} value={form.esi?.wageThreshold ?? 0} onChange={(e) => set("esi.wageThreshold", Number(e.target.value))} style={{ maxWidth: 120 }} />
            </div>
          </Field>

          <Field label="Professional Tax">
            <div className="flex items-center gap-3 flex-wrap">
              <Toggle checked={!!form.professionalTax?.enabled} onChange={(v) => set("professionalTax.enabled", v)} />
              <TextInput type="number" min={0} disabled={!form.professionalTax?.enabled} value={form.professionalTax?.monthlyAmount ?? 0} onChange={(e) => set("professionalTax.monthlyAmount", Number(e.target.value))} style={{ maxWidth: 130 }} />
              <span style={{ fontSize: 12.5, color: C.muted }}>₹ / month</span>
            </div>
          </Field>

          <Field label="TDS (Income Tax)" hint="Uses each employee's annualTaxEstimate ÷ 12">
            <div className="flex items-center gap-3 flex-wrap">
              <Toggle checked={!!form.tds?.enabled} onChange={(v) => set("tds.enabled", v)} />
              <span style={{ fontSize: 12.5, color: C.muted }}>{form.tds?.enabled ? "Enabled" : "Disabled"}</span>
            </div>
          </Field>
        </div>
      </Card>

      <Card title="Allowances" subtitle='The "balancing" allowance absorbs whatever gross remains after Basic, HRA and other allowances'>
        <div className="overflow-x-auto overscroll-x-contain -mx-1">
          <table className="w-full" style={{ borderCollapse: "collapse", minWidth: 560 }}>
            <thead>
              <tr style={{ textAlign: "left", fontSize: 11.5, color: C.muted, textTransform: "uppercase", letterSpacing: 0.4 }}>
                <th style={{ padding: "6px 10px" }}>Name</th>
                <th style={{ padding: "6px 10px" }}>% of Basic</th>
                <th style={{ padding: "6px 10px" }}>Flat Amount (₹)</th>
                <th style={{ padding: "6px 10px" }}>Enabled</th>
                <th style={{ padding: "6px 10px" }}></th>
              </tr>
            </thead>
            <tbody>
              {(form.allowances || []).map((a) => (
                <tr key={a.name} style={{ borderTop: `1px solid ${C.border}` }}>
                  <td style={{ padding: "8px 10px", fontSize: 13, fontWeight: 600, color: C.text }}>
                    <span className="break-words">{a.name}</span> {a.isBalancing && <Badge color={C.blue} bg={C.blueBg}>Balancing</Badge>}
                  </td>
                  <td style={{ padding: "8px 10px" }}>
                    <TextInput type="number" min={0} max={100} value={a.percentOfBasic ?? 0} onChange={(e) => handleAllowanceField(a.name, "percentOfBasic", Number(e.target.value))} style={{ maxWidth: 100 }} />
                  </td>
                  <td style={{ padding: "8px 10px" }}>
                    <TextInput type="number" min={0} value={a.flatAmount ?? 0} onChange={(e) => handleAllowanceField(a.name, "flatAmount", Number(e.target.value))} style={{ maxWidth: 120 }} />
                  </td>
                  <td style={{ padding: "8px 10px" }}>
                    <Toggle checked={!!a.enabled} onChange={(v) => handleAllowanceField(a.name, "enabled", v)} disabled={a.isBalancing} />
                  </td>
                  <td style={{ padding: "8px 10px", whiteSpace: "nowrap" }}>
                    <GhostButton onClick={() => commitAllowance(a)} style={{ marginRight: 8 }}>Save</GhostButton>
                    {!a.isBalancing && (
                      <button onClick={() => handleDeleteAllowance(a)} style={{ background: "none", border: "none", color: C.red, cursor: "pointer", fontSize: 12.5, fontWeight: 600 }}>
                        Remove
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="flex items-end gap-3 flex-wrap mt-4 pt-4" style={{ borderTop: `1px dashed ${C.border}` }}>
          <Field label="New allowance name">
            <TextInput value={newAllowance.name} onChange={(e) => setNewAllowance((p) => ({ ...p, name: e.target.value }))} placeholder="e.g. Meal Allowance" style={{ maxWidth: 180 }} />
          </Field>
          <Field label="% of Basic">
            <TextInput type="number" min={0} max={100} value={newAllowance.percentOfBasic} onChange={(e) => setNewAllowance((p) => ({ ...p, percentOfBasic: Number(e.target.value) }))} style={{ maxWidth: 100 }} />
          </Field>
          <Field label="Flat Amount (₹)">
            <TextInput type="number" min={0} value={newAllowance.flatAmount} onChange={(e) => setNewAllowance((p) => ({ ...p, flatAmount: Number(e.target.value) }))} style={{ maxWidth: 120 }} />
          </Field>
          <PrimaryButton onClick={handleAddAllowance} loading={adding}>Add Allowance</PrimaryButton>
        </div>
      </Card>
    </>
  );
}


function StructuresTab({ notify, directory }) {
  const [modelFilter, setModelFilter] = useState("");
  const { data, isLoading } = useListSalaryStructures(modelFilter ? { employeeModel: modelFilter } : undefined);
  const { mutate: setCTC, isPending: saving } = useSetEmployeeCTC();
  const { mutate: reapply } = useReapplyPolicy();

  const [form, setForm] = useState({ employeeModel: "User", employee: "", ctc: "", annualTaxEstimate: "", effectiveFrom: "" });

  const people = directory.byModel[form.employeeModel] || [];

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!form.employee || !form.ctc) return notify("Select an employee and enter a CTC", "error");
    setCTC(
      {
        employee: form.employee,
        employeeModel: form.employeeModel,
        ctc: Number(form.ctc),
        annualTaxEstimate: form.annualTaxEstimate ? Number(form.annualTaxEstimate) : undefined,
        effectiveFrom: form.effectiveFrom || undefined,
      },
      {
        onSuccess: (res) => {
          notify(res?.message || "Salary structure saved", "success");
          setForm({ employeeModel: form.employeeModel, employee: "", ctc: "", annualTaxEstimate: "", effectiveFrom: "" });
        },
        onError: (err) => notify(getErrorMessage(err), "error"),
      }
    );
  };

  const handleReapply = (employeeId) => {
    reapply(employeeId, {
      onSuccess: () => notify("Policy re-applied to employee's structure", "success"),
      onError: (err) => notify(getErrorMessage(err), "error"),
    });
  };

  const structures = data?.structures || [];

  return (
    <>
      <Card title="Set / Revise CTC" subtitle="Setting CTC auto-computes the monthly breakup from the current policy. Setting it again revises CTC and keeps history.">
        <form onSubmit={handleSubmit} className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 items-end">
          <Field label="Employee Type">
            <Select value={form.employeeModel} onChange={(e) => setForm((p) => ({ ...p, employeeModel: e.target.value, employee: "" }))}>
              {MODELS.map((m) => <option key={m} value={m}>{MODEL_LABEL[m]}</option>)}
            </Select>
          </Field>
          <Field label="Employee">
            <Select value={form.employee} onChange={(e) => setForm((p) => ({ ...p, employee: e.target.value }))} disabled={directory.loading}>
              <option value="">{directory.loading ? "Loading…" : "Select employee"}</option>
              {people.map((p) => <option key={p._id} value={p._id}>{p.name} ({p.uid})</option>)}
            </Select>
          </Field>
          <Field label="Annual CTC (₹)">
            <TextInput type="number" min={1} value={form.ctc} onChange={(e) => setForm((p) => ({ ...p, ctc: e.target.value }))} placeholder="e.g. 600000" />
          </Field>
          <Field label="Annual Tax Estimate (₹)" hint="Optional — used only if TDS is enabled">
            <TextInput type="number" min={0} value={form.annualTaxEstimate} onChange={(e) => setForm((p) => ({ ...p, annualTaxEstimate: e.target.value }))} />
          </Field>
          <Field label="Effective From" hint="Defaults to today">
            <TextInput type="date" value={form.effectiveFrom} onChange={(e) => setForm((p) => ({ ...p, effectiveFrom: e.target.value }))} />
          </Field>
          <PrimaryButton type="submit" loading={saving} className="mb-6">Save Salary Structure</PrimaryButton>
        </form>
      </Card>

      <Card
        title="Salary Structures"
        right={
          <Select value={modelFilter} onChange={(e) => setModelFilter(e.target.value)} style={{ maxWidth: 160 }}>
            <option value="">All Types</option>
            {MODELS.map((m) => <option key={m} value={m}>{MODEL_LABEL[m]}</option>)}
          </Select>
        }
      >
        {isLoading ? (
          <div className="flex items-center gap-2" style={{ color: C.muted, fontSize: 13 }}><Spinner size={14} color={C.brand} /> Loading…</div>
        ) : structures.length === 0 ? (
          <p style={{ color: C.muted, fontSize: 13 }}>No salary structures found.</p>
        ) : (
          <div className="overflow-x-auto overscroll-x-contain -mx-1">
            <table className="w-full" style={{ borderCollapse: "collapse", minWidth: 760 }}>
              <thead>
                <tr style={{ textAlign: "left", fontSize: 11.5, color: C.muted, textTransform: "uppercase", letterSpacing: 0.4 }}>
                  <th style={{ padding: "6px 10px" }}>Employee</th>
                  <th style={{ padding: "6px 10px" }}>Type</th>
                  <th style={{ padding: "6px 10px" }}>CTC (Annual)</th>
                  <th style={{ padding: "6px 10px" }}>Monthly Gross</th>
                  <th style={{ padding: "6px 10px" }}>Basic</th>
                  <th style={{ padding: "6px 10px" }}>HRA</th>
                  <th style={{ padding: "6px 10px" }}>Effective From</th>
                  <th style={{ padding: "6px 10px" }}></th>
                </tr>
              </thead>
              <tbody>
                {structures.map((s) => (
                  <tr key={s._id} style={{ borderTop: `1px solid ${C.border}` }}>
                    <td style={{ padding: "8px 10px", fontSize: 13, fontWeight: 600, color: C.text }}>{resolveName(directory, s.employee, s.employeeModel)}</td>
                    <td style={{ padding: "8px 10px", fontSize: 12.5, color: C.muted }}>{MODEL_LABEL[s.employeeModel] || s.employeeModel}</td>
                    <td style={{ padding: "8px 10px", fontSize: 13 }}>{fmtINR(s.ctc)}</td>
                    <td style={{ padding: "8px 10px", fontSize: 13 }}>{fmtINR(s.breakup?.monthlyGross)}</td>
                    <td style={{ padding: "8px 10px", fontSize: 13 }}>{fmtINR(s.breakup?.basic)}</td>
                    <td style={{ padding: "8px 10px", fontSize: 13 }}>{fmtINR(s.breakup?.hra)}</td>
                    <td style={{ padding: "8px 10px", fontSize: 12.5, color: C.muted }}>{s.effectiveFrom ? new Date(s.effectiveFrom).toLocaleDateString("en-IN") : "—"}</td>
                    <td style={{ padding: "8px 10px", whiteSpace: "nowrap" }}>
                      <GhostButton onClick={() => handleReapply(s.employee)}>Re-apply Policy</GhostButton>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </>
  );
}


function GenerateTab({ notify, directory }) {
  const now = new Date();
  const { mutate: generate, isPending: generating } = useGeneratePayroll();
  const { mutate: bulkGenerate, isPending: bulkGenerating } = useBulkGeneratePayroll();

  const [single, setSingle] = useState({
    employeeModel: "User", employee: "", month: now.getMonth() + 1, year: now.getFullYear(),
    bonus: "", incentive: "", overtime: "", otherEarnings: "", loan: "", advance: "", otherDeductions: "", remarks: "", force: false,
  });
  const [bulk, setBulk] = useState({ employeeModel: "User", month: now.getMonth() + 1, year: now.getFullYear(), force: false });
  const [singleResult, setSingleResult] = useState(null);
  const [bulkResult, setBulkResult] = useState(null);

  const people = directory.byModel[single.employeeModel] || [];

  const numOrUndef = (v) => (v === "" || v === null || v === undefined ? undefined : Number(v));

  const handleSingle = (e) => {
    e.preventDefault();
    if (!single.employee) return notify("Select an employee", "error");
    setSingleResult(null);
    generate(
      {
        employee: single.employee,
        employeeModel: single.employeeModel,
        month: Number(single.month),
        year: Number(single.year),
        bonus: numOrUndef(single.bonus),
        incentive: numOrUndef(single.incentive),
        overtime: numOrUndef(single.overtime),
        otherEarnings: numOrUndef(single.otherEarnings),
        loan: numOrUndef(single.loan),
        advance: numOrUndef(single.advance),
        otherDeductions: numOrUndef(single.otherDeductions),
        remarks: single.remarks || undefined,
        force: single.force || undefined,
      },
      {
        onSuccess: (res) => {
          notify(res?.message || "Payroll generated", "success");
          setSingleResult(res?.payroll || null);
        },
        onError: (err) => notify(getErrorMessage(err), "error"),
      }
    );
  };

  const handleBulk = (e) => {
    e.preventDefault();
    setBulkResult(null);
    bulkGenerate(
      { month: Number(bulk.month), year: Number(bulk.year), employeeModel: bulk.employeeModel, force: bulk.force || undefined },
      {
        onSuccess: (res) => {
          notify(`Generated ${res.generated}, skipped ${res.skipped}`, "success");
          setBulkResult(res);
        },
        onError: (err) => notify(getErrorMessage(err), "error"),
      }
    );
  };

  return (
    <>
      <Card title="Generate Payroll — Single Employee" subtitle="Requires a salary structure (set CTC first) and pulls the employee's attendance summary for the month">
        <form onSubmit={handleSingle} className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 items-end">
          <Field label="Employee Type">
            <Select value={single.employeeModel} onChange={(e) => setSingle((p) => ({ ...p, employeeModel: e.target.value, employee: "" }))}>
              {MODELS.map((m) => <option key={m} value={m}>{MODEL_LABEL[m]}</option>)}
            </Select>
          </Field>
          <Field label="Employee">
            <Select value={single.employee} onChange={(e) => setSingle((p) => ({ ...p, employee: e.target.value }))}>
              <option value="">Select employee</option>
              {people.map((p) => <option key={p._id} value={p._id}>{p.name} ({p.uid})</option>)}
            </Select>
          </Field>
          <Field label="Month">
            <Select value={single.month} onChange={(e) => setSingle((p) => ({ ...p, month: e.target.value }))}>
              {MONTH_NAMES.map((m, i) => <option key={m} value={i + 1}>{m}</option>)}
            </Select>
          </Field>
          <Field label="Year">
            <TextInput type="number" value={single.year} onChange={(e) => setSingle((p) => ({ ...p, year: e.target.value }))} />
          </Field>
          <Field label="Bonus (₹)"><TextInput type="number" min={0} value={single.bonus} onChange={(e) => setSingle((p) => ({ ...p, bonus: e.target.value }))} /></Field>
          <Field label="Incentive (₹)"><TextInput type="number" min={0} value={single.incentive} onChange={(e) => setSingle((p) => ({ ...p, incentive: e.target.value }))} /></Field>
          <Field label="Overtime (₹)"><TextInput type="number" min={0} value={single.overtime} onChange={(e) => setSingle((p) => ({ ...p, overtime: e.target.value }))} /></Field>
          <Field label="Other Earnings (₹)"><TextInput type="number" min={0} value={single.otherEarnings} onChange={(e) => setSingle((p) => ({ ...p, otherEarnings: e.target.value }))} /></Field>
          <Field label="Loan Deduction (₹)"><TextInput type="number" min={0} value={single.loan} onChange={(e) => setSingle((p) => ({ ...p, loan: e.target.value }))} /></Field>
          <Field label="Advance Deduction (₹)"><TextInput type="number" min={0} value={single.advance} onChange={(e) => setSingle((p) => ({ ...p, advance: e.target.value }))} /></Field>
          <Field label="Other Deductions (₹)"><TextInput type="number" min={0} value={single.otherDeductions} onChange={(e) => setSingle((p) => ({ ...p, otherDeductions: e.target.value }))} /></Field>
          <Field label="Remarks"><TextInput value={single.remarks} onChange={(e) => setSingle((p) => ({ ...p, remarks: e.target.value }))} /></Field>

          <div className="flex items-center gap-2 flex-wrap">
            <input id="single-force" type="checkbox" checked={single.force} onChange={(e) => setSingle((p) => ({ ...p, force: e.target.checked }))} />
            <label htmlFor="single-force" style={{ fontSize: 12.5, color: C.muted }}>Force overwrite if approved/paid</label>
          </div>

          <PrimaryButton type="submit" loading={generating}>Generate Payroll</PrimaryButton>
        </form>

        {singleResult && (
          <div className="mt-4 pt-4" style={{ borderTop: `1px dashed ${C.border}` }}>
            <div className="flex flex-wrap gap-x-8 gap-y-2">
              <span style={{ fontSize: 13 }}><strong>Gross:</strong> {fmtINR(singleResult.earnings?.gross)}</span>
              <span style={{ fontSize: 13 }}><strong>Total Earnings:</strong> {fmtINR(singleResult.earnings?.totalEarnings)}</span>
              <span style={{ fontSize: 13 }}><strong>Total Deductions:</strong> {fmtINR(singleResult.deductions?.totalDeductions)}</span>
              <span style={{ fontSize: 13.5, fontWeight: 700, color: C.brandDark }}><strong>Net Salary:</strong> {fmtINR(singleResult.netSalary)}</span>
              {statusBadge(singleResult.status)}
            </div>
          </div>
        )}
      </Card>

      <Card title="Bulk Generate — Whole Organisation" subtitle="Generates payroll for every active employee (of the chosen type) who already has a salary structure">
        <form onSubmit={handleBulk} className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 items-end">
          <Field label="Employee Type">
            <Select value={bulk.employeeModel} onChange={(e) => setBulk((p) => ({ ...p, employeeModel: e.target.value }))}>
              {MODELS.map((m) => <option key={m} value={m}>{MODEL_LABEL[m]}</option>)}
            </Select>
          </Field>
          <Field label="Month">
            <Select value={bulk.month} onChange={(e) => setBulk((p) => ({ ...p, month: e.target.value }))}>
              {MONTH_NAMES.map((m, i) => <option key={m} value={i + 1}>{m}</option>)}
            </Select>
          </Field>
          <Field label="Year">
            <TextInput type="number" value={bulk.year} onChange={(e) => setBulk((p) => ({ ...p, year: e.target.value }))} />
          </Field>
          <div className="flex items-center gap-2 flex-wrap">
            <input id="bulk-force" type="checkbox" checked={bulk.force} onChange={(e) => setBulk((p) => ({ ...p, force: e.target.checked }))} />
            <label htmlFor="bulk-force" style={{ fontSize: 12.5, color: C.muted }}>Force overwrite</label>
          </div>
          <PrimaryButton type="submit" loading={bulkGenerating}>Bulk Generate</PrimaryButton>
        </form>

        {bulkResult && (
          <div className="mt-4 pt-4" style={{ borderTop: `1px dashed ${C.border}` }}>
            <p style={{ fontSize: 13, marginBottom: 8 }}>
              <strong>{bulkResult.generated}</strong> generated, <strong>{bulkResult.skipped}</strong> skipped
            </p>
            {bulkResult.skippedDetails?.length > 0 && (
              <ul style={{ fontSize: 12.5, color: C.muted, paddingLeft: 18 }}>
                {bulkResult.skippedDetails.map((s, i) => (
                  <li key={i} className="break-words">{resolveName(directory, s.employee, bulk.employeeModel)} — {s.reason}</li>
                ))}
              </ul>
            )}
          </div>
        )}
      </Card>
    </>
  );
}


function PayslipModal({ payroll, directory, onClose }) {
  if (!payroll) return null;
  return (
    <div className="fixed inset-0 z-[998] flex items-center justify-center p-3 sm:p-4 overscroll-contain" style={{ background: "rgba(0,0,0,0.45)" }} onClick={onClose}>
      <div
        onClick={(e) => e.stopPropagation()}
        className="p-4 sm:p-[22px] overscroll-contain"
        style={{ background: "#fff", borderRadius: 14, maxWidth: 520, width: "100%", maxHeight: "88vh", overflowY: "auto" }}
      >
        <div className="flex items-center justify-between mb-3 gap-3">
          <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: C.text }}>Payslip</h3>
          <button onClick={onClose} style={{ background: "none", border: "none", fontSize: 20, cursor: "pointer", color: C.muted, flexShrink: 0 }}>×</button>
        </div>
        <p style={{ fontSize: 13, color: C.muted, marginBottom: 2 }} className="break-words">{resolveName(directory, payroll.employee, payroll.employeeModel)}</p>
        <p style={{ fontSize: 13, color: C.muted, marginBottom: 12 }} className="flex items-center gap-2 flex-wrap">{MONTH_NAMES[payroll.month - 1]} {payroll.year} {statusBadge(payroll.status)}</p>

        <div className="grid grid-cols-2 gap-x-3 sm:gap-x-4 gap-y-1.5 mb-3">
          <span style={{ fontSize: 12.5, color: C.muted }}>Basic</span><span style={{ fontSize: 13, textAlign: "right" }}>{fmtINR(payroll.breakup?.basic)}</span>
          <span style={{ fontSize: 12.5, color: C.muted }}>HRA</span><span style={{ fontSize: 13, textAlign: "right" }}>{fmtINR(payroll.breakup?.hra)}</span>
          {(payroll.breakup?.allowances || []).map((a) => (
            <Fragment key={a.name}>
              <span style={{ fontSize: 12.5, color: C.muted }} className="break-words">{a.name}</span><span style={{ fontSize: 13, textAlign: "right" }}>{fmtINR(a.amount)}</span>
            </Fragment>
          ))}
          <span style={{ fontSize: 12.5, color: C.muted }}>Bonus</span><span style={{ fontSize: 13, textAlign: "right" }}>{fmtINR(payroll.earnings?.bonus)}</span>
          <span style={{ fontSize: 12.5, color: C.muted }}>Incentive</span><span style={{ fontSize: 13, textAlign: "right" }}>{fmtINR(payroll.earnings?.incentive)}</span>
          <span style={{ fontSize: 12.5, color: C.muted }}>Overtime</span><span style={{ fontSize: 13, textAlign: "right" }}>{fmtINR(payroll.earnings?.overtime)}</span>
          <span style={{ fontSize: 12.5, color: C.muted }}>Other</span><span style={{ fontSize: 13, textAlign: "right" }}>{fmtINR(payroll.earnings?.other)}</span>
          <span style={{ fontSize: 13, fontWeight: 700 }}>Total Earnings</span><span style={{ fontSize: 13, fontWeight: 700, textAlign: "right" }}>{fmtINR(payroll.earnings?.totalEarnings)}</span>
        </div>

        <div className="grid grid-cols-2 gap-x-3 sm:gap-x-4 gap-y-1.5 mb-3 pt-3" style={{ borderTop: `1px dashed ${C.border}` }}>
          <span style={{ fontSize: 12.5, color: C.muted }}>PF</span><span style={{ fontSize: 13, textAlign: "right" }}>{fmtINR(payroll.deductions?.pf)}</span>
          <span style={{ fontSize: 12.5, color: C.muted }}>ESI</span><span style={{ fontSize: 13, textAlign: "right" }}>{fmtINR(payroll.deductions?.esi)}</span>
          <span style={{ fontSize: 12.5, color: C.muted }}>Professional Tax</span><span style={{ fontSize: 13, textAlign: "right" }}>{fmtINR(payroll.deductions?.professionalTax)}</span>
          <span style={{ fontSize: 12.5, color: C.muted }}>TDS</span><span style={{ fontSize: 13, textAlign: "right" }}>{fmtINR(payroll.deductions?.tds)}</span>
          <span style={{ fontSize: 12.5, color: C.muted }}>Loss of Pay</span><span style={{ fontSize: 13, textAlign: "right" }}>{fmtINR(payroll.deductions?.lossOfPay)}</span>
          <span style={{ fontSize: 12.5, color: C.muted }}>Loan</span><span style={{ fontSize: 13, textAlign: "right" }}>{fmtINR(payroll.deductions?.loan)}</span>
          <span style={{ fontSize: 12.5, color: C.muted }}>Advance</span><span style={{ fontSize: 13, textAlign: "right" }}>{fmtINR(payroll.deductions?.advance)}</span>
          <span style={{ fontSize: 12.5, color: C.muted }}>Other</span><span style={{ fontSize: 13, textAlign: "right" }}>{fmtINR(payroll.deductions?.other)}</span>
          <span style={{ fontSize: 13, fontWeight: 700 }}>Total Deductions</span><span style={{ fontSize: 13, fontWeight: 700, textAlign: "right" }}>{fmtINR(payroll.deductions?.totalDeductions)}</span>
        </div>

        <div className="flex items-center justify-between pt-3 gap-3" style={{ borderTop: `2px solid ${C.border}` }}>
          <span style={{ fontSize: 15, fontWeight: 700, color: C.text }}>Net Salary</span>
          <span style={{ fontSize: 17, fontWeight: 800, color: C.brandDark }}>{fmtINR(payroll.netSalary)}</span>
        </div>

        {payroll.attendance && (
          <p style={{ fontSize: 11.5, color: C.muted, marginTop: 12 }}>
            Paid days: {payroll.attendance.paidDays} / {payroll.attendance.daysInMonth} · Absent: {payroll.attendance.absentDays} · Half-days: {payroll.attendance.halfDays}
          </p>
        )}
        {payroll.remarks && <p style={{ fontSize: 12, color: C.muted, marginTop: 6 }} className="break-words">Remarks: {payroll.remarks}</p>}
      </div>
    </div>
  );
}

function RecordsTab({ notify, directory }) {
  const now = new Date();
  const [filters, setFilters] = useState({ month: "", year: String(now.getFullYear()), employeeModel: "", status: "" });
  const { data, isLoading } = useListPayrolls({
    month: filters.month || undefined,
    year: filters.year || undefined,
    employeeModel: filters.employeeModel || undefined,
    status: filters.status || undefined,
  });
  const { mutate: updateStatus } = useUpdatePayrollStatus();
  const [selected, setSelected] = useState(null);

  const payrolls = data?.payrolls || [];

  const handleStatus = (id, status) => {
    updateStatus(
      { id, status },
      {
        onSuccess: () => notify(`Marked as ${status.replace("_", " ")}`, "success"),
        onError: (err) => notify(getErrorMessage(err), "error"),
      }
    );
  };

  return (
    <Card
      title="Payroll Records"
      right={
        <div className="flex items-center gap-2 flex-wrap">
          <Select value={filters.month} onChange={(e) => setFilters((p) => ({ ...p, month: e.target.value }))} style={{ maxWidth: 140 }}>
            <option value="">All Months</option>
            {MONTH_NAMES.map((m, i) => <option key={m} value={i + 1}>{m}</option>)}
          </Select>
          <TextInput type="number" value={filters.year} onChange={(e) => setFilters((p) => ({ ...p, year: e.target.value }))} style={{ maxWidth: 100 }} />
          <Select value={filters.employeeModel} onChange={(e) => setFilters((p) => ({ ...p, employeeModel: e.target.value }))} style={{ maxWidth: 140 }}>
            <option value="">All Types</option>
            {MODELS.map((m) => <option key={m} value={m}>{MODEL_LABEL[m]}</option>)}
          </Select>
          <Select value={filters.status} onChange={(e) => setFilters((p) => ({ ...p, status: e.target.value }))} style={{ maxWidth: 140 }}>
            <option value="">All Statuses</option>
            <option value="generated">Generated</option>
            <option value="approved">Approved</option>
            <option value="paid">Paid</option>
            <option value="on_hold">On Hold</option>
          </Select>
        </div>
      }
    >
      {isLoading ? (
        <div className="flex items-center gap-2" style={{ color: C.muted, fontSize: 13 }}><Spinner size={14} color={C.brand} /> Loading…</div>
      ) : payrolls.length === 0 ? (
        <p style={{ color: C.muted, fontSize: 13 }}>No payroll records found for these filters.</p>
      ) : (
        <div className="overflow-x-auto overscroll-x-contain -mx-1">
          <table className="w-full" style={{ borderCollapse: "collapse", minWidth: 820 }}>
            <thead>
              <tr style={{ textAlign: "left", fontSize: 11.5, color: C.muted, textTransform: "uppercase", letterSpacing: 0.4 }}>
                <th style={{ padding: "6px 10px" }}>Employee</th>
                <th style={{ padding: "6px 10px" }}>Period</th>
                <th style={{ padding: "6px 10px" }}>Net Salary</th>
                <th style={{ padding: "6px 10px" }}>Status</th>
                <th style={{ padding: "6px 10px" }}></th>
              </tr>
            </thead>
            <tbody>
              {payrolls.map((p) => (
                <tr key={p._id} style={{ borderTop: `1px solid ${C.border}` }}>
                  <td style={{ padding: "8px 10px", fontSize: 13, fontWeight: 600, color: C.text }}>{resolveName(directory, p.employee, p.employeeModel)}</td>
                  <td style={{ padding: "8px 10px", fontSize: 12.5, color: C.muted }}>{MONTH_NAMES[p.month - 1]} {p.year}</td>
                  <td style={{ padding: "8px 10px", fontSize: 13, fontWeight: 700, color: C.brandDark }}>{fmtINR(p.netSalary)}</td>
                  <td style={{ padding: "8px 10px" }}>{statusBadge(p.status)}</td>
                  <td style={{ padding: "8px 10px", whiteSpace: "nowrap" }}>
                    <GhostButton onClick={() => setSelected(p)} style={{ marginRight: 8 }}>View Payslip</GhostButton>
                    {p.status === "generated" && <GhostButton onClick={() => handleStatus(p._id, "approved")} style={{ marginRight: 8 }}>Approve</GhostButton>}
                    {p.status === "approved" && <GhostButton onClick={() => handleStatus(p._id, "paid")} style={{ marginRight: 8 }}>Mark Paid</GhostButton>}
                    {p.status !== "on_hold" && p.status !== "paid" && <GhostButton onClick={() => handleStatus(p._id, "on_hold")}>Hold</GhostButton>}
                    {p.status === "on_hold" && <GhostButton onClick={() => handleStatus(p._id, "approved")}>Resume</GhostButton>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <PayslipModal payroll={selected} directory={directory} onClose={() => setSelected(null)} />
    </Card>
  );
}


export default function Payroll() {
  const [tab, setTab] = useState("policy");
  const [toast, setToast] = useState({ message: "", type: "" });
  const notify = (message, type = "success") => setToast({ message, type });
  const directory = useEmployeeDirectory();

  return (
    <div
      className="w-full overflow-x-hidden p-3 sm:p-6 lg:p-8 box-border"
      style={{ background: C.page }}
    >
      <style>{`
        @keyframes payroll-spin { to { transform: rotate(360deg); } }
        @keyframes payroll-slideIn { from { transform: translateX(12px); opacity: 0; } to { transform: translateX(0); opacity: 1; } }
      `}</style>

      <Toast message={toast.message} type={toast.type} onClose={() => setToast({ message: "", type: "" })} />

      <div className="max-w-[1200px] mx-auto min-w-0">
        <div className="mb-5">
          <h1 className="text-lg sm:text-xl lg:text-[22px]" style={{ fontWeight: 700, margin: 0, color: C.text }}>Payroll</h1>
          <p style={{ fontSize: 13, color: C.muted, marginTop: 3, marginBottom: 0 }}>Configure policy, manage salary structures, and generate payslips</p>
        </div>

        <div className="flex gap-1.5 mb-5 flex-wrap overflow-x-auto" style={{ borderBottom: `1px solid ${C.border}` }}>
          {TABS.map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className="whitespace-nowrap"
              style={{
                padding: "9px 14px", border: "none", background: "none", cursor: "pointer",
                fontSize: 13, fontWeight: 700, fontFamily: "inherit",
                color: tab === t.key ? C.brandDark : C.muted,
                borderBottom: tab === t.key ? `2.5px solid ${C.brand}` : "2.5px solid transparent",
                marginBottom: -1,
              }}
            >
              {t.label}
            </button>
          ))}
        </div>

        {tab === "policy" && <PolicyTab notify={notify} />}
        {tab === "structures" && <StructuresTab notify={notify} directory={directory} />}
        {tab === "generate" && <GenerateTab notify={notify} directory={directory} />}
        {tab === "records" && <RecordsTab notify={notify} directory={directory} />}
      </div>
    </div>
  );
}