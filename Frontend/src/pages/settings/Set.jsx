import { useState, useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useEditAdminProfile, useChangeAdminPassword } from "../../auth/server-state/adminauth/adminauth.hook";
import { useAuth } from "../../auth/store/getmeauth/getmeauth";

const AVATAR_STYLES = [
  "avataaars", "bottts", "personas", "lorelei",
  "micah", "open-peeps", "big-ears", "croodles",
];

const C = {
  brand:      "#CD166E",
  brandDark:  "#730042",
  brandLight: "rgba(205,22,110,0.08)",
  brandMid:   "rgba(205,22,110,0.15)",
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

function getOrgInitials(name = "") {
  return (
    name.split(" ").map(w => w[0]).join("").toUpperCase().slice(0, 2) || "?"
  );
}

function getErrorMessage(err) {
  return err?.response?.data?.message || err?.message || "Something went wrong";
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
    <div style={{
      position: "fixed", top: 24, right: 24, zIndex: 999,
      background: isSuccess ? "#f0faf5" : "#fff5f5",
      border: `0.5px solid ${isSuccess ? "#a8dfc3" : "#f5c6c6"}`,
      borderRadius: 12, padding: "14px 18px",
      display: "flex", alignItems: "center", gap: 10,
      boxShadow: "0 4px 24px rgba(205,22,110,0.12)",
      minWidth: 260, maxWidth: 360,
      animation: "slideIn 0.25s ease",
    }}>
      <div style={{
        width: 28, height: 28, borderRadius: "50%",
        background: isSuccess ? C.greenBg : C.redBg,
        display: "flex", alignItems: "center", justifyContent: "center",
        flexShrink: 0,
      }}>
        {isSuccess
          ? <svg width="14" height="14" viewBox="0 0 14 14"><polyline points="2,7 5.5,10.5 12,4" fill="none" stroke={C.green} strokeWidth="2" strokeLinecap="round" /></svg>
          : <svg width="14" height="14" viewBox="0 0 14 14"><line x1="3" y1="3" x2="11" y2="11" stroke={C.red} strokeWidth="2" strokeLinecap="round" /><line x1="11" y1="3" x2="3" y2="11" stroke={C.red} strokeWidth="2" strokeLinecap="round" /></svg>
        }
      </div>
      <span style={{ fontSize: 13, fontWeight: 500, color: isSuccess ? "#1a5c3a" : "#7a1a1a", flex: 1 }}>
        {message}
      </span>
      <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", color: C.muted, fontSize: 16, lineHeight: 1, padding: 0 }}>×</button>
    </div>
  );
}

function SectionCard({ title, subtitle, accent = C.brand, children }) {
  return (
    <div style={{
      background: C.surface, borderRadius: 16,
      border: `0.5px solid ${C.border}`,
      overflow: "hidden", position: "relative",
      marginBottom: 16,
    }}>
      <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 3, background: accent, borderRadius: "16px 16px 0 0" }} />
      <div style={{ padding: "20px 24px 16px", borderBottom: `0.5px solid ${C.border}` }}>
        <div style={{ fontSize: 14, fontWeight: 500, color: C.text }}>{title}</div>
        {subtitle && <div style={{ fontSize: 12, color: C.muted, marginTop: 3 }}>{subtitle}</div>}
      </div>
      <div style={{ padding: "20px 24px" }}>{children}</div>
    </div>
  );
}

function FieldLabel({ children }) {
  return <div style={{ fontSize: 12, fontWeight: 500, color: C.muted, marginBottom: 6, letterSpacing: "0.2px" }}>{children}</div>;
}

function ReadonlyField({ label, value }) {
  return (
    <div style={{ marginBottom: 16 }}>
      <FieldLabel>{label}</FieldLabel>
      <div style={{
        padding: "10px 14px", borderRadius: 10,
        background: "#f9f4f2", border: `0.5px solid ${C.border}`,
        fontSize: 13, color: C.text, fontWeight: 500,
      }}>
        {value || "—"}
      </div>
      <div style={{ fontSize: 11, color: C.mutedMid, marginTop: 4 }}>Read-only</div>
    </div>
  );
}

