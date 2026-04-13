import { useState, useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  useGetMeManager,
} from "../../auth/server-state/manager/managerauth/managerauth.hook";
import { useUpdateProfile,useUpdatePassword } from "../../auth/server-state/manager/managgerother/managerother.hook";

const AVATAR_STYLES = [
  "avataaars", "bottts", "personas", "lorelei",
  "micah", "open-peeps", "big-ears", "croodles",
];
const MARITAL_OPTIONS = ["single", "married", "divorced"];
const OFFICE_LOCATIONS = ["Noida", "Bareilly", "Delhi", "Mumbai"];

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

// ─── UTILS ────────────────────────────────────────────────────────────────
function getInitials(fName = "", lName = "") {
  return `${(fName[0] || "").toUpperCase()}${(lName[0] || "").toUpperCase()}`;
}

function getErrorMessage(err) {
  return err?.response?.data?.message || err?.message || "Something went wrong";
}

// ─── SMALL UI PRIMITIVES ──────────────────────────────────────────────────
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
    if (!message) return;
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
      boxShadow: "0 4px 24px rgba(115,0,66,0.10)",
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
  return (
    <div style={{ fontSize: 12, fontWeight: 500, color: C.muted, marginBottom: 6, letterSpacing: "0.2px" }}>
      {children}
    </div>
  );
}

function ReadonlyField({ value, label }) {
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
      {hint && <div style={{ fontSize: 11, color: C.mutedMid, marginTop: 4 }}>{hint}</div>}
    </div>
  );
}

function SelectField({ label, value, onChange, options, hint }) {
  return (
    <div style={{ marginBottom: 16 }}>
      <FieldLabel>{label}</FieldLabel>
      <select
        value={value}
        onChange={onChange}
        style={{
          width: "100%", padding: "10px 14px",
          borderRadius: 10, border: `0.5px solid ${C.border}`,
          fontSize: 13, color: C.text, background: C.surface,
          fontFamily: "inherit", outline: "none",
          boxSizing: "border-box",
        }}
        onFocus={e => e.target.style.borderColor = C.brand}
        onBlur={e => e.target.style.borderColor = C.border}
      >
        {options.map(o => <option key={o} value={o}>{o}</option>)}
      </select>
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
        fontSize: 13, fontWeight: 500,
        cursor: disabled || loading ? "not-allowed" : "pointer",
        display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
        transition: "opacity 0.15s", fontFamily: "inherit",
      }}
    >
      {loading ? <><Spinner />{children}</> : children}
    </button>
  );
}

// ─── SIDEBAR ──────────────────────────────────────────────────────────────
function Sidebar({ tab, setTab, manager, initials }) {
  const tabs = [
    {
      key: "profile", label: "Profile",
      icon: <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><circle cx="8" cy="5" r="3" stroke="currentColor" strokeWidth="1.4" /><path d="M2 13c0-3.314 2.686-5 6-5s6 1.686 6 5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" /></svg>,
    },
    {
      key: "contact", label: "Contact & office",
      icon: <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><rect x="2" y="2" width="12" height="12" rx="3" stroke="currentColor" strokeWidth="1.4" /><path d="M5 6h6M5 9h4" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" /></svg>,
    },
    {
      key: "password", label: "Password",
      icon: <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><rect x="4" y="7" width="8" height="6" rx="2" stroke="currentColor" strokeWidth="1.4" /><path d="M6 7V5a2 2 0 0 1 4 0v2" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" /></svg>,
    },
    {
      key: "avatar", label: "Avatar",
      icon: <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><circle cx="8" cy="8" r="6" stroke="currentColor" strokeWidth="1.4" /><circle cx="8" cy="6" r="2" stroke="currentColor" strokeWidth="1.2" /><path d="M4 12.5c0-2.2 1.8-3.5 4-3.5s4 1.3 4 3.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" /></svg>,
    },
  ];

  return (
    <div style={{ width: 220, flexShrink: 0 }}>
      {/* Profile mini card */}
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
            background: manager?.profile_image ? "transparent" : C.brand,
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 20, fontWeight: 500, color: "#fff",
            overflow: "hidden", border: `3px solid ${C.brandLight}`,
          }}>
            {manager?.profile_image
              ? <img src={manager.profile_image} alt="avatar" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
              : initials
            }
          </div>
          <div style={{ textAlign: "center" }}>
            <div style={{ fontSize: 13, fontWeight: 500, color: C.text }}>{manager?.f_name} {manager?.l_name}</div>
            <div style={{ fontSize: 11, color: C.muted, marginTop: 2 }}>{manager?.designation || "—"}</div>
            <div style={{ marginTop: 8 }}>
              <Badge>{manager?.role || "manager"}</Badge>
            </div>
          </div>
        </div>
      </div>

      {/* Nav */}
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
                border: "none",
                borderBottom: i < tabs.length - 1 ? `0.5px solid ${C.border}` : "none",
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

