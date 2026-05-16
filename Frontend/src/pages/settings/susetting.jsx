import { useState, useEffect } from "react";
import React from "react";
import {
  useGetMeSuperAdmin,
  useUpdateSuperAdminProfile,
} from "../../auth/server-state/superadmin/auth/suauth.hook";
import { useChangeSuperAdminPassword } from "../../auth/server-state/superadmin/other/suother.hook";
import { useQueryClient } from "@tanstack/react-query";

// ─── CONSTANTS ────────────────────────────────────────────────────────────
const AVATAR_STYLES = [
  "avataaars", "bottts", "personas", "lorelei",
  "micah", "open-peeps", "big-ears", "croodles",
];

const INDUSTRY_OPTIONS = [
  "Technology", "Healthcare", "Finance", "Education",
  "Retail", "Manufacturing", "Consulting", "Real Estate", "Other",
];

const COMPANY_SIZE_OPTIONS = [
  "1–10", "11–50", "51–200", "201–500", "501–1000", "1000+",
];

// ─── BRAND COLORS (matches superadmin palette) ────────────────────────────
const C = {
  brand:      "#730042",
  brandLight: "rgba(115,0,66,0.08)",
  brandMid:   "rgba(115,0,66,0.18)",
  grad1:      "#730042",
  grad2:      "#CD166E",
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

function formatDate(dateStr) {
  if (!dateStr) return "—";
  return new Date(dateStr).toLocaleDateString("en-IN", {
    day: "numeric", month: "long", year: "numeric",
  });
}

function daysLeft(dateStr) {
  if (!dateStr) return null;
  const diff = new Date(dateStr) - new Date();
  return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
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

function PlanBadge({ plan }) {
  const isTrial = plan === "trial" || plan === "free_trial";
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", gap: 4,
      padding: "3px 10px", borderRadius: 20,
      fontSize: 11, fontWeight: 600,
      color: isTrial ? C.amber : "#1a5c3a",
      background: isTrial ? C.amberBg : C.greenBg,
      border: `0.5px solid ${isTrial ? "#f5d98a" : "#a8dfc3"}`,
    }}>
      {isTrial ? "⏱ Free Trial" : "✓ " + (plan || "Active")}
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
          ? <svg width="14" height="14" viewBox="0 0 14 14"><polyline points="2,7 5.5,10.5 12,4" fill="none" stroke={C.green} strokeWidth="2" strokeLinecap="round"/></svg>
          : <svg width="14" height="14" viewBox="0 0 14 14"><line x1="3" y1="3" x2="11" y2="11" stroke={C.red} strokeWidth="2" strokeLinecap="round"/><line x1="11" y1="3" x2="3" y2="11" stroke={C.red} strokeWidth="2" strokeLinecap="round"/></svg>
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

function InputField({ label, value, onChange, type = "text", placeholder, hint, rightEl, name, disabled }) {
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
          disabled={disabled}
          style={{
            width: "100%", padding: "10px 14px",
            paddingRight: rightEl ? 40 : 14,
            borderRadius: 10, border: `0.5px solid ${C.border}`,
            fontSize: 13, color: C.text, background: disabled ? "#f9f4f2" : C.surface,
            outline: "none", fontFamily: "inherit",
            transition: "border-color 0.15s",
            boxSizing: "border-box",
            cursor: disabled ? "not-allowed" : "text",
          }}
          onFocus={e => { if (!disabled) e.target.style.borderColor = C.brand; }}
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
          outline: "none", fontFamily: "inherit",
          appearance: "none",
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='10' height='6' viewBox='0 0 10 6' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M1 1l4 4 4-4' stroke='%23b0948a' fill='none' stroke-width='1.5' stroke-linecap='round'/%3E%3C/svg%3E")`,
          backgroundRepeat: "no-repeat",
          backgroundPosition: "right 14px center",
          paddingRight: 36,
          cursor: "pointer",
          boxSizing: "border-box",
        }}
        onFocus={e => e.target.style.borderColor = C.brand}
        onBlur={e => e.target.style.borderColor = C.border}
      >
        {options.map(opt => (
          <option key={opt} value={opt}>{opt}</option>
        ))}
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
        fontSize: 13, fontWeight: 500, cursor: disabled || loading ? "not-allowed" : "pointer",
        display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
        transition: "opacity 0.15s", fontFamily: "inherit",
      }}
    >
      {loading ? <><Spinner />{children}</> : children}
    </button>
  );
}

