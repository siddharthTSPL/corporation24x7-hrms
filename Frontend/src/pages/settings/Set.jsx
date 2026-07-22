import { useState, useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useEditAdminProfile, useChangeAdminPassword } from "../../auth/server-state/adminauth/adminauth.hook";
import { useAuth } from "../../auth/store/getmeauth/getmeauth";
import { Country, State, City } from "country-state-city";

const DEFAULT_COUNTRY_ISO = "IN";
const AVATAR_STYLES = [
  "avataaars", "bottts", "personas", "lorelei",
  "micah", "open-peeps", "big-ears", "croodles",
];

const PHONE_REGEX = /^[0-9]{10}$/;
const IFSC_REGEX = /^[A-Z]{4}0[A-Z0-9]{6}$/;
const ACCOUNT_REGEX = /^[0-9]{9,18}$/;

// Department short-form -> full-form mapping.
// Keep this in sync with the SuperAdmin dashboard's DEPT_OPTIONS list
// so any new department code added there gets a matching full name here.
const DEPT_FULL_FORMS = {
  OPR: "Operations",
  BPO: "Business Process Outsourcing",
  ENG: "Engineering",
  HR: "Human Resources",
  MGMT: "Management",
};

const getDepartmentName = (dept) => DEPT_FULL_FORMS[dept] || dept || "—";

const LOCATION_DATA = {
  India: {
    "Uttar Pradesh": ["Bareilly", "Noida", "Lucknow", "Kanpur", "Agra"],
    "Delhi": ["Delhi"],
    "Maharashtra": ["Mumbai", "Pune", "Nagpur"],
    "Karnataka": ["Bengaluru", "Mysuru"],
    "Telangana": ["Hyderabad"],
    "Tamil Nadu": ["Chennai", "Coimbatore"],
    "West Bengal": ["Kolkata"],
    "Gujarat": ["Ahmedabad", "Surat"],
  },
  "United States": {
    California: ["San Francisco", "Los Angeles", "San Jose"],
    "New York": ["New York City", "Buffalo"],
    Texas: ["Austin", "Dallas"],
  },
  "United Arab Emirates": {
    Dubai: ["Dubai"],
    "Abu Dhabi": ["Abu Dhabi"],
  },
};

const C = {
  brand:      "#CD166E",
  brandDark:  "#730042",
  brandLight: "rgba(205,22,110,0.08)",
  green:      "#1D9E75",
  greenBg:    "#e8f5e9",
  blue:       "#378ADD",
  blueBg:     "#e6f1fb",
  amber:      "#BA7517",
  amberBg:    "#faeeda",
  red:        "#E24B4A",
  redBg:      "#fcebeb",
  surface:    "#ffffff",
  page:       "#F9F8F2",
  border:     "#ede5e0",
  text:       "#2a1a16",
  muted:      "#b0948a",
  mutedMid:   "#c9bab5",
};

const TABS = [
  { key: "profile",   label: "Profile" },
  { key: "contact",   label: "Contact" },
  { key: "address",   label: "Address" },
  { key: "identity",  label: "Identity" },
  { key: "documents", label: "Documents & Banking" },
  { key: "leave",     label: "Leave Balance" },
  { key: "reviews",   label: "Reviews" },
  { key: "password",  label: "Password" },
  { key: "avatar",    label: "Avatar" },
];



function getInitials(name = "") {
  return name.split(" ").filter(Boolean).map(w => w[0]).join("").toUpperCase().slice(0, 2) || "?";
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

function fmtDate(iso) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" });
}


function findLocationByCityName(cityName) {
  if (!cityName) return null;
  const countries = Country.getAllCountries();
  for (const country of countries) {
    const states = State.getStatesOfCountry(country.isoCode);
    for (const state of states) {
      const cities = City.getCitiesOfState(country.isoCode, state.isoCode);
      if (cities.some(c => c.name === cityName)) {
        return { countryIso: country.isoCode, stateIso: state.isoCode };
      }
    }
  }
  return null;
}

function findLocation(city) {
  for (const country of Object.keys(LOCATION_DATA)) {
    for (const state of Object.keys(LOCATION_DATA[country])) {
      if (LOCATION_DATA[country][state].includes(city)) return { country, state };
    }
  }
  return null;
}