function InputField({ label, value, onChange, type = "text", placeholder, hint, rightEl, name }) {
  return (
    <div style={{ marginBottom: 16 }}>
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
      {hint && <div style={{ fontSize: 11, color: C.red, marginTop: 4 }}>{hint}</div>}
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

function Sidebar({ tab, setTab, adminData, initials }) {
  const tabs = [
    { key: "profile", label: "Profile", icon: (
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><circle cx="8" cy="5" r="3" stroke="currentColor" strokeWidth="1.4" /><path d="M2 13c0-3.314 2.686-5 6-5s6 1.686 6 5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" /></svg>
    )},
    { key: "contact", label: "Contact & office", icon: (
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><rect x="2" y="2" width="12" height="12" rx="3" stroke="currentColor" strokeWidth="1.4" /><path d="M5 6h6M5 9h4" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" /></svg>
    )},
    { key: "address", label: "Address", icon: (
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M8 1.5C5.515 1.5 3.5 3.515 3.5 6c0 3.75 4.5 8.5 4.5 8.5S12.5 9.75 12.5 6c0-2.485-2.015-4.5-4.5-4.5z" stroke="currentColor" strokeWidth="1.4" /><circle cx="8" cy="6" r="1.5" stroke="currentColor" strokeWidth="1.2" /></svg>
    )},
    { key: "documents", label: "Documents", icon: (
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><rect x="3" y="1" width="10" height="14" rx="2" stroke="currentColor" strokeWidth="1.4" /><path d="M5.5 5h5M5.5 8h5M5.5 11h3" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" /></svg>
    )},
    { key: "password", label: "Password", icon: (
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><rect x="4" y="7" width="8" height="6" rx="2" stroke="currentColor" strokeWidth="1.4" /><path d="M6 7V5a2 2 0 0 1 4 0v2" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" /></svg>
    )},
    { key: "avatar", label: "Avatar", icon: (
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><circle cx="8" cy="8" r="6" stroke="currentColor" strokeWidth="1.4" /><circle cx="8" cy="6" r="2" stroke="currentColor" strokeWidth="1.2" /><path d="M4 12.5c0-2.2 1.8-3.5 4-3.5s4 1.3 4 3.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" /></svg>
    )},
    { key: "system", label: "System", icon: (
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><circle cx="8" cy="8" r="2.5" stroke="currentColor" strokeWidth="1.3" /><path d="M8 1v2M8 13v2M1 8h2M13 8h2M3.05 3.05l1.42 1.42M11.53 11.53l1.42 1.42M3.05 12.95l1.42-1.42M11.53 4.47l1.42-1.42" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" /></svg>
    )},
  ];

  return (
    <div style={{ width: 220, flexShrink: 0 }}>
      <div style={{
        background: C.surface, borderRadius: 16,
        border: `0.5px solid ${C.border}`,
        padding: "20px 16px", marginBottom: 12,
        position: "relative", overflow: "hidden",
      }}>
        <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 3, background: `linear-gradient(90deg, ${C.brand}, ${C.brandDark})`, borderRadius: "16px 16px 0 0" }} />
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 10 }}>
          <div style={{
            width: 56, height: 56, borderRadius: "50%",
            background: adminData?.profile_image ? "transparent" : `linear-gradient(135deg, ${C.brand}, ${C.brandDark})`,
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 20, fontWeight: 500, color: "#fff",
            overflow: "hidden", border: `3px solid ${C.brandLight}`,
          }}>
            {adminData?.profile_image
              ? <img src={adminData.profile_image} alt="avatar" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
              : initials
            }
          </div>
          <div style={{ textAlign: "center" }}>
            <div style={{ fontSize: 13, fontWeight: 500, color: C.text }}>{adminData?.organisation_name || `${adminData?.f_name || ""} ${adminData?.l_name || ""}`.trim() || "Admin"}</div>
            <div style={{ fontSize: 11, color: C.muted, marginTop: 2 }}>{adminData?.work_email || adminData?.email || "—"}</div>
            <div style={{ marginTop: 8 }}>
              <Badge>{adminData?.role || "admin"}</Badge>
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
                transition: "all 0.15s", textAlign: "left",
              }}
            >
              {t.icon}
              {t.label}
              {active && (
                <div style={{ marginLeft: "auto", width: 5, height: 5, borderRadius: "50%", background: C.brand }} />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function ProfileTab({ adminData }) {
  const joined = adminData?.createdAt;
  const joinedFmt = joined ? new Date(joined).toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" }) : "—";
  const lastLogin = adminData?.last_login ? new Date(adminData.last_login).toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" }) : "—";

  return (
    <>
      <SectionCard title="Personal details" subtitle="Your core information on record" accent={C.brand}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0 20px" }}>
          <ReadonlyField label="First name"    value={adminData?.f_name} />
          <ReadonlyField label="Last name"     value={adminData?.l_name} />
          <ReadonlyField label="Work email"    value={adminData?.work_email} />
          <ReadonlyField label="Employee ID"   value={adminData?.uid} />
          <ReadonlyField label="Gender"        value={adminData?.gender} />
          <ReadonlyField label="Marital status" value={adminData?.marital_status} />
        </div>
      </SectionCard>

      <SectionCard title="Job information" subtitle="Your current role and team" accent={C.blue}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0 20px" }}>
          <ReadonlyField label="Role"            value={adminData?.role} />
          <ReadonlyField label="Designation"     value={adminData?.designation} />
          <ReadonlyField label="Department"      value={adminData?.department} />
          <ReadonlyField label="Office location" value={adminData?.office_location} />
          <ReadonlyField label="Date of joining" value={joinedFmt} />
          <ReadonlyField label="Account status"  value={adminData?.status} />
          <ReadonlyField label="Email verified"  value={adminData?.isVerified ? "✓ Verified" : "Not verified"} />
          <ReadonlyField label="Last login"      value={lastLogin} />
        </div>
      </SectionCard>

      <SectionCard title="Experience" subtitle="Your work background" accent={C.amber}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0 20px" }}>
          <ReadonlyField label="Fresher"                   value={adminData?.is_fresher ? "Yes" : "No"} />
          <ReadonlyField label="Total experience (years)"  value={adminData?.total_experience !== undefined ? String(adminData.total_experience) : "—"} />
          <ReadonlyField label="Previous company"          value={adminData?.previous_company} />
          <ReadonlyField label="Previous designation"      value={adminData?.previous_designation} />
        </div>
      </SectionCard>

      <SectionCard title="Banking details" subtitle="Your bank information on record" accent={C.green}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0 20px" }}>
          <ReadonlyField label="Bank name"           value={adminData?.bank_name} />
          <ReadonlyField label="Account holder name" value={adminData?.account_holder_name} />
          <ReadonlyField label="Account number"      value={adminData?.account_number} />
          <ReadonlyField label="IFSC code"           value={adminData?.ifsc_code} />
        </div>
      </SectionCard>
    </>
  );
}

function ContactTab({ adminData, onSuccess, onError }) {
  const queryClient = useQueryClient();
  const editProfileMutation = useEditAdminProfile();

  const [form, setForm] = useState({
    phone:           adminData?.phone           || "",
    e_contact:       adminData?.e_contact       || "",
    marital_status:  adminData?.marital_status  || "single",
    gender:          adminData?.gender          || "male",
    designation:     adminData?.designation     || "",
    office_location: adminData?.office_location || "Bareilly",
  });

  useEffect(() => {
    if (adminData) {
      setForm({
        phone:           adminData.phone           || "",
        e_contact:       adminData.e_contact       || "",
        marital_status:  adminData.marital_status  || "single",
        gender:          adminData.gender          || "male",
        designation:     adminData.designation     || "",
        office_location: adminData.office_location || "Bareilly",
      });
    }
  }, [adminData]);

  const handleSave = () => {
    if (!form.phone) { onError("Phone number is required"); return; }
    editProfileMutation.mutate(
      { phone: form.phone, profile_image: adminData?.profile_image || "" },
      {
        onSuccess: (data) => {
          queryClient.setQueryData(["auth"], old =>
            old ? { ...old, data: { ...old.data, ...(data.admin || { phone: form.phone }) } } : old
          );
          queryClient.invalidateQueries({ queryKey: ["auth"] });
          onSuccess("Contact info updated successfully!");
        },
        onError: (err) => onError(getErrorMessage(err)),
      }
    );
  };

  const MARITAL_OPTIONS = ["single", "married", "divorced"];
  const OFFICE_LOCATIONS = ["Noida", "Bareilly", "Delhi", "Mumbai"];

  return (
    <SectionCard title="Contact & office information" subtitle="Fields you can update yourself" accent={C.green}>
      <InputField
        label="Phone number"
        type="tel"
        value={form.phone}
        onChange={e => setForm(p => ({ ...p, phone: e.target.value }))}
        placeholder="Enter phone number"
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
        label="Designation"
        value={form.designation}
        onChange={e => setForm(p => ({ ...p, designation: e.target.value }))}
        placeholder="Enter your designation"
      />
      <div style={{ marginBottom: 16 }}>
        <FieldLabel>Office location</FieldLabel>
        <select
          value={form.office_location}
          onChange={e => setForm(p => ({ ...p, office_location: e.target.value }))}
          style={{
            width: "100%", padding: "10px 14px",
            borderRadius: 10, border: `0.5px solid ${C.border}`,
            fontSize: 13, color: C.text, background: C.surface,
            fontFamily: "inherit", outline: "none", boxSizing: "border-box",
          }}
          onFocus={e => e.target.style.borderColor = C.brand}
          onBlur={e => e.target.style.borderColor = C.border}
        >
          {OFFICE_LOCATIONS.map(o => <option key={o} value={o}>{o}</option>)}
        </select>
      </div>
      <div style={{ marginBottom: 20 }}>
        <FieldLabel>Gender</FieldLabel>
        <div style={{ display: "flex", gap: 10 }}>
          {["male", "female"].map(opt => {
            const active = form.gender === opt;
            return (
              <button
                key={opt}
                onClick={() => setForm(p => ({ ...p, gender: opt }))}
                style={{
                  flex: 1, padding: "10px 0",
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
        <div style={{ display: "flex", gap: 10 }}>
          {MARITAL_OPTIONS.map(opt => {
            const active = form.marital_status === opt;
            return (
              <button
                key={opt}
                onClick={() => setForm(p => ({ ...p, marital_status: opt }))}
                style={{
                  flex: 1, padding: "10px 0",
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
      <PrimaryButton onClick={handleSave} loading={editProfileMutation.isPending}>
        Save contact info
      </PrimaryButton>
    </SectionCard>
  );
}

function AddressTab({ adminData, onSuccess, onError }) {
  const queryClient = useQueryClient();
  const editProfileMutation = useEditAdminProfile();

  const [form, setForm] = useState({
    address: adminData?.address || "",
    city:    adminData?.city    || "",
    state:   adminData?.state   || "",
    pincode: adminData?.pincode || "",
  });

  useEffect(() => {
    if (adminData) {
      setForm({
        address: adminData.address || "",
        city:    adminData.city    || "",
        state:   adminData.state   || "",
        pincode: adminData.pincode || "",
      });
    }
  }, [adminData]);

  const handleSave = () => {
    editProfileMutation.mutate(
      { ...form, phone: adminData?.phone || "", profile_image: adminData?.profile_image || "" },
      {
        onSuccess: (data) => {
          queryClient.setQueryData(["auth"], old =>
            old ? { ...old, data: { ...old.data, ...(data.admin || form) } } : old
          );
          queryClient.invalidateQueries({ queryKey: ["auth"] });
          onSuccess("Address updated successfully!");
        },
        onError: (err) => onError(getErrorMessage(err)),
      }
    );
  };

  return (
    <SectionCard title="Address information" subtitle="Your residential details" accent={C.amber}>
      <InputField
        label="Address"
        value={form.address}
        onChange={e => setForm(p => ({ ...p, address: e.target.value }))}
        placeholder="Enter your address"
      />
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0 16px" }}>
        <InputField
          label="City"
          value={form.city}
          onChange={e => setForm(p => ({ ...p, city: e.target.value }))}
          placeholder="City"
        />
        <InputField
          label="State"
          value={form.state}
          onChange={e => setForm(p => ({ ...p, state: e.target.value }))}
          placeholder="State"
        />
      </div>
      <InputField
        label="Pincode"
        value={form.pincode}
        onChange={e => setForm(p => ({ ...p, pincode: e.target.value }))}
        placeholder="Enter pincode"
      />
      <PrimaryButton onClick={handleSave} loading={editProfileMutation.isPending}>
        Save address
      </PrimaryButton>
    </SectionCard>
  );
}

function DocumentsTab({ adminData }) {
  const docFields = [
    { label: "Aadhaar number",      value: adminData?.aadhaar_number },
    { label: "PAN number",          value: adminData?.pan_number },
    { label: "Bank name",           value: adminData?.bank_name },
    { label: "Account holder name", value: adminData?.account_holder_name },
    { label: "Account number",      value: adminData?.account_number },
    { label: "IFSC code",           value: adminData?.ifsc_code },
  ];

  const fileFields = [
    { label: "Resume",            value: adminData?.resume },
    { label: "Aadhaar card",      value: adminData?.aadhaar_card },
    { label: "PAN card",          value: adminData?.pan_card },
    { label: "Experience letter", value: adminData?.experience_letter },
  ];

  return (
    <>
      <SectionCard title="Identity & banking" subtitle="Your identity and bank details on record" accent={C.brand}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0 20px" }}>
          {docFields.map(f => (
            <ReadonlyField key={f.label} label={f.label} value={f.value} />
          ))}
        </div>
      </SectionCard>

      <SectionCard title="Uploaded documents" subtitle="Files submitted during onboarding" accent={C.blue}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0 20px" }}>
          {fileFields.map(f => (
            <div key={f.label} style={{ marginBottom: 16 }}>
              <FieldLabel>{f.label}</FieldLabel>
              <div style={{
                padding: "10px 14px", borderRadius: 10,
                background: "#f9f4f2", border: `0.5px solid ${C.border}`,
                fontSize: 13, color: f.value ? C.blue : C.muted, fontWeight: 500,
                display: "flex", alignItems: "center", gap: 8,
              }}>
                {f.value
                  ? <><svg width="14" height="14" viewBox="0 0 14 14" fill="none"><rect x="2" y="1" width="10" height="12" rx="2" stroke={C.blue} strokeWidth="1.3"/><path d="M4.5 4.5h5M4.5 7h5M4.5 9.5h3" stroke={C.blue} strokeWidth="1.2" strokeLinecap="round"/></svg>Uploaded</>
                  : "Not uploaded"
                }
              </div>
              <div style={{ fontSize: 11, color: C.mutedMid, marginTop: 4 }}>Read-only</div>
            </div>
          ))}
        </div>
      </SectionCard>
    </>
  );
}

function PasswordTab({ onSuccess, onError }) {
  const changePasswordMutation = useChangeAdminPassword();
  const [show, setShow] = useState(false);
  const [form, setForm] = useState({ currentPassword: "", newPassword: "", confirm: "" });

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
  const strengthLabel = ["", "Weak", "Fair", "Good", "Strong", "Very strong"][s];
  const strengthColor = ["", C.red, C.amber, "#f9a825", C.green, C.green][s];

  const EyeIcon = ({ open }) => open
    ? <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M1 8s2.5-5 7-5 7 5 7 5-2.5 5-7 5-7-5-7-5z" stroke={C.muted} strokeWidth="1.3"/><circle cx="8" cy="8" r="2" stroke={C.muted} strokeWidth="1.3"/></svg>
    : <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M1 8s2.5-5 7-5 7 5 7 5-2.5 5-7 5-7-5-7-5z" stroke={C.muted} strokeWidth="1.3"/><line x1="2" y1="2" x2="14" y2="14" stroke={C.muted} strokeWidth="1.3" strokeLinecap="round"/></svg>;

  const handleChange = () => {
    if (!form.currentPassword || !form.newPassword) { onError("All password fields are required"); return; }
    if (form.newPassword !== form.confirm) { onError("New passwords do not match"); return; }
    if (form.newPassword.length < 6) { onError("Password must be at least 6 characters"); return; }
    if (form.currentPassword === form.newPassword) { onError("New password must differ from current password"); return; }
    changePasswordMutation.mutate(
      { currentPassword: form.currentPassword, newPassword: form.newPassword },
      {
        onSuccess: () => {
          setForm({ currentPassword: "", newPassword: "", confirm: "" });
          onSuccess("Password changed successfully!");
        },
        onError: (err) => onError(getErrorMessage(err)),
      }
    );
  };

  const eyeToggle = (
    <button type="button" onClick={() => setShow(v => !v)} style={{ background: "none", border: "none", cursor: "pointer", display: "flex", padding: 0 }}>
      <EyeIcon open={show} />
    </button>
  );

  return (
    <SectionCard title="Change password" subtitle="Keep your admin account secure with a strong password" accent={C.brand}>
      <div style={{ maxWidth: 400 }}>
        <InputField label="Current password *" type={show ? "text" : "password"} name="currentPassword"
          value={form.currentPassword} onChange={e => setForm(p => ({ ...p, currentPassword: e.target.value }))}
          placeholder="Enter current password" rightEl={eyeToggle} />

        <InputField label="New password *" type={show ? "text" : "password"} name="newPassword"
          value={form.newPassword} onChange={e => setForm(p => ({ ...p, newPassword: e.target.value }))}
          placeholder="Enter new password" rightEl={eyeToggle} />

        {form.newPassword && (
          <div style={{ marginTop: -8, marginBottom: 16 }}>
            <div style={{ display: "flex", gap: 4, marginBottom: 5 }}>
              {[1, 2, 3, 4, 5].map(i => (
                <div key={i} style={{ flex: 1, height: 3, borderRadius: 3, background: i <= s ? strengthColor : C.border, transition: "background 0.2s" }} />
              ))}
            </div>
            <div style={{ fontSize: 11, color: strengthColor, fontWeight: 500 }}>{strengthLabel}</div>
          </div>
        )}

        <InputField label="Confirm new password *" type={show ? "text" : "password"} name="confirm"
          value={form.confirm} onChange={e => setForm(p => ({ ...p, confirm: e.target.value }))}
          placeholder="Confirm new password"
          hint={form.confirm && form.newPassword !== form.confirm ? "Passwords do not match" : ""}
        />

        <PrimaryButton onClick={handleChange} loading={changePasswordMutation.isPending}>
          Update password
        </PrimaryButton>

        <div style={{ marginTop: 16, padding: "12px 14px", background: C.brandLight, borderRadius: 10, fontSize: 12, color: C.brandDark, lineHeight: 1.6 }}>
          Tips: use 10+ characters, mix uppercase, numbers and symbols for a strong password.
        </div>
      </div>
    </SectionCard>
  );
}

function AvatarTab({ adminData, onSuccess, onError }) {
  const queryClient = useQueryClient();
  const editProfileMutation = useEditAdminProfile();
  const [currentImg, setCurrentImg] = useState(adminData?.profile_image || "");
  const [pending, setPending] = useState(null);

  useEffect(() => { setCurrentImg(adminData?.profile_image || ""); }, [adminData]);

  const initials = getOrgInitials(adminData?.organisation_name || `${adminData?.f_name || ""} ${adminData?.l_name || ""}`);
  const seed = initials || "default";

  const applyAvatar = (url) => {
    setPending(url);
    setCurrentImg(url);
    editProfileMutation.mutate(
      { phone: adminData?.phone || "", profile_image: url },
      {
        onSuccess: (data) => {
          queryClient.setQueryData(["auth"], old =>
            old ? { ...old, data: { ...old.data, ...(data.admin || { profile_image: url }) } } : old
          );
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

  const removeAvatar = () => applyAvatar("");

  return (
    <SectionCard title="Profile avatar" subtitle="Choose an avatar that represents you" accent={C.blue}>
      <div style={{ display: "flex", alignItems: "center", gap: 20, marginBottom: 24, padding: "16px 20px", background: C.page, borderRadius: 12, border: `0.5px solid ${C.border}` }}>
        <div style={{
          width: 72, height: 72, borderRadius: "50%",
          background: currentImg ? "transparent" : `linear-gradient(135deg, ${C.brand}, ${C.brandDark})`,
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
        <div>
          <div style={{ fontSize: 13, fontWeight: 500, color: C.text, marginBottom: 4 }}>Current avatar</div>
          <div style={{ fontSize: 12, color: C.muted, marginBottom: 10 }}>
            {currentImg ? "DiceBear avatar" : "Initials avatar (default)"}
          </div>
          {currentImg && (
            <button
              onClick={removeAvatar}
              disabled={editProfileMutation.isPending}
              style={{ fontSize: 12, color: C.red, background: "none", border: "none", cursor: "pointer", fontFamily: "inherit", padding: 0, fontWeight: 500 }}
            >
              Remove avatar
            </button>
          )}
        </div>
      </div>

      <FieldLabel>Choose a style</FieldLabel>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 10 }}>
        {AVATAR_STYLES.map(style => {
          const url = `https://api.dicebear.com/7.x/${style}/svg?seed=${seed}`;
          const isActive = currentImg?.includes(style);
          const isLoading = pending === url;
          return (
            <button
              key={style}
              onClick={() => applyAvatar(url)}
              disabled={editProfileMutation.isPending}
              style={{
                padding: "12px 8px", borderRadius: 12,
                border: `0.5px solid ${isActive ? C.brand : C.border}`,
                background: isActive ? C.brandLight : C.surface,
                cursor: editProfileMutation.isPending ? "not-allowed" : "pointer",
                transition: "all 0.15s", position: "relative",
                outline: isActive ? `2px solid ${C.brand}` : "none",
                outlineOffset: 2,
              }}
            >
              {isLoading && (
                <div style={{ position: "absolute", inset: 0, borderRadius: 12, background: "rgba(255,255,255,0.7)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <Spinner size={18} color={C.brand} />
                </div>
              )}
              <img src={url} alt={style} style={{ width: "100%", aspectRatio: "1", display: "block", borderRadius: 8 }} />
              <div style={{ fontSize: 10, color: isActive ? C.brand : C.muted, marginTop: 6, textAlign: "center", fontWeight: isActive ? 500 : 400, textTransform: "capitalize" }}>
                {style}
              </div>
            </button>
          );
        })}
      </div>
    </SectionCard>
  );
}

function SystemTab({ onSuccess }) {
  const [theme, setTheme] = useState("Light");
  const [language, setLanguage] = useState("English");

  const THEME_OPTIONS = ["Light", "Dark", "Auto"];
  const LANGUAGE_OPTIONS = ["English", "Hindi"];

  return (
    <SectionCard title="System preferences" subtitle="Customize your admin dashboard experience" accent={C.brandDark}>
      <div style={{ maxWidth: 400 }}>
        <div style={{ marginBottom: 16 }}>
          <FieldLabel>Theme</FieldLabel>
          <select
            value={theme}
            onChange={e => setTheme(e.target.value)}
            style={{
              width: "100%", padding: "10px 14px",
              borderRadius: 10, border: `0.5px solid ${C.border}`,
              fontSize: 13, color: C.text, background: C.surface,
              fontFamily: "inherit", outline: "none", boxSizing: "border-box",
            }}
            onFocus={e => e.target.style.borderColor = C.brand}
            onBlur={e => e.target.style.borderColor = C.border}
          >
            {THEME_OPTIONS.map(o => <option key={o} value={o}>{o}</option>)}
          </select>
        </div>
        <div style={{ marginBottom: 20 }}>
          <FieldLabel>Language</FieldLabel>
          <select
            value={language}
            onChange={e => setLanguage(e.target.value)}
            style={{
              width: "100%", padding: "10px 14px",
              borderRadius: 10, border: `0.5px solid ${C.border}`,
              fontSize: 13, color: C.text, background: C.surface,
              fontFamily: "inherit", outline: "none", boxSizing: "border-box",
            }}
            onFocus={e => e.target.style.borderColor = C.brand}
            onBlur={e => e.target.style.borderColor = C.border}
          >
            {LANGUAGE_OPTIONS.map(o => <option key={o} value={o}>{o}</option>)}
          </select>
        </div>
        <PrimaryButton onClick={() => onSuccess("System settings saved!")} color={C.brandDark}>
          Save settings
        </PrimaryButton>
      </div>
    </SectionCard>
  );
}

export default function AdminSettingsPage() {
  const [tab, setTab] = useState("profile");
  const [toast, setToast] = useState({ message: "", type: "" });

  const { data: auth } = useAuth();
  const adminData = auth?.data;

  const showSuccess = (msg) => setToast({ message: msg, type: "success" });
  const showError   = (msg) => setToast({ message: msg, type: "error" });

  const initials = getOrgInitials(adminData?.organisation_name || `${adminData?.f_name || ""} ${adminData?.l_name || ""}`);

  if (!adminData) {
    return (
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: C.page, fontFamily: "'DM Sans','Segoe UI',sans-serif" }}>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 16 }}>
          <Spinner size={36} color={C.brand} />
          <div style={{ fontSize: 13, color: C.muted }}>Loading admin profile...</div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ fontFamily: "'DM Sans','Segoe UI',sans-serif", background: C.page, minHeight: "100vh", padding: "28px 32px", color: C.text }}>
      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes slideIn { from { opacity:0; transform:translateX(20px); } to { opacity:1; transform:translateX(0); } }
        input:focus { border-color: ${C.brand} !important; box-shadow: 0 0 0 3px ${C.brandLight}; }
        select:focus { border-color: ${C.brand} !important; box-shadow: 0 0 0 3px ${C.brandLight}; outline: none; }
        button:not([disabled]):hover { opacity: 0.88; }
      `}</style>

      <Toast message={toast.message} type={toast.type} onClose={() => setToast({ message: "", type: "" })} />

      <div style={{ marginBottom: 28 }}>
        <h1 style={{ fontSize: 22, fontWeight: 500, margin: 0, letterSpacing: "-0.3px" }}>Settings</h1>
        <p style={{ fontSize: 13, color: C.muted, marginTop: 4 }}>Manage your admin profile, contact info and security</p>
      </div>

      <div style={{ display: "flex", gap: 16, alignItems: "flex-start" }}>
        <Sidebar tab={tab} setTab={setTab} adminData={adminData} initials={initials} />

        <div style={{ flex: 1, minWidth: 0 }}>
          {tab === "profile"   && <ProfileTab   adminData={adminData} />}
          {tab === "contact"   && <ContactTab   adminData={adminData} onSuccess={showSuccess} onError={showError} />}
          {tab === "address"   && <AddressTab   adminData={adminData} onSuccess={showSuccess} onError={showError} />}
          {tab === "documents" && <DocumentsTab adminData={adminData} />}
          {tab === "password"  && <PasswordTab  onSuccess={showSuccess} onError={showError} />}
          {tab === "avatar"    && <AvatarTab    adminData={adminData} onSuccess={showSuccess} onError={showError} />}
          {tab === "system"    && <SystemTab    onSuccess={showSuccess} />}

          <div style={{ textAlign: "center", fontSize: 12, color: C.mutedMid, marginTop: 8 }}>
            Changes are saved to your account automatically
          </div>
        </div>
      </div>
    </div>
  );
}