// ─── NAV SIDEBAR ──────────────────────────────────────────────────────────
function Sidebar({ tab, setTab, superAdmin, initials }) {
  const tabs = [
    {
      key: "overview", label: "Overview", icon: (
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><rect x="2" y="2" width="5" height="5" rx="1.5" stroke="currentColor" strokeWidth="1.4"/><rect x="9" y="2" width="5" height="5" rx="1.5" stroke="currentColor" strokeWidth="1.4"/><rect x="2" y="9" width="5" height="5" rx="1.5" stroke="currentColor" strokeWidth="1.4"/><rect x="9" y="9" width="5" height="5" rx="1.5" stroke="currentColor" strokeWidth="1.4"/></svg>
      )
    },
    {
      key: "profile", label: "Profile", icon: (
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><circle cx="8" cy="5" r="3" stroke="currentColor" strokeWidth="1.4"/><path d="M2 13c0-3.314 2.686-5 6-5s6 1.686 6 5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/></svg>
      )
    },
    {
      key: "organisation", label: "Organisation", icon: (
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M2 14V6l6-4 6 4v8" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round"/><rect x="6" y="9" width="4" height="5" rx="1" stroke="currentColor" strokeWidth="1.4"/></svg>
      )
    },
    {
      key: "password", label: "Password", icon: (
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><rect x="4" y="7" width="8" height="6" rx="2" stroke="currentColor" strokeWidth="1.4"/><path d="M6 7V5a2 2 0 0 1 4 0v2" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/></svg>
      )
    },
    {
      key: "avatar", label: "Avatar", icon: (
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><circle cx="8" cy="8" r="6" stroke="currentColor" strokeWidth="1.4"/><circle cx="8" cy="6" r="2" stroke="currentColor" strokeWidth="1.2"/><path d="M4 12.5c0-2.2 1.8-3.5 4-3.5s4 1.3 4 3.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/></svg>
      )
    },
  ];

  const days = daysLeft(superAdmin?.plan_expires_at);

  return (
    <div style={{ width: 220, flexShrink: 0 }}>
      {/* Profile mini card */}
      <div style={{
        background: C.surface, borderRadius: 16,
        border: `0.5px solid ${C.border}`,
        padding: "20px 16px", marginBottom: 12,
        position: "relative", overflow: "hidden",
      }}>
        {/* gradient top bar */}
        <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 3, background: `linear-gradient(90deg, ${C.grad1}, ${C.grad2})`, borderRadius: "16px 16px 0 0" }} />
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 10 }}>
          <div style={{
            width: 60, height: 60, borderRadius: "50%",
            background: superAdmin?.profile_image ? "transparent" : `linear-gradient(135deg, ${C.grad1}, ${C.grad2})`,
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 20, fontWeight: 600, color: "#fff",
            overflow: "hidden", border: `3px solid ${C.brandLight}`,
          }}>
            {superAdmin?.profile_image
              ? <img src={superAdmin.profile_image} alt="avatar" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
              : initials
            }
          </div>
          <div style={{ textAlign: "center" }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: C.text }}>{superAdmin?.f_name} {superAdmin?.l_name}</div>
            <div style={{ fontSize: 11, color: C.muted, marginTop: 2 }}>{superAdmin?.organisation_name || "—"}</div>
            <div style={{ marginTop: 8, display: "flex", flexDirection: "column", gap: 5, alignItems: "center" }}>
              <Badge color={C.brand} bg={C.brandLight}>{superAdmin?.role || "super_admin"}</Badge>
              {superAdmin?.plan && <PlanBadge plan={superAdmin.plan} />}
            </div>
          </div>
          {/* Trial days pill */}
          {days !== null && days <= 30 && (
            <div style={{
              width: "100%", padding: "8px 12px", borderRadius: 10,
              background: days <= 5 ? C.redBg : C.amberBg,
              border: `0.5px solid ${days <= 5 ? "#f5c6c6" : "#f5d98a"}`,
              textAlign: "center",
            }}>
              <div style={{ fontSize: 11, fontWeight: 600, color: days <= 5 ? C.red : C.amber }}>
                {days === 0 ? "Expires today!" : `${days} day${days !== 1 ? "s" : ""} left`}
              </div>
              <div style={{ fontSize: 10, color: C.muted, marginTop: 1 }}>Plan expires {formatDate(superAdmin.plan_expires_at)}</div>
            </div>
          )}
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

