import { useState, useEffect } from "react";
import React from "react";
import {
  useGetMeSuperAdmin,
  useUpdateSuperAdminProfile,
} from "../../auth/server-state/superadmin/auth/suauth.hook";
import { useChangeSuperAdminPassword } from "../../auth/server-state/superadmin/other/suother.hook";
import { useQueryClient } from "@tanstack/react-query";

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

function Badge({ children, color = C.brand, bg = C.brandLight }) {
  return (
    <span 
      className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-medium whitespace-nowrap"
      style={{ color, background: bg }}
    >
      {children}
    </span>
  );
}

function PlanBadge({ plan }) {
  const isTrial = plan === "trial" || plan === "free_trial";
  return (
    <span 
      className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold whitespace-nowrap"
      style={{
        color: isTrial ? C.amber : "#1a5c3a",
        background: isTrial ? C.amberBg : C.greenBg,
        border: `0.5px solid ${isTrial ? "#f5d98a" : "#a8dfc3"}`,
      }}
    >
      {isTrial ? "⏱ Free Trial" : "✓ " + (plan || "Active")}
    </span>
  );
}

function Spinner({ size = 16, color = "#fff" }) {
  return (
    <div 
      className="rounded-full animate-spin shrink-0"
      style={{
        width: size, height: size,
        border: `2px solid ${color}33`,
        borderTop: `2px solid ${color}`,
      }} 
    />
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
      className="fixed top-4 right-4 left-4 sm:left-auto z-[999] flex items-center gap-2.5 p-3.5 rounded-xl shadow-lg animate-[slideIn_0.25s_ease]"
      style={{
        background: isSuccess ? "#f0faf5" : "#fff5f5",
        border: `0.5px solid ${isSuccess ? "#a8dfc3" : "#f5c6c6"}`,
      }}
    >
      <div 
        className="w-7 h-7 rounded-full flex items-center justify-center shrink-0"
        style={{ background: isSuccess ? C.greenBg : C.redBg }}
      >
        {isSuccess
          ? <svg width="14" height="14" viewBox="0 0 14 14"><polyline points="2,7 5.5,10.5 12,4" fill="none" stroke={C.green} strokeWidth="2" strokeLinecap="round"/></svg>
          : <svg width="14" height="14" viewBox="0 0 14 14"><line x1="3" y1="3" x2="11" y2="11" stroke={C.red} strokeWidth="2" strokeLinecap="round"/><line x1="11" y1="3" x2="3" y2="11" stroke={C.red} strokeWidth="2" strokeLinecap="round"/></svg>
        }
      </div>
      <span 
        className="text-[13px] font-medium flex-1"
        style={{ color: isSuccess ? "#1a5c3a" : "#7a1a1a" }}
      >
        {message}
      </span>
      <button onClick={onClose} className="bg-none border-none cursor-pointer text-[#b0948a] text-base p-0 leading-none">×</button>
    </div>
  );
}

function SectionCard({ title, subtitle, accent = C.brand, children }) {
  return (
    <div className="bg-white rounded-2xl border border-[#ede5e0] overflow-hidden relative mb-4 sm:mb-6">
      <div className="absolute top-0 left-0 right-0 h-[3px] rounded-t-2xl" style={{ background: accent }} />
      <div className="p-5 sm:p-6 border-b border-[#ede5e0]">
        <div className="text-sm font-medium text-[#2a1a16]">{title}</div>
        {subtitle && <div className="text-xs text-[#b0948a] mt-1">{subtitle}</div>}
      </div>
      <div className="p-5 sm:p-6">{children}</div>
    </div>
  );
}

function FieldLabel({ children }) {
  return <div className="text-xs font-medium text-[#b0948a] mb-1.5 tracking-wide">{children}</div>;
}

function ReadonlyField({ value, label }) {
  return (
    <div className="mb-4">
      <FieldLabel>{label}</FieldLabel>
      <div className="px-3.5 py-2.5 rounded-lg bg-[#f9f4f2] border border-[#ede5e0] text-sm text-[#2a1a16] font-medium">
        {value || "—"}
      </div>
      <div className="text-[11px] text-[#c9bab5] mt-1">Read-only</div>
    </div>
  );
}

