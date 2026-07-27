import { useState, useEffect, useMemo } from "react";
import React from "react";
import { useUpdateProfile, useUpdatePassword, useGetMeUser } from "../../auth/server-state/employee/employeeauth/employeeauth.hook";
import { useQueryClient } from "@tanstack/react-query";
import { Country, State, City } from "country-state-city";

const DEFAULT_COUNTRY_ISO = "IN";
const ALL_COUNTRIES = Country.getAllCountries();

const AVATAR_STYLES = [
  "avataaars", "bottts", "personas", "lorelei",
  "micah", "open-peeps", "big-ears", "croodles",
];

const MARITAL_OPTIONS = ["single", "married", "divorced"];

const PHONE_REGEX = /^[0-9]{10}$/;
const IFSC_REGEX = /^[A-Z]{4}0[A-Z0-9]{6}$/;
const ACCOUNT_REGEX = /^[0-9]{9,18}$/;

// Shared between the sidebar (desktop/tablet-landscape) and the mobile
// <select> dropdown so the two navigation styles can never drift apart.
const SETTINGS_TABS = [
  { key: "profile", label: "Profile" },
  { key: "contact", label: "Contact info" },
  { key: "address", label: "Address" },
  { key: "identity", label: "Identity" },
  { key: "leave", label: "Leave Balance" },
  { key: "reviews", label: "Reviews" },
  { key: "password", label: "Password" },
  { key: "avatar", label: "Avatar" },
];

const C = {
  brand:      "#730042",
  brandLight: "rgba(115,0,66,0.08)",
  brandMid:   "rgba(115,0,66,0.15)",
  green:      "#1D9E75",
  greenBg:    "#e8f5e9",
  blue:       "#378ADD",
  blueBg:     "#e6f1fb",
  amber:      "#BA7517",
  amberBg:    "#faeeda",
  red:        "#E24B4A",
  redBg:      "#fcebeb",
  surface:    "#ffffff",
  page:       "#f9f8f2",
  border:     "#ede5e0",
  text:       "#2a1a16",
  muted:      "#b0948a",
  mutedMid:   "#c9bab5",
};

function getInitials(fName = "", lName = "") {
  return `${(fName[0] || "").toUpperCase()}${(lName[0] || "").toUpperCase()}`;
}

function getErrorMessage(err) {
  return err?.response?.data?.message || err?.message || "Something went wrong";
}

function toDateInputValue(date) {
  if (!date) return "";
  const d = new Date(date);
  if (isNaN(d.getTime())) return "";
  return d.toISOString().slice(0, 10);
}

function Badge({ children, color = C.brand, bg = C.brandLight }) {
  return (
    <span style={{
      display: "inline-flex", alignItems: "center",
      padding: "2px 10px", borderRadius: 20,
      fontSize: 11, fontWeight: 500,
      color, background: bg,
    }}>
      {children}
    </span>
  );
}

const locationLookupCache = new Map();

function findLocationByCityName(cityName) {
  if (!cityName) return null;
  if (locationLookupCache.has(cityName)) return locationLookupCache.get(cityName);

  let result = null;
  const countries = Country.getAllCountries();
  outer: for (const country of countries) {
    const states = State.getStatesOfCountry(country.isoCode);
    for (const state of states) {
      const cities = City.getCitiesOfState(country.isoCode, state.isoCode);
      if (cities.some(c => c.name === cityName)) {
        result = { countryIso: country.isoCode, stateIso: state.isoCode };
        break outer;
      }
    }
  }

  locationLookupCache.set(cityName, result);
  return result;
}

function Spinner({ size = 16, color = "#fff" }) {
  return (
    <div style={{
      width: size, height: size, borderRadius: "50%",
      border: `2px solid ${color}33`,
      borderTop: `2px solid ${color}`,
      animation: "spin 0.7s linear infinite",
      flexShrink: 0,
    }} />
  );
}

function Toast({ message, type, onClose }) {
  useEffect(() => {
    const t = setTimeout(onClose, 3200);
    return () => clearTimeout(t);
  }, [message]);

  if (!message) return null;

  const isSuccess = type === "success";
  return (
    <div
      className="st-toast"
      style={{
        background: isSuccess ? "#f0faf5" : "#fff5f5",
        border: `0.5px solid ${isSuccess ? "#a8dfc3" : "#f5c6c6"}`,
      }}
    >
      <div style={{
        width: 28, height: 28, borderRadius: "50%",
        background: isSuccess ? C.greenBg : C.redBg,
        display: "flex", alignItems: "center", justifyContent: "center",
        flexShrink: 0,
      }}>
        {isSuccess
          ? <svg width="14" height="14" viewBox="0 0 14 14"><polyline points="2,7 5.5,10.5 12,4" fill="none" stroke={C.green} strokeWidth="2" strokeLinecap="round"/></svg>
          : <svg width="14" height="14" viewBox="0 0 14 14"><line x1="3" y1="3" x2="11" y2="11" stroke={C.red} strokeWidth="2" strokeLinecap="round"/><line x1="11" y1="3" x2="3" y2="11" stroke={C.red} strokeWidth="2" strokeLinecap="round"/></svg>
        }
      </div>
      <span style={{ fontSize: 13, fontWeight: 500, color: isSuccess ? "#1a5c3a" : "#7a1a1a", flex: 1, minWidth: 0 }}>
        {message}
      </span>
      <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", color: C.muted, fontSize: 16, lineHeight: 1, padding: 0, flexShrink: 0 }}>×</button>
    </div>
  );
}

function SectionCard({ title, subtitle, accent = C.brand, children }) {
  return (
    <div className="st-section-card" style={{
      background: C.surface, borderRadius: 16,
      border: `0.5px solid ${C.border}`,
      overflow: "hidden", position: "relative",
      marginBottom: 16, minWidth: 0,
    }}>
      <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 3, background: accent, borderRadius: "16px 16px 0 0" }} />
      <div className="st-section-head" style={{ padding: "20px 24px 16px", borderBottom: `0.5px solid ${C.border}` }}>
        <div style={{ fontSize: 14, fontWeight: 500, color: C.text }}>{title}</div>
        {subtitle && <div style={{ fontSize: 12, color: C.muted, marginTop: 3 }}>{subtitle}</div>}
      </div>
      <div className="st-section-body" style={{ padding: "20px 24px" }}>{children}</div>
    </div>
  );
}