function Spinner({ size = 16, color = "#fff" }) {
  return (
    <div style={{
      width: size, height: size, borderRadius: "50%",
      border: `2px solid ${color}33`, borderTop: `2px solid ${color}`,
      animation: "spin 0.7s linear infinite", flexShrink: 0,
    }} />
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
    <div className="fixed top-3 right-3 sm:top-4 sm:right-4 z-[999] flex items-center gap-2.5 rounded-xl shadow-lg" style={{
      background: ok ? "#f0faf5" : "#fff5f5",
      border: `1px solid ${ok ? "#a8dfc3" : "#f5c6c6"}`,
      padding: "12px 16px",
      minWidth: 0,
      maxWidth: "calc(100vw - 24px)",
      width: "min(360px, calc(100vw - 24px))",
      animation: "slideIn 0.25s ease",
    }}>
      <div style={{
        width: 26, height: 26, borderRadius: "50%",
        background: ok ? C.greenBg : C.redBg,
        display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
      }}>
        {ok
          ? <svg width="13" height="13" viewBox="0 0 14 14"><polyline points="2,7 5.5,10.5 12,4" fill="none" stroke={C.green} strokeWidth="2" strokeLinecap="round"/></svg>
          : <svg width="13" height="13" viewBox="0 0 14 14"><line x1="3" y1="3" x2="11" y2="11" stroke={C.red} strokeWidth="2" strokeLinecap="round"/><line x1="11" y1="3" x2="3" y2="11" stroke={C.red} strokeWidth="2" strokeLinecap="round"/></svg>
        }
      </div>
      <span className="flex-1 min-w-0 break-words" style={{ fontSize: 13, fontWeight: 500, color: ok ? "#1a5c3a" : "#7a1a1a" }}>{message}</span>
      <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", color: C.muted, fontSize: 18, lineHeight: 1, padding: 0, flexShrink: 0 }}>×</button>
    </div>
  );
}

function SectionCard({ title, subtitle, accent = C.brand, children }) {
  return (
    <div className="min-w-0" style={{
      background: C.surface, borderRadius: 14,
      border: `1px solid ${C.border}`, overflow: "hidden",
      position: "relative", marginBottom: 16,
    }}>
      <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 3, background: accent }} />
      <div className="px-4 sm:px-5" style={{ paddingTop: 18, paddingBottom: 14, borderBottom: `1px solid ${C.border}` }}>
        <div style={{ fontSize: 14, fontWeight: 600, color: C.text }}>{title}</div>
        {subtitle && <div style={{ fontSize: 12, color: C.muted, marginTop: 2 }}>{subtitle}</div>}
      </div>
      <div className="px-4 sm:px-5" style={{ paddingTop: 18, paddingBottom: 18 }}>{children}</div>
    </div>
  );
}

function FieldLabel({ children }) {
  return <div style={{ fontSize: 11, fontWeight: 600, color: C.muted, marginBottom: 5, textTransform: "uppercase", letterSpacing: "0.4px" }}>{children}</div>;
}

function ReadonlyField({ label, value }) {
  return (
    <div className="min-w-0" style={{ marginBottom: 14 }}>
      <FieldLabel>{label}</FieldLabel>
      <div className="break-words" style={{
        padding: "9px 12px", borderRadius: 8,
        background: "#f7f3f1", border: `1px solid ${C.border}`,
        fontSize: 13, color: value ? C.text : C.muted, fontWeight: 500,
      }}>
        {value || "—"}
      </div>
    </div>
  );
}

