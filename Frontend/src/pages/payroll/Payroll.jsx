import { useState, useEffect, useMemo, Fragment } from "react";
import {
  useGetPayrollPolicy,
  useSetPayrollPolicy,
  useResetPayrollPolicy,
  useAddPayrollAllowance,
  useUpdatePayrollAllowance,
  useRemovePayrollAllowance,
  useGetPaySchedule,
  useSetPaySchedule,
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
  { key: "schedule", label: "Pay Schedule" },
  { key: "statutory", label: "Statutory Components" },
  { key: "components", label: "Salary Components" },
  { key: "claims", label: "Claims & Declarations" },
  { key: "structures", label: "Salary Structures" },
  { key: "generate", label: "Generate Payroll" },
  { key: "records", label: "Payroll Records" },
];

const COMPONENT_CATEGORIES = [
  { key: "earning", label: "Earnings" },
  { key: "deduction", label: "Deductions" },
  { key: "benefit", label: "Benefits" },
  { key: "reimbursement", label: "Reimbursements" },
];

const CALC_TYPES = [
  { key: "flat", label: "Flat Amount" },
  { key: "percentOfBasic", label: "% of Basic" },
  { key: "percentOfCTC", label: "% of CTC" },
  { key: "formula", label: "Custom Formula" },
];

const MODEL_LABEL = { User: "Employee", Manager: "Manager", Admin: "Admin" };
const MODELS = ["User", "Manager", "Admin"];
const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];
const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

function daysInMonthClient(month, year) {
  return new Date(Date.UTC(Number(year), Number(month), 0)).getUTCDate();
}

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