// ─── OVERVIEW TAB ─────────────────────────────────────────────────────────
function OverviewTab({ superAdmin }) {
  const days = daysLeft(superAdmin?.plan_expires_at);

  return (
    <>
      <SectionCard title="Account summary" subtitle="Your super admin account at a glance" accent={`linear-gradient(90deg, ${C.grad1}, ${C.grad2})`}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0 20px" }}>
          <ReadonlyField label="Full name" value={`${superAdmin?.f_name || ""} ${superAdmin?.l_name || ""}`.trim()} />
          <ReadonlyField label="Email address" value={superAdmin?.email} />
          <ReadonlyField label="Role" value={superAdmin?.role} />
          <ReadonlyField label="Account status" value={superAdmin?.status} />
          <ReadonlyField label="Last login" value={formatDate(superAdmin?.last_login)} />
          <ReadonlyField label="Account created" value={formatDate(superAdmin?.createdAt)} />
        </div>
      </SectionCard>

      <SectionCard title="Plan & billing" subtitle="Current subscription details" accent={C.amber}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0 20px" }}>
          <div style={{ marginBottom: 16 }}>
            <FieldLabel>Current plan</FieldLabel>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <PlanBadge plan={superAdmin?.plan} />
            </div>
          </div>
          <ReadonlyField label="Plan started" value={formatDate(superAdmin?.plan_started_at)} />
          <div style={{ marginBottom: 16 }}>
            <FieldLabel>Plan expires</FieldLabel>
            <div style={{
              padding: "10px 14px", borderRadius: 10,
              background: days !== null && days <= 5 ? C.redBg : "#f9f4f2",
              border: `0.5px solid ${days !== null && days <= 5 ? "#f5c6c6" : C.border}`,
              fontSize: 13, color: days !== null && days <= 5 ? C.red : C.text, fontWeight: 500,
            }}>
              {formatDate(superAdmin?.plan_expires_at)}
              {days !== null && <span style={{ fontSize: 11, marginLeft: 8, opacity: 0.7 }}>({days}d left)</span>}
            </div>
          </div>
          <ReadonlyField label="Company domain" value={superAdmin?.company_domain} />
        </div>
      </SectionCard>

      <SectionCard title="Organisation snapshot" subtitle="Your company profile" accent={C.blue}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0 20px" }}>
          <ReadonlyField label="Organisation name" value={superAdmin?.organisation_name} />
          <ReadonlyField label="Industry" value={superAdmin?.industry} />
          <ReadonlyField label="Company size" value={superAdmin?.company_size} />
          <ReadonlyField label="Phone" value={superAdmin?.phone} />
          <div style={{ gridColumn: "1 / -1" }}>
            <ReadonlyField label="Company address" value={superAdmin?.company_address} />
          </div>
        </div>
      </SectionCard>
    </>
  );
}

// ─── PROFILE TAB ──────────────────────────────────────────────────────────
function ProfileTab({ superAdmin, onSuccess, onError }) {
  const queryClient = useQueryClient();
  const updateProfile = useUpdateSuperAdminProfile();

  const [form, setForm] = useState({
    f_name: superAdmin?.f_name || "",
    l_name: superAdmin?.l_name || "",
    phone: superAdmin?.phone || "",
  });

  useEffect(() => {
    if (superAdmin) {
      setForm({
        f_name: superAdmin.f_name || "",
        l_name: superAdmin.l_name || "",
        phone: superAdmin.phone || "",
      });
    }
  }, [superAdmin]);

  const handleSave = () => {
    if (!form.f_name || !form.l_name) { onError("First and last name are required"); return; }
    updateProfile.mutate(form, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ["superadmin-profile"] });
        onSuccess("Profile updated successfully!");
      },
      onError: (err) => onError(getErrorMessage(err)),
    });
  };

  return (
    <SectionCard title="Personal details" subtitle="Update your name and contact information" accent={C.brand}>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0 20px" }}>
        <InputField
          label="First name *"
          value={form.f_name}
          onChange={e => setForm(p => ({ ...p, f_name: e.target.value }))}
          placeholder="First name"
        />
        <InputField
          label="Last name *"
          value={form.l_name}
          onChange={e => setForm(p => ({ ...p, l_name: e.target.value }))}
          placeholder="Last name"
        />
      </div>
      <InputField
        label="Email address"
        value={superAdmin?.email || ""}
        disabled
        hint="Email cannot be changed. Contact support if needed."
      />
      <InputField
        label="Phone number"
        type="tel"
        value={form.phone}
        onChange={e => setForm(p => ({ ...p, phone: e.target.value }))}
        placeholder="Enter phone number"
      />

      {/* Read-only info row */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0 20px" }}>
        <ReadonlyField label="Role" value={superAdmin?.role} />
        <ReadonlyField label="Company domain" value={superAdmin?.company_domain} />
      </div>

      <PrimaryButton onClick={handleSave} loading={updateProfile.isPending}>
        Save personal details
      </PrimaryButton>
    </SectionCard>
  );
}