function InputField({ label, value, onChange, type = "text", placeholder, hint, rightEl, name, disabled }) {
  return (
    <div className="mb-4">
      <FieldLabel>{label}</FieldLabel>
      <div className="relative">
        <input
          type={type}
          name={name}
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          disabled={disabled}
          className={`w-full px-3.5 py-2.5 ${rightEl ? 'pr-10' : ''} rounded-lg border border-[#ede5e0] text-sm text-[#2a1a16] outline-none transition-all focus:border-[#730042] focus:ring-2 focus:ring-[#730042]/10 font-sans ${disabled ? 'bg-[#f9f4f2] cursor-not-allowed' : 'bg-white'}`}
        />
        {rightEl && (
          <div className="absolute right-3 top-1/2 -translate-y-1/2">
            {rightEl}
          </div>
        )}
      </div>
      {hint && <div className="text-[11px] text-[#c9bab5] mt-1">{hint}</div>}
    </div>
  );
}

function SelectField({ label, value, onChange, options, hint }) {
  return (
    <div className="mb-4">
      <FieldLabel>{label}</FieldLabel>
      <select
        value={value}
        onChange={onChange}
        className="w-full px-3.5 py-2.5 rounded-lg border border-[#ede5e0] text-sm text-[#2a1a16] bg-white outline-none transition-all focus:border-[#730042] focus:ring-2 focus:ring-[#730042]/10 font-sans cursor-pointer appearance-none"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='10' height='6' viewBox='0 0 10 6' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M1 1l4 4 4-4' stroke='%23b0948a' fill='none' stroke-width='1.5' stroke-linecap='round'/%3E%3C/svg%3E")`,
          backgroundRepeat: "no-repeat",
          backgroundPosition: "right 14px center",
        }}
      >
        {options.map(opt => (
          <option key={opt} value={opt}>{opt}</option>
        ))}
      </select>
      {hint && <div className="text-[11px] text-[#c9bab5] mt-1">{hint}</div>}
    </div>
  );
}

function PrimaryButton({ onClick, disabled, loading, children, color = C.brand }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled || loading}
      className="w-full py-2.5 text-white rounded-lg text-sm font-medium flex items-center justify-center gap-2 transition-opacity hover:opacity-90 font-sans"
      style={{ 
        background: disabled || loading ? `${color}99` : color, 
        cursor: disabled || loading ? "not-allowed" : "pointer" 
      }}
    >
      {loading ? <><Spinner />{children}</> : children}
    </button>
  );
}