function InputField({ label, value, onChange, type = "text", placeholder, hint, rightEl, name }) {
  const [focused, setFocused] = useState(false);
  return (
    <div className="min-w-0" style={{ marginBottom: 14 }}>
      <FieldLabel>{label}</FieldLabel>
      <div style={{ position: "relative" }}>
        <input
          type={type} name={name} value={value} onChange={onChange} placeholder={placeholder}
          onFocus={() => setFocused(true)} onBlur={() => setFocused(false)}
          style={{
            width: "100%", padding: "9px 12px",
            paddingRight: rightEl ? 40 : 12,
            borderRadius: 8, border: `1px solid ${focused ? C.brand : C.border}`,
            fontSize: 13, color: C.text, background: C.surface,
            outline: "none", fontFamily: "inherit",
            boxSizing: "border-box", transition: "border-color 0.15s",
            boxShadow: focused ? `0 0 0 3px ${C.brandLight}` : "none",
          }}
        />
        {rightEl && (
          <div style={{ position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)" }}>
            {rightEl}
          </div>
        )}
      </div>
      {hint && <div style={{ fontSize: 11, color: C.red, marginTop: 3 }}>{hint}</div>}
    </div>
  );
}

function SelectField({ label, value, onChange, options }) {
  return (
    <div className="min-w-0" style={{ marginBottom: 14 }}>
      <FieldLabel>{label}</FieldLabel>
      <select
        value={value} onChange={onChange}
        style={{
          width: "100%", padding: "9px 12px",
          borderRadius: 8, border: `1px solid ${C.border}`,
          fontSize: 13, color: C.text, background: C.surface,
          fontFamily: "inherit", outline: "none", boxSizing: "border-box",
        }}
      >
        {options.map(o => <option key={o.value || o} value={o.value || o}>{o.label || o}</option>)}
      </select>
    </div>
  );
}

function PrimaryButton({ onClick, disabled, loading, children, color = C.brand, fullWidth = true }) {
  return (
    <button onClick={onClick} disabled={disabled || loading}
      className={fullWidth ? "w-full" : "w-auto"}
      style={{
        padding: "10px 20px",
        background: disabled || loading ? `${color}80` : color,
        color: "#fff", border: "none", borderRadius: 9,
        fontSize: 13, fontWeight: 600,
        cursor: disabled || loading ? "not-allowed" : "pointer",
        display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
        fontFamily: "inherit", transition: "opacity 0.15s",
      }}>
      {loading ? <><Spinner />{children}</> : children}
    </button>
  );
}

function Badge({ children, color = C.brand, bg }) {
  return (
    <span className="inline-block whitespace-nowrap" style={{
      padding: "2px 10px", borderRadius: 20,
      fontSize: 10, fontWeight: 600, color, background: bg || `${color}15`,
      textTransform: "capitalize",
    }}>
      {children}
    </span>
  );
}

function Grid({ cols = 2, children, className }) {
  const responsiveClass = cols === 3 ? "grid-cols-1 sm:grid-cols-3" : "grid-cols-1 sm:grid-cols-2";
  return (
    <div className={`grid gap-x-0 sm:gap-x-4 gap-y-0 min-w-0 ${responsiveClass} ${className || ""}`}>
      {children}
    </div>
  );
}

function ProfileTab({ adminData }) {
  return (
    <>
      <SectionCard title="Personal details" subtitle="Core information on record" accent={C.brand}>
        <Grid>
          <ReadonlyField label="First name" value={adminData?.f_name} />
          <ReadonlyField label="Last name" value={adminData?.l_name} />
          <ReadonlyField label="Work email" value={adminData?.work_email} />
          <ReadonlyField label="Employee ID" value={adminData?.empid} />
          <ReadonlyField label="Gender" value={adminData?.gender} />
          <ReadonlyField label="Marital status" value={adminData?.marital_status} />
          <ReadonlyField label="Country" value={adminData?.country} />
          <ReadonlyField label="Account status" value={adminData?.status || "active"} />
        </Grid>
      </SectionCard>

      <SectionCard title="Job information" accent={C.blue}>
        <Grid>
          <ReadonlyField label="Role" value={adminData?.role} />
          <ReadonlyField label="Designation" value={adminData?.designation} />
          {/* Department now shown in full form instead of short code */}
          <ReadonlyField label="Department" value={getDepartmentName(adminData?.department)} />
          <ReadonlyField label="Office location" value={adminData?.office_location} />
          <ReadonlyField label="Date of joining" value={fmtDate(adminData?.date_of_joining || adminData?.createdAt)} />
          <ReadonlyField label="Working status" value={adminData?.working_status} />
          <ReadonlyField label="Last login" value={fmtDate(adminData?.last_login)} />
          <ReadonlyField label="Email verified" value={adminData?.isVerified ? "✓ Verified" : "Not verified"} />
        </Grid>
      </SectionCard>

      <SectionCard title="Experience" accent={C.amber}>
        <Grid>
          <ReadonlyField label="Fresher" value={adminData?.is_fresher ? "Yes" : "No"} />
          <ReadonlyField label="Total experience (yrs)" value={adminData?.total_experience !== undefined ? String(adminData.total_experience) : "—"} />
          <ReadonlyField label="Previous company" value={adminData?.previous_company} />
          <ReadonlyField label="Previous designation" value={adminData?.previous_designation} />
        </Grid>
      </SectionCard>
    </>
  );
}



function ContactTab({ adminData, onSuccess, onError }) {
  const queryClient = useQueryClient();
  const { mutate, isPending } = useEditAdminProfile();

  const [form, setForm] = useState({
    personal_contact: "",
    e_contact: "",
    countryIso: DEFAULT_COUNTRY_ISO,
    stateIso: "",
    city: "",
    date_of_joining: "",
  });

  const countries = Country.getAllCountries();
  const states = form.countryIso ? State.getStatesOfCountry(form.countryIso) : [];
  const cities = form.countryIso && form.stateIso ? City.getCitiesOfState(form.countryIso, form.stateIso) : [];

  useEffect(() => {
    if (!adminData) return;

    const cityName = adminData.office_location || "";
    const match = findLocationByCityName(cityName);

    let countryIso = match?.countryIso || DEFAULT_COUNTRY_ISO;
    let stateIso = match?.stateIso || "";

    if (!stateIso) {
      const defaultStates = State.getStatesOfCountry(countryIso);
      stateIso = defaultStates[0]?.isoCode || "";
    }

    setForm({
      personal_contact: adminData.personal_contact || "",
      e_contact: adminData.e_contact || "",
      countryIso,
      stateIso,
      city: cityName,
      date_of_joining: toDateInputValue(adminData.date_of_joining),
    });
  }, [adminData]);

  const setPhone = (key) => (e) => setForm(p => ({ ...p, [key]: e.target.value }));

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

  const cityOptions = form.city && !cities.some(c => c.name === form.city)
    ? [{ name: form.city }, ...cities]
    : cities;

  const handleSave = () => {
    if (!PHONE_REGEX.test(form.personal_contact)) { onError("Phone number must be a valid 10-digit number"); return; }
    if (form.e_contact && !PHONE_REGEX.test(form.e_contact)) { onError("Emergency contact must be a valid 10-digit number"); return; }
    mutate(
      { personal_contact: form.personal_contact, e_contact: form.e_contact, office_location: form.city, date_of_joining: form.date_of_joining },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: ["auth"] });
          onSuccess("Contact info updated!");
        },
        onError: (err) => onError(getErrorMessage(err)),
      }
    );
  };

  return (
    <SectionCard title="Contact & office" subtitle="Fields you can update" accent={C.green}>
      <InputField label="Phone number" type="tel" value={form.personal_contact} onChange={setPhone("personal_contact")} placeholder="10-digit phone number" />
      <InputField label="Emergency contact" type="tel" value={form.e_contact} onChange={setPhone("e_contact")} placeholder="Emergency contact" hint="Reached in case of emergency" />
      <Grid cols={3}>
        <SelectField
          label="Country"
          value={form.countryIso}
          onChange={setCountry}
          options={countries.map(c => ({ value: c.isoCode, label: c.name }))}
        />
        <SelectField
          label="State"
          value={form.stateIso}
          onChange={setState}
          options={states.map(s => ({ value: s.isoCode, label: s.name }))}
        />
        <SelectField
          label="City (office location)"
          value={form.city}
          onChange={setCity}
          options={cityOptions.map(c => ({ value: c.name, label: c.name }))}
        />
      </Grid>
      <InputField
        label="Date of joining"
        type="date"
        value={form.date_of_joining}
        onChange={e => setForm(p => ({ ...p, date_of_joining: e.target.value }))}
        hint="Shown on your dashboard in place of your account creation date"
      />
      <PrimaryButton onClick={handleSave} loading={isPending}>Save contact info</PrimaryButton>
    </SectionCard>
  );
}
function AddressTab({ adminData }) {
  return (
    <SectionCard title="Address information" subtitle="On record, contact HR to update" accent={C.amber}>
      <ReadonlyField label="Address" value={adminData?.address} />
      <Grid>
        <ReadonlyField label="City" value={adminData?.city} />
        <ReadonlyField label="State" value={adminData?.state} />
      </Grid>
      <Grid>
        <ReadonlyField label="Pincode" value={adminData?.pincode} />
        <ReadonlyField label="Country" value={adminData?.country} />
      </Grid>
    </SectionCard>
  );
}