// ─── PROFILE TAB ──────────────────────────────────────────────────────────
function ProfileTab({ manager }) {
  const joined = manager?.createdAt
    ? new Date(manager.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" })
    : "—";

  return (
    <>
      <SectionCard title="Personal details" subtitle="Your core information on record" accent={C.brand}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0 20px" }}>
          <ReadonlyField label="First name"  value={manager?.f_name} />
          <ReadonlyField label="Last name"   value={manager?.l_name} />
          <ReadonlyField label="Work email"  value={manager?.work_email} />
          <ReadonlyField label="Employee ID" value={manager?.uid} />
          <ReadonlyField label="Role"        value={manager?.role} />
          <ReadonlyField label="Department"  value={manager?.department} />
        </div>
      </SectionCard>

      <SectionCard title="Job & location" subtitle="Current role, office and account info" accent={C.blue}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0 20px" }}>
          <ReadonlyField label="Designation"     value={manager?.designation} />
          <ReadonlyField label="Office location" value={manager?.office_location} />
          <ReadonlyField label="Gender"          value={manager?.gender} />
          <ReadonlyField label="Date joined"     value={joined} />
          <ReadonlyField label="Account status"  value={manager?.status} />
          <ReadonlyField label="Email verified"  value={manager?.isVerified ? "✓ Verified" : "Not verified"} />
        </div>
      </SectionCard>
    </>
  );
}

// ─── CONTACT TAB ──────────────────────────────────────────────────────────
function ContactTab({ manager, onSuccess, onError }) {
  const queryClient = useQueryClient();
  const editProfile = useUpdateProfile();

  const [form, setForm] = useState({
    personal_contact: manager?.personal_contact || "",
    e_contact:        manager?.e_contact        || "",
    marital_status:   manager?.marital_status   || "single",
    office_location:  manager?.office_location  || "Noida",
    designation:      manager?.designation      || "",
  });

  useEffect(() => {
    if (manager) {
      setForm({
        personal_contact: manager.personal_contact || "",
        e_contact:        manager.e_contact        || "",
        marital_status:   manager.marital_status   || "single",
        office_location:  manager.office_location  || "Noida",
        designation:      manager.designation      || "",
      });
    }
  }, [manager]);

  const handleSave = () => {
    if (!form.personal_contact) { onError("Personal contact is required"); return; }
    editProfile.mutate(form, {
      onSuccess: (data) => {
        queryClient.setQueryData(["meManager"], old =>
          old ? { ...old, manager: { ...old.manager, ...data.manager } } : old
        );
        queryClient.invalidateQueries({ queryKey: ["meManager"] });
        onSuccess("Contact info updated successfully!");
      },
      onError: (err) => onError(getErrorMessage(err)),
    });
  };

  return (
    <SectionCard title="Contact & office information" subtitle="Fields you can update yourself" accent={C.green}>
      <InputField
        label="Personal contact" type="tel"
        value={form.personal_contact}
        onChange={e => setForm(p => ({ ...p, personal_contact: e.target.value }))}
        placeholder="Enter personal phone number"
      />
      <InputField
        label="Emergency contact" type="tel"
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
      <SelectField
        label="Office location"
        value={form.office_location}
        onChange={e => setForm(p => ({ ...p, office_location: e.target.value }))}
        options={OFFICE_LOCATIONS}
      />
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
      <PrimaryButton onClick={handleSave} loading={editProfile.isPending} color={C.green}>
        Save contact info
      </PrimaryButton>
    </SectionCard>
  );
}


function PasswordTab({ onSuccess, onError }) {
  const changePassword = useUpdatePassword();
  const [show, setShow] = useState(false);
  const [form, setForm] = useState({ oldPassword: "", newPassword: "", confirm: "" });

  const strength = (pw) => {
    if (!pw) return 0;
    let s = 0;
    if (pw.length >= 6)          s++;
    if (pw.length >= 10)         s++;
    if (/[A-Z]/.test(pw))        s++;
    if (/[0-9]/.test(pw))        s++;
    if (/[^a-zA-Z0-9]/.test(pw)) s++;
    return s;
  };

  const s = strength(form.newPassword);
  const strengthLabel = ["", "Weak", "Fair", "Good", "Strong", "Very strong"][s];
  const strengthColor = ["", C.red, C.amber, "#f9a825", C.green, C.green][s];

  const EyeIcon = ({ open }) => open
    ? <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M1 8s2.5-5 7-5 7 5 7 5-2.5 5-7 5-7-5-7-5z" stroke={C.muted} strokeWidth="1.3" /><circle cx="8" cy="8" r="2" stroke={C.muted} strokeWidth="1.3" /></svg>
    : <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M1 8s2.5-5 7-5 7 5 7 5-2.5 5-7 5-7-5-7-5z" stroke={C.muted} strokeWidth="1.3" /><line x1="2" y1="2" x2="14" y2="14" stroke={C.muted} strokeWidth="1.3" strokeLinecap="round" /></svg>;

  const eyeToggle = (
    <button type="button" onClick={() => setShow(v => !v)} style={{ background: "none", border: "none", cursor: "pointer", display: "flex", padding: 0 }}>
      <EyeIcon open={show} />
    </button>
  );

  const handleChange = () => {
    if (!form.oldPassword || !form.newPassword) { onError("All fields are required"); return; }
    if (form.newPassword !== form.confirm)       { onError("Passwords do not match"); return; }
    if (form.newPassword.length < 6)             { onError("Password must be at least 6 characters"); return; }
    if (form.oldPassword === form.newPassword)   { onError("New password must differ from old password"); return; }

    changePassword.mutate(
      { oldPassword: form.oldPassword, newPassword: form.newPassword },
      {
        onSuccess: () => {
          setForm({ oldPassword: "", newPassword: "", confirm: "" });
          onSuccess("Password changed successfully!");
        },
        onError: (err) => onError(getErrorMessage(err)),
      }
    );
  };

  return (
    <SectionCard title="Change password" subtitle="Keep your account secure with a strong password" accent={C.brand}>
      <div style={{ maxWidth: 400 }}>
        <InputField
          label="Current password *" type={show ? "text" : "password"} name="oldPassword"
          value={form.oldPassword}
          onChange={e => setForm(p => ({ ...p, oldPassword: e.target.value }))}
          placeholder="Enter current password" rightEl={eyeToggle}
        />
        <InputField
          label="New password *" type={show ? "text" : "password"} name="newPassword"
          value={form.newPassword}
          onChange={e => setForm(p => ({ ...p, newPassword: e.target.value }))}
          placeholder="Enter new password" rightEl={eyeToggle}
        />

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

        <InputField
          label="Confirm new password *" type={show ? "text" : "password"} name="confirm"
          value={form.confirm}
          onChange={e => setForm(p => ({ ...p, confirm: e.target.value }))}
          placeholder="Confirm new password"
          hint={form.confirm && form.newPassword !== form.confirm ? "Passwords do not match" : ""}
        />

        <PrimaryButton onClick={handleChange} loading={changePassword.isPending}>
          Update password
        </PrimaryButton>

        <div style={{ marginTop: 16, padding: "12px 14px", background: C.brandLight, borderRadius: 10, fontSize: 12, color: C.brand, lineHeight: 1.6 }}>
          Tips: use 10+ characters, mix uppercase, numbers and symbols for a strong password.
        </div>
      </div>
    </SectionCard>
  );
}

// ─── AVATAR TAB ───────────────────────────────────────────────────────────
function AvatarTab({ manager, onSuccess, onError }) {
  const queryClient = useQueryClient();
  const editProfile = useUpdateProfile();
  const [currentImg, setCurrentImg] = useState(manager?.profile_image || "");
  const [pending, setPending] = useState(null);

  useEffect(() => { setCurrentImg(manager?.profile_image || ""); }, [manager]);

  const initials = getInitials(manager?.f_name, manager?.l_name);
  const seed = initials || "default";

  const applyAvatar = (url) => {
    setPending(url);
    setCurrentImg(url);
    editProfile.mutate(
      { profile_image: url },
      {
        onSuccess: () => {
          queryClient.setQueryData(["meManager"], old =>
            old ? { ...old, manager: { ...old.manager, profile_image: url } } : old
          );
          queryClient.invalidateQueries({ queryKey: ["meManager"] });
          onSuccess("Avatar updated!");
          setPending(null);
        },
        onError: (err) => {
          setCurrentImg(manager?.profile_image || "");
          onError(getErrorMessage(err));
          setPending(null);
        },
      }
    );
  };

  const removeAvatar = () => applyAvatar("");

  return (
    <SectionCard title="Profile avatar" subtitle="Choose an avatar that represents you" accent={C.blue}>
      {/* Current preview */}
      <div style={{ display: "flex", alignItems: "center", gap: 20, marginBottom: 24, padding: "16px 20px", background: C.page, borderRadius: 12, border: `0.5px solid ${C.border}` }}>
        <div style={{
          width: 72, height: 72, borderRadius: "50%",
          background: currentImg ? "transparent" : C.brand,
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: 24, fontWeight: 500, color: "#fff",
          overflow: "hidden", border: `3px solid ${C.brandLight}`, flexShrink: 0,
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
              disabled={editProfile.isPending}
              style={{ fontSize: 12, color: C.red, background: "none", border: "none", cursor: "pointer", fontFamily: "inherit", padding: 0, fontWeight: 500 }}
            >
              Remove avatar
            </button>
          )}
        </div>
      </div>

      {/* Style grid */}
      <FieldLabel>Choose a style</FieldLabel>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 10 }}>
        {AVATAR_STYLES.map((style) => {
          const url = `https://api.dicebear.com/7.x/${style}/svg?seed=${seed}`;
          const isActive = currentImg?.includes(style);
          const isLoading = pending === url;
          return (
            <button
              key={style}
              onClick={() => applyAvatar(url)}
              disabled={editProfile.isPending}
              style={{
                padding: "12px 8px", borderRadius: 12,
                border: `0.5px solid ${isActive ? C.brand : C.border}`,
                background: isActive ? C.brandLight : C.surface,
                cursor: editProfile.isPending ? "not-allowed" : "pointer",
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

// ─── MAIN PAGE ────────────────────────────────────────────────────────────
export default function Setma() {
  const [tab, setTab] = useState("profile");
  const [toast, setToast] = useState({ message: "", type: "" });

  const { data: meData, isLoading } = useGetMeManager();
  const manager = meData?.manager ?? null;
  const initials = manager ? getInitials(manager.f_name, manager.l_name) : "—";

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
    <div style={{ fontFamily: "'DM Sans','Segoe UI',sans-serif", background: C.page, minHeight: "100vh", padding: "28px 32px", color: C.text }}>
      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes slideIn { from { opacity:0; transform:translateX(20px); } to { opacity:1; transform:translateX(0); } }
        input:focus { border-color: ${C.brand} !important; box-shadow: 0 0 0 3px ${C.brandLight}; }
        button:not([disabled]):hover { opacity: 0.88; }
      `}</style>

      <Toast message={toast.message} type={toast.type} onClose={() => setToast({ message: "", type: "" })} />

      <div style={{ marginBottom: 28 }}>
        <h1 style={{ fontSize: 22, fontWeight: 500, margin: 0, letterSpacing: "-0.3px" }}>Settings</h1>
        <p style={{ fontSize: 13, color: C.muted, marginTop: 4 }}>Manage your profile, contact info and security</p>
      </div>

      <div style={{ display: "flex", gap: 16, alignItems: "flex-start" }}>
        <Sidebar tab={tab} setTab={setTab} manager={manager} initials={initials} />

        <div style={{ flex: 1, minWidth: 0 }}>
          {tab === "profile"  && <ProfileTab  manager={manager} />}
          {tab === "contact"  && <ContactTab  manager={manager} onSuccess={showSuccess} onError={showError} />}
          {tab === "password" && <PasswordTab onSuccess={showSuccess} onError={showError} />}
          {tab === "avatar"   && <AvatarTab   manager={manager} onSuccess={showSuccess} onError={showError} />}

          <div style={{ textAlign: "center", fontSize: 12, color: C.mutedMid, marginTop: 8 }}>
            Changes are saved to your account automatically
          </div>
        </div>
      </div>
    </div>
  );
}