// ─── ORGANISATION TAB ─────────────────────────────────────────────────────
function OrganisationTab({ superAdmin, onSuccess, onError }) {
  const queryClient = useQueryClient();
  const updateProfile = useUpdateSuperAdminProfile();

  const [form, setForm] = useState({
    organisation_name: superAdmin?.organisation_name || "",
    company_address: superAdmin?.company_address || "",
    company_size: superAdmin?.company_size || COMPANY_SIZE_OPTIONS[0],
    industry: superAdmin?.industry || INDUSTRY_OPTIONS[0],
  });

  useEffect(() => {
    if (superAdmin) {
      setForm({
        organisation_name: superAdmin.organisation_name || "",
        company_address: superAdmin.company_address || "",
        company_size: superAdmin.company_size || COMPANY_SIZE_OPTIONS[0],
        industry: superAdmin.industry || INDUSTRY_OPTIONS[0],
      });
    }
  }, [superAdmin]);

  const handleSave = () => {
    if (!form.organisation_name) { onError("Organisation name is required"); return; }
    updateProfile.mutate(form, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ["superadmin-profile"] });
        onSuccess("Organisation details updated!");
      },
      onError: (err) => onError(getErrorMessage(err)),
    });
  };

  return (
    <SectionCard title="Organisation details" subtitle="Manage your company information" accent={C.blue}>
      <InputField
        label="Organisation name *"
        value={form.organisation_name}
        onChange={e => setForm(p => ({ ...p, organisation_name: e.target.value }))}
        placeholder="Your company name"
      />
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0 20px" }}>
        <SelectField
          label="Industry"
          value={form.industry}
          onChange={e => setForm(p => ({ ...p, industry: e.target.value }))}
          options={INDUSTRY_OPTIONS}
        />
        <SelectField
          label="Company size"
          value={form.company_size}
          onChange={e => setForm(p => ({ ...p, company_size: e.target.value }))}
          options={COMPANY_SIZE_OPTIONS}
        />
      </div>
      <InputField
        label="Company address"
        value={form.company_address}
        onChange={e => setForm(p => ({ ...p, company_address: e.target.value }))}
        placeholder="Full company address"
      />
      <ReadonlyField label="Company domain" value={superAdmin?.company_domain} />
      <PrimaryButton onClick={handleSave} loading={updateProfile.isPending}>
        Save organisation details
      </PrimaryButton>
    </SectionCard>
  );
}