function IdentityTab({ adminData }) {
  return (
    <SectionCard title="Identity numbers" subtitle="Government ID records on file" accent={C.brand}>
      <Grid>
        <ReadonlyField label="Aadhaar number" value={adminData?.aadhaar_number} />
        <ReadonlyField label="PAN number" value={adminData?.pan_number} />
      </Grid>
    </SectionCard>
  );
}

function DocumentsBankingTab({ adminData, onSuccess, onError }) {
  const queryClient = useQueryClient();
  const { mutate, isPending } = useEditAdminProfile();
  const [form, setForm] = useState({
    resume: "", aadhaar_card: "", pan_card: "", experience_letter: "",
    bank_name: "", account_holder_name: "", account_number: "", ifsc_code: "",
  });

  useEffect(() => {
    if (adminData) {
      setForm({
        resume: adminData.resume || "",
        aadhaar_card: adminData.aadhaar_card || "",
        pan_card: adminData.pan_card || "",
        experience_letter: adminData.experience_letter || "",
        bank_name: adminData.bank_name || "",
        account_holder_name: adminData.account_holder_name || "",
        account_number: adminData.account_number || "",
        ifsc_code: adminData.ifsc_code || "",
      });
    }
  }, [adminData]);

  const set = (key) => (e) => setForm(p => ({ ...p, [key]: e.target.value }));

  const handleSaveDocs = () => {
    mutate(
      {
        resume: form.resume,
        aadhaar_card: form.aadhaar_card,
        pan_card: form.pan_card,
        experience_letter: form.experience_letter,
      },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: ["auth"] });
          onSuccess("Documents updated!");
        },
        onError: (err) => onError(getErrorMessage(err)),
      }
    );
  };

  const handleSaveBanking = () => {
    if (form.bank_name && form.bank_name.length > 100) { onError("Bank name is too long"); return; }
    if (!form.account_holder_name.trim()) { onError("Account holder name is required"); return; }
    if (!ACCOUNT_REGEX.test(form.account_number)) { onError("Account number must be 9-18 digits"); return; }
    if (!IFSC_REGEX.test(form.ifsc_code.toUpperCase())) { onError("Invalid IFSC code"); return; }
    mutate(
      {
        bank_name: form.bank_name,
        account_holder_name: form.account_holder_name,
        account_number: form.account_number,
        ifsc_code: form.ifsc_code.toUpperCase(),
      },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: ["auth"] });
          onSuccess("Banking details updated!");
        },
        onError: (err) => onError(getErrorMessage(err)),
      }
    );
  };

  return (
    <>
      <SectionCard title="Documents" subtitle="Paste a link to each uploaded file" accent={C.blue}>
        <InputField label="Resume" value={form.resume} onChange={set("resume")} placeholder="https://…" />
        <InputField label="Aadhaar card" value={form.aadhaar_card} onChange={set("aadhaar_card")} placeholder="https://…" />
        <InputField label="PAN card" value={form.pan_card} onChange={set("pan_card")} placeholder="https://…" />
        <InputField label="Experience letter" value={form.experience_letter} onChange={set("experience_letter")} placeholder="https://…" />
        <PrimaryButton onClick={handleSaveDocs} loading={isPending}>Save documents</PrimaryButton>
      </SectionCard>

      <SectionCard title="Banking details" subtitle="Used for salary disbursement" accent={C.green}>
        <InputField label="Bank name" value={form.bank_name} onChange={set("bank_name")} placeholder="Bank name" />
        <InputField label="Account holder name" value={form.account_holder_name} onChange={set("account_holder_name")} placeholder="As per bank records" />
        <Grid>
          <InputField label="Account number" value={form.account_number} onChange={set("account_number")} placeholder="9-18 digit account number" />
          <InputField label="IFSC code" value={form.ifsc_code} onChange={(e) => setForm(p => ({ ...p, ifsc_code: e.target.value.toUpperCase() }))} placeholder="ABCD0123456" />
        </Grid>
        <PrimaryButton onClick={handleSaveBanking} loading={isPending} color={C.green}>Save banking details</PrimaryButton>
      </SectionCard>
    </>
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
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4 min-w-0">
        {leaves.map(l => {
          const entitled = l.entitled ?? 0;
          const availed = l.availed ?? 0;
          const remaining = entitled - availed;
          const pct = entitled > 0 ? Math.max(0, Math.min(100, (remaining / entitled) * 100)) : 0;
          return (
            <div key={l.key} className="min-w-0" style={{
              padding: "14px 16px", borderRadius: 12,
              border: `1px solid ${C.border}`, background: C.surface,
            }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8, gap: 8 }}>
                <span style={{ fontSize: 12, fontWeight: 600, color: C.text }}>{l.label}</span>
                <span style={{
                  fontSize: 11, fontWeight: 600, padding: "2px 8px",
                  borderRadius: 20, background: `${l.color}15`, color: l.color, whiteSpace: "nowrap",
                }}>
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
      <div className="flex gap-3 flex-wrap">
        {[
          { label: "LWP (Loss of Pay)", value: leaveBalance.lwp ?? 0 },
          { label: "PBC (Public Holidays)", value: leaveBalance.pbc ?? 0 },
        ].map(item => (
          <div key={item.label} className="flex-1 min-w-[140px]" style={{
            padding: "12px 14px",
            borderRadius: 10, border: `1px solid ${C.border}`,
            background: C.surface,
          }}>
            <div style={{ fontSize: 11, color: C.muted, marginBottom: 4 }}>{item.label}</div>
            <div style={{ fontSize: 20, fontWeight: 700, color: C.text }}>{item.value}</div>
          </div>
        ))}
      </div>
      <div style={{ marginTop: 12, fontSize: 11, color: C.muted }}>
        Last accrual: {fmtDate(leaveBalance.lastAccrualDate)}
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
          <div key={r._id || i} className="min-w-0" style={{
            padding: "14px 16px", borderRadius: 10,
            border: `1px solid ${C.border}`, background: C.surface,
          }}>
            <div className="flex-wrap" style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8, gap: 8 }}>
              <div className="min-w-0">
                <div style={{ fontSize: 13, fontWeight: 600, color: C.text }}>
                  {r.reviewer?.f_name ? `${r.reviewer.f_name} ${r.reviewer.l_name || ""}` : "Anonymous"}
                </div>
                <div style={{ fontSize: 11, color: C.muted }}>{r.reviewer?.role || ""} · {r.monthYear || fmtDate(r.createdAt)}</div>
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
              <div className="break-words" style={{ fontSize: 13, color: C.text, lineHeight: 1.6, fontStyle: "italic" }}>
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
  const { mutate, isPending } = useChangeAdminPassword();
  const [show, setShow] = useState(false);
  const [form, setForm] = useState({ currentPassword: "", newPassword: "", confirm: "" });
  const set = (key) => (e) => setForm(p => ({ ...p, [key]: e.target.value }));

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

  const s = strength(form.newPassword);
  const sLabel = ["","Weak","Fair","Good","Strong","Very strong"][s];
  const sColor = ["",C.red,C.amber,"#f9a825",C.green,C.green][s];

  const EyeBtn = () => (
    <button type="button" onClick={() => setShow(v => !v)}
      style={{ background: "none", border: "none", cursor: "pointer", display: "flex", padding: 0 }}>
      {show
        ? <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M1 8s2.5-5 7-5 7 5 7 5-2.5 5-7 5-7-5-7-5z" stroke={C.muted} strokeWidth="1.3"/><circle cx="8" cy="8" r="2" stroke={C.muted} strokeWidth="1.3"/></svg>
        : <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M1 8s2.5-5 7-5 7 5 7 5-2.5 5-7 5-7-5-7-5z" stroke={C.muted} strokeWidth="1.3"/><line x1="2" y1="2" x2="14" y2="14" stroke={C.muted} strokeWidth="1.3" strokeLinecap="round"/></svg>
      }
    </button>
  );

  const handleChange = () => {
    if (!form.currentPassword || !form.newPassword) { onError("All fields are required"); return; }
    if (form.newPassword !== form.confirm) { onError("Passwords do not match"); return; }
    if (form.newPassword.length < 6) { onError("Password must be at least 6 characters"); return; }
    if (form.currentPassword === form.newPassword) { onError("New password must differ from current"); return; }
    mutate(
      { currentPassword: form.currentPassword, newPassword: form.newPassword },
      {
        onSuccess: () => { setForm({ currentPassword: "", newPassword: "", confirm: "" }); onSuccess("Password changed!"); },
        onError: (err) => onError(getErrorMessage(err)),
      }
    );
  };

  return (
    <SectionCard title="Change password" subtitle="Keep your account secure" accent={C.brand}>
      <div className="max-w-full sm:max-w-[420px] min-w-0">
        <InputField label="Current password *" type={show ? "text" : "password"} value={form.currentPassword} onChange={set("currentPassword")} placeholder="Current password" rightEl={<EyeBtn />} />
        <InputField label="New password *" type={show ? "text" : "password"} value={form.newPassword} onChange={set("newPassword")} placeholder="New password" rightEl={<EyeBtn />} />
        {form.newPassword && (
          <div style={{ marginTop: -6, marginBottom: 12 }}>
            <div style={{ display: "flex", gap: 3, marginBottom: 4 }}>
              {[1,2,3,4,5].map(i => (
                <div key={i} style={{ flex: 1, height: 3, borderRadius: 3, background: i <= s ? sColor : C.border, transition: "background 0.2s" }} />
              ))}
            </div>
            <div style={{ fontSize: 11, color: sColor, fontWeight: 600 }}>{sLabel}</div>
          </div>
        )}
        <InputField label="Confirm new password *" type={show ? "text" : "password"} value={form.confirm} onChange={set("confirm")} placeholder="Confirm password"
          hint={form.confirm && form.newPassword !== form.confirm ? "Passwords do not match" : ""}
        />
        <PrimaryButton onClick={handleChange} loading={isPending}>Update password</PrimaryButton>
        <div style={{ marginTop: 14, padding: "11px 14px", background: C.brandLight, borderRadius: 9, fontSize: 12, color: C.brandDark, lineHeight: 1.6 }}>
          Use 10+ characters with uppercase, numbers and symbols for a strong password.
        </div>
      </div>
    </SectionCard>
  );
}

function AvatarTab({ adminData, onSuccess, onError }) {
  const queryClient = useQueryClient();
  const { mutate, isPending } = useEditAdminProfile();
  const [currentImg, setCurrentImg] = useState(adminData?.profile_image || "");
  const [pending, setPending] = useState(null);

  useEffect(() => { setCurrentImg(adminData?.profile_image || ""); }, [adminData]);

  const displayName = adminData?.f_name
    ? `${adminData.f_name} ${adminData.l_name || ""}`
    : adminData?.work_email || "admin";
  const seed = getInitials(displayName) || "default";
  const initials = getInitials(displayName);

  const applyAvatar = (url) => {
    setPending(url);
    setCurrentImg(url);
    mutate(
      { profile_image: url },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: ["auth"] });
          onSuccess("Avatar updated!");
          setPending(null);
        },
        onError: (err) => {
          setCurrentImg(adminData?.profile_image || "");
          onError(getErrorMessage(err));
          setPending(null);
        },
      }
    );
  };

  return (
    <SectionCard title="Profile avatar" subtitle="Choose an avatar that represents you" accent={C.blue}>
      <div className="flex flex-col xs:flex-row items-start xs:items-center gap-4 mb-5 min-w-0" style={{
        padding: "14px 16px", background: C.page, borderRadius: 11, border: `1px solid ${C.border}`,
      }}>
        <div style={{
          width: 64, height: 64, borderRadius: "50%",
          background: currentImg ? "transparent" : `linear-gradient(135deg, ${C.brand}, ${C.brandDark})`,
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: 22, fontWeight: 700, color: "#fff",
          overflow: "hidden", border: `3px solid ${C.brandLight}`, flexShrink: 0,
        }}>
          {currentImg
            ? <img src={currentImg} alt="avatar" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
            : initials
          }
        </div>
        <div className="min-w-0">
          <div style={{ fontSize: 13, fontWeight: 600, color: C.text, marginBottom: 3 }}>Current avatar</div>
          <div style={{ fontSize: 12, color: C.muted, marginBottom: 8 }}>
            {currentImg ? "DiceBear avatar" : "Initials (default)"}
          </div>
          {currentImg && (
            <button onClick={() => applyAvatar("")} disabled={isPending}
              style={{ fontSize: 12, color: C.red, background: "none", border: "none", cursor: "pointer", fontFamily: "inherit", padding: 0, fontWeight: 600 }}>
              Remove avatar
            </button>
          )}
        </div>
      </div>

      <FieldLabel>Choose a style</FieldLabel>
      <div className="grid grid-cols-3 xs:grid-cols-4 gap-2 min-w-0">
        {AVATAR_STYLES.map(style => {
          const url = `https://api.dicebear.com/7.x/${style}/svg?seed=${seed}`;
          const isActive = currentImg?.includes(style);
          const isLoading = pending === url;
          return (
            <button key={style} onClick={() => applyAvatar(url)} disabled={isPending}
              className="min-w-0"
              style={{
                padding: "10px 6px", borderRadius: 10,
                border: `1px solid ${isActive ? C.brand : C.border}`,
                background: isActive ? C.brandLight : C.surface,
                cursor: isPending ? "not-allowed" : "pointer",
                transition: "all 0.15s", position: "relative",
                outline: isActive ? `2px solid ${C.brand}` : "none", outlineOffset: 2,
              }}>
              {isLoading && (
                <div style={{ position: "absolute", inset: 0, borderRadius: 10, background: "rgba(255,255,255,0.75)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <Spinner size={18} color={C.brand} />
                </div>
              )}
              <img src={url} alt={style} style={{ width: "100%", aspectRatio: "1", display: "block", borderRadius: 6 }} />
              <div className="truncate" style={{ fontSize: 10, color: isActive ? C.brand : C.muted, marginTop: 5, textAlign: "center", fontWeight: isActive ? 600 : 400, textTransform: "capitalize" }}>
                {style}
              </div>
            </button>
          );
        })}
      </div>
    </SectionCard>
  );
}

function MobileTabBar({ tab, setTab, onClose }) {
  return (
    <div className="fixed inset-0 z-[200]" style={{
      background: "rgba(42,26,22,0.45)", backdropFilter: "blur(2px)",
    }} onClick={onClose}>
      <div className="absolute bottom-0 left-0 right-0 max-h-[80vh] overflow-y-auto" style={{
        background: C.surface, borderRadius: "20px 20px 0 0",
        paddingBottom: "env(safe-area-inset-bottom, 16px)",
      }} onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5" style={{ paddingTop: 14, borderBottom: `1px solid ${C.border}` }}>
          <span style={{ fontSize: 14, fontWeight: 700, color: C.text }}>Settings</span>
          <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", fontSize: 22, color: C.muted, padding: 0 }}>×</button>
        </div>
        {TABS.map(t => (
          <button key={t.key} onClick={() => { setTab(t.key); onClose(); }}
            className="w-full flex items-center justify-between px-5"
            style={{
              padding: "14px 20px",
              background: tab === t.key ? C.brandLight : "transparent",
              color: tab === t.key ? C.brand : C.text,
              border: "none", borderBottom: `1px solid ${C.border}`,
              cursor: "pointer", fontFamily: "inherit",
              fontSize: 14, fontWeight: tab === t.key ? 600 : 400,
            }}>
            {t.label}
            {tab === t.key && <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><polyline points="4,8 7,11 12,5" stroke={C.brand} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>}
          </button>
        ))}
      </div>
    </div>
  );
}

export default function AdminSettingsPage() {
  const [tab, setTab] = useState("profile");
  const [toast, setToast] = useState({ message: "", type: "" });
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { data: auth } = useAuth();

  const adminData = auth?.data?.user || auth?.user;
  const leaveBalance = auth?.data?.leaveBalance || auth?.leaveBalance;
  const reviews = auth?.data?.reviews || auth?.reviews || [];

  const showSuccess = (msg) => setToast({ message: msg, type: "success" });
  const showError   = (msg) => setToast({ message: msg, type: "error" });

  const displayName = adminData?.f_name
    ? `${adminData.f_name} ${adminData.l_name || ""}`.trim()
    : "Admin";
  const initials = getInitials(displayName);

  if (!adminData) {
    return (
      <div className="min-h-screen flex items-center justify-center overflow-x-hidden" style={{ background: C.page, fontFamily: "'DM Sans','Segoe UI',sans-serif" }}>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 14 }}>
          <Spinner size={36} color={C.brand} />
          <div style={{ fontSize: 13, color: C.muted }}>Loading profile…</div>
        </div>
      </div>
    );
  }

  const currentTabLabel = TABS.find(t => t.key === tab)?.label || "Settings";

  return (
    <div className="w-full max-w-full min-h-screen overflow-x-hidden" style={{ fontFamily: "'DM Sans','Segoe UI',sans-serif", background: C.page, color: C.text }}>
      <style>{`
  @keyframes spin { to { transform: rotate(360deg); } }
  @keyframes slideIn { from { opacity:0; transform:translateX(20px); } to { opacity:1; transform:translateX(0); } }
  * { box-sizing: border-box; }
  input::placeholder { color: #c9bab5; }
  select option { color: #2a1a16; }
  select { position: relative; }
  .mobile-menu-btn { display: none; }
  @media (max-width: 768px) {
    .settings-layout { flex-direction: column !important; }
    .settings-sidebar { display: none !important; }
    .mobile-menu-btn { display: flex !important; }
  }
`}</style>

      <Toast message={toast.message} type={toast.type} onClose={() => setToast({ message: "", type: "" })} />
      {mobileMenuOpen && <MobileTabBar tab={tab} setTab={setTab} onClose={() => setMobileMenuOpen(false)} />}

      <div className="p-4 sm:p-6 lg:p-8">
        <div className="max-w-[1100px] mx-auto min-w-0">

          <div className="mb-5 flex items-center justify-between gap-3 flex-wrap">
            <div className="min-w-0">
              <h1 className="text-lg sm:text-xl lg:text-[22px]" style={{ fontWeight: 700, margin: 0, color: C.text }}>Settings</h1>
              <p style={{ fontSize: 13, color: C.muted, marginTop: 3, marginBottom: 0 }}>Manage your profile and account preferences</p>
            </div>
            <button
              onClick={() => setMobileMenuOpen(true)}
              className="mobile-menu-btn items-center gap-1.5"
              style={{
                padding: "8px 14px", borderRadius: 9,
                border: `1px solid ${C.border}`, background: C.surface,
                cursor: "pointer", fontSize: 13, fontWeight: 600,
                color: C.brand, fontFamily: "inherit",
              }}
            >
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><line x1="1" y1="3.5" x2="13" y2="3.5" stroke={C.brand} strokeWidth="1.5" strokeLinecap="round"/><line x1="1" y1="7" x2="13" y2="7" stroke={C.brand} strokeWidth="1.5" strokeLinecap="round"/><line x1="1" y1="10.5" x2="13" y2="10.5" stroke={C.brand} strokeWidth="1.5" strokeLinecap="round"/></svg>
              {currentTabLabel}
            </button>
          </div>

          <div className="settings-layout flex gap-4 items-start min-w-0">

            <div className="settings-sidebar w-[210px] shrink-0">
              <div className="relative overflow-hidden mb-3" style={{
                background: C.surface, borderRadius: 14, border: `1px solid ${C.border}`,
                padding: "18px 14px",
              }}>
                <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 3, background: `linear-gradient(90deg, ${C.brand}, ${C.brandDark})` }} />
                <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 10 }}>
                  <div style={{
                    width: 54, height: 54, borderRadius: "50%",
                    background: adminData?.profile_image ? "transparent" : `linear-gradient(135deg, ${C.brand}, ${C.brandDark})`,
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontSize: 18, fontWeight: 700, color: "#fff",
                    overflow: "hidden", border: `3px solid ${C.brandLight}`,
                  }}>
                    {adminData?.profile_image
                      ? <img src={adminData.profile_image} alt="avatar" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                      : initials
                    }
                  </div>
                  <div className="text-center min-w-0">
                    <div className="truncate" style={{ fontSize: 13, fontWeight: 700, color: C.text }}>{displayName}</div>
                    <div className="truncate" style={{ fontSize: 11, color: C.muted, marginTop: 2 }}>{adminData?.work_email || "—"}</div>
                    <div style={{ marginTop: 7, display: "flex", gap: 6, justifyContent: "center", flexWrap: "wrap" }}>
                      <Badge color={C.brand}>{adminData?.role || "admin"}</Badge>
                      {adminData?.designation && <Badge color={C.blue}>{adminData.designation}</Badge>}
                    </div>
                  </div>
                </div>
              </div>

              <div style={{ background: C.surface, borderRadius: 14, border: `1px solid ${C.border}`, overflow: "hidden" }}>
                {TABS.map((t, i) => {
                  const active = tab === t.key;
                  return (
                    <button key={t.key} onClick={() => setTab(t.key)}
                      className="w-full flex items-center justify-between px-3.5"
                      style={{
                        padding: "12px 14px",
                        background: active ? C.brandLight : "transparent",
                        color: active ? C.brand : C.muted,
                        border: "none",
                        borderBottom: i < TABS.length - 1 ? `1px solid ${C.border}` : "none",
                        cursor: "pointer", fontFamily: "inherit",
                        fontSize: 13, fontWeight: active ? 600 : 400,
                        transition: "all 0.15s",
                      }}>
                      {t.label}
                      {active && <div style={{ width: 5, height: 5, borderRadius: "50%", background: C.brand, flexShrink: 0 }} />}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="flex-1 min-w-0">
              {tab === "profile"   && <ProfileTab adminData={adminData} />}
              {tab === "contact"   && <ContactTab adminData={adminData} onSuccess={showSuccess} onError={showError} />}
              {tab === "address"   && <AddressTab adminData={adminData} />}
              {tab === "identity"  && <IdentityTab adminData={adminData} />}
              {tab === "documents" && <DocumentsBankingTab adminData={adminData} onSuccess={showSuccess} onError={showError} />}
              {tab === "leave"     && <LeaveTab leaveBalance={leaveBalance} />}
              {tab === "reviews"   && <ReviewsTab reviews={reviews} />}
              {tab === "password"  && <PasswordTab onSuccess={showSuccess} onError={showError} />}
              {tab === "avatar"    && <AvatarTab adminData={adminData} onSuccess={showSuccess} onError={showError} />}

              <div style={{ textAlign: "center", fontSize: 11, color: C.mutedMid, marginTop: 8, paddingBottom: 16 }}>
                Changes are saved to your account automatically
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}