function FieldLabel({ children }) {
  return <div style={{ fontSize: 12, fontWeight: 500, color: C.muted, marginBottom: 6, letterSpacing: "0.2px" }}>{children}</div>;
}

function ReadonlyField({ value, label }) {
  return (
    <div style={{ marginBottom: 16, minWidth: 0 }}>
      <FieldLabel>{label}</FieldLabel>
      <div style={{
        padding: "10px 14px", borderRadius: 10,
        background: "#f9f4f2", border: `0.5px solid ${C.border}`,
        fontSize: 13, color: C.text, fontWeight: 500,
        wordBreak: "break-word",
      }}>
        {value || "—"}
      </div>
      <div style={{ fontSize: 11, color: C.mutedMid, marginTop: 4 }}>Read-only</div>
    </div>
  );
}

function InputField({ label, value, onChange, type = "text", placeholder, hint, rightEl, name }) {
  return (
    <div style={{ marginBottom: 16, minWidth: 0 }}>
      <FieldLabel>{label}</FieldLabel>
      <div style={{ position: "relative" }}>
        <input
          type={type}
          name={name}
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          style={{
            width: "100%", padding: "10px 14px",
            paddingRight: rightEl ? 40 : 14,
            borderRadius: 10, border: `0.5px solid ${C.border}`,
            fontSize: 13, color: C.text, background: C.surface,
            outline: "none", fontFamily: "inherit",
            transition: "border-color 0.15s",
            boxSizing: "border-box",
          }}
          onFocus={e => e.target.style.borderColor = C.brand}
          onBlur={e => e.target.style.borderColor = C.border}
        />
        {rightEl && (
          <div style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)" }}>
            {rightEl}
          </div>
        )}
      </div>
      {hint && <div style={{ fontSize: 11, color: C.mutedMid, marginTop: 4 }}>{hint}</div>}
    </div>
  );
}

function PrimaryButton({ onClick, disabled, loading, children, color = C.brand }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled || loading}
      style={{
        width: "100%", padding: "11px 0",
        background: disabled || loading ? `${color}99` : color,
        color: "#fff", border: "none", borderRadius: 10,
        fontSize: 13, fontWeight: 500, cursor: disabled || loading ? "not-allowed" : "pointer",
        display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
        transition: "opacity 0.15s", fontFamily: "inherit",
      }}
    >
      {loading ? <><Spinner />{children}</> : children}
    </button>
  );
}