// ─── PASSWORD TAB ─────────────────────────────────────────────────────────
function PasswordTab({ onSuccess, onError }) {
  const changePassword = useChangeSuperAdminPassword();
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

  const eyeToggle = (
    <button type="button" onClick={() => setShow(s => !s)} style={{ background: "none", border: "none", cursor: "pointer", display: "flex", padding: 0 }}>
      <EyeIcon open={show} />
    </button>
  );

  const handleChange = () => {
    if (!form.currentPassword || !form.newPassword) { onError("All fields are required"); return; }
    if (form.newPassword !== form.confirm) { onError("Passwords do not match"); return; }
    if (form.newPassword.length < 6) { onError("Password must be at least 6 characters"); return; }
    changePassword.mutate(
      { currentPassword: form.currentPassword, newPassword: form.newPassword },
      {
        onSuccess: () => { setForm({ currentPassword: "", newPassword: "", confirm: "" }); onSuccess("Password changed successfully!"); },
        onError: (err) => onError(getErrorMessage(err)),
      }
    );
  };

  return (
    <SectionCard title="Change password" subtitle="Keep your super admin account secure" accent={C.brand}>
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
function AvatarTab({ superAdmin, onSuccess, onError }) {
  const queryClient = useQueryClient();
  const updateProfile = useUpdateSuperAdminProfile();
  const [currentImg, setCurrentImg] = useState(superAdmin?.profile_image || "");
  const [pending, setPending] = useState(null);

  useEffect(() => { setCurrentImg(superAdmin?.profile_image || ""); }, [superAdmin]);

  const initials = getInitials(superAdmin?.f_name, superAdmin?.l_name);
  const seed = initials || "superadmin";

  const applyAvatar = (url) => {
    setPending(url);
    setCurrentImg(url);
    updateProfile.mutate(
      { profile_image: url },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: ["superadmin-profile"] });
          onSuccess("Avatar updated!");
          setPending(null);
        },
        onError: (err) => {
          setCurrentImg(superAdmin?.profile_image || "");
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
          background: currentImg ? "transparent" : `linear-gradient(135deg, ${C.grad1}, ${C.grad2})`,
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: 24, fontWeight: 600, color: "#fff",
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
              disabled={updateProfile.isPending}
              style={{ fontSize: 12, color: C.red, background: "none", border: "none", cursor: "pointer", fontFamily: "inherit", padding: 0, fontWeight: 500 }}
            >
              Remove avatar
            </button>
          )}
        </div>
      </div>

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
              disabled={updateProfile.isPending}
              style={{
                padding: "12px 8px", borderRadius: 12,
                border: `0.5px solid ${isActive ? C.brand : C.border}`,
                background: isActive ? C.brandLight : C.surface,
                cursor: updateProfile.isPending ? "not-allowed" : "pointer",
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
export default function SuperAdminSettingsPage() {
  const [tab, setTab] = useState("overview");
  const [toast, setToast] = useState({ message: "", type: "" });

  const { data: profileData, isLoading } = useGetMeSuperAdmin();
  // useGetMeSuperAdmin returns { success, superAdmin }
  const superAdmin = profileData?.superAdmin ?? null;
  const initials = superAdmin ? getInitials(superAdmin.f_name, superAdmin.l_name) : "SA";

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
        select:focus { border-color: ${C.brand} !important; box-shadow: 0 0 0 3px ${C.brandLight}; }
        button:not([disabled]):hover { opacity: 0.88; }
      `}</style>

      <Toast message={toast.message} type={toast.type} onClose={() => setToast({ message: "", type: "" })} />

      {/* Header */}
      <div style={{ marginBottom: 28 }}>
        <h1 style={{ fontSize: 22, fontWeight: 500, margin: 0, letterSpacing: "-0.3px" }}>Settings</h1>
        <p style={{ fontSize: 13, color: C.muted, marginTop: 4 }}>Manage your super admin profile, organisation and security</p>
      </div>

      {/* Layout */}
      <div style={{ display: "flex", gap: 16, alignItems: "flex-start" }}>
        <Sidebar tab={tab} setTab={setTab} superAdmin={superAdmin} initials={initials} />

        {/* Content */}
        <div style={{ flex: 1, minWidth: 0 }}>
          {tab === "overview"      && <OverviewTab superAdmin={superAdmin} />}
          {tab === "profile"       && <ProfileTab superAdmin={superAdmin} onSuccess={showSuccess} onError={showError} />}
          {tab === "organisation"  && <OrganisationTab superAdmin={superAdmin} onSuccess={showSuccess} onError={showError} />}
          {tab === "password"      && <PasswordTab onSuccess={showSuccess} onError={showError} />}
          {tab === "avatar"        && <AvatarTab superAdmin={superAdmin} onSuccess={showSuccess} onError={showError} />}

          <div style={{ textAlign: "center", fontSize: 12, color: C.mutedMid, marginTop: 8 }}>
            Changes are saved to your account automatically
          </div>
        </div>
      </div>
    </div>
  );
}