function Sidebar({ tab, setTab, superAdmin, initials }) {
  const tabs = [
    {
      key: "overview", label: "Overview", icon: (
        <svg className="w-4 h-4" viewBox="0 0 16 16" fill="none"><rect x="2" y="2" width="5" height="5" rx="1.5" stroke="currentColor" strokeWidth="1.4"/><rect x="9" y="2" width="5" height="5" rx="1.5" stroke="currentColor" strokeWidth="1.4"/><rect x="2" y="9" width="5" height="5" rx="1.5" stroke="currentColor" strokeWidth="1.4"/><rect x="9" y="9" width="5" height="5" rx="1.5" stroke="currentColor" strokeWidth="1.4"/></svg>
      )
    },
    {
      key: "profile", label: "Profile", icon: (
        <svg className="w-4 h-4" viewBox="0 0 16 16" fill="none"><circle cx="8" cy="5" r="3" stroke="currentColor" strokeWidth="1.4"/><path d="M2 13c0-3.314 2.686-5 6-5s6 1.686 6 5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/></svg>
      )
    },
    {
      key: "organisation", label: "Organisation", icon: (
        <svg className="w-4 h-4" viewBox="0 0 16 16" fill="none"><path d="M2 14V6l6-4 6 4v8" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round"/><rect x="6" y="9" width="4" height="5" rx="1" stroke="currentColor" strokeWidth="1.4"/></svg>
      )
    },
    {
      key: "password", label: "Password", icon: (
        <svg className="w-4 h-4" viewBox="0 0 16 16" fill="none"><rect x="4" y="7" width="8" height="6" rx="2" stroke="currentColor" strokeWidth="1.4"/><path d="M6 7V5a2 2 0 0 1 4 0v2" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/></svg>
      )
    },
    {
      key: "avatar", label: "Avatar", icon: (
        <svg className="w-4 h-4" viewBox="0 0 16 16" fill="none"><circle cx="8" cy="8" r="6" stroke="currentColor" strokeWidth="1.4"/><circle cx="8" cy="6" r="2" stroke="currentColor" strokeWidth="1.2"/><path d="M4 12.5c0-2.2 1.8-3.5 4-3.5s4 1.3 4 3.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/></svg>
      )
    },
  ];

  const days = daysLeft(superAdmin?.plan_expires_at || superAdmin?.trial_expires_at);

  return (
    <div className="w-full lg:w-64 lg:shrink-0">
      <div className="bg-white rounded-2xl border border-[#ede5e0] p-4 sm:p-5 mb-3 relative overflow-hidden">
        <div className="absolute top-0 left-0 right-0 h-[3px] rounded-t-2xl" style={{ background: `linear-gradient(90deg, ${C.grad1}, ${C.grad2})` }} />
        <div className="flex flex-col items-center gap-2.5">
          <div 
            className="w-14 h-14 sm:w-16 sm:h-16 rounded-full flex items-center justify-center text-xl sm:text-2xl font-semibold text-white overflow-hidden border-[3px]"
            style={{ 
              background: superAdmin?.profile_image ? "transparent" : `linear-gradient(135deg, ${C.grad1}, ${C.grad2})`,
              borderColor: C.brandLight 
            }}
          >
            {superAdmin?.profile_image
              ? <img src={superAdmin.profile_image} alt="avatar" className="w-full h-full object-cover" />
              : initials
            }
          </div>
          <div className="text-center w-full min-w-0">
            <div className="text-sm font-semibold text-[#2a1a16] truncate">{superAdmin?.f_name} {superAdmin?.l_name}</div>
            <div className="text-[11px] text-[#b0948a] mt-0.5 truncate">{superAdmin?.organisation_name || "—"}</div>
            <div className="mt-2 flex flex-col gap-1.5 items-center">
              <Badge color={C.brand} bg={C.brandLight}>{superAdmin?.role || "super_admin"}</Badge>
              {superAdmin?.is_trial_active && <PlanBadge plan="free_trial" />}
            </div>
          </div>
          {days !== null && days <= 30 && (
            <div 
              className="w-full p-2 rounded-lg text-center"
              style={{
                background: days <= 5 ? C.redBg : C.amberBg,
                border: `0.5px solid ${days <= 5 ? "#f5c6c6" : "#f5d98a"}`,
              }}
            >
              <div className="text-[11px] font-semibold" style={{ color: days <= 5 ? C.red : C.amber }}>
                {days === 0 ? "Expires today!" : `${days} day${days !== 1 ? "s" : ""} left`}
              </div>
              <div className="text-[10px] text-[#b0948a] mt-0.5">
                Trial expires {formatDate(superAdmin?.trial_expires_at)}
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-[#ede5e0] overflow-hidden flex flex-col">
        {tabs.map((t, i) => {
          const active = tab === t.key;
          return (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`w-full px-4 py-3 flex items-center gap-2.5 text-sm transition-all text-left font-sans ${active ? 'bg-[#730042]/10 text-[#730042] font-medium' : 'text-[#b0948a] hover:bg-gray-50'} ${i < tabs.length - 1 ? 'border-b border-[#ede5e0]' : ''}`}
            >
              {t.icon}
              {t.label}
              {active && (
                <div className="ml-auto w-1.5 h-1.5 rounded-full bg-[#730042]"></div>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function OverviewTab({ superAdmin }) {
  const days = daysLeft(superAdmin?.trial_expires_at);

  return (
    <>
      <SectionCard title="Account summary" subtitle="Your super admin account at a glance" accent={`linear-gradient(90deg, ${C.grad1}, ${C.grad2})`}>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-0">
          <ReadonlyField label="Full name" value={`${superAdmin?.f_name || ""} ${superAdmin?.l_name || ""}`.trim()} />
          <ReadonlyField label="Email address" value={superAdmin?.email} />
          <ReadonlyField label="Role" value={superAdmin?.role} />
          <ReadonlyField label="Account status" value={superAdmin?.status} />
          <ReadonlyField label="Last login" value={formatDate(superAdmin?.last_login)} />
          <ReadonlyField label="Account created" value={formatDate(superAdmin?.createdAt)} />
        </div>
      </SectionCard>

      <SectionCard title="Plan & billing" subtitle="Current subscription details" accent={C.amber}>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-0">
          <div className="mb-4">
            <FieldLabel>Current plan</FieldLabel>
            <div className="flex items-center gap-2 py-2.5">
              <PlanBadge plan={superAdmin?.is_trial_active ? "free_trial" : "active"} />
            </div>
          </div>
          <ReadonlyField label="Trial started" value={formatDate(superAdmin?.trial_started_at)} />
          <div className="mb-4">
            <FieldLabel>Trial expires</FieldLabel>
            <div 
              className="px-3.5 py-2.5 rounded-lg text-sm font-medium"
              style={{
                background: days !== null && days <= 5 ? C.redBg : "#f9f4f2",
                border: `0.5px solid ${days !== null && days <= 5 ? "#f5c6c6" : C.border}`,
                color: days !== null && days <= 5 ? C.red : C.text,
              }}
            >
              {formatDate(superAdmin?.trial_expires_at)}
              {days !== null && <span className="text-[11px] ml-2 opacity-70">({days}d left)</span>}
            </div>
          </div>
          <ReadonlyField label="Company domain" value={superAdmin?.company_domain} />
        </div>
      </SectionCard>

      <SectionCard title="Organisation snapshot" subtitle="Your company profile" accent={C.blue}>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-0">
          <ReadonlyField label="Organisation name" value={superAdmin?.organisation_name} />
          <ReadonlyField label="Industry" value={superAdmin?.industry} />
          <ReadonlyField label="Company size" value={superAdmin?.company_size} />
          <ReadonlyField label="Phone" value={superAdmin?.phone} />
          <div className="md:col-span-2">
            <ReadonlyField label="Company address" value={superAdmin?.company_address} />
          </div>
        </div>
      </SectionCard>
    </>
  );
}

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
      <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-0">
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
      <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-0">
        <ReadonlyField label="Role" value={superAdmin?.role} />
        <ReadonlyField label="Company domain" value={superAdmin?.company_domain} />
      </div>
      <PrimaryButton onClick={handleSave} loading={updateProfile.isPending}>
        Save personal details
      </PrimaryButton>
    </SectionCard>
  );
}

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
      <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-0">
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
    ? <svg className="w-4 h-4" viewBox="0 0 16 16" fill="none"><path d="M1 8s2.5-5 7-5 7 5 7 5-2.5 5-7 5-7-5-7-5z" stroke={C.muted} strokeWidth="1.3"/><circle cx="8" cy="8" r="2" stroke={C.muted} strokeWidth="1.3"/></svg>
    : <svg className="w-4 h-4" viewBox="0 0 16 16" fill="none"><path d="M1 8s2.5-5 7-5 7 5 7 5-2.5 5-7 5-7-5-7-5z" stroke={C.muted} strokeWidth="1.3"/><line x1="2" y1="2" x2="14" y2="14" stroke={C.muted} strokeWidth="1.3" strokeLinecap="round"/></svg>;

  const eyeToggle = (
    <button type="button" onClick={() => setShow(s => !s)} className="bg-none border-none cursor-pointer flex p-0">
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
      <div className="w-full max-w-md">
        <InputField label="Current password *" type={show ? "text" : "password"} name="currentPassword"
          value={form.currentPassword} onChange={e => setForm(p => ({ ...p, currentPassword: e.target.value }))}
          placeholder="Enter current password" rightEl={eyeToggle} />

        <InputField label="New password *" type={show ? "text" : "password"} name="newPassword"
          value={form.newPassword} onChange={e => setForm(p => ({ ...p, newPassword: e.target.value }))}
          placeholder="Enter new password" rightEl={eyeToggle} />

        {form.newPassword && (
          <div className="-mt-2 mb-4">
            <div className="flex gap-1 mb-1.5">
              {[1,2,3,4,5].map(i => (
                <div key={i} className="flex-1 h-1 rounded-full transition-colors" style={{ background: i <= s ? strengthColor : C.border }} />
              ))}
            </div>
            <div className="text-[11px] font-medium" style={{ color: strengthColor }}>{strengthLabel}</div>
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

        <div className="mt-4 p-3.5 rounded-lg text-xs leading-relaxed" style={{ background: C.brandLight, color: C.brand }}>
          Tips: use 10+ characters, mix uppercase, numbers and symbols for a strong password.
        </div>
      </div>
    </SectionCard>
  );
}

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
      <div className="flex flex-col sm:flex-row items-center gap-4 mb-6 p-4 sm:p-5 bg-[#f9f8f2] rounded-xl border border-[#ede5e0]">
        <div 
          className="w-16 h-16 sm:w-18 sm:h-18 rounded-full flex items-center justify-center text-2xl font-semibold text-white overflow-hidden border-[3px] shrink-0"
          style={{ 
            background: currentImg ? "transparent" : `linear-gradient(135deg, ${C.grad1}, ${C.grad2})`,
            borderColor: C.brandLight 
          }}
        >
          {currentImg
            ? <img src={currentImg} alt="avatar" className="w-full h-full object-cover" />
            : initials
          }
        </div>
        <div className="text-center sm:text-left">
          <div className="text-sm font-medium text-[#2a1a16] mb-1">Current avatar</div>
          <div className="text-xs text-[#b0948a] mb-2.5">
            {currentImg ? "DiceBear avatar" : "Initials avatar (default)"}
          </div>
          {currentImg && (
            <button
              onClick={removeAvatar}
              disabled={updateProfile.isPending}
              className="text-xs text-[#E24B4A] bg-none border-none cursor-pointer font-sans p-0 font-medium hover:underline"
            >
              Remove avatar
            </button>
          )}
        </div>
      </div>

      <FieldLabel>Choose a style</FieldLabel>
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
        {AVATAR_STYLES.map((style) => {
          const url = `https://api.dicebear.com/7.x/${style}/svg?seed=${seed}`;
          const isActive = currentImg?.includes(style);
          const isLoading = pending === url;
          return (
            <button
              key={style}
              onClick={() => applyAvatar(url)}
              disabled={updateProfile.isPending}
              className="p-2 rounded-xl border transition-all relative flex flex-col items-center"
              style={{
                borderColor: isActive ? C.brand : C.border,
                background: isActive ? C.brandLight : C.surface,
                cursor: updateProfile.isPending ? "not-allowed" : "pointer",
                outline: isActive ? `2px solid ${C.brand}` : "none",
                outlineOffset: 2,
              }}
            >
              {isLoading && (
                <div className="absolute inset-0 rounded-xl bg-white/70 flex items-center justify-center">
                  <Spinner size={18} color={C.brand} />
                </div>
              )}
              <img src={url} alt={style} className="w-full aspect-square block rounded-lg" />
              <div 
                className="text-[10px] mt-1.5 text-center capitalize"
                style={{ color: isActive ? C.brand : C.muted, fontWeight: isActive ? 500 : 400 }}
              >
                {style}
              </div>
            </button>
          );
        })}
      </div>
    </SectionCard>
  );
}

export default function SuperAdminSettingsPage() {
  const [tab, setTab] = useState("overview");
  const [toast, setToast] = useState({ message: "", type: "" });

  const { data: profileData, isLoading } = useGetMeSuperAdmin();
  const superAdmin = profileData?.superAdmin ?? null;
  const initials = superAdmin ? getInitials(superAdmin.f_name, superAdmin.l_name) : "SA";

  const showSuccess = (msg) => setToast({ message: msg, type: "success" });
  const showError   = (msg) => setToast({ message: msg, type: "error" });

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#f9f8f2] font-sans">
        <div className="flex flex-col items-center gap-4">
          <Spinner size={36} color={C.brand} />
          <div className="text-sm text-[#b0948a]">Loading your profile...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen w-full overflow-x-hidden bg-[#f9f8f2] p-4 sm:p-6 lg:p-8 text-[#2a1a16] font-sans">
      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes slideIn { from { opacity:0; transform:translateX(20px); } to { opacity:1; transform:translateX(0); } }
      `}</style>

      <Toast message={toast.message} type={toast.type} onClose={() => setToast({ message: "", type: "" })} />

      <div className="mb-6 sm:mb-8">
        <h1 className="text-lg sm:text-xl font-medium m-0 tracking-tight">Settings</h1>
        <p className="text-sm text-[#b0948a] mt-1">Manage your super admin profile, organisation and security</p>
      </div>

      <div className="flex flex-col lg:flex-row gap-4 sm:gap-6 lg:gap-8 items-start w-full">
        <Sidebar tab={tab} setTab={setTab} superAdmin={superAdmin} initials={initials} />

        <div className="flex-1 w-full min-w-0">
          {tab === "overview"      && <OverviewTab superAdmin={superAdmin} />}
          {tab === "profile"       && <ProfileTab superAdmin={superAdmin} onSuccess={showSuccess} onError={showError} />}
          {tab === "organisation"  && <OrganisationTab superAdmin={superAdmin} onSuccess={showSuccess} onError={showError} />}
          {tab === "password"      && <PasswordTab onSuccess={showSuccess} onError={showError} />}
          {tab === "avatar"        && <AvatarTab superAdmin={superAdmin} onSuccess={showSuccess} onError={showError} />}

          <div className="text-center text-xs text-[#c9bab5] mt-2">
            Changes are saved to your account automatically
          </div>
        </div>
      </div>
    </div>
  );
}