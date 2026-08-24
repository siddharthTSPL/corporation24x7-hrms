import { useState, useEffect, useMemo, Fragment } from "react";
import { FaFileExcel } from "react-icons/fa";
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
  useDeletePayroll,
  useBulkUpdatePayrollStatus,
  useBulkDeletePayroll,
} from "../../auth/server-state/payroll/payroll.hook";
import {
  useGetAllEmployee,
  useGetAllAdmins,
} from "../../auth/server-state/adminother/adminother.hook";
import { useAuth } from "../../auth/store/getmeauth/getmeauth";

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
  { key: "percentOfGross", label: "% of Gross" },
  { key: "formula", label: "Custom Formula" },
];

const MODEL_LABEL = { User: "Employee", Manager: "Manager", Admin: "Admin", SuperAdmin: "Super Admin (You)" };
const MODELS = ["User", "Manager", "Admin", "SuperAdmin"];
const DEPARTMENT_LABEL = {
  OPR: "Operations",
  BPO: "Business Process Outsourcing",
  ENG: "Engineering",
  HR: "Human Resources",
  MGMT: "Management",
};
function departmentLabel(code) {
  if (!code || code === "—") return code || "—";
  return DEPARTMENT_LABEL[code] || code;
}
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

function roundINR(n) {
  return Math.round(Number(n) || 0);
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
  const { data: auth } = useAuth();

  const isSuperAdmin = auth?.role === "superadmin";
  const me = auth?.data?.superAdmin;

  return useMemo(() => {
    const users = (empData?.users || []).map((e) => ({
      _id: e._id,
      name: `${e.f_name || ""} ${e.l_name || ""}`.trim() || e.empid || e.uid,
      uid: e.uid,
      empid: e.empid || e.uid,
      model: e.type === "manager" ? "Manager" : "User",
    }));
    const admins = (adminData?.admins || []).map((a) => ({
      _id: a._id,
      name: `${a.f_name || ""} ${a.l_name || ""}`.trim() || a.empid || a.uid,
      uid: a.uid,
      empid: a.empid || a.uid,
      model: "Admin",
    }));
    // A SuperAdmin has no roster to fetch — it's a single person, the org
    // owner. Only a logged-in SuperAdmin sees themself here so they can
    // build their own salary structure/payroll, same flow as everyone else.
    const superAdmins = isSuperAdmin && me?._id
      ? [{
          _id: me._id,
          name: `${me.f_name || ""} ${me.l_name || ""}`.trim() || "Super Admin",
          uid: "OWNER",
          empid: "OWNER",
          model: "SuperAdmin",
        }]
      : [];

    const all = [...users, ...admins, ...superAdmins];
    const byId = new Map(all.map((p) => [String(p._id), p]));
    const byModel = {
      User: all.filter((p) => p.model === "User"),
      Manager: all.filter((p) => p.model === "Manager"),
      Admin: all.filter((p) => p.model === "Admin"),
      SuperAdmin: superAdmins,
    };
    // Admins/Managers/Employees never see "Super Admin" as a selectable
    // employee type — only the SuperAdmin themself can build their own payroll.
    const visibleModels = isSuperAdmin ? MODELS : MODELS.filter((m) => m !== "SuperAdmin");

    return { byId, byModel, visibleModels, loading: empLoading || adminLoading };
  }, [empData, adminData, isSuperAdmin, me]);
}

function resolveName(directory, id, fallbackModel) {
  const person = directory.byId.get(String(id));
  if (person) return `${person.name} (${person.empid})`;
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
  );
}



function emptyComponentForm(category) {
  return {
    name: "", category, calculationType: "flat",
    percentOfGross: 0, flatAmount: 0, formula: "",
    considerForEPF: true, considerForESI: true, isFBP: false,
  };
}