function Sidebar({ tab, setTab, employee, initials }) {
  const tabs = [
    { key: "profile", label: "Profile", icon: (
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><circle cx="8" cy="5" r="3" stroke="currentColor" strokeWidth="1.4"/><path d="M2 13c0-3.314 2.686-5 6-5s6 1.686 6 5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/></svg>
    )},
    { key: "contact", label: "Contact info", icon: (
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><rect x="2" y="2" width="12" height="12" rx="3" stroke="currentColor" strokeWidth="1.4"/><path d="M5 6h6M5 9h4" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/></svg>
    )},
    { key: "address", label: "Address", icon: (
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M8 1.5C5.515 1.5 3.5 3.515 3.5 6c0 3.75 4.5 8.5 4.5 8.5S12.5 9.75 12.5 6c0-2.485-2.015-4.5-4.5-4.5z" stroke="currentColor" strokeWidth="1.4"/><circle cx="8" cy="6" r="1.5" stroke="currentColor" strokeWidth="1.2"/></svg>
    )},
    { key: "identity", label: "Identity", icon: (
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><rect x="2" y="3" width="12" height="10" rx="2" stroke="currentColor" strokeWidth="1.4"/><circle cx="6" cy="7" r="1.4" stroke="currentColor" strokeWidth="1.2"/><path d="M4.5 11c0-1.1 0.9-1.8 1.5-1.8s1.5 0.7 1.5 1.8M9.5 6.5h3M9.5 9h3" stroke="currentColor" strokeWidth="1.1" strokeLinecap="round"/></svg>
    )},
    { key: "leave", label: "Leave Balance", icon: (
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><rect x="2" y="3" width="12" height="11" rx="2" stroke="currentColor" strokeWidth="1.4"/><path d="M2 6.5h12M5.5 1.5v3M10.5 1.5v3" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/></svg>
    )},
    { key: "reviews", label: "Reviews", icon: (
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><polygon points="8,1.5 9.9,5.4 14,6 11,9 11.8,13.5 8,11.4 4.2,13.5 5,9 2,6 6.1,5.4" stroke="currentColor" strokeWidth="1.1" strokeLinejoin="round"/></svg>
    )},
    { key: "password", label: "Password", icon: (
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><rect x="4" y="7" width="8" height="6" rx="2" stroke="currentColor" strokeWidth="1.4"/><path d="M6 7V5a2 2 0 0 1 4 0v2" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/></svg>
    )},
    { key: "avatar", label: "Avatar", icon: (
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><circle cx="8" cy="8" r="6" stroke="currentColor" strokeWidth="1.4"/><circle cx="8" cy="6" r="2" stroke="currentColor" strokeWidth="1.2"/><path d="M4 12.5c0-2.2 1.8-3.5 4-3.5s4 1.3 4 3.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/></svg>
    )},
  ];

  return (
    <div className="settings-sidebar">
      <div style={{
        background: C.surface, borderRadius: 16,
        border: `0.5px solid ${C.border}`,
        padding: "20px 16px", marginBottom: 12,
        position: "relative", overflow: "hidden",
      }}>
        <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 3, background: C.brand, borderRadius: "16px 16px 0 0" }} />
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 10 }}>
          <div style={{
            width: 56, height: 56, borderRadius: "50%",
            background: employee?.profile_image ? "transparent" : C.brand,
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 20, fontWeight: 500, color: "#fff",
            overflow: "hidden", border: `3px solid ${C.brandLight}`,
            flexShrink: 0,
          }}>
            {employee?.profile_image
              ? <img src={employee.profile_image} alt="avatar" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
              : initials
            }
          </div>
          <div style={{ textAlign: "center", minWidth: 0, width: "100%" }}>
            <div style={{ fontSize: 13, fontWeight: 500, color: C.text, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{employee?.f_name} {employee?.l_name}</div>
            <div style={{ fontSize: 11, color: C.muted, marginTop: 2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{employee?.designation || "—"}</div>
            <div style={{ marginTop: 8 }}>
              <Badge>{employee?.role || "employee"}</Badge>
            </div>
          </div>
        </div>
      </div>

      <div style={{ background: C.surface, borderRadius: 16, border: `0.5px solid ${C.border}`, overflow: "hidden" }}>
        {tabs.map((t, i) => {
          const active = tab === t.key;
          return (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              style={{
                width: "100%", padding: "13px 16px",
                display: "flex", alignItems: "center", gap: 10,
                background: active ? C.brandLight : "transparent",
                color: active ? C.brand : C.muted,
                border: "none", borderBottom: i < tabs.length - 1 ? `0.5px solid ${C.border}` : "none",
                cursor: "pointer", fontFamily: "inherit",
                fontSize: 13, fontWeight: active ? 500 : 400,
                transition: "all 0.15s",
                textAlign: "left",
              }}
            >
              {t.icon}
              <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", minWidth: 0 }}>{t.label}</span>
              {active && (
                <div style={{ marginLeft: "auto", width: 5, height: 5, borderRadius: "50%", background: C.brand, flexShrink: 0 }} />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function ProfileTab({ employee }) {
  const joined = employee?.date_of_joining || employee?.createdAt;
  const joinedFmt = joined ? new Date(joined).toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" }) : "—";
  const pwUpdated = employee?.passwordupdatedAt ? new Date(employee.passwordupdatedAt).toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" }) : "—";

  const deptMap = {
    OPR: "Operations",
    BPO: "Business Process Outsourcing",
    ENG: "Engineering",
    HR: "Human Resources",
    IT: "Information Technology",
    FIN: "Finance",
    SALES: "Sales",
    MKT: "Marketing",
    ADMIN: "Administration",
    LEGAL: "Legal",
    SUPPORT: "Customer Support",
    QA: "Quality Assurance",
  };

  return (
    <>
      <SectionCard title="Personal details" subtitle="Your core information on record" accent={C.brand}>
        <div className="st-2col">
          <ReadonlyField label="First name" value={employee?.f_name} />
          <ReadonlyField label="Last name" value={employee?.l_name} />
          <ReadonlyField label="Work email" value={employee?.work_email} />
          <ReadonlyField label="Employee ID" value={employee?.empid} />
          <ReadonlyField label="Gender" value={employee?.gender} />
          <ReadonlyField label="Marital status" value={employee?.marital_status} />
        </div>
      </SectionCard>

      <SectionCard title="Job information" subtitle="Your current role and team" accent={C.blue}>
        <div className="st-2col">
          <ReadonlyField label="Role" value={employee?.role} />
          <ReadonlyField label="Designation" value={employee?.designation} />
          <ReadonlyField label="Department" value={deptMap[employee?.department] || employee?.department} />
          <ReadonlyField label="Office location" value={employee?.office_location} />
          <ReadonlyField label="Date of joining" value={joinedFmt} />
          <ReadonlyField label="Account status" value={employee?.status} />
          <ReadonlyField label="Email verified" value={employee?.isverified ? "✓ Verified" : "Not verified"} />
          <ReadonlyField label="Password last updated" value={pwUpdated} />
        </div>
      </SectionCard>

      <SectionCard title="Experience" subtitle="Your work background" accent={C.amber}>
        <div className="st-2col">
          <ReadonlyField label="Fresher" value={employee?.is_fresher ? "Yes" : "No"} />
          <ReadonlyField label="Total experience (years)" value={employee?.total_experience !== undefined ? String(employee.total_experience) : "—"} />
          {!employee?.is_fresher && (
            <>
              <ReadonlyField label="Previous company" value={employee?.previous_company} />
              <ReadonlyField label="Previous designation" value={employee?.previous_designation} />
            </>
          )}
        </div>
      </SectionCard>

      <SectionCard title="Reporting manager" subtitle="Your direct reporting line" accent={C.green}>
        <div className="st-2col">
          <ReadonlyField label="Manager name" value={employee?.Under_manager ? `${employee.Under_manager.f_name} ${employee.Under_manager.l_name}` : "—"} />
          <ReadonlyField label="Manager email" value={employee?.Under_manager?.work_email} />
          <ReadonlyField label="Manager role" value={employee?.Under_manager?.role} />
          <ReadonlyField label="Manager designation" value={employee?.Under_manager?.designation} />
        </div>
      </SectionCard>
    </>
  );
}

function selectStyle() {
  return {
    width: "100%",
    padding: "10px 30px 10px 14px",
    borderRadius: 10,
    border: `0.5px solid ${C.border}`,
    fontSize: 13,
    color: C.text,
    background: C.surface,
    fontFamily: "inherit",
    outline: "none",
    boxSizing: "border-box",
    maxWidth: "100%",
    minWidth: 0,
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
    appearance: "none",
    WebkitAppearance: "none",
    MozAppearance: "none",
    backgroundImage:
      "url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='10' height='6' viewBox='0 0 10 6'><path d='M1 1l4 4 4-4' stroke='%23b0948a' stroke-width='1.5' fill='none' stroke-linecap='round' stroke-linejoin='round'/></svg>\")",
    backgroundRepeat: "no-repeat",
    backgroundPosition: "right 12px center",
    backgroundSize: "10px 6px",
  };
}

function ContactTab({ employee, onSuccess, onError }) {
  const queryClient = useQueryClient();
  const updateProfile = useUpdateProfile();

  const [form, setForm] = useState({
    personal_contact: employee?.personal_contact || "",
    e_contact: employee?.e_contact || "",
    marital_status: employee?.marital_status || "single",
    gender: employee?.gender || "male",
    date_of_joining: toDateInputValue(employee?.date_of_joining),
    countryIso: DEFAULT_COUNTRY_ISO,
    stateIso: "",
    city: employee?.office_location || "",
  });

  // AFTER
const countries = ALL_COUNTRIES;
const states = useMemo(
  () => (form.countryIso ? State.getStatesOfCountry(form.countryIso) : []),
  [form.countryIso]
);
const cities = useMemo(
  () => (form.countryIso && form.stateIso ? City.getCitiesOfState(form.countryIso, form.stateIso) : []),
  [form.countryIso, form.stateIso]
);
const cityOptions = useMemo(
  () => (form.city && !cities.some(c => c.name === form.city) ? [{ name: form.city }, ...cities] : cities),
  [form.city, cities]
);

  useEffect(() => {
    if (!employee) return;

    const cityName = employee.office_location || "";
    const match = findLocationByCityName(cityName);

    let countryIso = match?.countryIso || DEFAULT_COUNTRY_ISO;
    let stateIso = match?.stateIso || "";

    if (!stateIso) {
      const defaultStates = State.getStatesOfCountry(countryIso);
      stateIso = defaultStates[0]?.isoCode || "";
    }

    setForm({
      personal_contact: employee.personal_contact || "",
      e_contact: employee.e_contact || "",
      marital_status: employee.marital_status || "single",
      gender: employee.gender || "male",
      date_of_joining: toDateInputValue(employee.date_of_joining),
      countryIso,
      stateIso,
      city: cityName,
    });
  }, [employee]);

  const setCountry = (e) => {
    const countryIso = e.target.value;
    const firstState = State.getStatesOfCountry(countryIso)[0];
    const stateIso = firstState?.isoCode || "";
    const firstCity = stateIso ? City.getCitiesOfState(countryIso, stateIso)[0] : null;
    setForm(p => ({ ...p, countryIso, stateIso, city: firstCity?.name || "" }));
  };

  const setState = (e) => {
    const stateIso = e.target.value;
    const firstCity = City.getCitiesOfState(form.countryIso, stateIso)[0];
    setForm(p => ({ ...p, stateIso, city: firstCity?.name || "" }));
  };

  const setCity = (e) => setForm(p => ({ ...p, city: e.target.value }));

  const handleSave = () => {
    if (!form.personal_contact) { onError("Personal contact is required"); return; }
    const payload = {
      personal_contact: form.personal_contact,
      e_contact: form.e_contact,
      marital_status: form.marital_status,
      gender: form.gender,
      date_of_joining: form.date_of_joining,
      office_location: form.city,
    };
    updateProfile.mutate(payload, {
      onSuccess: (data) => {
        queryClient.setQueryData(["meUser"], old => old ? { ...old, employee: { ...old.employee, ...data.employee } } : old);
        queryClient.invalidateQueries({ queryKey: ["meUser"] });
        onSuccess("Contact info updated successfully!");
      },
      onError: (err) => onError(getErrorMessage(err)),
    });
  };

  const selectClass =
    "w-full min-w-0 max-w-full appearance-none truncate rounded-[10px] border border-[#ede5e0] " +
    "bg-white px-3.5 py-2.5 pr-8 text-[13px] text-[#2a1a16] font-['DM_Sans','Segoe_UI',sans-serif] " +
    "outline-none transition-colors focus:border-[#730042] " +
    "bg-[length:10px_6px] bg-no-repeat bg-[right_12px_center] " +
    "bg-[url('data:image/svg+xml;utf8,<svg%20xmlns=%27http://www.w3.org/2000/svg%27%20width=%2710%27%20height=%276%27%20viewBox=%270%200%2010%206%27><path%20d=%27M1%201l4%204%204-4%27%20stroke=%27%23b0948a%27%20stroke-width=%271.5%27%20fill=%27none%27%20stroke-linecap=%27round%27%20stroke-linejoin=%27round%27/></svg>')]";

  return (
    <SectionCard title="Contact information" subtitle="Fields you can update yourself" accent={C.green}>
      <InputField
        label="Personal contact"
        type="tel"
        value={form.personal_contact}
        onChange={e => setForm(p => ({ ...p, personal_contact: e.target.value }))}
        placeholder="Enter personal phone number"
      />
      <InputField
        label="Emergency contact"
        type="tel"
        value={form.e_contact}
        onChange={e => setForm(p => ({ ...p, e_contact: e.target.value }))}
        placeholder="Enter emergency contact"
        hint="This contact will be reached in case of emergency"
      />
      <InputField
        label="Date of joining"
        type="date"
        value={form.date_of_joining}
        onChange={e => setForm(p => ({ ...p, date_of_joining: e.target.value }))}
        hint="Shown on your dashboard in place of your account creation date"
      />

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-x-0 sm:gap-x-3 gap-y-0 min-w-0 w-full max-w-full mb-4">
        <div className="min-w-0 mb-4 sm:mb-0">
          <FieldLabel>Country</FieldLabel>
          <select value={form.countryIso} onChange={setCountry} className={selectClass}>
            {countries.map(c => (
              <option key={c.isoCode} value={c.isoCode}>{c.name}</option>
            ))}
          </select>
        </div>

        <div className="min-w-0 mb-4 sm:mb-0">
          <FieldLabel>State</FieldLabel>
          <select value={form.stateIso} onChange={setState} className={selectClass}>
            {states.map(s => (
              <option key={s.isoCode} value={s.isoCode}>{s.name}</option>
            ))}
          </select>
        </div>

        <div className="min-w-0 mb-4 sm:mb-0">
          <FieldLabel>City</FieldLabel>
          <select value={form.city} onChange={setCity} className={selectClass}>
            {cityOptions.map(c => (
              <option key={c.name} value={c.name}>{c.name}</option>
            ))}
          </select>
        </div>
      </div>

      <div style={{ marginBottom: 20 }}>
        <FieldLabel>Gender</FieldLabel>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          {["male", "female"].map(opt => {
            const active = form.gender === opt;
            return (
              <button
                key={opt}
                onClick={() => setForm(p => ({ ...p, gender: opt }))}
                style={{
                  flex: "1 1 100px", padding: "10px 0",
                  borderRadius: 10, border: `0.5px solid ${active ? C.brand : C.border}`,
                  background: active ? C.brandLight : C.surface,
                  color: active ? C.brand : C.muted,
                  fontSize: 12, fontWeight: active ? 500 : 400,
                  cursor: "pointer", fontFamily: "inherit",
                  textTransform: "capitalize", transition: "all 0.15s",
                }}
              >
                {opt}
              </button>
            );
          })}
        </div>
      </div>
      <div style={{ marginBottom: 20 }}>
        <FieldLabel>Marital status</FieldLabel>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          {MARITAL_OPTIONS.map(opt => {
            const active = form.marital_status === opt;
            return (
              <button
                key={opt}
                onClick={() => setForm(p => ({ ...p, marital_status: opt }))}
                style={{
                  flex: "1 1 100px", padding: "10px 0",
                  borderRadius: 10, border: `0.5px solid ${active ? C.brand : C.border}`,
                  background: active ? C.brandLight : C.surface,
                  color: active ? C.brand : C.muted,
                  fontSize: 12, fontWeight: active ? 500 : 400,
                  cursor: "pointer", fontFamily: "inherit",
                  textTransform: "capitalize", transition: "all 0.15s",
                }}
              >
                {opt}
              </button>
            );
          })}
        </div>
      </div>
      <PrimaryButton onClick={handleSave} loading={updateProfile.isPending}>
        Save contact info
      </PrimaryButton>
    </SectionCard>
  );
}

function AddressTab({ employee }) {
  return (
    <SectionCard title="Address information" subtitle="On record, contact HR to update" accent={C.amber}>
      <ReadonlyField label="Address" value={employee?.address} />
      <div className="st-2col">
        <ReadonlyField label="City" value={employee?.city} />
        <ReadonlyField label="State" value={employee?.state} />
      </div>
      <div className="st-2col">
        <ReadonlyField label="Pincode" value={employee?.pincode} />
        <ReadonlyField label="Country" value={employee?.country} />
      </div>
    </SectionCard>
  );
}

function IdentityTab({ employee }) {
  return (
    <SectionCard title="Identity numbers" subtitle="Government ID records on file" accent={C.brand}>
      <div className="st-2col">
        <ReadonlyField label="Aadhaar number" value={employee?.aadhaar_number} />
        <ReadonlyField label="PAN number" value={employee?.pan_number} />
      </div>
    </SectionCard>
  );
}

function LeaveTab({ leaveBalance }) {
  if (!leaveBalance) {
    return (
      <SectionCard title="Leave Balance" accent={C.green}>
        <div style={{ textAlign: "center", padding: "32px 0", color: C.muted, fontSize: 13 }}>
          No leave balance data available.
        </div>
      </SectionCard>
    );
  }

  const leaves = [
    { key: "EL", label: "Earned Leave", color: C.brand, entitled: leaveBalance.EL?.entitled, availed: leaveBalance.EL?.availed, accrued: leaveBalance.EL?.accrued },
    { key: "SL", label: "Sick Leave", color: C.blue, entitled: leaveBalance.SL?.entitled, availed: leaveBalance.SL?.availed },
    { key: "ML", label: "Maternity Leave", color: C.amber, entitled: leaveBalance.ML, availed: null },
    { key: "PL", label: "Paternity Leave", color: C.green, entitled: leaveBalance.PL, availed: null },
  ];

  return (
    <SectionCard title="Leave Balance" subtitle="Your current leave entitlements" accent={C.green}>
      <div className="st-2col" style={{ gap: 12, marginBottom: 16 }}>
        {leaves.map(l => {
          const entitled = l.entitled ?? 0;
          const availed = l.availed ?? 0;
          const remaining = entitled - availed;
          const pct = entitled > 0 ? Math.max(0, Math.min(100, (remaining / entitled) * 100)) : 0;
          return (
            <div key={l.key} style={{ padding: "14px 16px", borderRadius: 12, border: `0.5px solid ${C.border}`, background: C.surface, minWidth: 0 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8, gap: 8 }}>
                <span style={{ fontSize: 12, fontWeight: 600, color: C.text }}>{l.label}</span>
                <span style={{ fontSize: 11, fontWeight: 600, padding: "2px 8px", borderRadius: 20, background: `${l.color}15`, color: l.color, whiteSpace: "nowrap" }}>
                  {remaining} left
                </span>
              </div>
              <div style={{ height: 5, borderRadius: 4, background: C.border, marginBottom: 8 }}>
                <div style={{ height: "100%", width: `${pct}%`, borderRadius: 4, background: l.color, transition: "width 0.4s" }} />
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: C.muted, gap: 6 }}>
                <span>Entitled: <b style={{ color: C.text }}>{entitled}</b></span>
                <span>Availed: <b style={{ color: C.text }}>{availed}</b></span>
              </div>
              {l.accrued !== undefined && (
                <div style={{ fontSize: 11, color: C.muted, marginTop: 3 }}>
                  Accrued: <b style={{ color: C.text }}>{l.accrued}</b>
                </div>
              )}
            </div>
          );
        })}
      </div>
      <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
        {[
          { label: "LWP (Loss of Pay)", value: leaveBalance.lwp ?? 0 },
          { label: "PBC (Public Holidays)", value: leaveBalance.pbc ?? 0 },
        ].map(item => (
          <div key={item.label} style={{ flex: "1 1 140px", minWidth: 140, padding: "12px 14px", borderRadius: 10, border: `0.5px solid ${C.border}`, background: C.surface }}>
            <div style={{ fontSize: 11, color: C.muted, marginBottom: 4 }}>{item.label}</div>
            <div style={{ fontSize: 20, fontWeight: 700, color: C.text }}>{item.value}</div>
          </div>
        ))}
      </div>
    </SectionCard>
  );
}

function ReviewsTab({ reviews }) {
  if (!reviews?.length) {
    return (
      <SectionCard title="My Reviews" accent={C.brand}>
        <div style={{ textAlign: "center", padding: "32px 0", color: C.muted, fontSize: 13 }}>
          No reviews received yet.
        </div>
      </SectionCard>
    );
  }

  const avg = (reviews.reduce((s, r) => s + (r.rating || 0), 0) / reviews.length).toFixed(1);

  return (
    <SectionCard title="My Reviews" subtitle={`${reviews.length} review${reviews.length !== 1 ? "s" : ""} · avg ${avg}/5`} accent={C.brand}>
      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        {reviews.map((r, i) => (
          <div key={r._id || i} style={{ padding: "14px 16px", borderRadius: 10, border: `0.5px solid ${C.border}`, background: C.surface, minWidth: 0 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8, gap: 8, flexWrap: "wrap" }}>
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: C.text }}>
                  {r.reviewer?.f_name ? `${r.reviewer.f_name} ${r.reviewer.l_name || ""}` : "Anonymous"}
                </div>
                <div style={{ fontSize: 11, color: C.muted }}>{r.reviewer?.role || ""} · {r.monthYear || (r.createdAt ? new Date(r.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" }) : "")}</div>
              </div>
              <div style={{ display: "flex", gap: 2, flexShrink: 0 }}>
                {[1,2,3,4,5].map(s => (
                  <svg key={s} width="14" height="14" viewBox="0 0 24 24">
                    <polygon points="12,2 15.09,8.26 22,9.27 17,14.14 18.18,21.02 12,17.77 5.82,21.02 7,14.14 2,9.27 8.91,8.26"
                      fill={s <= (r.rating || 0) ? "#f59e0b" : "transparent"}
                      stroke="#f59e0b" strokeWidth="1.5" strokeLinejoin="round" />
                  </svg>
                ))}
              </div>
            </div>
            {r.comment && (
              <div style={{ fontSize: 13, color: C.text, lineHeight: 1.6, fontStyle: "italic", wordBreak: "break-word" }}>
                "{r.comment}"
              </div>
            )}
          </div>
        ))}
      </div>
    </SectionCard>
  );
}

function PasswordTab({ onSuccess, onError }) {
  const updatePassword = useUpdatePassword();
  const [show, setShow] = useState(false);
  const [form, setForm] = useState({ oldpassword: "", newpassword: "", confirm: "" });

  const strength = (pw) => {
    if (!pw) return 0;
    let s = 0;
    if (pw.length >= 6) s++;
    if (pw.length >= 10) s++;
    if (/[A-Z]/.test(pw)) s++;
    if (/[0-9]/.test(pw)) s++;
    if (/[^a-zA-Z0-9]/.test(pw)) s++;
    return s;
  };

  const s = strength(form.newpassword);
  const strengthLabel = ["", "Weak", "Fair", "Good", "Strong", "Very strong"][s];
  const strengthColor = ["", C.red, C.amber, "#f9a825", C.green, C.green][s];

  const EyeIcon = ({ open }) => open
    ? <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M1 8s2.5-5 7-5 7 5 7 5-2.5 5-7 5-7-5-7-5z" stroke={C.muted} strokeWidth="1.3"/><circle cx="8" cy="8" r="2" stroke={C.muted} strokeWidth="1.3"/></svg>
    : <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M1 8s2.5-5 7-5 7 5 7 5-2.5 5-7 5-7-5-7-5z" stroke={C.muted} strokeWidth="1.3"/><line x1="2" y1="2" x2="14" y2="14" stroke={C.muted} strokeWidth="1.3" strokeLinecap="round"/></svg>;

  const handleChange = () => {
    if (!form.oldpassword || !form.newpassword) { onError("All fields are required"); return; }
    if (form.newpassword !== form.confirm) { onError("Passwords do not match"); return; }
    if (form.newpassword.length < 6) { onError("Password must be at least 6 characters"); return; }
    if (form.oldpassword === form.newpassword) { onError("New password must differ from old password"); return; }
    updatePassword.mutate(
      { oldpassword: form.oldpassword, newpassword: form.newpassword },
      {
        onSuccess: () => { setForm({ oldpassword: "", newpassword: "", confirm: "" }); onSuccess("Password changed successfully!"); },
        onError: (err) => onError(getErrorMessage(err)),
      }
    );
  };

  const eyeToggle = (
    <button type="button" onClick={() => setShow(s => !s)} style={{ background: "none", border: "none", cursor: "pointer", display: "flex", padding: 0 }}>
      <EyeIcon open={show} />
    </button>
  );

  return (
    <SectionCard title="Change password" subtitle="Keep your account secure with a strong password" accent={C.brand}>
      <div style={{ maxWidth: 400, width: "100%" }}>
        <InputField label="Current password *" type={show ? "text" : "password"} name="oldpassword"
          value={form.oldpassword} onChange={e => setForm(p => ({ ...p, oldpassword: e.target.value }))}
          placeholder="Enter current password" rightEl={eyeToggle} />

        <InputField label="New password *" type={show ? "text" : "password"} name="newpassword"
          value={form.newpassword} onChange={e => setForm(p => ({ ...p, newpassword: e.target.value }))}
          placeholder="Enter new password" rightEl={eyeToggle} />

        {form.newpassword && (
          <div style={{ marginTop: -8, marginBottom: 16 }}>
            <div style={{ display: "flex", gap: 4, marginBottom: 5 }}>
              {[1,2,3,4,5].map(i => (
                <div key={i} style={{ flex: 1, height: 3, borderRadius: 3, background: i <= s ? strengthColor : C.border, transition: "background 0.2s" }} />
              ))}
            </div>
            <div style={{ fontSize: 11, color: strengthColor, fontWeight: 500 }}>{strengthLabel}</div>
          </div>
        )}

        <InputField label="Confirm new password *" type={show ? "text" : "password"} name="confirm"
          value={form.confirm} onChange={e => setForm(p => ({ ...p, confirm: e.target.value }))}
          placeholder="Confirm new password"
          hint={form.confirm && form.newpassword !== form.confirm ? "Passwords do not match" : ""}
        />

        <PrimaryButton onClick={handleChange} loading={updatePassword.isPending}>
          Update password
        </PrimaryButton>

        <div style={{ marginTop: 16, padding: "12px 14px", background: C.brandLight, borderRadius: 10, fontSize: 12, color: C.brand, lineHeight: 1.6 }}>
          Tips: use 10+ characters, mix uppercase, numbers and symbols for a strong password.
        </div>
      </div>
    </SectionCard>
  );
}

function AvatarTab({ employee, onSuccess, onError }) {
  const queryClient = useQueryClient();
  const updateProfile = useUpdateProfile();
  const [currentImg, setCurrentImg] = useState(employee?.profile_image || "");
  const [pending, setPending] = useState(null);

  useEffect(() => { setCurrentImg(employee?.profile_image || ""); }, [employee]);

  const initials = getInitials(employee?.f_name, employee?.l_name);
  const seed = initials || "default";

  const applyAvatar = (url) => {
    setPending(url);
    setCurrentImg(url);
    updateProfile.mutate(
      { profile_image: url },
      {
        onSuccess: (data) => {
          queryClient.setQueryData(["meUser"], old => old ? { ...old, employee: { ...old.employee, profile_image: url } } : old);
          queryClient.invalidateQueries({ queryKey: ["meUser"] });
          onSuccess("Avatar updated!");
          setPending(null);
        },
        onError: (err) => { setCurrentImg(employee?.profile_image || ""); onError(getErrorMessage(err)); setPending(null); },
      }
    );
  };

  const removeAvatar = () => applyAvatar("");

  return (
    <SectionCard title="Profile avatar" subtitle="Choose an avatar that represents you" accent={C.blue}>
      <div className="st-avatar-current" style={{ display: "flex", alignItems: "center", gap: 20, marginBottom: 24, padding: "16px 20px", background: C.page, borderRadius: 12, border: `0.5px solid ${C.border}`, flexWrap: "wrap" }}>
        <div style={{
          width: 72, height: 72, borderRadius: "50%",
          background: currentImg ? "transparent" : C.brand,
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: 24, fontWeight: 500, color: "#fff",
          overflow: "hidden", border: `3px solid ${C.brandLight}`,
          flexShrink: 0,
        }}>
          {currentImg
            ? <img src={currentImg} alt="avatar" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
            : initials
          }
        </div>
        <div style={{ minWidth: 0 }}>
          <div style={{ fontSize: 13, fontWeight: 500, color: C.text, marginBottom: 4 }}>Current avatar</div>
          <div style={{ fontSize: 12, color: C.muted, marginBottom: 10 }}>
            {currentImg ? "DiceBear avatar" : "Initials avatar (default)"}
          </div>
          {currentImg && (
            <button
              onClick={removeAvatar}
              disabled={updateProfile.isPending}
              style={{ fontSize: 12, color: C.red, background: "none", border: "none", cursor: "pointer", fontFamily: "inherit", padding: 0, fontWeight: 500 }}
            >
              Remove avatar
            </button>
          )}
        </div>
      </div>

      <FieldLabel>Choose a style</FieldLabel>
      <div className="st-avatar-grid">
        {AVATAR_STYLES.map((style) => {
          const url = `https://api.dicebear.com/7.x/${style}/svg?seed=${seed}`;
          const isActive = currentImg?.includes(style);
          const isLoading = pending === url;
          return (
            <button
              key={style}
              onClick={() => applyAvatar(url)}
              disabled={updateProfile.isPending}
              style={{
                padding: "12px 8px", borderRadius: 12,
                border: `0.5px solid ${isActive ? C.brand : C.border}`,
                background: isActive ? C.brandLight : C.surface,
                cursor: updateProfile.isPending ? "not-allowed" : "pointer",
                transition: "all 0.15s", position: "relative",
                outline: isActive ? `2px solid ${C.brand}` : "none",
                outlineOffset: 2,
                minWidth: 0,
              }}
            >
              {isLoading && (
                <div style={{ position: "absolute", inset: 0, borderRadius: 12, background: "rgba(255,255,255,0.7)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <Spinner size={18} color={C.brand} />
                </div>
              )}
              <img src={url} alt={style} style={{ width: "100%", aspectRatio: "1", display: "block", borderRadius: 8 }} />
              <div style={{ fontSize: 10, color: isActive ? C.brand : C.muted, marginTop: 6, textAlign: "center", fontWeight: isActive ? 500 : 400, textTransform: "capitalize", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {style}
              </div>
            </button>
          );
        })}
      </div>
    </SectionCard>
  );
}

export default function EmployeeSettingsPage() {
  const [tab, setTab] = useState("profile");
  const [toast, setToast] = useState({ message: "", type: "" });

  const { data: meData, isLoading } = useGetMeUser();
  const employee = meData?.employee ?? null;
  const leaveBalance = Array.isArray(meData?.leavebalance) ? meData.leavebalance[0] : meData?.leavebalance;
  const reviews = meData?.reviews ?? [];
  const initials = employee ? getInitials(employee.f_name, employee.l_name) : "—";

  const showSuccess = (msg) => setToast({ message: msg, type: "success" });
  const showError   = (msg) => setToast({ message: msg, type: "error" });

  if (isLoading) {
    return (
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: C.page, fontFamily: "'DM Sans','Segoe UI',sans-serif" }}>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 16 }}>
          <Spinner size={36} color={C.brand} />
          <div style={{ fontSize: 13, color: C.muted }}>Loading your profile...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="st-page" style={{ fontFamily: "'DM Sans','Segoe UI',sans-serif", background: C.page, minHeight: "100vh", color: C.text }}>
      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes slideIn { from { opacity:0; transform:translateX(20px); } to { opacity:1; transform:translateX(0); } }
        * { box-sizing: border-box; }
        input:focus { border-color: ${C.brand} !important; box-shadow: 0 0 0 3px ${C.brandLight}; }
        button:not([disabled]):hover { opacity: 0.88; }

        /* ---------- base / desktop-first layout ---------- */
        .st-page { padding: 28px 32px; overflow-x: hidden; }
        .st-content-wrap { max-width: 1400px; margin: 0 auto; width: 100%; }

        .st-toast {
          position: fixed; top: 24px; right: 24px; z-index: 999;
          border-radius: 12px; padding: 14px 18px;
          display: flex; align-items: center; gap: 10px;
          box-shadow: 0 4px 24px rgba(115,0,66,0.10);
          min-width: 260px; max-width: 360px;
          animation: slideIn 0.25s ease;
        }

        .settings-layout { display: flex; gap: 16px; align-items: flex-start; }
        .settings-sidebar { width: 220px; flex-shrink: 0; }

        .mobile-tab-select-wrap { display: none; }
        .mobile-profile-bar { display: none; }

        .st-2col { display: grid; grid-template-columns: 1fr 1fr; gap: 0 20px; min-width: 0; }

        .st-avatar-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px; }

        /* ---------- large desktop / wide monitors ---------- */
        @media (min-width: 1600px) {
          .st-content-wrap { max-width: 1500px; }
        }

        /* ---------- small laptops / large tablets (landscape) ---------- */
        @media (max-width: 1200px) {
          .settings-sidebar { width: 190px; }
        }

        /* ---------- tablets (portrait) & phones: stacked layout ---------- */
        @media (max-width: 900px) {
          .st-page { padding: 20px 16px !important; }
          .settings-layout { flex-direction: column; }
          .settings-sidebar { display: none; }
          .mobile-tab-select-wrap { display: block; margin-bottom: 12px; }
          .mobile-profile-bar {
            display: flex; align-items: center; gap: 12px;
            background: #ffffff; border: 0.5px solid #ede5e0; border-radius: 16px;
            padding: 14px 16px; margin-bottom: 12px;
          }
          .st-avatar-grid { grid-template-columns: repeat(3, 1fr); }
          .st-section-head { padding: 16px 18px 12px !important; }
          .st-section-body { padding: 16px 18px !important; }
        }

        /* ---------- phones ---------- */
        @media (max-width: 720px) {
          .st-2col { grid-template-columns: 1fr !important; gap: 16px 0 !important; }
          .st-avatar-grid { grid-template-columns: repeat(3, 1fr); gap: 8px; }
        }

        /* ---------- small phones ---------- */
        @media (max-width: 480px) {
          .st-page { padding: 14px 10px !important; }
          .st-section-head { padding: 14px 14px 10px !important; }
          .st-section-body { padding: 14px 14px !important; }
          .st-avatar-grid { grid-template-columns: repeat(2, 1fr); gap: 8px; }
          .st-toast { top: 12px; right: 12px; left: 12px; min-width: auto; max-width: none; }
          .st-avatar-current { padding: 14px !important; gap: 14px !important; }
        }
      `}</style>

      <Toast message={toast.message} type={toast.type} onClose={() => setToast({ message: "", type: "" })} />

      <div className="st-content-wrap">
        <div style={{ marginBottom: 28 }}>
          <h1 style={{ fontSize: 22, fontWeight: 500, margin: 0, letterSpacing: "-0.3px" }}>Settings</h1>
          <p style={{ fontSize: 13, color: C.muted, marginTop: 4 }}>Manage your profile, contact info and security</p>
        </div>

        <div className="mobile-profile-bar">
          <div style={{
            width: 44, height: 44, borderRadius: "50%",
            background: employee?.profile_image ? "transparent" : C.brand,
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 16, fontWeight: 500, color: "#fff",
            overflow: "hidden", flexShrink: 0,
          }}>
            {employee?.profile_image
              ? <img src={employee.profile_image} alt="avatar" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
              : initials
            }
          </div>
          <div style={{ minWidth: 0 }}>
            <div style={{ fontSize: 13, fontWeight: 500, color: C.text, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{employee?.f_name} {employee?.l_name}</div>
            <div style={{ fontSize: 11, color: C.muted, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{employee?.designation || employee?.role || "—"}</div>
          </div>
        </div>

        <div className="mobile-tab-select-wrap">
          <select value={tab} onChange={(e) => setTab(e.target.value)} style={selectStyle()}>
            {SETTINGS_TABS.map(t => (
              <option key={t.key} value={t.key}>{t.label}</option>
            ))}
          </select>
        </div>

        <div className="settings-layout">
          <Sidebar tab={tab} setTab={setTab} employee={employee} initials={initials} />

          <div style={{ flex: 1, minWidth: 0, width: "100%" }}>
            {tab === "profile"   && <ProfileTab   employee={employee} />}
            {tab === "contact"   && <ContactTab   employee={employee} onSuccess={showSuccess} onError={showError} />}
            {tab === "address"   && <AddressTab   employee={employee} />}
            {tab === "identity"  && <IdentityTab  employee={employee} />}
            {tab === "leave"     && <LeaveTab     leaveBalance={leaveBalance} />}
            {tab === "reviews"   && <ReviewsTab   reviews={reviews} />}
            {tab === "password"  && <PasswordTab  onSuccess={showSuccess} onError={showError} />}
            {tab === "avatar"    && <AvatarTab    employee={employee} onSuccess={showSuccess} onError={showError} />}

            <div style={{ textAlign: "center", fontSize: 12, color: C.mutedMid, marginTop: 8 }}>
              Changes are saved to your account automatically
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}