// Inner sub-tab strip used inside Statutory Components / Salary Components /
// Claims & Declarations — mirrors Zoho's secondary tab row (e.g. EPF | ESI |
// Professional Tax | ...).
function SubTabs({ items, active, onChange }) {
  return (
    <div className="flex items-center gap-1 flex-wrap mb-5" style={{ borderBottom: `1px solid ${C.border}` }}>
      {items.map((it) => (
        <button
          key={it.key}
          type="button"
          onClick={() => onChange(it.key)}
          style={{
            background: "none", border: "none", cursor: "pointer", fontFamily: "inherit",
            padding: "8px 14px 10px", fontSize: 13, fontWeight: 600,
            color: active === it.key ? C.brand : C.muted,
            borderBottom: active === it.key ? `2px solid ${C.brand}` : "2px solid transparent",
            marginBottom: -1,
          }}
        >
          {it.label}
        </button>
      ))}
    </div>
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


function PayScheduleTab({ notify }) {
  const { data, isLoading } = useGetPaySchedule();
  const { mutate: save, isPending: saving } = useSetPaySchedule();

  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState(null);

  useEffect(() => {
    if (data?.paySchedule) setForm(JSON.parse(JSON.stringify(data.paySchedule)));
  }, [data]);

  if (isLoading || !form) {
    return <Card title="Pay Schedule"><div className="flex items-center gap-2" style={{ color: C.muted, fontSize: 13 }}><Spinner size={14} color={C.brand} /> Loading pay schedule…</div></Card>;
  }

  const locked = !!data?.paySchedule?.locked;

  const toggleWorkingDay = (day) => {
    setForm((prev) => {
      const has = prev.workingDays.includes(day);
      const workingDays = has ? prev.workingDays.filter((d) => d !== day) : [...prev.workingDays, day];
      return { ...prev, workingDays };
    });
  };

  const handleSave = () => {
    save(
      {
        workingDays: form.workingDays,
        payDay: Number(form.payDay),
        firstPayPeriodMonth: form.firstPayPeriodMonth ? Number(form.firstPayPeriodMonth) : undefined,
        firstPayPeriodYear: form.firstPayPeriodYear ? Number(form.firstPayPeriodYear) : undefined,
        firstPayDate: form.firstPayDate || undefined,
        noOfWorkingDays: Number(form.noOfWorkingDays),
      },
      {
        onSuccess: () => {
          notify("Pay Schedule saved", "success");
          setEditing(false);
        },
        onError: (e) => notify(getErrorMessage(e), "error"),
      }
    );
  };

  return (
    <Card
      title="Pay Schedule"
      subtitle="Fixed, organisation-wide payroll run schedule"
      right={
        !locked && (
          editing ? (
            <div className="flex items-center gap-2 flex-wrap w-full sm:w-auto">
              <GhostButton onClick={() => { setForm(JSON.parse(JSON.stringify(data.paySchedule))); setEditing(false); }} className="flex-1 sm:flex-none justify-center">Cancel</GhostButton>
              <PrimaryButton onClick={handleSave} loading={saving} className="flex-1 sm:flex-none">Save Schedule</PrimaryButton>
            </div>
          ) : (
            <GhostButton onClick={() => setEditing(true)}>Edit</GhostButton>
          )
        )
      }
    >
      {locked && (
        <div style={{ background: C.amberBg, border: `1px solid #ecd6a8`, borderRadius: 10, padding: "10px 14px", marginBottom: 16, fontSize: 12.5, color: "#7a5710" }}>
          <strong>Note:</strong> Pay Schedule cannot be edited once you process the first pay run.
        </div>
      )}

      {!editing ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-4">
          <div>
            <p style={{ fontSize: 11.5, color: C.muted, marginBottom: 3 }}>Pay Frequency</p>
            <p style={{ fontSize: 14, fontWeight: 600, color: C.text, margin: 0 }}>{form.payFrequency || "Monthly"}</p>
          </div>
          <div>
            <p style={{ fontSize: 11.5, color: C.muted, marginBottom: 3 }}>Working Days</p>
            <p style={{ fontSize: 14, fontWeight: 600, color: C.text, margin: 0 }}>{(form.workingDays || []).join(", ") || "—"}</p>
          </div>
          <div>
            <p style={{ fontSize: 11.5, color: C.muted, marginBottom: 3 }}>Pay Day</p>
            <p style={{ fontSize: 14, fontWeight: 600, color: C.text, margin: 0 }}>{form.payDay ? `${form.payDay}${["th","st","nd","rd"][(form.payDay % 10 > 3 || Math.floor(form.payDay/10) === 1) ? 0 : form.payDay % 10]} of every month` : "—"}</p>
          </div>
          <div>
            <p style={{ fontSize: 11.5, color: C.muted, marginBottom: 3 }}>No. of Working Days</p>
            <p style={{ fontSize: 14, fontWeight: 600, color: C.text, margin: 0 }}>{form.noOfWorkingDays ?? "—"}</p>
          </div>
          <div>
            <p style={{ fontSize: 11.5, color: C.muted, marginBottom: 3 }}>First Pay Period</p>
            <p style={{ fontSize: 14, fontWeight: 600, color: C.text, margin: 0 }}>
              {form.firstPayPeriodMonth ? `${MONTH_NAMES[form.firstPayPeriodMonth - 1]} ${form.firstPayPeriodYear || ""}` : "Not set"}
            </p>
          </div>
          <div>
            <p style={{ fontSize: 11.5, color: C.muted, marginBottom: 3 }}>First Pay Date</p>
            <p style={{ fontSize: 14, fontWeight: 600, color: C.text, margin: 0 }}>
              {form.firstPayDate ? new Date(form.firstPayDate).toLocaleDateString("en-IN") : "Not set"}
            </p>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <Field label="Working Days" hint="Days counted as working days each week">
            <div className="flex items-center gap-2 flex-wrap">
              {WEEKDAYS.map((d) => (
                <button
                  key={d}
                  type="button"
                  onClick={() => toggleWorkingDay(d)}
                  style={{
                    padding: "6px 12px", borderRadius: 8, fontSize: 12.5, fontWeight: 700, cursor: "pointer",
                    border: `1px solid ${form.workingDays.includes(d) ? C.brand : C.border}`,
                    background: form.workingDays.includes(d) ? C.brandLight : "#fff",
                    color: form.workingDays.includes(d) ? C.brandDark : C.muted,
                  }}
                >
                  {d}
                </button>
              ))}
            </div>
          </Field>
          <Field label="Pay Day" hint="Day of month payroll is paid out">
            <TextInput type="number" min={1} max={31} value={form.payDay ?? 1} onChange={(e) => setForm((p) => ({ ...p, payDay: e.target.value }))} />
          </Field>
          <Field label="No. of Working Days" hint="Fixed denominator used for per-day rate / LOP math, e.g. 30">
            <TextInput type="number" min={1} max={31} value={form.noOfWorkingDays ?? 30} onChange={(e) => setForm((p) => ({ ...p, noOfWorkingDays: e.target.value }))} />
          </Field>
          <div />
          <Field label="First Pay Period Month">
            <Select value={form.firstPayPeriodMonth || ""} onChange={(e) => setForm((p) => ({ ...p, firstPayPeriodMonth: e.target.value }))}>
              <option value="">Not set</option>
              {MONTH_NAMES.map((m, i) => <option key={m} value={i + 1}>{m}</option>)}
            </Select>
          </Field>
          <Field label="First Pay Period Year">
            <TextInput type="number" value={form.firstPayPeriodYear || ""} onChange={(e) => setForm((p) => ({ ...p, firstPayPeriodYear: e.target.value }))} placeholder="e.g. 2026" />
          </Field>
          <Field label="First Pay Date">
            <TextInput type="date" value={form.firstPayDate ? String(form.firstPayDate).slice(0, 10) : ""} onChange={(e) => setForm((p) => ({ ...p, firstPayDate: e.target.value }))} />
          </Field>
        </div>
      )}
    </Card>
  );
}


// ---------- Statutory Components (EPF / ESI / Professional Tax / LWF / Statutory Bonus) ----------

const STATUTORY_SUBTABS = [
  { key: "epf", label: "EPF" },
  { key: "esi", label: "ESI" },
  { key: "pt", label: "Professional Tax" },
  { key: "lwf", label: "Labour Welfare Fund" },
  { key: "bonus", label: "Statutory Bonus" },
];

function StatutoryTab({ notify }) {
  const { data, isLoading } = useGetPayrollPolicy();
  const { mutate: savePolicy, isPending: saving } = useSetPayrollPolicy();
  const { mutate: resetPolicy, isPending: resetting } = useResetPayrollPolicy();

  const [form, setForm] = useState(null);
  const [sub, setSub] = useState("epf");

  useEffect(() => {
    if (data?.policy) setForm(JSON.parse(JSON.stringify(data.policy)));
  }, [data]);

  if (isLoading || !form) {
    return <Card title="Statutory Components"><div className="flex items-center gap-2" style={{ color: C.muted, fontSize: 13 }}><Spinner size={14} color={C.brand} /> Loading…</div></Card>;
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
        lwf: form.lwf,
        statutoryBonus: form.statutoryBonus,
      },
      {
        onSuccess: () => notify("Statutory components updated", "success"),
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

  return (
    <>
      <Card
        title="Salary Structure Rules"
        subtitle="Basic and HRA — the base every other Salary Component and statutory deduction is computed from"
      >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <Field label="Basic % of Gross" hint="1–100">
            <TextInput type="number" min={1} max={100} value={form.basic?.percentOfGross ?? 0} onChange={(e) => set("basic.percentOfGross", Number(e.target.value))} />
          </Field>
          <Field label="HRA">
            <div className="flex items-center gap-3 flex-wrap">
              <Toggle checked={!!form.hra?.enabled} onChange={(v) => set("hra.enabled", v)} />
              <TextInput type="number" min={0} max={100} disabled={!form.hra?.enabled} value={form.hra?.percentOfBasic ?? 0} onChange={(e) => set("hra.percentOfBasic", Number(e.target.value))} style={{ maxWidth: 130 }} />
              <span style={{ fontSize: 12.5, color: C.muted }}>% of Basic</span>
            </div>
          </Field>
        </div>
      </Card>

      <Card
        title="Statutory Components"
        right={
          <div className="flex items-center gap-2 flex-wrap w-full sm:w-auto">
            <GhostButton onClick={handleReset} disabled={resetting} className="flex-1 sm:flex-none justify-center">{resetting ? "Resetting…" : "Reset to Standard"}</GhostButton>
            <PrimaryButton onClick={handleSave} loading={saving} className="flex-1 sm:flex-none">Save</PrimaryButton>
          </div>
        }
      >
        <SubTabs items={STATUTORY_SUBTABS} active={sub} onChange={setSub} />

        {sub === "epf" && (
          <div>
            <p style={{ fontSize: 13, color: C.muted, marginBottom: 16 }}>
              Any organisation with 20 or more employees must register for the Employee Provident Fund (EPF) scheme, a retirement benefit plan for all salaried employees.
            </p>
            <div className="flex items-center gap-3 flex-wrap mb-3">
              <Toggle checked={!!form.pf?.enabled} onChange={(v) => set("pf.enabled", v)} />
              <span style={{ fontSize: 13, fontWeight: 600, color: C.text }}>Registered for EPF</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field label="Employee Contribution (%)">
                <TextInput type="number" min={0} max={100} disabled={!form.pf?.enabled} value={form.pf?.employeePercent ?? 0} onChange={(e) => set("pf.employeePercent", Number(e.target.value))} />
              </Field>
              <Field label="Employer Contribution (%)">
                <TextInput type="number" min={0} max={100} disabled={!form.pf?.enabled} value={form.pf?.employerPercent ?? 0} onChange={(e) => set("pf.employerPercent", Number(e.target.value))} />
              </Field>
            </div>
            <div className="flex items-center gap-2 mt-3 flex-wrap">
              <Toggle checked={!!form.pf?.applyWageCeiling} onChange={(v) => set("pf.applyWageCeiling", v)} disabled={!form.pf?.enabled} />
              <span style={{ fontSize: 12.5, color: C.muted }}>Apply statutory wage ceiling</span>
              <TextInput type="number" min={0} disabled={!form.pf?.enabled || !form.pf?.applyWageCeiling} value={form.pf?.wageCeiling ?? 0} onChange={(e) => set("pf.wageCeiling", Number(e.target.value))} style={{ maxWidth: 120 }} />
            </div>
          </div>
        )}

        {sub === "esi" && (
          <div>
            <p style={{ fontSize: 13, color: C.muted, marginBottom: 16 }}>
              Employee State Insurance (ESI) applies only to employees whose monthly gross is at or below the wage threshold set by the government.
            </p>
            <div className="flex items-center gap-3 flex-wrap mb-3">
              <Toggle checked={!!form.esi?.enabled} onChange={(v) => set("esi.enabled", v)} />
              <span style={{ fontSize: 13, fontWeight: 600, color: C.text }}>Registered for ESI</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field label="Employee Contribution (%)">
                <TextInput type="number" step="0.01" min={0} max={100} disabled={!form.esi?.enabled} value={form.esi?.employeePercent ?? 0} onChange={(e) => set("esi.employeePercent", Number(e.target.value))} />
              </Field>
              <Field label="Employer Contribution (%)">
                <TextInput type="number" step="0.01" min={0} max={100} disabled={!form.esi?.enabled} value={form.esi?.employerPercent ?? 0} onChange={(e) => set("esi.employerPercent", Number(e.target.value))} />
              </Field>
              <Field label="Wage Threshold (₹/month)" hint="ESI only applies at or below this gross">
                <TextInput type="number" min={0} disabled={!form.esi?.enabled} value={form.esi?.wageThreshold ?? 0} onChange={(e) => set("esi.wageThreshold", Number(e.target.value))} />
              </Field>
            </div>
          </div>
        )}

        {sub === "pt" && (
          <div>
            <p style={{ fontSize: 13, color: C.muted, marginBottom: 16 }}>
              Professional Tax is a state-specific tax deducted from salary each month. Set your state's flat monthly slab amount.
            </p>
            <div className="flex items-center gap-3 flex-wrap mb-3">
              <Toggle checked={!!form.professionalTax?.enabled} onChange={(v) => set("professionalTax.enabled", v)} />
              <span style={{ fontSize: 13, fontWeight: 600, color: C.text }}>Applicable</span>
            </div>
            <Field label="Monthly Amount (₹)">
              <TextInput type="number" min={0} disabled={!form.professionalTax?.enabled} value={form.professionalTax?.monthlyAmount ?? 0} onChange={(e) => set("professionalTax.monthlyAmount", Number(e.target.value))} style={{ maxWidth: 200 }} />
            </Field>
          </div>
        )}

        {sub === "lwf" && (
          <div>
            <p style={{ fontSize: 13, color: C.muted, marginBottom: 16 }}>
              Labour Welfare Fund (LWF) is a small, state-specific contribution shared by employee and employer. Many small organisations don't register for it.
            </p>
            <div className="flex items-center gap-3 flex-wrap mb-3">
              <Toggle checked={!!form.lwf?.enabled} onChange={(v) => set("lwf.enabled", v)} />
              <span style={{ fontSize: 13, fontWeight: 600, color: C.text }}>Registered for LWF</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field label="Employee Contribution (₹)">
                <TextInput type="number" min={0} disabled={!form.lwf?.enabled} value={form.lwf?.employeeAmount ?? 0} onChange={(e) => set("lwf.employeeAmount", Number(e.target.value))} />
              </Field>
              <Field label="Employer Contribution (₹)">
                <TextInput type="number" min={0} disabled={!form.lwf?.enabled} value={form.lwf?.employerAmount ?? 0} onChange={(e) => set("lwf.employerAmount", Number(e.target.value))} />
              </Field>
            </div>
          </div>
        )}

        {sub === "bonus" && (
          <div>
            <p style={{ fontSize: 13, color: C.muted, marginBottom: 16 }}>
              Statutory Bonus under the Payment of Bonus Act — an employer-cost accrual of 8.33% to 20% of Basic. Shown as an employer contribution; it is not deducted from the employee.
            </p>
            <div className="flex items-center gap-3 flex-wrap mb-3">
              <Toggle checked={!!form.statutoryBonus?.enabled} onChange={(v) => set("statutoryBonus.enabled", v)} />
              <span style={{ fontSize: 13, fontWeight: 600, color: C.text }}>Applicable</span>
            </div>
            <Field label="% of Basic" hint="8.33 – 20">
              <TextInput type="number" step="0.01" min={0} max={20} disabled={!form.statutoryBonus?.enabled} value={form.statutoryBonus?.percentOfBasic ?? 0} onChange={(e) => set("statutoryBonus.percentOfBasic", Number(e.target.value))} style={{ maxWidth: 160 }} />
            </Field>
          </div>
        )}

        <div className="flex items-center gap-3 flex-wrap mt-6 pt-5" style={{ borderTop: `1px dashed ${C.border}` }}>
          <Field label="TDS (Income Tax)" hint="Uses each employee's annualTaxEstimate ÷ 12">
            <div className="flex items-center gap-3 flex-wrap">
              <Toggle checked={!!form.tds?.enabled} onChange={(v) => set("tds.enabled", v)} />
              <span style={{ fontSize: 12.5, color: C.muted }}>{form.tds?.enabled ? "Enabled" : "Disabled"}</span>
            </div>
          </Field>
        </div>
      </Card>
    </>
  );
}

// ---------- Salary Components (Earnings / Deductions / Benefits / Reimbursements) ----------

function emptyComponentForm(category) {
  return {
    name: "", category, calculationType: "flat",
    percentOfBasic: 0, percentOfCTC: 0, flatAmount: 0, formula: "",
    considerForEPF: true, considerForESI: true, isFBP: false,
  };
}

function ComponentValueFields({ value, onChange, disabled }) {
  return (
    <div className="flex items-center gap-3 flex-wrap">
      <Select value={value.calculationType} onChange={(e) => onChange({ ...value, calculationType: e.target.value })} disabled={disabled} style={{ maxWidth: 160 }}>
        {CALC_TYPES.map((c) => <option key={c.key} value={c.key}>{c.label}</option>)}
      </Select>
      {value.calculationType === "flat" && (
        <TextInput type="number" min={0} disabled={disabled} value={value.flatAmount ?? 0} onChange={(e) => onChange({ ...value, flatAmount: Number(e.target.value) })} placeholder="₹ / month" style={{ maxWidth: 130 }} />
      )}
      {value.calculationType === "percentOfBasic" && (
        <TextInput type="number" min={0} max={100} disabled={disabled} value={value.percentOfBasic ?? 0} onChange={(e) => onChange({ ...value, percentOfBasic: Number(e.target.value) })} placeholder="% of Basic" style={{ maxWidth: 130 }} />
      )}
      {value.calculationType === "percentOfCTC" && (
        <TextInput type="number" min={0} max={100} disabled={disabled} value={value.percentOfCTC ?? 0} onChange={(e) => onChange({ ...value, percentOfCTC: Number(e.target.value) })} placeholder="% of CTC" style={{ maxWidth: 130 }} />
      )}
      {value.calculationType === "formula" && (
        <TextInput disabled={disabled} value={value.formula ?? ""} onChange={(e) => onChange({ ...value, formula: e.target.value })} placeholder="e.g. basic*0.1 + 500" style={{ maxWidth: 220 }} />
      )}
    </div>
  );
}

function ComponentsTab({ notify }) {
  const { data, isLoading } = useGetPayrollPolicy();
  const { mutate: addAllowance, isPending: adding } = useAddPayrollAllowance();
  const { mutate: updateAllowance } = useUpdatePayrollAllowance();
  const { mutate: removeAllowance } = useRemovePayrollAllowance();

  const [form, setForm] = useState(null);
  const [category, setCategory] = useState("earning");
  const [showAdd, setShowAdd] = useState(false);
  const [newComponent, setNewComponent] = useState(emptyComponentForm("earning"));

  useEffect(() => {
    if (data?.policy) setForm(JSON.parse(JSON.stringify(data.policy)));
  }, [data]);

  useEffect(() => {
    setShowAdd(false);
    setNewComponent(emptyComponentForm(category));
  }, [category]);

  if (isLoading || !form) {
    return <Card title="Salary Components"><div className="flex items-center gap-2" style={{ color: C.muted, fontSize: 13 }}><Spinner size={14} color={C.brand} /> Loading…</div></Card>;
  }

  const rows = (form.allowances || []).filter((a) => (a.category || "earning") === category);

  const handleField = (name, patch) => {
    setForm((prev) => ({
      ...prev,
      allowances: prev.allowances.map((a) => (a.name === name ? { ...a, ...patch } : a)),
    }));
  };

  const commit = (a) => {
    updateAllowance(
      {
        name: a.name,
        data: {
          calculationType: a.calculationType || "flat",
          percentOfBasic: a.percentOfBasic,
          percentOfCTC: a.percentOfCTC,
          flatAmount: a.flatAmount,
          formula: a.formula,
          enabled: a.enabled,
          considerForEPF: a.considerForEPF,
          considerForESI: a.considerForESI,
          isFBP: a.isFBP,
        },
      },
      { onSuccess: () => notify(`"${a.name}" updated`, "success"), onError: (e) => notify(getErrorMessage(e), "error") }
    );
  };

  const handleDelete = (a) => {
    if (a.isBalancing) return;
    if (!window.confirm(`Remove component "${a.name}"?`)) return;
    removeAllowance(a.name, {
      onSuccess: () => notify("Component removed", "success"),
      onError: (e) => notify(getErrorMessage(e), "error"),
    });
  };

  const handleAdd = () => {
    if (!newComponent.name.trim()) return notify("Component name is required", "error");
    if (newComponent.calculationType === "formula" && !newComponent.formula.trim())
      return notify("Enter a formula, e.g. basic*0.1 + 500", "error");
    addAllowance(newComponent, {
      onSuccess: () => {
        notify("Component added", "success");
        setNewComponent(emptyComponentForm(category));
        setShowAdd(false);
      },
      onError: (e) => notify(getErrorMessage(e), "error"),
    });
  };

  const showEpfEsiCols = category === "earning";
  const showFbpCol = category === "reimbursement";

  return (
    <Card
      title="Salary Components"
      right={
        <PrimaryButton onClick={() => setShowAdd((v) => !v)} className="flex-1 sm:flex-none">
          {showAdd ? "Cancel" : "+ Add Component"}
        </PrimaryButton>
      }
    >
      <SubTabs items={COMPONENT_CATEGORIES} active={category} onChange={setCategory} />

      {category === "earning" && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-5 pb-5" style={{ borderBottom: `1px dashed ${C.border}` }}>
          <Field label="Basic" hint="Fixed; % of Gross — edit under Statutory Components">
            <div style={{ ...inputStyle, background: "#f7f3f1", color: C.muted }}>{form.basic?.percentOfGross ?? 0}% of Gross</div>
          </Field>
          <Field label="House Rent Allowance" hint="Fixed; % of Basic — edit under Statutory Components">
            <div style={{ ...inputStyle, background: "#f7f3f1", color: C.muted }}>
              {form.hra?.enabled ? `${form.hra?.percentOfBasic ?? 0}% of Basic` : "Disabled"}
            </div>
          </Field>
        </div>
      )}

      {showAdd && (
        <div className="mb-5 pb-5" style={{ borderBottom: `1px dashed ${C.border}` }}>
          <p style={{ fontSize: 12.5, fontWeight: 700, color: C.text, textTransform: "uppercase", letterSpacing: 0.4, marginBottom: 10 }}>
            New {COMPONENT_CATEGORIES.find((c) => c.key === category)?.label.replace(/s$/, "")} Component
          </p>
          <div className="flex items-end gap-3 flex-wrap">
            <Field label="Name">
              <TextInput value={newComponent.name} onChange={(e) => setNewComponent((p) => ({ ...p, name: e.target.value }))} placeholder="e.g. Special Allowance" style={{ maxWidth: 200 }} />
            </Field>
            <Field label="Calculation">
              <ComponentValueFields value={newComponent} onChange={setNewComponent} />
            </Field>
            {category === "reimbursement" && (
              <Field label="Flexible Benefit Plan">
                <div className="flex items-center gap-2">
                  <Toggle checked={!!newComponent.isFBP} onChange={(v) => setNewComponent((p) => ({ ...p, isFBP: v }))} />
                  <span style={{ fontSize: 12, color: C.muted }}>Mark as FBP</span>
                </div>
              </Field>
            )}
            <PrimaryButton onClick={handleAdd} loading={adding}>Add Component</PrimaryButton>
          </div>
          {newComponent.calculationType === "formula" && (
            <p style={{ fontSize: 11.5, color: C.muted, marginTop: 8 }}>
              Available variables: <code>basic</code>, <code>gross</code> (monthly gross), <code>ctc</code> (annual), <code>hra</code>. Example: <code>basic*0.1 + 500</code>
            </p>
          )}
        </div>
      )}

      <div className="overflow-x-auto overscroll-x-contain -mx-1">
        <table className="w-full" style={{ borderCollapse: "collapse", minWidth: 640 }}>
          <thead>
            <tr style={{ textAlign: "left", fontSize: 11.5, color: C.muted, textTransform: "uppercase", letterSpacing: 0.4 }}>
              <th style={{ padding: "6px 10px" }}>Name</th>
              <th style={{ padding: "6px 10px" }}>Calculation</th>
              {showEpfEsiCols && <th style={{ padding: "6px 10px" }}>Consider for EPF</th>}
              {showEpfEsiCols && <th style={{ padding: "6px 10px" }}>Consider for ESI</th>}
              {showFbpCol && <th style={{ padding: "6px 10px" }}>FBP</th>}
              <th style={{ padding: "6px 10px" }}>Status</th>
              <th style={{ padding: "6px 10px" }}></th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 && !showAdd && (
              <tr>
                <td colSpan={showEpfEsiCols || showFbpCol ? 6 : 4} style={{ padding: "14px 10px", fontSize: 13, color: C.muted }}>
                  No {COMPONENT_CATEGORIES.find((c) => c.key === category)?.label.toLowerCase()} configured yet.
                </td>
              </tr>
            )}
            {rows.map((a) => (
              <tr key={a.name} style={{ borderTop: `1px solid ${C.border}` }}>
                <td style={{ padding: "8px 10px", fontSize: 13, fontWeight: 600, color: C.text, verticalAlign: "top" }}>
                  <span className="break-words">{a.name}</span> {a.isBalancing && <Badge color={C.blue} bg={C.blueBg}>Balancing</Badge>}
                </td>
                <td style={{ padding: "8px 10px", verticalAlign: "top" }}>
                  <ComponentValueFields value={a} onChange={(patch) => handleField(a.name, patch)} disabled={false} />
                </td>
                {showEpfEsiCols && (
                  <td style={{ padding: "8px 10px", verticalAlign: "top" }}>
                    <Toggle checked={a.considerForEPF !== false} onChange={(v) => handleField(a.name, { considerForEPF: v })} />
                  </td>
                )}
                {showEpfEsiCols && (
                  <td style={{ padding: "8px 10px", verticalAlign: "top" }}>
                    <Toggle checked={a.considerForESI !== false} onChange={(v) => handleField(a.name, { considerForESI: v })} />
                  </td>
                )}
                {showFbpCol && (
                  <td style={{ padding: "8px 10px", verticalAlign: "top" }}>
                    <Toggle checked={!!a.isFBP} onChange={(v) => handleField(a.name, { isFBP: v })} />
                  </td>
                )}
                <td style={{ padding: "8px 10px", verticalAlign: "top" }}>
                  <Toggle checked={!!a.enabled} onChange={(v) => handleField(a.name, { enabled: v })} disabled={a.isBalancing} />
                </td>
                <td style={{ padding: "8px 10px", whiteSpace: "nowrap", verticalAlign: "top" }}>
                  <GhostButton onClick={() => commit(a)} style={{ marginRight: 8 }}>Save</GhostButton>
                  {!a.isBalancing && (
                    <button onClick={() => handleDelete(a)} style={{ background: "none", border: "none", color: C.red, cursor: "pointer", fontSize: 12.5, fontWeight: 600 }}>
                      Remove
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {category === "earning" && (
        <p style={{ fontSize: 11.5, color: C.muted, marginTop: 12 }}>
          The "Balancing" earning absorbs whatever gross remains after Basic, HRA and every other earning — it always stays enabled.
        </p>
      )}
    </Card>
  );
}

// ---------- Claims & Declarations ----------

const CLAIMS_SUBTABS = [
  { key: "fbp", label: "Flexible Benefit Plan" },
  { key: "reimbursement", label: "Reimbursement Claims" },
  { key: "itd", label: "Income Tax Declaration" },
  { key: "poi", label: "Proof Of Investments" },
];

function ClaimsTab({ notify }) {
  const { data, isLoading } = useGetPayrollPolicy();
  const [sub, setSub] = useState("fbp");

  const fbpComponents = (data?.policy?.allowances || []).filter((a) => a.category === "reimbursement" && a.isFBP);

  return (
    <Card title="Claims and Declarations">
      <SubTabs items={CLAIMS_SUBTABS} active={sub} onChange={setSub} />

      {sub === "fbp" && (
        <>
          {isLoading ? (
            <div className="flex items-center gap-2" style={{ color: C.muted, fontSize: 13 }}><Spinner size={14} color={C.brand} /> Loading…</div>
          ) : fbpComponents.length === 0 ? (
            <div className="flex flex-col items-center text-center py-10 px-4">
              <p style={{ fontSize: 17, fontWeight: 700, color: C.text, marginBottom: 8 }}>No Active FBP component</p>
              <p style={{ fontSize: 13, color: C.muted, maxWidth: 480 }}>
                Your organisation does not have an active FBP component associated to an employee. Mark a reimbursement as FBP component under Settings &gt; Salary Components &gt; Reimbursements.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto overscroll-x-contain -mx-1">
              <table className="w-full" style={{ borderCollapse: "collapse", minWidth: 420 }}>
                <thead>
                  <tr style={{ textAlign: "left", fontSize: 11.5, color: C.muted, textTransform: "uppercase", letterSpacing: 0.4 }}>
                    <th style={{ padding: "6px 10px" }}>Name</th>
                    <th style={{ padding: "6px 10px" }}>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {fbpComponents.map((c) => (
                    <tr key={c.name} style={{ borderTop: `1px solid ${C.border}` }}>
                      <td style={{ padding: "8px 10px", fontSize: 13, fontWeight: 600, color: C.text }}>{c.name}</td>
                      <td style={{ padding: "8px 10px" }}>{c.enabled !== false ? <Badge color={C.green} bg={C.greenBg}>Active</Badge> : <Badge color={C.muted} bg="#f2ece9">Inactive</Badge>}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}

      {sub !== "fbp" && (
        <div className="flex flex-col items-center text-center py-10 px-4">
          <p style={{ fontSize: 17, fontWeight: 700, color: C.text, marginBottom: 8 }}>
            {CLAIMS_SUBTABS.find((s) => s.key === sub)?.label}
          </p>
          <p style={{ fontSize: 13, color: C.muted, maxWidth: 480 }}>
            This section isn't set up yet for this organisation.
          </p>
        </div>
      )}
    </Card>
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
  const { data: scheduleData } = useGetPaySchedule();
  const scheduleWorkingDays = scheduleData?.paySchedule?.noOfWorkingDays || 30;

  const [single, setSingle] = useState({
    employeeModel: "User", employee: "", month: now.getMonth() + 1, year: now.getFullYear(),
    calendarDays: String(daysInMonthClient(now.getMonth() + 1, now.getFullYear())),
    workingDays: String(scheduleWorkingDays),
    paidDays: "",
    bonus: "", incentive: "", overtime: "", reimbursement: "", otherEarnings: "", loan: "", advance: "", otherDeductions: "", remarks: "", force: false,
  });
  const [bulk, setBulk] = useState({ employeeModel: "User", month: now.getMonth() + 1, year: now.getFullYear(), force: false });
  const [singleResult, setSingleResult] = useState(null);
  const [bulkResult, setBulkResult] = useState(null);

  const people = directory.byModel[single.employeeModel] || [];

  const numOrUndef = (v) => (v === "" || v === null || v === undefined ? undefined : Number(v));

  // Keep Calendar/Working Days sensible defaults when month/year change,
  // unless the admin already typed something different in by hand.
  const handleMonthYear = (field, value) => {
    setSingle((p) => {
      const next = { ...p, [field]: value };
      const cd = daysInMonthClient(next.month, next.year);
      return { ...next, calendarDays: String(cd), workingDays: p.workingDays || String(scheduleWorkingDays) };
    });
  };

  const lopDaysPreview = (() => {
    const wd = Number(single.workingDays);
    const pd = Number(single.paidDays);
    if (!wd || single.paidDays === "" || Number.isNaN(pd)) return null;
    return Math.max(0, Math.round((wd - pd) * 100) / 100);
  })();

  const handleSingle = (e) => {
    e.preventDefault();
    if (!single.employee) return notify("Select an employee", "error");
    if (single.paidDays === "" || single.paidDays === null) return notify("Enter Paid Days for this month", "error");
    setSingleResult(null);
    generate(
      {
        employee: single.employee,
        employeeModel: single.employeeModel,
        month: Number(single.month),
        year: Number(single.year),
        paidDays: Number(single.paidDays),
        workingDays: numOrUndef(single.workingDays),
        calendarDays: numOrUndef(single.calendarDays),
        bonus: numOrUndef(single.bonus),
        incentive: numOrUndef(single.incentive),
        overtime: numOrUndef(single.overtime),
        reimbursement: numOrUndef(single.reimbursement),
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
      <Card title="Generate Payroll — Single Employee" subtitle="Requires a salary structure (set CTC first). Enter Paid Days by hand each month — no auto attendance pull, no email sent.">
        <form onSubmit={handleSingle}>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 items-end mb-5">
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
              <Select value={single.month} onChange={(e) => handleMonthYear("month", e.target.value)}>
                {MONTH_NAMES.map((m, i) => <option key={m} value={i + 1}>{m}</option>)}
              </Select>
            </Field>
            <Field label="Year">
              <TextInput type="number" value={single.year} onChange={(e) => handleMonthYear("year", e.target.value)} />
            </Field>
          </div>

          <p style={{ fontSize: 12.5, fontWeight: 700, color: C.text, textTransform: "uppercase", letterSpacing: 0.4, marginBottom: 10 }}>Attendance</p>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 items-end mb-5 pb-5" style={{ borderBottom: `1px dashed ${C.border}` }}>
            <Field label="Calendar Days" hint="Days in the month">
              <TextInput type="number" min={1} max={31} value={single.calendarDays} onChange={(e) => setSingle((p) => ({ ...p, calendarDays: e.target.value }))} />
            </Field>
            <Field label="Working Days" hint="From Pay Schedule">
              <TextInput type="number" min={1} max={31} value={single.workingDays} onChange={(e) => setSingle((p) => ({ ...p, workingDays: e.target.value }))} />
            </Field>
            <Field label="Paid Days" hint="Kitne din present — manual entry">
              <TextInput type="number" min={0} step="0.5" value={single.paidDays} onChange={(e) => setSingle((p) => ({ ...p, paidDays: e.target.value }))} placeholder="e.g. 27" required />
            </Field>
            <Field label="LOP Days" hint="Auto-calculated">
              <div style={{ ...inputStyle, background: "#f7f3f1", color: C.muted, display: "flex", alignItems: "center" }}>
                {lopDaysPreview === null ? "—" : lopDaysPreview}
              </div>
            </Field>
          </div>

          <p style={{ fontSize: 12.5, fontWeight: 700, color: C.text, textTransform: "uppercase", letterSpacing: 0.4, marginBottom: 10 }}>Earnings &amp; Deductions (this month only)</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 items-end">
            <Field label="Bonus (₹)"><TextInput type="number" min={0} value={single.bonus} onChange={(e) => setSingle((p) => ({ ...p, bonus: e.target.value }))} /></Field>
            <Field label="Incentive (₹)"><TextInput type="number" min={0} value={single.incentive} onChange={(e) => setSingle((p) => ({ ...p, incentive: e.target.value }))} /></Field>
            <Field label="Overtime (₹)"><TextInput type="number" min={0} value={single.overtime} onChange={(e) => setSingle((p) => ({ ...p, overtime: e.target.value }))} /></Field>
            <Field label="Reimbursement (₹)"><TextInput type="number" min={0} value={single.reimbursement} onChange={(e) => setSingle((p) => ({ ...p, reimbursement: e.target.value }))} /></Field>
            <Field label="Other Earnings (₹)"><TextInput type="number" min={0} value={single.otherEarnings} onChange={(e) => setSingle((p) => ({ ...p, otherEarnings: e.target.value }))} /></Field>
            <Field label="Loan EMI (₹)"><TextInput type="number" min={0} value={single.loan} onChange={(e) => setSingle((p) => ({ ...p, loan: e.target.value }))} /></Field>
            <Field label="Advance Deduction (₹)"><TextInput type="number" min={0} value={single.advance} onChange={(e) => setSingle((p) => ({ ...p, advance: e.target.value }))} /></Field>
            <Field label="Other Deduction (₹)"><TextInput type="number" min={0} value={single.otherDeductions} onChange={(e) => setSingle((p) => ({ ...p, otherDeductions: e.target.value }))} /></Field>
            <Field label="Remarks"><TextInput value={single.remarks} onChange={(e) => setSingle((p) => ({ ...p, remarks: e.target.value }))} /></Field>
          </div>

          <div className="flex items-center gap-2 flex-wrap mt-4">
            <input id="single-force" type="checkbox" checked={single.force} onChange={(e) => setSingle((p) => ({ ...p, force: e.target.checked }))} />
            <label htmlFor="single-force" style={{ fontSize: 12.5, color: C.muted }}>Force overwrite if approved/paid</label>
          </div>

          <PrimaryButton type="submit" loading={generating} className="mt-4">Generate Payroll</PrimaryButton>
        </form>

        {singleResult && (
          <div className="mt-4 pt-4" style={{ borderTop: `1px dashed ${C.border}` }}>
            <div className="flex flex-wrap gap-x-8 gap-y-2">
              <span style={{ fontSize: 13 }}><strong>Gross Earnings:</strong> {fmtINR(singleResult.earnings?.gross)}</span>
              <span style={{ fontSize: 13 }}><strong>Total Earnings:</strong> {fmtINR(singleResult.earnings?.totalEarnings)}</span>
              <span style={{ fontSize: 13 }}><strong>Total Deductions:</strong> {fmtINR(singleResult.deductions?.totalDeductions)}</span>
              <span style={{ fontSize: 13.5, fontWeight: 700, color: C.brandDark }}><strong>Net Pay:</strong> {fmtINR(singleResult.netSalary)}</span>
              {statusBadge(singleResult.status)}
            </div>
          </div>
        )}
      </Card>

      <Card title="Bulk Generate — Whole Organisation" subtitle="Generates payroll for every active employee (of the chosen type) who already has a salary structure, using their attendance summary for the month">
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


function PayslipRow({ label, value, bold }) {
  return (
    <>
      <span style={{ fontSize: bold ? 13 : 12.5, color: bold ? C.text : C.muted, fontWeight: bold ? 700 : 400 }} className="break-words">{label}</span>
      <span style={{ fontSize: bold ? 13 : 13, fontWeight: bold ? 700 : 400, textAlign: "right" }}>{value}</span>
    </>
  );
}

function PayslipSection({ title, children }) {
  return (
    <div className="mb-4 pt-3" style={{ borderTop: `1px dashed ${C.border}` }}>
      <p style={{ fontSize: 11, fontWeight: 700, color: C.muted, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 8 }}>{title}</p>
      <div className="grid grid-cols-2 gap-x-3 sm:gap-x-4 gap-y-1.5">{children}</div>
    </div>
  );
}

function PayslipModal({ payroll, directory, onClose }) {
  if (!payroll) return null;
  const snap = payroll.employeeSnapshot || {};
  const person = directory.byId.get(String(payroll.employee));
  const name = snap.name || person?.name || resolveName(directory, payroll.employee, payroll.employeeModel);
  const employeeId = snap.employeeId || person?.uid || "—";
  const department = snap.department || "—";
  const designation = snap.designation || "—";
  const att = payroll.attendance || {};

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

        {/* Employee details */}
        <div className="grid grid-cols-2 gap-x-3 sm:gap-x-4 gap-y-1.5 mb-3 pb-3" style={{ borderBottom: `1px dashed ${C.border}` }}>
          <PayslipRow label="Employee" value={<span className="break-words">{name}</span>} />
          <PayslipRow label="Employee ID" value={employeeId} />
          <PayslipRow label="Department" value={department} />
          <PayslipRow label="Designation" value={designation} />
          <PayslipRow label="Pay Period" value={<span className="flex items-center gap-2 justify-end flex-wrap">{MONTH_NAMES[payroll.month - 1]} {payroll.year} {statusBadge(payroll.status)}</span>} />
        </div>

        {/* Attendance */}
        <PayslipSection title="Attendance">
          <PayslipRow label="Calendar Days" value={att.calendarDays ?? att.daysInMonth ?? "—"} />
          <PayslipRow label="Working Days" value={att.workingDays ?? "—"} />
          <PayslipRow label="Paid Days" value={att.paidDays ?? "—"} />
          <PayslipRow label="LOP Days" value={att.lopDays ?? "—"} />
        </PayslipSection>

        {/* Earnings */}
        <PayslipSection title="Earnings">
          <PayslipRow label="Basic" value={fmtINR(payroll.breakup?.basic)} />
          <PayslipRow label="HRA" value={fmtINR(payroll.breakup?.hra)} />
          {(payroll.breakup?.allowances || []).map((a) => (
            <Fragment key={a.name}><PayslipRow label={a.name} value={fmtINR(a.amount)} /></Fragment>
          ))}
          <PayslipRow label="Bonus" value={fmtINR(payroll.earnings?.bonus)} />
          <PayslipRow label="Overtime" value={fmtINR(payroll.earnings?.overtime)} />
          <PayslipRow label="Reimbursement" value={fmtINR(payroll.earnings?.reimbursement)} />
          <div className="col-span-2 pt-1.5 mt-1" style={{ borderTop: `1px solid ${C.border}` }} />
          <PayslipRow label="GROSS EARNINGS" value={fmtINR(payroll.earnings?.totalEarnings)} bold />
        </PayslipSection>

        {/* Deductions */}
        <PayslipSection title="Deductions">
          <PayslipRow label="Employee PF" value={fmtINR(payroll.deductions?.pf)} />
          <PayslipRow label="ESI" value={fmtINR(payroll.deductions?.esi)} />
          <PayslipRow label="Professional Tax" value={fmtINR(payroll.deductions?.professionalTax)} />
          <PayslipRow label="TDS" value={fmtINR(payroll.deductions?.tds)} />
          <PayslipRow label="Loan EMI" value={fmtINR(payroll.deductions?.loan)} />
          <PayslipRow label="Other Deduction" value={fmtINR((payroll.deductions?.advance || 0) + (payroll.deductions?.other || 0))} />
          <div className="col-span-2 pt-1.5 mt-1" style={{ borderTop: `1px solid ${C.border}` }} />
          <PayslipRow label="TOTAL DEDUCTIONS" value={fmtINR(payroll.deductions?.totalDeductions)} bold />
        </PayslipSection>

        {/* Net pay */}
        <div className="flex items-center justify-between py-3 mb-1" style={{ borderTop: `2px solid ${C.border}`, borderBottom: `2px solid ${C.border}` }}>
          <span style={{ fontSize: 15, fontWeight: 700, color: C.text }}>NET PAY</span>
          <span style={{ fontSize: 17, fontWeight: 800, color: C.brandDark }}>{fmtINR(payroll.netSalary)}</span>
        </div>

        {/* Employer contributions */}
        <PayslipSection title="Employer Contributions">
          <PayslipRow label="Employer PF" value={fmtINR(payroll.employerContribution?.pf)} />
          <PayslipRow label="Employer ESI" value={fmtINR(payroll.employerContribution?.esi)} />
          <PayslipRow label="Gratuity" value={fmtINR(payroll.employerContribution?.gratuity)} />
        </PayslipSection>

        {att.manualEntry && (
          <p style={{ fontSize: 11, color: C.muted, marginTop: -4, marginBottom: 8 }}>Paid Days entered manually for this pay run.</p>
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

        {tab === "schedule" && <PayScheduleTab notify={notify} />}
        {tab === "statutory" && <StatutoryTab notify={notify} />}
        {tab === "components" && <ComponentsTab notify={notify} />}
        {tab === "claims" && <ClaimsTab notify={notify} />}
        {tab === "structures" && <StructuresTab notify={notify} directory={directory} />}
        {tab === "generate" && <GenerateTab notify={notify} directory={directory} />}
        {tab === "records" && <RecordsTab notify={notify} directory={directory} />}
      </div>
    </div>
  );
}