function ComponentValueFields({ value, onChange, disabled, onUnlock }) {

  if (value.isBalancing) {
    return (
      <div className="flex items-center gap-2 flex-wrap">
        <span style={{ fontSize: 12.5, color: "#b0948a", fontStyle: "italic" }}>Auto — fills remaining gross</span>
        {onUnlock && (
          <button
            onClick={onUnlock}
            style={{ background: "none", border: "none", color: "#378ADD", cursor: "pointer", fontSize: 12, fontWeight: 600, padding: 0 }}
          >
            Make it a normal allowance
          </button>
        )}
      </div>
    );
  }
  return (
    <div className="flex items-center gap-3 flex-wrap">
      <Select value={value.calculationType} onChange={(e) => onChange({ ...value, calculationType: e.target.value })} disabled={disabled} style={{ maxWidth: 160 }}>
        {CALC_TYPES.map((c) => <option key={c.key} value={c.key}>{c.label}</option>)}
      </Select>
      {value.calculationType === "flat" && (
        <TextInput type="number" min={0} disabled={disabled} value={value.flatAmount ?? 0} onChange={(e) => onChange({ ...value, flatAmount: Number(e.target.value) })} placeholder="₹ / month" style={{ maxWidth: 130 }} />
      )}
      {value.calculationType === "percentOfGross" && (
        <TextInput type="number" min={0} max={100} disabled={disabled} value={value.percentOfGross ?? 0} onChange={(e) => onChange({ ...value, percentOfGross: Number(e.target.value) })} placeholder="% of Gross" style={{ maxWidth: 130 }} />
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
  const { mutate: savePolicy, isPending: savingRules } = useSetPayrollPolicy();

  const [form, setForm] = useState(null);
  const [category, setCategory] = useState("earning");
  const [showAdd, setShowAdd] = useState(false);
  const [newComponent, setNewComponent] = useState(emptyComponentForm("earning"));

  useEffect(() => {
    if (data?.policy) {
      const policy = JSON.parse(JSON.stringify(data.policy));

      policy.allowances = (policy.allowances || []).map((a) => ({ ...a, _key: a.name }));
      setForm(policy);
    }
  }, [data]);

  useEffect(() => {
    setShowAdd(false);
    setNewComponent(emptyComponentForm(category));
  }, [category]);

  if (isLoading || !form) {
    return <Card title="Salary Components"><div className="flex items-center gap-2" style={{ color: C.muted, fontSize: 13 }}><Spinner size={14} color={C.brand} /> Loading…</div></Card>;
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

  const handleSaveRules = () => {
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
        onSuccess: () => notify("Salary Structure Rules updated", "success"),
        onError: (e) => notify(getErrorMessage(e), "error"),
      }
    );
  };


  const rows = (form.allowances || []).filter((a) => (a.category || "earning") === category);

  const handleField = (key, patch) => {
    setForm((prev) => ({
      ...prev,
      allowances: prev.allowances.map((a) => (a._key === key ? { ...a, ...patch } : a)),
    }));
  };

  const commit = (a) => {
    const renamed = a.name !== a._key;
    if (renamed && !a.name.trim()) return notify("Component name can't be empty", "error");
    updateAllowance(
      {
        name: a._key,
        data: {
          calculationType: a.calculationType || "flat",
          percentOfBasic: a.percentOfBasic,
          percentOfCTC: a.percentOfCTC,
          percentOfGross: a.percentOfGross,
          flatAmount: a.flatAmount,
          formula: a.formula,
          enabled: a.enabled,
          considerForEPF: a.considerForEPF,
          considerForESI: a.considerForESI,
          isFBP: a.isFBP,
          ...(renamed ? { newName: a.name } : {}),
        },
      },
      {
        onSuccess: () => {
          notify(`"${a.name}" updated`, "success");
          if (renamed) setForm((prev) => ({ ...prev, allowances: prev.allowances.map((x) => (x._key === a._key ? { ...x, _key: a.name } : x)) }));
        },
        onError: (e) => notify(getErrorMessage(e), "error"),
      }
    );
  };


  const handleUnlock = (a) => {
    updateAllowance(
      { name: a._key, data: { isBalancing: false } },
      {
        onSuccess: () => {
          notify(`"${a.name}" is now a normal, editable allowance`, "success");
          setForm((prev) => ({ ...prev, allowances: prev.allowances.map((x) => (x._key === a._key ? { ...x, isBalancing: false } : x)) }));
        },
        onError: (e) => notify(getErrorMessage(e), "error"),
      }
    );
  };

  const handleDelete = (a) => {
    if (a.isBalancing) return;
    if (!window.confirm(`Remove component "${a.name}"?`)) return;
    removeAllowance(a._key, {
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
        <div className="mb-5 pb-5" style={{ borderBottom: `1px dashed ${C.border}` }}>
          <div className="flex items-center justify-between gap-3 flex-wrap mb-3">
            <p style={{ fontSize: 12.5, fontWeight: 700, color: C.text, textTransform: "uppercase", letterSpacing: 0.4, margin: 0 }}>Salary Structure Rules</p>
            <PrimaryButton onClick={handleSaveRules} loading={savingRules}>Save</PrimaryButton>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
        </div>
      )}

      {showAdd && (
        <div className="mb-5 pb-5" style={{ borderBottom: `1px dashed ${C.border}` }}>
          <p style={{ fontSize: 12.5, fontWeight: 700, color: C.text, textTransform: "uppercase", letterSpacing: 0.4, marginBottom: 10 }}>
            New {COMPONENT_CATEGORIES.find((c) => c.key === category)?.label.replace(/s$/, "")} Component
          </p>
          <div className="flex items-end gap-3 flex-wrap">
            <Field label="Name" hint="e.g. add Conveyance first, then Fixed Conveyance">
              <TextInput value={newComponent.name} onChange={(e) => setNewComponent((p) => ({ ...p, name: e.target.value }))} placeholder="e.g. Conveyance" style={{ maxWidth: 200 }} />
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
              <tr key={a._key} style={{ borderTop: `1px solid ${C.border}` }}>
                <td style={{ padding: "8px 10px", verticalAlign: "top" }}>
                  <div className="flex items-center gap-2 flex-wrap">
                    <TextInput
                      value={a.name}
                      onChange={(e) => handleField(a._key, { name: e.target.value })}
                      style={{ maxWidth: 160, fontWeight: 600 }}
                    />
                    {a.isBalancing && <Badge color={C.blue} bg={C.blueBg}>Locked</Badge>}
                  </div>
                </td>
                <td style={{ padding: "8px 10px", verticalAlign: "top" }}>
                  <ComponentValueFields value={a} onChange={(patch) => handleField(a._key, patch)} disabled={false} onUnlock={a.isBalancing ? () => handleUnlock(a) : undefined} />
                </td>
                {showEpfEsiCols && (
                  <td style={{ padding: "8px 10px", verticalAlign: "top" }}>
                    <Toggle checked={a.considerForEPF !== false} onChange={(v) => handleField(a._key, { considerForEPF: v })} />
                  </td>
                )}
                {showEpfEsiCols && (
                  <td style={{ padding: "8px 10px", verticalAlign: "top" }}>
                    <Toggle checked={a.considerForESI !== false} onChange={(v) => handleField(a._key, { considerForESI: v })} />
                  </td>
                )}
                {showFbpCol && (
                  <td style={{ padding: "8px 10px", verticalAlign: "top" }}>
                    <Toggle checked={!!a.isFBP} onChange={(v) => handleField(a._key, { isFBP: v })} />
                  </td>
                )}
                <td style={{ padding: "8px 10px", verticalAlign: "top" }}>
                  <Toggle checked={!!a.enabled} onChange={(v) => handleField(a._key, { enabled: v })} disabled={a.isBalancing} />
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
          Every earning here — including "Fixed Allowance" — can be flat, % of Gross/Basic/CTC, or a custom formula (e.g.{" "}
          <code>basic*0.1 + 500</code>), and it's actually used when payroll runs. Any part of the gross nothing accounts for
          shows up automatically as "Other Allowance". A <Badge color={C.blue} bg={C.blueBg}>Locked</Badge> row is a legacy
          auto-balancing component — click "Make it a normal allowance" to free it up.
        </p>
      )}
    </Card>
  );
}



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

  const [form, setForm] = useState({ employeeModel: "User", employee: "", ctc: "", effectiveFrom: "" });

  const people = directory.byModel[form.employeeModel] || [];

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!form.employee || !form.ctc) return notify("Select an employee and enter a CTC", "error");
    setCTC(
      {
        employee: form.employee,
        employeeModel: form.employeeModel,
        ctc: Number(form.ctc),
        effectiveFrom: form.effectiveFrom || undefined,
      },
      {
        onSuccess: (res) => {
          notify(res?.message || "Salary structure saved", "success");
          setForm({ employeeModel: form.employeeModel, employee: "", ctc: "", effectiveFrom: "" });
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
              {directory.visibleModels.map((m) => <option key={m} value={m}>{MODEL_LABEL[m]}</option>)}
            </Select>
          </Field>
          <Field label="Employee">
            <Select value={form.employee} onChange={(e) => setForm((p) => ({ ...p, employee: e.target.value }))} disabled={directory.loading}>
              <option value="">{directory.loading ? "Loading…" : "Select employee"}</option>
              {people.map((p) => <option key={p._id} value={p._id}>{p.name} ({p.empid})</option>)}
            </Select>
          </Field>
          <Field label="Fixed Annual CTC (₹)">
            <TextInput type="number" min={1} value={form.ctc} onChange={(e) => setForm((p) => ({ ...p, ctc: e.target.value }))} placeholder="e.g. 600000" />
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
            {directory.visibleModels.map((m) => <option key={m} value={m}>{MODEL_LABEL[m]}</option>)}
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
                {directory.visibleModels.map((m) => <option key={m} value={m}>{MODEL_LABEL[m]}</option>)}
              </Select>
            </Field>
            <Field label="Employee">
              <Select value={single.employee} onChange={(e) => setSingle((p) => ({ ...p, employee: e.target.value }))}>
                <option value="">Select employee</option>
                {people.map((p) => <option key={p._id} value={p._id}>{p.name} ({p.empid})</option>)}
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
            <Field label="Paid Days" hint=" present — manual entry">
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
              {directory.visibleModels.map((m) => <option key={m} value={m}>{MODEL_LABEL[m]}</option>)}
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





function humanizeKey(key) {
  const spaced = String(key).replace(/([a-z0-9])([A-Z])/g, "$1 $2");
  return spaced.charAt(0).toUpperCase() + spaced.slice(1);
}




const EARNINGS_LABELS = { other: "Other Earnings" };
const DEDUCTIONS_LABELS = {
  pf: "Employee PF",
  esi: "ESI",
  professionalTax: "Professional Tax",
  tds: "TDS",
  lwf: "LWF",
  loan: "Loan EMI",
  advance: "Advance",
  other: "Other Deduction",
};
const EMPLOYER_LABELS = { pf: "Employer PF", esi: "Employer ESI", lwf: "Employer LWF", statutoryBonus: "Statutory Bonus" };





const EARNINGS_EXCLUDE = ["gross", "benefits", "reimbursementComponents", "totalEarnings"];
const DEDUCTIONS_EXCLUDE = ["lossOfPay", "components", "totalDeductions"];







function dynamicRows(obj, excludeKeys, labelOverrides) {
  return Object.entries(obj || {})
    .filter(([key, value]) => !excludeKeys.includes(key) && typeof value === "number" && value !== 0)
    .map(([key, value]) => ({ label: labelOverrides[key] || humanizeKey(key), amount: value }));
}




function getPayslipLineItems(payroll) {
  const breakup = payroll.breakup || {};

  const earnings = [
    { label: "Basic", amount: breakup.basic || 0 },
    { label: "HRA", amount: breakup.hra || 0 },
    ...(breakup.allowances || []).map((a) => ({ label: a.name, amount: a.amount })),
    ...dynamicRows(payroll.earnings, EARNINGS_EXCLUDE, EARNINGS_LABELS),
    ...(breakup.benefitComponents || []).map((c) => ({ label: c.name, amount: c.amount })),
    ...(breakup.reimbursementComponents || []).map((c) => ({ label: c.name, amount: c.amount })),
  ];

  const deductions = [
    ...dynamicRows(payroll.deductions, DEDUCTIONS_EXCLUDE, DEDUCTIONS_LABELS),
    ...(breakup.deductionComponents || []).map((c) => ({ label: c.name, amount: c.amount })),
  ];

  const employerContribution = dynamicRows(payroll.employerContribution, [], EMPLOYER_LABELS);

  return { earnings, deductions, employerContribution };
}





function downloadPayslip({ payroll, name, employeeId, department, designation, orgName }) {
  const att = payroll.attendance || {};
  const { earnings, deductions, employerContribution } = getPayslipLineItems(payroll);
  const rowsHtml = (items) => items.map((r) => `<tr><td>${r.label}</td><td class="amt">${fmtINR(r.amount)}</td></tr>`).join("");
  const period = `${MONTH_NAMES[payroll.month - 1]} ${payroll.year}`;

  const html = `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8" />
<title>${orgName ? orgName + " - " : ""}Payslip - ${name} - ${period}</title>
<style>
  * { box-sizing: border-box; }
  body { font-family: Arial, Helvetica, sans-serif; color: #2a1a16; padding: 32px; max-width: 640px; margin: 0 auto; }
  h1 { font-size: 18px; margin: 0 0 4px; }
  .org { font-size: 14px; font-weight: 700; color: #CD166E; margin: 0 0 2px; }
  .sub { color: #8a7a74; font-size: 12px; margin-bottom: 20px; }
  table { width: 100%; border-collapse: collapse; margin-bottom: 18px; }
  th { text-align: left; font-size: 10.5px; text-transform: uppercase; letter-spacing: 0.4px; color: #8a7a74; padding: 4px 0; border-bottom: 1px solid #ede5e0; }
  td { font-size: 13px; padding: 5px 0; border-bottom: 1px solid #f3ede9; }
  td.amt, th.amt { text-align: right; }
  .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 4px 16px; margin-bottom: 20px; font-size: 13px; }
  .grid .lbl { color: #8a7a74; }
  .total-row td { font-weight: 700; border-top: 2px solid #2a1a16; border-bottom: none; }
  .net { display: flex; justify-content: space-between; align-items: center; padding: 14px 0; border-top: 2px solid #2a1a16; border-bottom: 2px solid #2a1a16; margin: 18px 0; }
  .net .lbl { font-size: 14px; font-weight: 700; }
  .net .val { font-size: 18px; font-weight: 800; }
  @media print { body { padding: 0; } }
</style>
</head>
<body>
  ${orgName ? `<p class="org">${orgName}</p>` : ""}
  <h1>Payslip</h1>
  <div class="sub">Pay Period: ${period}${payroll.status ? " · " + payroll.status.toUpperCase().replace("_", " ") : ""}</div>

  <div class="grid">
    <div><span class="lbl">Employee: </span>${name}</div>
    <div><span class="lbl">Employee ID: </span>${employeeId}</div>
    <div><span class="lbl">Department: </span>${departmentLabel(department)}</div>
    <div><span class="lbl">Designation: </span>${designation}</div>
    <div><span class="lbl">Paid Days: </span>${att.paidDays ?? "—"} / ${att.workingDays ?? "—"}</div>
    <div><span class="lbl">LOP Days: </span>${att.lopDays ?? "—"}</div>
  </div>

  <table>
    <thead><tr><th>Earnings</th><th class="amt">Amount</th></tr></thead>
    <tbody>
      ${rowsHtml(earnings)}
      <tr class="total-row"><td>GROSS EARNINGS</td><td class="amt">${fmtINR(payroll.earnings?.totalEarnings)}</td></tr>
    </tbody>
  </table>

  <table>
    <thead><tr><th>Deductions</th><th class="amt">Amount</th></tr></thead>
    <tbody>
      ${rowsHtml(deductions)}
      <tr class="total-row"><td>TOTAL DEDUCTIONS</td><td class="amt">${fmtINR(payroll.deductions?.totalDeductions)}</td></tr>
    </tbody>
  </table>

  <div class="net">
    <span class="lbl">NET PAY</span>
    <span class="val">${fmtINR(payroll.netSalary)}</span>
  </div>

  <script>window.onload = function() { window.print(); };</script>
</body>
</html>`;


  const blob = new Blob([html], { type: "text/html" });
  const url = URL.createObjectURL(blob);
  const win = window.open(url, "_blank");

  if (!win) {

    const link = document.createElement("a");
    link.href = url;
    link.download = `Payslip - ${name} - ${period}.html`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }


  setTimeout(() => URL.revokeObjectURL(url), 60000);
}

function PayslipModal({ payroll, directory, onClose }) {
  if (!payroll) return null;
  const orgName = payroll.organisationSnapshot?.name || "";
  const snap = payroll.employeeSnapshot || {};
  const person = directory.byId.get(String(payroll.employee));
  const name = snap.name || person?.name || resolveName(directory, payroll.employee, payroll.employeeModel);
  const employeeId = snap.employeeId || person?.empid || "—";
  const department = snap.department || "—";
  const designation = snap.designation || "—";
  const att = payroll.attendance || {};
  const { earnings, deductions, employerContribution } = getPayslipLineItems(payroll);

  return (
    <div className="fixed inset-0 z-[998] flex items-center justify-center p-3 sm:p-4 overscroll-contain" style={{ background: "rgba(0,0,0,0.45)" }} onClick={onClose}>
      <div
        onClick={(e) => e.stopPropagation()}
        className="p-4 sm:p-[22px] overscroll-contain"
        style={{ background: "#fff", borderRadius: 14, maxWidth: 520, width: "100%", maxHeight: "88vh", overflowY: "auto" }}
      >
        <div className="flex items-center justify-between mb-3 gap-3">
          <div>
            {orgName && <p style={{ margin: "0 0 2px", fontSize: 13, fontWeight: 700, color: C.brand }}>{orgName}</p>}
            <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: C.text }}>Payslip</h3>
          </div>
          <div className="flex items-center gap-2">
            {payroll.status === "paid" && (
              <GhostButton onClick={() => downloadPayslip({ payroll, name, employeeId, department, designation, orgName })}>
                Download
              </GhostButton>
            )}
            <button onClick={onClose} style={{ background: "none", border: "none", fontSize: 20, cursor: "pointer", color: C.muted, flexShrink: 0 }}>×</button>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-x-3 sm:gap-x-4 gap-y-1.5 mb-3 pb-3" style={{ borderBottom: `1px dashed ${C.border}` }}>
          <PayslipRow label="Employee" value={<span className="break-words">{name}</span>} />
          <PayslipRow label="Employee ID" value={employeeId} />
          <PayslipRow label="Department" value={departmentLabel(department)} />
          <PayslipRow label="Designation" value={designation} />
          <PayslipRow label="Pay Period" value={<span className="flex items-center gap-2 justify-end flex-wrap">{MONTH_NAMES[payroll.month - 1]} {payroll.year} {statusBadge(payroll.status)}</span>} />
        </div>

        <PayslipSection title="Attendance">
          <PayslipRow label="Calendar Days" value={att.calendarDays ?? att.daysInMonth ?? "—"} />
          <PayslipRow label="Working Days" value={att.workingDays ?? "—"} />
          <PayslipRow label="Paid Days" value={att.paidDays ?? "—"} />
          <PayslipRow label="LOP Days" value={att.lopDays ?? "—"} />
        </PayslipSection>

        <PayslipSection title="Earnings">
          {earnings.map((r, i) => (
            <Fragment key={`e-${i}-${r.label}`}><PayslipRow label={r.label} value={fmtINR(r.amount)} /></Fragment>
          ))}
          <div className="col-span-2 pt-1.5 mt-1" style={{ borderTop: `1px solid ${C.border}` }} />
          <PayslipRow label="GROSS EARNINGS" value={fmtINR(payroll.earnings?.totalEarnings)} bold />
        </PayslipSection>

        <PayslipSection title="Deductions">
          {deductions.map((r, i) => (
            <Fragment key={`d-${i}-${r.label}`}><PayslipRow label={r.label} value={fmtINR(r.amount)} /></Fragment>
          ))}
          <div className="col-span-2 pt-1.5 mt-1" style={{ borderTop: `1px solid ${C.border}` }} />
          <PayslipRow label="TOTAL DEDUCTIONS" value={fmtINR(payroll.deductions?.totalDeductions)} bold />
        </PayslipSection>

        <div className="flex items-center justify-between py-3 mb-1" style={{ borderTop: `2px solid ${C.border}`, borderBottom: `2px solid ${C.border}` }}>
          <span style={{ fontSize: 15, fontWeight: 700, color: C.text }}>NET PAY</span>
          <span style={{ fontSize: 17, fontWeight: 800, color: C.brandDark }}>{fmtINR(payroll.netSalary)}</span>
        </div>

        <PayslipSection title="Employer Contributions">
          {employerContribution.map((r, i) => (
            <Fragment key={`ec-${i}-${r.label}`}><PayslipRow label={r.label} value={fmtINR(r.amount)} /></Fragment>
          ))}
          {employerContribution.length === 0 && (
            <span style={{ fontSize: 12.5, color: C.muted, gridColumn: "1 / -1" }}>No employer contributions for this pay run.</span>
          )}
        </PayslipSection>

        {att.manualEntry && (
          <p style={{ fontSize: 11, color: C.muted, marginTop: -4, marginBottom: 8 }}>Paid Days entered manually for this pay run.</p>
        )}
        {payroll.remarks && <p style={{ fontSize: 12, color: C.muted, marginTop: 6 }} className="break-words">Remarks: {payroll.remarks}</p>}
      </div>
    </div>
  );
}

function ConfirmDialog({ open, title, message, confirmLabel = "Delete", onConfirm, onCancel }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[999] flex items-center justify-center p-3 sm:p-4" style={{ background: "rgba(0,0,0,0.45)" }} onClick={onCancel}>
      <div
        onClick={(e) => e.stopPropagation()}
        className="p-5 sm:p-6"
        style={{ background: "#fff", borderRadius: 16, maxWidth: 380, width: "100%", textAlign: "center" }}
      >
        <div
          style={{
            width: 48, height: 48, borderRadius: "50%", margin: "0 auto 14px",
            background: C.redBg, display: "flex", alignItems: "center", justifyContent: "center",
          }}
        >
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
            <path d="M4 7h16M9 7V4h6v3m1 0l-.8 12.4A2 2 0 0114.2 21H9.8a2 2 0 01-2-1.6L7 7" stroke={C.red} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>
        <h3 style={{ margin: "0 0 6px", fontSize: 16, fontWeight: 700, color: C.text }}>{title}</h3>
        <p style={{ margin: "0 0 20px", fontSize: 13, color: C.muted, lineHeight: 1.5 }}>{message}</p>
        <div className="flex gap-2.5">
          <button
            onClick={onCancel}
            style={{
              flex: 1, padding: "10px 14px", borderRadius: 10, border: `1px solid ${C.border}`,
              background: "#fff", color: C.text, fontSize: 13.5, fontWeight: 700, cursor: "pointer", fontFamily: "inherit",
            }}
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            style={{
              flex: 1, padding: "10px 14px", borderRadius: 10, border: "none",
              background: C.red, color: "#fff", fontSize: 13.5, fontWeight: 700, cursor: "pointer", fontFamily: "inherit",
            }}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}


function getPaidAndBalance(p) {
  const total = roundINR(p.netSalary);
  const paid = p.status === "paid" ? total : 0;
  const balance = total - paid;
  return { total, paid, balance };
}

function isBulkSelectable(status) {
  return Boolean(BULK_ACTIONS[status]);
}

// FIX: "approved" now also allows the "hold" bulk action, so selecting
// approved rows shows "Hold All" — putting them into on_hold, from where
// "Resume All" (approve) already worked correctly.
const BULK_ACTIONS = {
  generated: ["approve", "hold", "delete"],
  on_hold: ["approve", "delete"],
  approved: ["hold", "delete"],
};

function buildPayrollExportRows(payrolls, directory) {
  const perRecord = payrolls.map((p) => {
    const { earnings, deductions, employerContribution } = getPayslipLineItems(p);
    const { total, paid, balance } = getPaidAndBalance(p);
    const snap = p.employeeSnapshot || {};
    const person = directory.byId.get(String(p.employee));
    return {
      p,
      name: snap.name || person?.name || resolveName(directory, p.employee, p.employeeModel),
      employeeId: snap.employeeId || person?.empid || "—",
      department: departmentLabel(snap.department || person?.department || "—"),
      designation: snap.designation || person?.designation || "—",
      earnMap: Object.fromEntries(earnings.map((e) => [e.label, roundINR(e.amount)])),
      dedMap: Object.fromEntries(deductions.map((d) => [d.label, roundINR(d.amount)])),
      empMap: Object.fromEntries(employerContribution.map((c) => [c.label, roundINR(c.amount)])),
      earnings, deductions, employerContribution,
      total, paid, balance,
    };
  });

  const earningKeys = [...new Set(perRecord.flatMap((r) => r.earnings.map((e) => e.label)))];
  const deductionKeys = [...new Set(perRecord.flatMap((r) => r.deductions.map((d) => d.label)))];
  const employerKeys = [...new Set(perRecord.flatMap((r) => r.employerContribution.map((c) => c.label)))];

  const header = [
    "Employee", "Employee ID", "Department", "Designation", "Month", "Year", "Status",
    ...earningKeys.map((k) => `Earning: ${k}`),
    "Gross Earnings",
    ...deductionKeys.map((k) => `Deduction: ${k}`),
    "Total Deductions",
    ...employerKeys.map((k) => `Employer: ${k}`),
    "Total", "Paid", "Balance",
  ];

  const rows = perRecord.map((r) => [
    r.name, r.employeeId, r.department, r.designation,
    MONTH_NAMES[r.p.month - 1], r.p.year, r.p.status,
    ...earningKeys.map((k) => r.earnMap[k] ?? ""),
    roundINR(r.p.earnings?.totalEarnings),
    ...deductionKeys.map((k) => r.dedMap[k] ?? ""),
    roundINR(r.p.deductions?.totalDeductions),
    ...employerKeys.map((k) => r.empMap[k] ?? ""),
    r.total, r.paid, r.balance,
  ]);

  const sumOf = (fn) => perRecord.reduce((s, r) => s + (Number(fn(r)) || 0), 0);
  const totalsRow = [
    "TOTAL", "", "", "", "", "", "",
    ...earningKeys.map((k) => sumOf((r) => r.earnMap[k])),
    sumOf((r) => roundINR(r.p.earnings?.totalEarnings)),
    ...deductionKeys.map((k) => sumOf((r) => r.dedMap[k])),
    sumOf((r) => roundINR(r.p.deductions?.totalDeductions)),
    ...employerKeys.map((k) => sumOf((r) => r.empMap[k])),
    sumOf((r) => r.total), sumOf((r) => r.paid), sumOf((r) => r.balance),
  ];

  return [header, ...rows, totalsRow];
}

function csvEscape(val) {
  const s = String(val ?? "");
  if (/[",\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

function exportPayrollCSV(payrolls, directory) {
  const table = buildPayrollExportRows(payrolls, directory);
  const csv = table.map((row) => row.map(csvEscape).join(",")).join("\r\n");

  const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `Payroll Sheet - ${new Date().toISOString().slice(0, 10)}.csv`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  setTimeout(() => URL.revokeObjectURL(url), 60000);
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
  const { mutate: removePayroll } = useDeletePayroll();
  const { mutate: bulkUpdateStatus, isPending: bulkStatusPending } = useBulkUpdatePayrollStatus();
  const { mutate: bulkDelete, isPending: bulkDeletePending } = useBulkDeletePayroll();
  const [selected, setSelected] = useState(null);
  const [confirmTarget, setConfirmTarget] = useState(null);
  const [selectedIds, setSelectedIds] = useState(() => new Set());
  const [bulkDeleteOpen, setBulkDeleteOpen] = useState(false);

  const payrolls = data?.payrolls || [];

  const selectableIds = useMemo(
    () => payrolls.filter((p) => isBulkSelectable(p.status)).map((p) => p._id),
    [payrolls]
  );

  useEffect(() => {
    setSelectedIds(new Set());
  }, [filters.month, filters.year, filters.employeeModel, filters.status]);

  useEffect(() => {
    setSelectedIds((prev) => {
      const allowed = new Set(selectableIds);
      const next = new Set([...prev].filter((id) => allowed.has(id)));
      return next.size === prev.size ? prev : next;
    });
  }, [selectableIds]);

  const allSelected = selectableIds.length > 0 && selectableIds.every((id) => selectedIds.has(id));
  const someSelected = selectedIds.size > 0 && !allSelected;

  const selectedStatuses = [...selectedIds]
    .map((id) => payrolls.find((row) => row._id === id)?.status)
    .filter(Boolean);
  const isPureOnHold = selectedStatuses.length > 0 && selectedStatuses.every((s) => s === "on_hold");
  const selectedActions = selectedStatuses.length === 0
    ? []
    : selectedStatuses.reduce((common, status, idx) => {
        const actions = BULK_ACTIONS[status] || [];
        return idx === 0 ? actions : common.filter((a) => actions.includes(a));
      }, []);

  const toggleSelectAll = () => {
    setSelectedIds(allSelected ? new Set() : new Set(selectableIds));
  };

  const toggleSelectOne = (id, status) => {
    if (!isBulkSelectable(status)) return;
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const summary = useMemo(() => {
    return payrolls.reduce(
      (acc, p) => {
        const { total, paid, balance } = getPaidAndBalance(p);
        acc.total += total;
        acc.paid += paid;
        acc.balance += balance;
        return acc;
      },
      { total: 0, paid: 0, balance: 0 }
    );
  }, [payrolls]);

  const handleStatus = (id, status) => {
    updateStatus(
      { id, status },
      {
        onSuccess: () => notify(`Marked as ${status.replace("_", " ")}`, "success"),
        onError: (err) => notify(getErrorMessage(err), "error"),
      }
    );
  };

  const handleDelete = (p) => {
    if (p.status !== "generated") return;
    setConfirmTarget(p);
  };

  const confirmDelete = () => {
    if (!confirmTarget) return;
    const id = confirmTarget._id;
    setConfirmTarget(null);
    removePayroll(id, {
      onSuccess: () => notify("Payroll record deleted", "success"),
      onError: (err) => notify(getErrorMessage(err), "error"),
    });
  };

  const handleBulkStatus = (status) => {
    const ids = [...selectedIds];
    if (ids.length === 0) return;
    bulkUpdateStatus(
      { ids, status },
      {
        onSuccess: (data) => {
          notify(`${data.modified} record${data.modified === 1 ? "" : "s"} marked as ${status.replace("_", " ")}`, "success");
          setSelectedIds(new Set());
        },
        onError: (err) => notify(getErrorMessage(err), "error"),
      }
    );
  };

  const confirmBulkDelete = () => {
    const ids = [...selectedIds];
    setBulkDeleteOpen(false);
    if (ids.length === 0) return;
    bulkDelete(ids, {
      onSuccess: (data) => {
        const skippedNote = data.skippedCount ? `, ${data.skippedCount} skipped` : "";
        notify(`${data.deletedCount} record${data.deletedCount === 1 ? "" : "s"} deleted${skippedNote}`, "success");
        setSelectedIds(new Set());
      },
      onError: (err) => notify(getErrorMessage(err), "error"),
    });
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
            {directory.visibleModels.map((m) => <option key={m} value={m}>{MODEL_LABEL[m]}</option>)}
          </Select>
          <Select value={filters.status} onChange={(e) => setFilters((p) => ({ ...p, status: e.target.value }))} style={{ maxWidth: 140 }}>
            <option value="">All Statuses</option>
            <option value="generated">Generated</option>
            <option value="approved">Approved</option>
            <option value="paid">Paid</option>
            <option value="on_hold">On Hold</option>
          </Select>
          <button
            className="flex items-center justify-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-2 rounded-xl border-2 text-xs sm:text-sm font-semibold transition-all w-full sm:w-auto sm:ml-auto"
            style={{ borderColor: "#085041", color: "#085041", background: "transparent", opacity: payrolls.length === 0 ? 0.5 : 1, cursor: payrolls.length === 0 ? "not-allowed" : "pointer" }}
            onMouseEnter={(e) => { if (payrolls.length === 0) return; e.currentTarget.style.background = "#085041"; e.currentTarget.style.color = "#fff"; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = "#085041"; }}
            onClick={() => exportPayrollCSV(payrolls, directory)}
            disabled={payrolls.length === 0}
          >
            <FaFileExcel size={12} /><span>Export CSV</span>
          </button>
        </div>
      }
    >
      {isLoading ? (
        <div className="flex items-center gap-2" style={{ color: C.muted, fontSize: 13 }}><Spinner size={14} color={C.brand} /> Loading…</div>
      ) : payrolls.length === 0 ? (
        <p style={{ color: C.muted, fontSize: 13 }}>No payroll records found for these filters.</p>
      ) : (
        <>
        <div className="flex gap-3 flex-wrap" style={{ marginBottom: 16 }}>
          <div style={{ flex: "1 1 160px", background: C.brandLight, borderRadius: 10, padding: "12px 14px" }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: C.muted, textTransform: "uppercase", letterSpacing: 0.4 }}>Total ({payrolls.length} record{payrolls.length === 1 ? "" : "s"})</div>
            <div style={{ fontSize: 18, fontWeight: 800, color: C.brandDark, marginTop: 2 }}>{fmtINR(summary.total)}</div>
          </div>
          <div style={{ flex: "1 1 160px", background: C.greenBg, borderRadius: 10, padding: "12px 14px" }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: C.muted, textTransform: "uppercase", letterSpacing: 0.4 }}>Paid</div>
            <div style={{ fontSize: 18, fontWeight: 800, color: C.green, marginTop: 2 }}>{fmtINR(summary.paid)}</div>
          </div>
          <div style={{ flex: "1 1 160px", background: summary.balance > 0 ? C.redBg : C.blueBg, borderRadius: 10, padding: "12px 14px" }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: C.muted, textTransform: "uppercase", letterSpacing: 0.4 }}>Balance</div>
            <div style={{ fontSize: 18, fontWeight: 800, color: summary.balance > 0 ? C.red : C.blue, marginTop: 2 }}>{fmtINR(summary.balance)}</div>
          </div>
        </div>
        {selectedIds.size > 0 && (
          <div
            className="flex items-center gap-2 flex-wrap"
            style={{ marginBottom: 14, padding: "10px 14px", borderRadius: 10, background: C.brandLight }}
          >
            <span style={{ fontSize: 13, fontWeight: 700, color: C.brandDark }}>
              {selectedIds.size} selected
            </span>
            {selectedActions.includes("approve") && (
              <GhostButton disabled={bulkStatusPending} onClick={() => handleBulkStatus("approved")}>
                {isPureOnHold ? "Resume All" : "Approve All"}
              </GhostButton>
            )}
            {selectedActions.includes("hold") && (
              <GhostButton disabled={bulkStatusPending} onClick={() => handleBulkStatus("on_hold")}>
                Hold All
              </GhostButton>
            )}
            {selectedActions.includes("delete") && (
              <GhostButton
                disabled={bulkDeletePending}
                onClick={() => setBulkDeleteOpen(true)}
                style={{ color: C.red, borderColor: C.red }}
              >
                Delete All
              </GhostButton>
            )}
            {selectedActions.length === 0 && (
              <span style={{ fontSize: 12.5, color: C.muted }}>
                No common bulk action for this mix of statuses
              </span>
            )}
            <button
              onClick={() => setSelectedIds(new Set())}
              style={{ marginLeft: "auto", fontSize: 12.5, color: C.muted, background: "transparent", border: "none", cursor: "pointer", textDecoration: "underline" }}
            >
              Clear selection
            </button>
          </div>
        )}
        <div className="overflow-x-auto overscroll-x-contain -mx-1">
          <table className="w-full" style={{ borderCollapse: "collapse", minWidth: 1060 }}>
            <thead>
              <tr style={{ textAlign: "left", fontSize: 11.5, color: C.muted, textTransform: "uppercase", letterSpacing: 0.4 }}>
                <th style={{ padding: "6px 10px" }}>
                  <input
                    type="checkbox"
                    checked={allSelected}
                    disabled={selectableIds.length === 0}
                    ref={(el) => { if (el) el.indeterminate = someSelected; }}
                    onChange={toggleSelectAll}
                  />
                </th>
                <th style={{ padding: "6px 10px" }}>Employee</th>
                <th style={{ padding: "6px 10px" }}>Period</th>
                <th style={{ padding: "6px 10px" }}>Total</th>
                <th style={{ padding: "6px 10px" }}>Paid</th>
                <th style={{ padding: "6px 10px" }}>Balance</th>
                <th style={{ padding: "6px 10px" }}>Status</th>
                <th style={{ padding: "6px 10px" }}></th>
              </tr>
            </thead>
            <tbody>
              {payrolls.map((p) => (
                <tr key={p._id} style={{ borderTop: `1px solid ${C.border}` }}>
                  <td style={{ padding: "8px 10px" }}>
                    <input
                      type="checkbox"
                      checked={selectedIds.has(p._id)}
                      disabled={!isBulkSelectable(p.status)}
                      title={!isBulkSelectable(p.status) ? "Paid records can't be bulk-selected" : ""}
                      onChange={() => toggleSelectOne(p._id, p.status)}
                    />
                  </td>
                  <td style={{ padding: "8px 10px", fontSize: 13, fontWeight: 600, color: C.text }}>{resolveName(directory, p.employee, p.employeeModel)}</td>
                  <td style={{ padding: "8px 10px", fontSize: 12.5, color: C.muted }}>{MONTH_NAMES[p.month - 1]} {p.year}</td>
                  {(() => {
                    const { total, paid, balance } = getPaidAndBalance(p);
                    return (
                      <>
                        <td style={{ padding: "8px 10px", fontSize: 13, fontWeight: 700, color: C.brandDark }}>{fmtINR(total)}</td>
                        <td style={{ padding: "8px 10px", fontSize: 13, fontWeight: 600, color: C.green }}>{fmtINR(paid)}</td>
                        <td style={{ padding: "8px 10px", fontSize: 13, fontWeight: 600, color: balance > 0 ? C.red : C.muted }}>{fmtINR(balance)}</td>
                      </>
                    );
                  })()}
                  <td style={{ padding: "8px 10px" }}>{statusBadge(p.status)}</td>
                  <td style={{ padding: "8px 10px", whiteSpace: "nowrap" }}>
                    <GhostButton onClick={() => setSelected(p)} style={{ marginRight: 8 }}>View Payslip</GhostButton>
                    {p.status === "paid" && (
                      <GhostButton
                        onClick={() => {
                          const snap = p.employeeSnapshot || {};
                          const person = directory.byId.get(String(p.employee));
                          downloadPayslip({
                            payroll: p,
                            name: snap.name || person?.name || resolveName(directory, p.employee, p.employeeModel),
                            employeeId: snap.employeeId || person?.empid || "—",
                            department: snap.department || "—",
                            designation: snap.designation || "—",
                            orgName: p.organisationSnapshot?.name || "",
                          });
                        }}
                        style={{ marginRight: 8 }}
                      >
                        Download
                      </GhostButton>
                    )}
                    {p.status === "generated" && <GhostButton onClick={() => handleStatus(p._id, "approved")} style={{ marginRight: 8 }}>Approve</GhostButton>}
                    {p.status === "approved" && <GhostButton onClick={() => handleStatus(p._id, "paid")} style={{ marginRight: 8 }}>Mark Paid</GhostButton>}
                    {p.status !== "on_hold" && p.status !== "paid" && <GhostButton onClick={() => handleStatus(p._id, "on_hold")} style={{ marginRight: 8 }}>Hold</GhostButton>}
                    {p.status === "on_hold" && <GhostButton onClick={() => handleStatus(p._id, "approved")} style={{ marginRight: 8 }}>Resume</GhostButton>}
                    {p.status === "generated" && (
                      <GhostButton onClick={() => handleDelete(p)} style={{ color: C.red, borderColor: C.red }}>
                        Delete
                      </GhostButton>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        </>
      )}

      <PayslipModal payroll={selected} directory={directory} onClose={() => setSelected(null)} />
      <ConfirmDialog
        open={Boolean(confirmTarget)}
        title="Delete this payroll record?"
        message={
          confirmTarget
            ? `This will permanently delete the ${MONTH_NAMES[confirmTarget.month - 1]} ${confirmTarget.year} payroll for ${resolveName(directory, confirmTarget.employee, confirmTarget.employeeModel)}. This cannot be undone.`
            : ""
        }
        onConfirm={confirmDelete}
        onCancel={() => setConfirmTarget(null)}
      />
      <ConfirmDialog
        open={bulkDeleteOpen}
        title={`Delete ${selectedIds.size} selected record${selectedIds.size === 1 ? "" : "s"}?`}
        message="This will permanently delete the selected payroll records. This cannot be undone."
        onConfirm={confirmBulkDelete}
        onCancel={() => setBulkDeleteOpen(false)}
      />
    </Card>
  );
}


const TAB_ICONS = {
  schedule: (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none"><rect x="3" y="5" width="18" height="16" rx="3" stroke="currentColor" strokeWidth="2"/><path d="M3 10h18M8 3v4M16 3v4" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>
  ),
  statutory: (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none"><path d="M12 3l8 4v5c0 5-3.5 8.5-8 9-4.5-.5-8-4-8-9V7l8-4z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round"/><path d="M9 12l2 2 4-4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
  ),
  components: (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none"><rect x="3" y="3" width="7" height="7" rx="1.5" stroke="currentColor" strokeWidth="2"/><rect x="14" y="3" width="7" height="7" rx="1.5" stroke="currentColor" strokeWidth="2"/><rect x="3" y="14" width="7" height="7" rx="1.5" stroke="currentColor" strokeWidth="2"/><rect x="14" y="14" width="7" height="7" rx="1.5" stroke="currentColor" strokeWidth="2"/></svg>
  ),
  claims: (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none"><path d="M7 3h8l4 4v14H7V3z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round"/><path d="M9 12h6M9 16h6" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>
  ),
  structures: (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none"><path d="M3 20V10M9 20V4M15 20v-7M21 20V8" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>
  ),
  generate: (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none"><path d="M12 2v4M12 18v4M4.9 4.9l2.8 2.8M16.3 16.3l2.8 2.8M2 12h4M18 12h4M4.9 19.1l2.8-2.8M16.3 7.7l2.8-2.8" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>
  ),
  records: (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none"><path d="M4 4h16v16H4V4z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round"/><path d="M8 9h8M8 13h8M8 17h5" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/></svg>
  ),
};

export default function Payroll() {
  const [tab, setTab] = useState(TABS[0].key);
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
        @keyframes payroll-fadeUp { from { opacity: 0; transform: translateY(6px); } to { opacity: 1; transform: translateY(0); } }
      `}</style>

      <Toast message={toast.message} type={toast.type} onClose={() => setToast({ message: "", type: "" })} />

      <div className="max-w-[1200px] mx-auto min-w-0">
        <div className="mb-6 flex items-center gap-3">
          <div
            style={{
              width: 42, height: 42, borderRadius: 12, flexShrink: 0,
              background: `linear-gradient(135deg, ${C.brand}, ${C.brandDark})`,
              display: "flex", alignItems: "center", justifyContent: "center",
              boxShadow: `0 6px 16px -6px ${C.brand}88`,
            }}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
              <path d="M12 1v22M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
          <div>
            <h1 className="text-lg sm:text-xl lg:text-[22px]" style={{ fontWeight: 800, margin: 0, color: C.text, letterSpacing: -0.3 }}>Payroll</h1>
            <p style={{ fontSize: 13, color: C.muted, marginTop: 2, marginBottom: 0 }}>Configure policy, manage salary structures, and generate payslips</p>
          </div>
        </div>

        <div
          className="flex gap-1.5 mb-6 flex-wrap overflow-x-auto"
          style={{
            background: C.surface, border: `1px solid ${C.border}`, borderRadius: 14,
            padding: 6, boxShadow: "0 1px 2px rgba(42,26,22,0.04)",
          }}
        >
          {TABS.map((t) => {
            const active = tab === t.key;
            return (
              <button
                key={t.key}
                onClick={() => setTab(t.key)}
                className="whitespace-nowrap flex items-center gap-1.5"
                style={{
                  padding: "9px 14px", border: "none", cursor: "pointer",
                  fontSize: 13, fontWeight: 700, fontFamily: "inherit",
                  borderRadius: 10,
                  color: active ? "#fff" : C.muted,
                  background: active ? `linear-gradient(135deg, ${C.brand}, ${C.brandDark})` : "transparent",
                  boxShadow: active ? `0 4px 12px -4px ${C.brand}99` : "none",
                  transition: "background .18s, color .18s, box-shadow .18s",
                }}
                onMouseEnter={(e) => { if (!active) e.currentTarget.style.background = C.brandLight; }}
                onMouseLeave={(e) => { if (!active) e.currentTarget.style.background = "transparent"; }}
              >
                <span style={{ display: "flex", opacity: active ? 1 : 0.7 }}>{TAB_ICONS[t.key]}</span>
                {t.label}
              </button>
            );
          })}
        </div>

        <div key={tab} style={{ animation: "payroll-fadeUp .22s ease" }}>
        {tab === "schedule" && <PayScheduleTab notify={notify} />}
        {tab === "statutory" && <StatutoryTab notify={notify} />}
        {tab === "components" && <ComponentsTab notify={notify} />}
        {tab === "claims" && <ClaimsTab notify={notify} />}
        {tab === "structures" && <StructuresTab notify={notify} directory={directory} />}
        {tab === "generate" && <GenerateTab notify={notify} directory={directory} />}
        {tab === "records" && <RecordsTab notify={notify} directory={directory} />}
        </div>
      </div>
    </div>
  );

}