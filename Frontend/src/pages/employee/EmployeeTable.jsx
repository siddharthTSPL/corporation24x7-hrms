import { useState, useRef, useEffect } from "react";
import { Country, State, City } from "country-state-city";
import {
  FaEdit, FaTrash, FaSearch, FaFilter, FaTimes, FaUserTie, FaUserPlus,
  FaChevronLeft, FaChevronRight, FaFileExcel, FaArrowUp, FaArrowDown,
  FaEllipsisV, FaEnvelope, FaPhone, FaBuilding, FaMapMarkerAlt, FaIdCard,
  FaStar, FaUser, FaBriefcase, FaUniversity, FaFileAlt, FaShieldAlt,
  FaToggleOn, FaToggleOff, FaKey, FaBan, FaCheck, FaExclamationTriangle,
  FaEye, FaEyeSlash,
} from "react-icons/fa";
import {
  useAddManager, useAddEmployee, useFindAllManagers, useFindAllManagerswithoutAdmin,
} from "../../auth/server-state/adminauth/adminauth.hook";
import {
  useGetAllEmployee, useDeleteUser, useEditEmployee, useEditManager,
  usePromoteEmployeeToManager, usePromoteEmployeeToAdmin, usePromoteManagerToAdmin,
  useDemoteManagerToEmployee, useDemoteAdminToManager, useDemoteAdminToEmployee,
  useGetParticularEmployee, useGetParticularManager,
  useSetEmployeeWorkingStatus, useSetManagerWorkingStatus,
  useAdminInactiveUsers, useGetActiveUserCount,
} from "../../auth/server-state/adminother/adminother.hook";
import { useGetMeAdmin } from "../../auth/server-state/adminauth/adminauth.hook";
import axios from "axios";

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "http://localhost:5000/",
  withCredentials: true,
});

const DEPARTMENTS = ["OPR", "BPO", "ENG", "MGMT", "HR"];
const LOCATIONS = ["Noida", "Bareilly", "Delhi", "Mumbai"];

const WORKING_STATUSES = ["working", "resigned", "fired", "terminated"];
const IRREVERSIBLE_STATUSES = ["resigned", "terminated"];

const ALL_COUNTRIES = Country.getAllCountries();

const EMPTY_EMP = {
  f_name:"",l_name:"",work_email:"",password:"",confirm_password:"",gender:"",marital_status:"single",
  personal_contact:"",e_contact:"",department:"",designation:"",role:"employee",
  office_location_country:"IN",office_location_state:"",office_location:"",
  Under_manager:"",
  address:"",city:"",state:"",pincode:"",country:"IN",
  same_as_residential:false,
  permanent_address:"",permanent_city:"",permanent_state:"",permanent_pincode:"",permanent_country:"IN",
  aadhaar_number:"",pan_number:"",is_fresher:true,total_experience:"",
  previous_company:"",previous_designation:"",bank_name:"",account_holder_name:"",
  account_number:"",ifsc_code:"",resume:"",aadhaar_card:"",pan_card:"",experience_letter:"",
};

const EMPTY_MGR = {
  f_name:"",l_name:"",work_email:"",password:"",confirm_password:"",gender:"",marital_status:"single",
  personal_contact:"",e_contact:"",department:"",designation:"",role:"manager",
  office_location_country:"IN",office_location_state:"",office_location:"",
  reporting_manager:"",
  address:"",city:"",state:"",pincode:"",country:"IN",
  same_as_residential:false,
  permanent_address:"",permanent_city:"",permanent_state:"",permanent_pincode:"",permanent_country:"IN",
  aadhaar_number:"",pan_number:"",is_fresher:true,total_experience:"",
  previous_company:"",previous_designation:"",bank_name:"",account_holder_name:"",
  account_number:"",ifsc_code:"",resume:"",aadhaar_card:"",pan_card:"",experience_letter:"",
};

const EMP_DEFAULT_PERMISSIONS = {
  announcements:{can_view_announcements:true,can_create_announcement:false,can_edit_announcement:false,can_delete_announcement:false},
  documents:{can_upload_documents:true,can_view_all_documents:false},
  tickets:{can_raise_ticket:true,can_view_all_tickets:false,can_resolve_ticket:false,can_rate_ticket:true},
  recruitment:{can_view_hiring_requisitions:false,can_create_hiring_requisition:false,can_view_candidates:false,can_add_candidate:false},
};

const MGR_DEFAULT_PERMISSIONS = {
  announcements:{can_view_announcements:true,can_create_announcement:false,can_edit_announcement:false,can_delete_announcement:false},
  documents:{can_upload_documents:true,can_view_all_documents:true},
  tickets:{can_raise_ticket:true,can_view_all_tickets:true,can_resolve_ticket:true,can_rate_ticket:true},
  recruitment:{can_view_hiring_requisitions:true,can_create_hiring_requisition:true,can_view_candidates:false,can_add_candidate:false},
};

const ADMIN_PERMISSIONS = {
  announcements:{can_view_announcements:true,can_create_announcement:true,can_edit_announcement:true,can_delete_announcement:true},
  documents:{can_upload_documents:true,can_view_all_documents:true},
  tickets:{can_raise_ticket:true,can_view_all_tickets:true,can_resolve_ticket:true,can_rate_ticket:true},
  recruitment:{can_view_hiring_requisitions:true,can_create_hiring_requisition:true,can_view_candidates:true,can_add_candidate:true},
};

const EMP_STEPS = [
  {label:"Basic Info",icon:"👤"},
  {label:"Work",icon:"💼"},
  {label:"Address",icon:"🏠"},
  {label:"Identity",icon:"🪪"},
  {label:"Experience",icon:"📋"},
  {label:"Bank & Docs",icon:"🏦"},
  {label:"Permissions",icon:"🔐"},
];

const inputCls =
  "w-full px-3 py-2.5 rounded-lg border border-[#F4C0D1] bg-[#F9F8F2] text-sm text-[#730042] " +
  "focus:outline-none focus:border-[#CD166E] focus:ring-2 focus:ring-[#CD166E]/20 transition-all placeholder-[#993556]/50 " +
  "font-['DM_Sans',system-ui,sans-serif] disabled:opacity-50 disabled:cursor-not-allowed";

const PWD_REGEX = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_REGEX = /^[6-9]\d{9}$/;
const PAN_REGEX = /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/;
const AADHAAR_REGEX = /^\d{12}$/;
const PINCODE_REGEX = /^\d{6}$/;
const IFSC_REGEX = /^[A-Z]{4}0[A-Z0-9]{6}$/;
const ACCOUNT_REGEX = /^\d{9,18}$/;
const URL_REGEX = /^https?:\/\/.+/;
const NAME_REGEX = /^[A-Za-z\s.'-]{2,50}$/;

function generatePassword() {
  const upper = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
  const lower = "abcdefghijklmnopqrstuvwxyz";
  const digits = "0123456789";
  const special = "@$!%*?&";
  const all = upper + lower + digits + special;
  let pwd =
    upper[Math.floor(Math.random() * upper.length)] +
    lower[Math.floor(Math.random() * lower.length)] +
    digits[Math.floor(Math.random() * digits.length)] +
    special[Math.floor(Math.random() * special.length)];
  for (let i = 0; i < 8; i++) pwd += all[Math.floor(Math.random() * all.length)];
  return pwd.split("").sort(() => Math.random() - 0.5).join("");
}

const numericOnly = (value) => value.replace(/\D/g, "");

function exportToCSV(data) {
  const headers = [
    "UID","First Name","Last Name","Work Email","Role","Department",
    "Designation","Office Location","Gender","Marital Status",
    "Personal Contact","Emergency Contact","City","State","Pincode",
    "Reporting / Under Manager","Is Fresher","Total Experience","Status","Working Status",
  ];
  const rows = data.map((u) => [
    u.uid??"",u.f_name??"",u.l_name??"",u.work_email??"",u.role??"",
    u.department??"",u.designation??"",u.office_location??"",u.gender??"",
    u.marital_status??"",u.personal_contact??"",u.e_contact??"",
    u.city??"",u.state??"",u.pincode??"",
    u.Under_manager
      ?`${u.Under_manager.f_name??""} ${u.Under_manager.l_name??""}`.trim()
      :u.reporting_manager
        ?`${u.reporting_manager.f_name??""} ${u.reporting_manager.l_name??""}`.trim()
        :"",
    u.is_fresher?"Yes":"No",u.total_experience??"",u.status??"",u.working_status??"",
  ]);
  const escape=(v)=>{const s=String(v??"");return s.includes(",")||s.includes('"')||s.includes("\n")?`"${s.replace(/"/g,'""')}"`:s;};
  const csv=[headers,...rows].map((r)=>r.map(escape).join(",")).join("\n");
  const blob=new Blob(["\uFEFF"+csv],{type:"text/csv;charset=utf-8;"});
  const url=URL.createObjectURL(blob);
  const a=document.createElement("a");
  a.href=url;a.download=`employees_${new Date().toISOString().slice(0,10)}.csv`;a.click();
  URL.revokeObjectURL(url);
}

function resolveLeaveValue(val) {
  if (val === null || val === undefined) return "—";
  if (typeof val === "object") {
    if (val.remaining !== undefined) return String(val.remaining);
    if (val.balance !== undefined) return String(val.balance);
    if (val.total !== undefined) return String(val.total);
    return "—";
  }
  return String(val);
}

const LEAVE_SKIP_KEYS = ["_id","employee","organisation_id","__v","createdAt","updatedAt","mlStartDate","mlEndDate","lastAccrualDate"];

function Field({label,error,children,required,span2}){
  return(
    <div className={`flex flex-col gap-1 ${span2?"col-span-2":""}`}>
      <label className="text-[11px] font-semibold uppercase tracking-wider text-[#993556]">
        {label}{required&&<span className="text-[#CD166E] ml-0.5">*</span>}
      </label>
      {children}
      {error&&<span className="text-[11px] text-[#A32D2D] flex items-center gap-1">⚠ {error}</span>}
    </div>
  );
}

function PasswordField({label,name,value,onChange,error,required=true,onGenerate}){
  const [show,setShow]=useState(false);
  return(
    <Field label={label} required={required} error={error}>
      <div className="relative">
        <input
          name={name}
          type={show?"text":"password"}
          placeholder={label}
          value={value}
          onChange={onChange}
          className={inputCls}
        />
        <button
          type="button"
          onClick={()=>setShow(!show)}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-[#993556]"
        >
          {show?<FaEyeSlash size={13}/>:<FaEye size={13}/>}
        </button>
      </div>
      {onGenerate&&(
        <div className="flex justify-end">
          <button
            type="button"
            onClick={onGenerate}
            className="text-xs font-semibold text-[#CD166E] hover:underline mt-1"
          >
            Generate Password
          </button>
        </div>
      )}
    </Field>
  );
}

function OfficeLocationFields({form,onChange,errors}){
  const states = form.office_location_country ? State.getStatesOfCountry(form.office_location_country) : [];
  const cities = form.office_location_country && form.office_location_state
    ? City.getCitiesOfState(form.office_location_country, form.office_location_state)
    : [];

  return(
    <>
      <Field label="Country" required error={errors.office_location_country}>
        <select name="office_location_country" value={form.office_location_country} onChange={onChange} className={inputCls}>
          <option value="">Select Country</option>
          {ALL_COUNTRIES.map((c)=><option key={c.isoCode} value={c.isoCode}>{c.name}</option>)}
        </select>
      </Field>
      <Field label="State" required error={errors.office_location_state}>
        <select
          name="office_location_state"
          value={form.office_location_state}
          onChange={onChange}
          className={inputCls}
          disabled={!form.office_location_country}
        >
          <option value="">{form.office_location_country?"Select State":"Select country first"}</option>
          {states.map((s)=><option key={s.isoCode} value={s.isoCode}>{s.name}</option>)}
        </select>
      </Field>
      <div className="col-span-2">
        <Field label="Office Location (City)" required error={errors.office_location}>
          <select
            name="office_location"
            value={form.office_location}
            onChange={onChange}
            className={inputCls}
            disabled={!form.office_location_state}
          >
            <option value="">{form.office_location_state?"Select City":"Select state first"}</option>
            {cities.map((c)=><option key={`${c.name}-${c.latitude}-${c.longitude}`} value={c.name}>{c.name}</option>)}
          </select>
        </Field>
      </div>
    </>
  );
}

function AddressFields({form,onChange,errors}){
  const resStates = form.country ? State.getStatesOfCountry(form.country) : [];
  const permStates = form.permanent_country ? State.getStatesOfCountry(form.permanent_country) : [];

  const resStateIso = resStates.find((s)=>s.name===form.state)?.isoCode;
  const permStateIso = permStates.find((s)=>s.name===form.permanent_state)?.isoCode;

  const resCities = form.country && resStateIso ? City.getCitiesOfState(form.country, resStateIso) : [];
  const permCities = form.permanent_country && permStateIso ? City.getCitiesOfState(form.permanent_country, permStateIso) : [];

  const handleSameAsResidential=(e)=>{
    const checked=e.target.checked;
    onChange({target:{name:"same_as_residential",value:checked}});
    if(checked){
      onChange({target:{name:"permanent_address",value:form.address}});
      onChange({target:{name:"permanent_country",value:form.country}});
      onChange({target:{name:"permanent_state",value:form.state}});
      onChange({target:{name:"permanent_city",value:form.city}});
      onChange({target:{name:"permanent_pincode",value:form.pincode}});
    }
  };

  return(
    <>
      <div className="col-span-2">
        <p className="text-[11px] font-semibold uppercase tracking-wider text-[#993556] mb-1">Residential Address</p>
      </div>

      <Field label="Country" required error={errors.country}>
        <select name="country" value={form.country} onChange={onChange} className={inputCls}>
          <option value="">Select Country</option>
          {ALL_COUNTRIES.map((c)=><option key={c.isoCode} value={c.isoCode}>{c.name}</option>)}
        </select>
      </Field>

      <Field label="State" required error={errors.state}>
        <select name="state" value={form.state} onChange={onChange} className={inputCls} disabled={!form.country}>
          <option value="">{form.country?"Select State":"Select country first"}</option>
          {resStates.map((s)=><option key={s.isoCode} value={s.name}>{s.name}</option>)}
        </select>
      </Field>

      <Field label="City" required error={errors.city}>
        <select name="city" value={form.city} onChange={onChange} className={inputCls} disabled={!form.state}>
          <option value="">{form.state?(resCities.length?"Select City":"No cities found"):"Select state first"}</option>
          {resCities.map((c)=><option key={c.name} value={c.name}>{c.name}</option>)}
        </select>
      </Field>

      <Field label="Pincode" required error={errors.pincode}>
        <input name="pincode" placeholder="6-digit pincode" maxLength={6} value={form.pincode} onChange={onChange} className={inputCls}/>
      </Field>

      <Field label="Address" required error={errors.address} span2>
        <input name="address" placeholder="Street address" value={form.address} onChange={onChange} className={inputCls}/>
      </Field>

      <div className="col-span-2 flex items-center gap-2 mt-1">
        <input type="checkbox" id="same_as_residential" checked={form.same_as_residential} onChange={handleSameAsResidential} className="w-4 h-4 accent-[#CD166E]"/>
        <label htmlFor="same_as_residential" className="text-xs font-medium text-[#730042]">
          Permanent address same as residential
        </label>
      </div>

      <div className="col-span-2">
        <p className="text-[11px] font-semibold uppercase tracking-wider text-[#993556] mb-1 mt-2">Permanent Address</p>
      </div>

      <Field label="Country" error={errors.permanent_country}>
        <select name="permanent_country" value={form.permanent_country} onChange={onChange} className={inputCls}>
          <option value="">Select Country</option>
          {ALL_COUNTRIES.map((c)=><option key={c.isoCode} value={c.isoCode}>{c.name}</option>)}
        </select>
      </Field>

      <Field label="State" error={errors.permanent_state}>
        <select name="permanent_state" value={form.permanent_state} onChange={onChange} className={inputCls} disabled={!form.permanent_country}>
          <option value="">{form.permanent_country?"Select State":"Select country first"}</option>
          {permStates.map((s)=><option key={s.isoCode} value={s.name}>{s.name}</option>)}
        </select>
      </Field>

      <Field label="City" error={errors.permanent_city}>
        <select name="permanent_city" value={form.permanent_city} onChange={onChange} className={inputCls} disabled={!form.permanent_state}>
          <option value="">{form.permanent_state?(permCities.length?"Select City":"No cities found"):"Select state first"}</option>
          {permCities.map((c)=><option key={c.name} value={c.name}>{c.name}</option>)}
        </select>
      </Field>

      <Field label="Pincode" error={errors.permanent_pincode}>
        <input name="permanent_pincode" placeholder="6-digit pincode" maxLength={6} value={form.permanent_pincode} onChange={onChange} className={inputCls}/>
      </Field>

      <Field label="Address" error={errors.permanent_address} span2>
        <input name="permanent_address" placeholder="Street address" value={form.permanent_address} onChange={onChange} className={inputCls}/>
      </Field>
    </>
  );
}

function Avatar({name,size="md"}){
  const safe=name||"??";
  const initials=safe.split(" ").map((w)=>w[0]).join("").toUpperCase().slice(0,2);
  const colors=["#CD166E","#730042","#993556","#72243E","#A0186A"];
  const color=colors[safe.charCodeAt(0)%colors.length];
  const sz=size==="lg"?"w-16 h-16 text-xl":size==="sm"?"w-7 h-7 text-[10px]":"w-8 h-8 text-xs";
  return(
    <div className={`${sz} rounded-full flex items-center justify-center font-bold text-white flex-shrink-0`} style={{background:color}}>
      {initials}
    </div>
  );
}

function Badge({label,type="dept"}){
  const styles={
    dept:"bg-[#FBEAF0] text-[#730042]",
    role:"bg-[#FEF3E8] text-[#7A3500]",
    manager:"bg-[#EEEDFE] text-[#3C3489]",
    smgr:"bg-[#E1F5EE] text-[#085041]",
    admin:"bg-[#FEF3C7] text-[#92400E]",
    active:"bg-[#D1FAE5] text-[#065F46]",
    inactive:"bg-[#F3F4F6] text-[#6B7280]",
    suspended:"bg-[#FEE2E2] text-[#991B1B]",
    working:"bg-[#D1FAE5] text-[#065F46]",
    resigned:"bg-[#FEF3C7] text-[#92400E]",
    fired:"bg-[#FEE2E2] text-[#991B1B]",
    terminated:"bg-[#F3F4F6] text-[#374151]",
  };
  return(
    <span className={`px-2 py-0.5 rounded-full text-xs font-semibold whitespace-nowrap ${styles[type]??styles.dept}`}>
      {label}
    </span>
  );
}

function InfoRow({icon,label,value}){
  if(!value)return null;
  return(
    <div className="flex items-start gap-2.5 py-2 border-b border-[#F4C0D1]/50 last:border-0">
      <div className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0" style={{background:"#FBEAF0"}}>
        <span className="text-[#993556]">{icon}</span>
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-[10px] font-semibold uppercase tracking-wider text-[#993556]">{label}</p>
        <p className="text-sm text-[#730042] font-medium break-words">{value}</p>
      </div>
    </div>
  );
}

function PermissionToggle({label,value,onChange,disabled}){
  return(
    <div className="flex items-center justify-between py-1.5">
      <span className={`text-xs font-medium ${disabled?"text-[#993556]/40":"text-[#730042]"}`}>{label}</span>
      <button
        type="button"
        onClick={()=>!disabled&&onChange(!value)}
        className={`transition-colors ${disabled?"cursor-not-allowed opacity-40":""}`}
        title={disabled?"This permission cannot be changed for this role":""}
      >
        {value
          ?<FaToggleOn size={22} className={disabled?"text-[#F4C0D1]":"text-[#CD166E]"}/>
          :<FaToggleOff size={22} className="text-[#F4C0D1]"/>
        }
      </button>
    </div>
  );
}

function getDisabledKeys(roleType) {
  if (roleType === "employee") {
    return {
      announcements: ["can_create_announcement","can_edit_announcement","can_delete_announcement"],
      documents: ["can_view_all_documents"],
      tickets: ["can_resolve_ticket","can_rate_ticket"],
      recruitment: ["can_view_hiring_requisitions","can_create_hiring_requisition","can_view_candidates","can_add_candidate"],
    };
  }
  if (roleType === "manager") {
    return {
      announcements: ["can_create_announcement","can_edit_announcement","can_delete_announcement"],
      documents: ["can_view_all_documents"],
      tickets: ["can_resolve_ticket","can_rate_ticket"],
      recruitment: ["can_view_candidates","can_add_candidate"],
    };
  }
  return {};
}

function PermissionsPanel({perms,onChange,roleType="employee"}){
  const disabledKeys = getDisabledKeys(roleType);
  const sections=[
    {key:"announcements",label:"Announcements",fields:[
      {k:"can_view_announcements",label:"View"},
      {k:"can_create_announcement",label:"Create"},
      {k:"can_edit_announcement",label:"Edit"},
      {k:"can_delete_announcement",label:"Delete"},
    ]},
    {key:"documents",label:"Documents",fields:[
      {k:"can_upload_documents",label:"Upload"},
      {k:"can_view_all_documents",label:"View All"},
    ]},
    {key:"tickets",label:"Tickets",fields:[
      {k:"can_raise_ticket",label:"Raise"},
      {k:"can_view_all_tickets",label:"View All"},
      {k:"can_resolve_ticket",label:"Resolve"},
      {k:"can_rate_ticket",label:"Rate"},
    ]},
    {key:"recruitment",label:"Recruitment",fields:[
      {k:"can_view_hiring_requisitions",label:"View Requisitions"},
      {k:"can_create_hiring_requisition",label:"Create Requisition"},
      {k:"can_view_candidates",label:"View Candidates"},
      {k:"can_add_candidate",label:"Add Candidate"},
    ]},
  ];
  return(
    <div className="col-span-2 space-y-3">
      {sections.map((sec)=>(
        <div key={sec.key} className="rounded-xl border border-[#F4C0D1] overflow-hidden">
          <div className="px-3 py-2 text-[11px] font-bold uppercase tracking-wider text-[#993556]" style={{background:"#FBEAF0"}}>
            {sec.label}
          </div>
          <div className="px-3 divide-y divide-[#F4C0D1]/50">
            {sec.fields.map((f)=>{
              const isDisabled = (disabledKeys[sec.key]||[]).includes(f.k);
              return(
                <PermissionToggle
                  key={f.k}
                  label={f.label}
                  value={perms?.[sec.key]?.[f.k]??false}
                  onChange={(v)=>onChange(sec.key,f.k,v)}
                  disabled={isDisabled}
                />
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}

function ReportingManagerSelect({value,onChange,managersOnly,managersWithAdmin,label="Reporting Manager",name="reporting_manager"}){
  const managersList = managersOnly?.managers ?? [];
  const withAdminList = managersWithAdmin?.managers ?? [];
  const adminList = withAdminList.filter(m => m.isAdmin);
  const pureManagers = managersList;
  return(
    <Field label={label}>
      <select name={name} value={value} onChange={onChange} className={inputCls}>
        <option value="">Select (optional)</option>
        {adminList.length > 0 && (
          <optgroup label="Admins">
            {adminList.map((a) => (
              <option key={a._id} value={a._id}>
                {a.f_name} {a.l_name} — {a.work_email} ({a.role?.replace("_"," ")||"Admin"})
              </option>
            ))}
          </optgroup>
        )}
        {pureManagers.length > 0 && (
          <optgroup label="Managers">
            {pureManagers.map((m) => (
              <option key={m._id} value={m._id}>
                {m.f_name} {m.l_name} — {m.work_email} ({m.role?.replace("_"," ")||"Manager"})
              </option>
            ))}
          </optgroup>
        )}
      </select>
    </Field>
  );
}

function UnderManagerSelect({value,onChange,managersOnly,label="Under Manager",name="Under_manager"}){
  const list = managersOnly?.managers ?? [];
  return(
    <Field label={label}>
      <select name={name} value={value} onChange={onChange} className={inputCls}>
        <option value="">Select Manager (optional)</option>
        {list.map((m) => (
          <option key={m._id} value={m._id}>
            {m.f_name} {m.l_name} — {m.work_email} ({m.role?.replace("_"," ")||"Manager"})
          </option>
        ))}
      </select>
    </Field>
  );
}

function PermissionsDrawer({userId,userModel,userRole,onClose}){
  const [perms,setPerms]=useState(null);
  const [loading,setLoading]=useState(true);
  const [saving,setSaving]=useState(false);
  const [msg,setMsg]=useState("");

  const roleType = ["admin","senior_admin","official"].includes(userRole)
    ? "admin"
    : ["manager","senior_manager"].includes(userRole)
    ? "manager"
    : "employee";

  const defaultPerms = roleType === "admin"
    ? ADMIN_PERMISSIONS
    : roleType === "manager"
    ? MGR_DEFAULT_PERMISSIONS
    : EMP_DEFAULT_PERMISSIONS;

  useEffect(()=>{
    api.get(`permission/admin/${userModel}/${userId}`)
      .then((r)=>setPerms(r.data.data||r.data))
      .catch(()=>setPerms({...defaultPerms}))
      .finally(()=>setLoading(false));
  },[userId,userModel]);

  const handleToggle=(section,key,val)=>{
    const disabled = getDisabledKeys(roleType);
    if ((disabled[section]||[]).includes(key)) return;
    setPerms((p)=>({...p,[section]:{...p[section],[key]:val}}));
  };

  const handleSave=async()=>{
    setSaving(true);
    try{
      await api.post("permission/assign/admin",{user_id:userId,user_model:userModel,permissions:perms});
      setMsg("Permissions saved successfully");
      setTimeout(()=>setMsg(""),2500);
    }catch(e){
      setMsg(e?.response?.data?.message||"Failed to save permissions");
      setTimeout(()=>setMsg(""),2500);
    }finally{setSaving(false);}
  };

  return(
    <div className="fixed inset-0 z-[60] flex" onClick={(e)=>e.target===e.currentTarget&&onClose()}>
      <div className="flex-1" onClick={onClose}/>
      <div className="w-full max-w-xs bg-white shadow-2xl flex flex-col border-l border-[#F4C0D1] h-full overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 border-b border-[#F4C0D1] flex-shrink-0" style={{background:"#F9F8F2"}}>
          <div className="flex items-center gap-2">
            <FaKey size={12} className="text-[#CD166E]"/>
            <p className="text-sm font-bold text-[#730042]">Manage Permissions</p>
          </div>
          <button onClick={onClose} className="w-7 h-7 rounded-lg flex items-center justify-center text-[#993556] hover:bg-[#FBEAF0]">
            <FaTimes size={12}/>
          </button>
        </div>
        {loading?(
          <div className="flex-1 flex items-center justify-center">
            <div className="w-8 h-8 rounded-full border-2 border-[#CD166E] border-t-transparent animate-spin"/>
          </div>
        ):(
          <>
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              <div className="flex gap-2 mb-3">
                <button onClick={()=>setPerms({...ADMIN_PERMISSIONS})} className="flex-1 py-1.5 rounded-lg text-xs font-semibold border border-[#F4C0D1] text-[#730042] hover:bg-[#FBEAF0]">Set All On</button>
                <button onClick={()=>setPerms({...defaultPerms})} className="flex-1 py-1.5 rounded-lg text-xs font-semibold border border-[#F4C0D1] text-[#730042] hover:bg-[#FBEAF0]">Reset Default</button>
              </div>
              {perms&&<PermissionsPanel perms={perms} onChange={handleToggle} roleType={roleType}/>}
            </div>
            <div className="px-4 py-3 border-t border-[#F4C0D1] flex-shrink-0 bg-[#F9F8F2]">
              {msg&&<p className={`text-xs mb-2 text-center font-medium ${msg.includes("success")?"text-[#065F46]":"text-[#A32D2D]"}`}>{msg}</p>}
              <button onClick={handleSave} disabled={saving} className="w-full py-2.5 rounded-xl text-white text-sm font-semibold disabled:opacity-60 hover:opacity-90" style={{background:"#730042"}}>
                {saving?"Saving…":"Save Permissions"}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function WorkingStatusBadge({status}){
  if(!status||status==="working") return <Badge label="Working" type="working"/>;
  if(status==="resigned") return <Badge label="Resigned" type="resigned"/>;
  if(status==="fired") return <Badge label="Fired" type="fired"/>;
  if(status==="terminated") return <Badge label="Terminated" type="terminated"/>;
  return <Badge label={status} type="inactive"/>;
}

function AssetReturnBlockedModal({ data, personName, onClose }) {
  if (!data) return null;
  const { pending_asset_count, assets, message } = data;
  return (
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center p-4"
      style={{ background: "rgba(115,0,66,0.55)", backdropFilter: "blur(3px)" }}
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl p-6 animate-[modalPop_.2s_ease-out]">
        <style>{`@keyframes modalPop{from{opacity:0;transform:scale(.96)}to{opacity:1;transform:scale(1)}}`}</style>

        <div className="flex items-start gap-3 p-3 bg-[#FFF5F5] border border-[#FCA5A5] rounded-xl mb-4">
          <FaExclamationTriangle size={18} className="text-[#DC2626] flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-[13px] font-bold text-[#991B1B]">
              Cannot offboard {personName || "this person"}
            </p>
            <p className="text-[12px] text-[#7F1D1D] mt-1 leading-relaxed">{message}</p>
          </div>
        </div>

        <p className="text-[12px] font-semibold text-[#993556] mb-3">
          {pending_asset_count} asset{pending_asset_count !== 1 ? "s" : ""} still assigned:
        </p>

        <div className="space-y-2 mb-4 max-h-56 overflow-y-auto">
          {assets.map((a) => (
            <div
              key={a._id}
              className="flex items-center gap-3 p-2.5 rounded-xl border border-[#F4C0D1] bg-[#F9F8F2]"
            >
              <div className="w-9 h-9 rounded-xl flex items-center justify-center bg-[#FBEAF0] text-[#730042] text-sm flex-shrink-0">
                📦
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-[12px] font-semibold text-[#730042] truncate">{a.asset_name}</p>
                <p className="text-[10px] text-[#993556] font-mono">{a.asset_id}</p>
                <p className="text-[10px] text-[#993556]">
                  {a.brand ? `${a.brand} · ` : ""}{a.asset_type}
                  {a.serial_number ? ` · S/N: ${a.serial_number}` : ""}
                </p>
              </div>
            </div>
          ))}
        </div>

        <p className="text-[11px] text-[#993556] mb-4 leading-relaxed">
          Please go to <strong>Asset Management</strong> and revoke the asset(s) listed above
          before changing this person's employment status.
        </p>

        <button
          onClick={onClose}
          className="w-full px-4 py-2.5 rounded-xl bg-[#730042] text-white text-[13px] font-semibold hover:bg-[#4a0029] transition"
        >
          Understood
        </button>
      </div>
    </div>
  );
}

function WorkingStatusSelector({currentStatus,onSave,loading,blockedInfo,onDismissBlock}){
  const [selected,setSelected]=useState(currentStatus||"working");
  const [awaitingConfirm,setAwaitingConfirm]=useState(false);

  const isIrreversible = IRREVERSIBLE_STATUSES.includes(selected);
  const isAlreadyIrreversible = IRREVERSIBLE_STATUSES.includes(currentStatus);
  const noChange = selected === currentStatus;

  const handleSelectChange=(e)=>{
    setSelected(e.target.value);
    setAwaitingConfirm(false);
    onDismissBlock&&onDismissBlock();
  };

  const handleUpdateClick=async ()=>{
    onDismissBlock&&onDismissBlock();
    if(isIrreversible){
      setAwaitingConfirm(true);
    } else {
      const ok = await onSave(selected);
      if(!ok) setSelected(currentStatus||"working");
    }
  };

  const handleConfirm=async ()=>{
    setAwaitingConfirm(false);
    const ok = await onSave(selected);
    if(!ok) setSelected(currentStatus||"working");
  };

  const handleCancel=()=>{
    setAwaitingConfirm(false);
    setSelected(currentStatus||"working");
  };

  const statusLabel = selected.charAt(0).toUpperCase()+selected.slice(1);

  return(
    <div className="mt-3 p-3 rounded-xl border border-[#F4C0D1] bg-[#F9F8F2]">
      <p className="text-[10px] font-bold uppercase tracking-wider text-[#993556] mb-2">Employment Status</p>

      {blockedInfo&&(
        <div className="mb-3 rounded-xl border border-[#FCA5A5] bg-[#FFF5F5] p-3">
          <div className="flex items-start gap-2 mb-2">
            <FaExclamationTriangle size={14} className="text-[#DC2626] flex-shrink-0 mt-0.5"/>
            <p className="text-[12px] text-[#7F1D1D] leading-relaxed font-medium">
              {blockedInfo.message}
            </p>
          </div>
          <div className="space-y-1.5 mb-2">
            {blockedInfo.assets.map((a)=>(
              <div key={a._id} className="flex items-center gap-2 p-2 rounded-lg bg-white border border-[#FCA5A5]">
                <span className="text-sm">📦</span>
                <div className="min-w-0">
                  <p className="text-[11px] font-semibold text-[#730042] truncate">{a.asset_name}</p>
                  <p className="text-[10px] text-[#993556]">
                    {a.asset_id}{a.brand?` · ${a.brand}`:""}{a.serial_number?` · S/N: ${a.serial_number}`:""}
                  </p>
                </div>
              </div>
            ))}
          </div>
          <button onClick={onDismissBlock} className="text-[11px] font-semibold text-[#730042] hover:underline">
            Dismiss
          </button>
        </div>
      )}

      {awaitingConfirm ? (
        <div className="rounded-xl border border-[#FCA5A5] bg-[#FFF5F5] p-3">
          <div className="flex items-start gap-2 mb-3">
            <FaExclamationTriangle size={14} className="text-[#DC2626] flex-shrink-0 mt-0.5"/>
            <div>
              <p className="text-xs font-bold text-[#991B1B]">This action cannot be undone</p>
              <p className="text-[11px] text-[#7F1D1D] mt-0.5 leading-relaxed">
                Setting status to <strong>{statusLabel}</strong> is permanent. The employee will be
                marked as inactive and cannot be set back to <strong>Working</strong>.
              </p>
            </div>
          </div>
          <div className="flex gap-2">
            <button onClick={handleCancel} className="flex-1 py-2 rounded-lg text-xs font-semibold border border-[#F4C0D1] text-[#730042] hover:bg-[#FBEAF0] transition-all">Cancel</button>
            <button onClick={handleConfirm} disabled={loading} className="flex-1 py-2 rounded-lg text-white text-xs font-bold disabled:opacity-50 transition-all" style={{background:"#DC2626"}}>
              {loading?"Updating…":`Confirm ${statusLabel}`}
            </button>
          </div>
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          <select
            value={selected}
            onChange={handleSelectChange}
            disabled={isAlreadyIrreversible}
            className={`${inputCls} ${isAlreadyIrreversible?"opacity-60 cursor-not-allowed":""}`}
          >
            {WORKING_STATUSES.map(s=>(
              <option key={s} value={s}>{s.charAt(0).toUpperCase()+s.slice(1)}</option>
            ))}
          </select>
          {isAlreadyIrreversible ? (
            <div className="flex items-center gap-1.5 px-2 py-2 rounded-lg bg-[#F3F4F6] border border-[#E5E7EB]">
              <FaBan size={10} className="text-[#6B7280] flex-shrink-0"/>
              <p className="text-[11px] text-[#6B7280]">
                Status is permanently set to <strong>{currentStatus}</strong> and cannot be changed.
              </p>
            </div>
          ) : (
            <>
              {isIrreversible && !noChange && (
                <div className="flex items-center gap-1.5 px-2 py-1.5 rounded-lg bg-[#FEF3C7] border border-[#FCD34D]">
                  <FaExclamationTriangle size={9} className="text-[#B45309] flex-shrink-0"/>
                  <p className="text-[11px] text-[#92400E] font-medium">
                    Warning: <strong>{statusLabel}</strong> is irreversible
                  </p>
                </div>
              )}
              <button
                onClick={handleUpdateClick}
                disabled={loading||noChange}
                className="w-full py-2 rounded-lg text-white text-xs font-semibold disabled:opacity-50 hover:opacity-90 transition-all"
                style={{background: isIrreversible && !noChange ? "#DC2626" : "#730042"}}
              >
                {loading?"Updating…":"Update Status"}
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
}

function AccountSummaryDrawer({
  userId,userRole,onClose,onEdit,onDelete,
  onPromoteToManager,onPromoteToAdmin,onDemoteToEmployee,onDemoteToManager,onDemoteToEmployee2,
  managersOnly,managersWithAdmin,allEmployees,currentAdminId,onRefresh,
}){
  const isManager=userRole==="manager"||userRole==="senior_manager";
  const isAdmin=userRole==="admin"||userRole==="senior_admin"||userRole==="official";
  const empQuery=useGetParticularEmployee(!isManager&&!isAdmin?userId:null);
  const mgrQuery=useGetParticularManager(isManager?userId:null);
  const data=isManager?mgrQuery.data:empQuery.data;
  const loading=isManager?mgrQuery.isLoading:empQuery.isLoading;
  const person=data?.user||data?.manager;
  const leaveBalance=data?.leaveBalance;
  const reviews=data?.reviews||[];
  const [tab,setTab]=useState("info");
  const [showPermissions,setShowPermissions]=useState(false);
  const [wsLoading,setWsLoading]=useState(false);
  const [assetBlock,setAssetBlock]=useState(null);

  const setEmpWS=useSetEmployeeWorkingStatus(userId);
  const setMgrWS=useSetManagerWorkingStatus(userId);

  const avgRating=reviews.length?reviews.reduce((s,r)=>s+(r.rating||0),0)/reviews.length:null;
  const isSelf=currentAdminId&&userId&&currentAdminId===userId;
  const userModel=isAdmin?"Admin":isManager?"Manager":"User";

  const roleType = isAdmin?"admin":isManager?"manager":"employee";

 const handleWorkingStatusSave=async(ws)=>{
    setWsLoading(true);
    try{
      if(isManager){
        await setMgrWS.mutateAsync(ws);
      }else{
        await setEmpWS.mutateAsync(ws);
      }
      onRefresh&&onRefresh();
      if(isManager) mgrQuery.refetch();
      else empQuery.refetch();
      return true;
    }catch(e){
      const assetCheck = e?.response?.data?.asset_return_check;
      if(e?.response?.status===409 && assetCheck?.has_pending_assets){
        setAssetBlock(assetCheck);
      } else {
        console.error(e);
      }
      return false;
    }finally{setWsLoading(false);}
  };
  const roleBadgeEl=(r)=>{
    if(r==="manager")return<Badge label="Manager" type="manager"/>;
    if(r==="senior_manager")return<Badge label="Sr. Manager" type="smgr"/>;
    if(r==="admin"||r==="senior_admin")return<Badge label="Admin" type="admin"/>;
    if(r==="employee")return<Badge label="Employee" type="role"/>;
    if(r==="official")return<Badge label="Official" type="role"/>;
    return<Badge label={r?.replace("_"," ")||"—"} type="role"/>;
  };

  return(
    <>
      <div className="fixed inset-0 z-50 flex" onClick={(e)=>e.target===e.currentTarget&&onClose()}>
        <div className="flex-1" onClick={onClose}/>
        <div className="w-full max-w-sm bg-white shadow-2xl flex flex-col border-l border-[#F4C0D1] h-full overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-[#F4C0D1] flex-shrink-0" style={{background:"#F9F8F2"}}>
            <p className="text-sm font-bold text-[#730042]">Account Summary</p>
            <div className="flex items-center gap-2">
              <button onClick={()=>setShowPermissions(true)} className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold text-[#730042] border border-[#F4C0D1] hover:bg-[#FBEAF0]">
                <FaKey size={10}/> Permissions
              </button>
              <button onClick={onClose} className="w-7 h-7 rounded-lg flex items-center justify-center text-[#993556] hover:bg-[#FBEAF0]">
                <FaTimes size={12}/>
              </button>
            </div>
          </div>
          {loading?(
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center space-y-2">
                <div className="w-12 h-12 rounded-full bg-[#FBEAF0] animate-pulse mx-auto"/>
                <div className="h-3 bg-[#FBEAF0] rounded w-24 mx-auto animate-pulse"/>
              </div>
            </div>
          ):person?(
            <>
              <div className="px-4 pt-4 pb-3 border-b border-[#F4C0D1] flex-shrink-0">
                <div className="flex items-start gap-3">
                  <Avatar name={`${person.f_name??""} ${person.l_name??""}`} size="lg"/>
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-[#730042] text-base leading-tight">{person.f_name} {person.l_name}</p>
                    <p className="text-xs text-[#993556] truncate mt-0.5">{person.work_email}</p>
                    <div className="flex flex-wrap gap-1.5 mt-2">
                      {roleBadgeEl(person.role)}
                      {person.department&&<Badge label={person.department} type="dept"/>}
                      {person.status&&<Badge label={person.status} type={person.status==="active"?"active":person.status==="suspended"?"suspended":"inactive"}/>}
                    </div>
                    <div className="flex flex-wrap gap-1.5 mt-1.5">
                      <WorkingStatusBadge status={person.working_status}/>
                    </div>
                    {person.uid&&<p className="text-[11px] text-[#993556] mt-1.5 font-mono bg-[#F9F8F2] px-1.5 py-0.5 rounded inline-block border border-[#F4C0D1]">{person.uid}</p>}
                  </div>
                </div>
                {avgRating!==null&&(
                  <div className="mt-3 flex items-center gap-1.5">
                    {[1,2,3,4,5].map((s)=>(
                      <FaStar key={s} size={12} className={s<=Math.round(avgRating)?"text-yellow-400":"text-[#F4C0D1]"}/>
                    ))}
                    <span className="text-xs text-[#993556] font-medium">{avgRating.toFixed(1)} ({reviews.length} review{reviews.length!==1?"s":""})</span>
                  </div>
                )}
              </div>
              <div className="flex border-b border-[#F4C0D1] flex-shrink-0 bg-white">
                {["info","leave","reviews"].map((t)=>(
                  <button key={t} onClick={()=>setTab(t)} className="flex-1 py-2.5 text-xs font-semibold capitalize transition-colors"
                    style={tab===t?{color:"#730042",borderBottom:"2px solid #CD166E"}:{color:"#993556"}}>
                    {t==="info"?"Profile":t==="leave"?"Leave":"Reviews"}
                  </button>
                ))}
              </div>
              <div className="flex-1 overflow-y-auto px-4 py-3">
                {tab==="info"&&(
                  <div className="space-y-0.5">
                    <InfoRow icon={<FaEnvelope size={10}/>} label="Work Email" value={person.work_email}/>
                    <InfoRow icon={<FaPhone size={10}/>} label="Personal Contact" value={person.personal_contact}/>
                    <InfoRow icon={<FaPhone size={10}/>} label="Emergency Contact" value={person.e_contact}/>
                    <InfoRow icon={<FaBriefcase size={10}/>} label="Designation" value={person.designation}/>
                    <InfoRow icon={<FaBuilding size={10}/>} label="Department" value={person.department}/>
                    <InfoRow icon={<FaMapMarkerAlt size={10}/>} label="Office Location" value={person.office_location}/>
                    <InfoRow icon={<FaUser size={10}/>} label="Gender" value={person.gender?person.gender.charAt(0).toUpperCase()+person.gender.slice(1):null}/>
                    <InfoRow icon={<FaUser size={10}/>} label="Marital Status" value={person.marital_status?person.marital_status.charAt(0).toUpperCase()+person.marital_status.slice(1):null}/>
                    {person.address&&<InfoRow icon={<FaMapMarkerAlt size={10}/>} label="Address" value={[person.address,person.city,person.state,person.pincode].filter(Boolean).join(", ")}/>}
                    {person.aadhaar_number&&<InfoRow icon={<FaIdCard size={10}/>} label="Aadhaar" value={person.aadhaar_number}/>}
                    {person.pan_number&&<InfoRow icon={<FaShieldAlt size={10}/>} label="PAN" value={person.pan_number}/>}
                    {person.bank_name&&(
                      <div className="mt-3 pt-3 border-t border-[#F4C0D1]/50">
                        <p className="text-[10px] font-bold uppercase tracking-wider text-[#993556] mb-2">Bank Details</p>
                        <InfoRow icon={<FaUniversity size={10}/>} label="Bank" value={person.bank_name}/>
                        <InfoRow icon={<FaUniversity size={10}/>} label="Account Holder" value={person.account_holder_name}/>
                        <InfoRow icon={<FaUniversity size={10}/>} label="Account No." value={person.account_number}/>
                        <InfoRow icon={<FaUniversity size={10}/>} label="IFSC" value={person.ifsc_code}/>
                      </div>
                    )}
                    {(person.resume||person.aadhaar_card||person.pan_card||person.experience_letter)&&(
                      <div className="mt-3 pt-3 border-t border-[#F4C0D1]/50">
                        <p className="text-[10px] font-bold uppercase tracking-wider text-[#993556] mb-2">Documents</p>
                        {person.resume&&<a href={person.resume} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 py-1.5 text-xs text-[#730042] hover:text-[#CD166E]"><FaFileAlt size={10}/> Resume</a>}
                        {person.aadhaar_card&&<a href={person.aadhaar_card} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 py-1.5 text-xs text-[#730042] hover:text-[#CD166E]"><FaFileAlt size={10}/> Aadhaar Card</a>}
                        {person.pan_card&&<a href={person.pan_card} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 py-1.5 text-xs text-[#730042] hover:text-[#CD166E]"><FaFileAlt size={10}/> PAN Card</a>}
                        {person.experience_letter&&<a href={person.experience_letter} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 py-1.5 text-xs text-[#730042] hover:text-[#CD166E]"><FaFileAlt size={10}/> Experience Letter</a>}
                      </div>
                    )}
                    {(person.Under_manager||person.reporting_manager)&&(
                      <div className="mt-3 pt-3 border-t border-[#F4C0D1]/50">
                        <p className="text-[10px] font-bold uppercase tracking-wider text-[#993556] mb-2">Reporting To</p>
                        <div className="flex items-center gap-2 p-2 rounded-lg bg-[#FBEAF0] border border-[#F4C0D1]">
                          <Avatar name={`${(person.Under_manager||person.reporting_manager)?.f_name??""} ${(person.Under_manager||person.reporting_manager)?.l_name??""}`} size="sm"/>
                          <div>
                            <p className="text-xs font-semibold text-[#730042]">{(person.Under_manager||person.reporting_manager)?.f_name} {(person.Under_manager||person.reporting_manager)?.l_name}</p>
                            <p className="text-[10px] text-[#993556]">{(person.Under_manager||person.reporting_manager)?.work_email}</p>
                          </div>
                        </div>
                      </div>
                    )}
                   {!isAdmin&&(
  <WorkingStatusSelector
    currentStatus={person.working_status||"working"}
    onSave={handleWorkingStatusSave}
    loading={wsLoading}
    blockedInfo={assetBlock}
    onDismissBlock={()=>setAssetBlock(null)}
  />
)}
                  </div>
                )}
                {tab==="leave"&&(
                  <div>
                    {leaveBalance?(
                      <div className="grid grid-cols-2 gap-2">
                        {Object.entries(leaveBalance)
                          .filter(([k])=>!LEAVE_SKIP_KEYS.includes(k))
                          .map(([k,v])=>(
                            <div key={k} className="p-3 rounded-xl border border-[#F4C0D1] bg-[#FBEAF0]">
                              <p className="text-[10px] font-bold uppercase tracking-wider text-[#993556]">{k.replace(/_/g," ")}</p>
                              <p className="text-xl font-bold text-[#730042] mt-0.5">{resolveLeaveValue(v)}</p>
                            </div>
                          ))}
                      </div>
                    ):(
                      <div className="text-center py-8 text-[#993556] text-sm">No leave balance data</div>
                    )}
                  </div>
                )}
                {tab==="reviews"&&(
                  <div className="space-y-3">
                    {reviews.length===0?(
                      <div className="text-center py-8 text-[#993556] text-sm">No reviews yet</div>
                    ):reviews.map((r,i)=>(
                      <div key={i} className="p-3 rounded-xl border border-[#F4C0D1] bg-[#FBEAF0]">
                        <div className="flex items-center justify-between mb-1.5">
                          <p className="text-xs font-semibold text-[#730042]">{r.reviewer?.f_name} {r.reviewer?.l_name}</p>
                          <div className="flex gap-0.5">
                            {[1,2,3,4,5].map((s)=>(
                              <FaStar key={s} size={10} className={s<=r.rating?"text-yellow-400":"text-[#F4C0D1]"}/>
                            ))}
                          </div>
                        </div>
                        <p className="text-xs text-[#993556]">{r.comment}</p>
                        <p className="text-[10px] text-[#993556]/60 mt-1">{r.monthYear}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              <div className="px-4 py-3 border-t border-[#F4C0D1] flex-shrink-0 bg-[#F9F8F2]">
                <div className="grid grid-cols-2 gap-2 mb-2">
                  <button onClick={()=>{onEdit(person);onClose();}} className="flex items-center justify-center gap-1.5 py-2 rounded-lg border border-[#F4C0D1] text-xs font-semibold text-[#730042] hover:bg-[#FBEAF0]">
                    <FaEdit size={10}/> Edit
                  </button>
                  <button onClick={()=>{onDelete(person);onClose();}} className="flex items-center justify-center gap-1.5 py-2 rounded-lg border border-[#FEE2E2] text-xs font-semibold text-[#A32D2D] hover:bg-[#FEE2E2]">
                    <FaTrash size={10}/> Delete
                  </button>
                </div>
                {!isSelf&&(
                  <div className="flex flex-col gap-2">
                    {(userRole==="employee"||userRole==="official")&&(
                      <>
                        <button onClick={()=>{onPromoteToManager(person);onClose();}} className="w-full flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-semibold text-white hover:opacity-90" style={{background:"#3C3489"}}>
                          <FaArrowUp size={10}/> Promote to Manager
                        </button>
                        <button onClick={()=>{onPromoteToAdmin(person);onClose();}} className="w-full flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-semibold text-white hover:opacity-90" style={{background:"#92400E"}}>
                          <FaArrowUp size={10}/> Promote to Admin
                        </button>
                      </>
                    )}
                    {(userRole==="manager"||userRole==="senior_manager")&&(
                      <div className="flex gap-2">
                        <button onClick={()=>{onPromoteToAdmin(person);onClose();}} className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-semibold text-white hover:opacity-90" style={{background:"#92400E"}}>
                          <FaArrowUp size={10}/> To Admin
                        </button>
                        <button onClick={()=>{onDemoteToEmployee(person);onClose();}} className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-semibold text-white hover:opacity-90" style={{background:"#7A3500"}}>
                          <FaArrowDown size={10}/> To Employee
                        </button>
                      </div>
                    )}
                    {(userRole==="admin"||userRole==="senior_admin")&&(
                      <div className="flex gap-2">
                        <button onClick={()=>{onDemoteToManager(person);onClose();}} className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-semibold text-white hover:opacity-90" style={{background:"#7A3500"}}>
                          <FaArrowDown size={10}/> To Manager
                        </button>
                        <button onClick={()=>{onDemoteToEmployee2(person);onClose();}} className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-semibold text-white hover:opacity-90" style={{background:"#A32D2D"}}>
                          <FaArrowDown size={10}/> To Employee
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </>
          ):(
            <div className="flex-1 flex items-center justify-center text-[#993556] text-sm">Failed to load profile</div>
          )}
        </div>
      </div>
      {showPermissions&&person&&(
        <PermissionsDrawer
          userId={person._id}
          userModel={userModel}
          userRole={person.role}
          onClose={()=>setShowPermissions(false)}
        />
      )}
      {assetBlock&&(
        <AssetReturnBlockedModal
          data={assetBlock}
          personName={person?`${person.f_name} ${person.l_name}`:""}
          onClose={()=>setAssetBlock(null)}
        />
      )}
    </>
  );
}
function StepModal({title,icon,onClose,onSubmit,steps,currentStep,setCurrentStep,children,accentColor="#CD166E"}){
  const totalSteps=steps.length;
  const isLast=currentStep===totalSteps-1;
  const isFirst=currentStep===0;
  return(
    <div
      className="fixed inset-0 flex items-end sm:items-center justify-center z-50 p-0 sm:p-4"
      style={{background:"rgba(115,0,66,0.40)",backdropFilter:"blur(3px)"}}
    >
      <div className="bg-white w-full sm:max-w-2xl rounded-t-2xl sm:rounded-2xl flex flex-col max-h-[96vh] sm:max-h-[92vh] border-t sm:border border-[#F4C0D1] shadow-2xl">
        <div className="flex items-center justify-between px-4 sm:px-6 py-3 sm:py-4 rounded-t-2xl flex-shrink-0" style={{background:accentColor}}>
          <div className="flex items-center gap-2 sm:gap-3 min-w-0">
            <span className="text-white text-lg sm:text-xl flex-shrink-0">{icon}</span>
            <div className="min-w-0">
              <h2 className="text-base sm:text-lg font-bold text-white truncate">{title}</h2>
              <p className="text-[11px] sm:text-xs" style={{color:"rgba(255,255,255,0.65)"}}>
                Step {currentStep+1} of {totalSteps} — {steps[currentStep].label}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-white flex-shrink-0 ml-2"
            style={{background:"rgba(255,255,255,0.18)"}}
          >
            <FaTimes size={13}/>
          </button>
        </div>
        <div className="px-3 sm:px-6 pt-3 pb-2 bg-white border-b border-[#F4C0D1] flex-shrink-0">
          <div className="flex items-center gap-1 overflow-x-auto pb-1 scrollbar-hide">
            {steps.map((s,i)=>(
              <div key={i} className="flex items-center gap-1 flex-shrink-0">
                <button onClick={()=>setCurrentStep(i)} className="flex items-center gap-1 sm:gap-1.5 px-2 sm:px-2.5 py-1.5 rounded-lg text-[11px] sm:text-xs font-semibold transition-all"
                  style={i===currentStep?{background:accentColor,color:"#fff"}:i<currentStep?{background:"#FBEAF0",color:"#730042"}:{background:"#F9F8F2",color:"#993556"}}>
                  <span>{s.icon}</span><span className="hidden sm:inline">{s.label}</span>
                </button>
                {i<totalSteps-1&&<div className="w-2 sm:w-3 h-0.5 rounded-full flex-shrink-0" style={{background:i<currentStep?accentColor:"#F4C0D1"}}/>}
              </div>
            ))}
          </div>
        </div>
        <div className="overflow-y-auto p-3 sm:p-6 flex-1 bg-[#F9F8F2]">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">{children}</div>
        </div>
        <div className="px-3 sm:px-6 py-3 sm:py-4 border-t border-[#F4C0D1] flex justify-between gap-2 bg-[#F9F8F2] flex-shrink-0">
          <button onClick={onClose} className="px-3 sm:px-5 py-2 sm:py-2.5 rounded-xl border border-[#F4C0D1] text-[#730042] text-xs sm:text-sm font-semibold hover:bg-[#FBEAF0]">Cancel</button>
          <div className="flex gap-2">
            {!isFirst&&<button onClick={()=>setCurrentStep((s)=>s-1)} className="flex items-center gap-1 sm:gap-1.5 px-3 sm:px-4 py-2 sm:py-2.5 rounded-xl border border-[#F4C0D1] text-[#730042] text-xs sm:text-sm font-semibold hover:bg-[#FBEAF0]"><FaChevronLeft size={10}/><span className="hidden xs:inline">Prev</span></button>}
            {!isLast?(
              <button onClick={()=>setCurrentStep((s)=>s+1)} className="flex items-center gap-1 sm:gap-1.5 px-3 sm:px-5 py-2 sm:py-2.5 rounded-xl text-white text-xs sm:text-sm font-semibold hover:opacity-90" style={{background:accentColor}}>
                <span className="hidden xs:inline">Next</span><FaChevronRight size={10}/>
              </button>
            ):(
              <button onClick={onSubmit} className="px-4 sm:px-6 py-2 sm:py-2.5 rounded-xl text-white text-xs sm:text-sm font-semibold hover:opacity-90" style={{background:accentColor}}>Submit</button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function Modal({title,icon,onClose,onSubmit,children,accentColor="#CD166E"}){
  return(
    <div
      className="fixed inset-0 flex items-end sm:items-center justify-center z-50 p-0 sm:p-4"
      style={{background:"rgba(115,0,66,0.40)",backdropFilter:"blur(3px)"}}
    >
      <div className="bg-white w-full sm:max-w-2xl rounded-t-2xl sm:rounded-2xl flex flex-col max-h-[96vh] sm:max-h-[92vh] border-t sm:border border-[#F4C0D1] shadow-2xl">
        <div className="flex items-center justify-between px-4 sm:px-6 py-3 sm:py-4 rounded-t-2xl flex-shrink-0" style={{background:accentColor}}>
          <div className="flex items-center gap-2 sm:gap-3">
            <span className="text-white text-lg sm:text-xl">{icon}</span>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-white">{title}</h2>
              <p className="text-[11px] sm:text-xs" style={{color:"rgba(255,255,255,0.6)"}}>Fill in all required fields</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-white"
            style={{background:"rgba(255,255,255,0.18)"}}
          >
            <FaTimes size={13}/>
          </button>
        </div>
        <div className="overflow-y-auto p-3 sm:p-6 flex-1 bg-[#F9F8F2]">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">{children}</div>
        </div>
        <div className="px-3 sm:px-6 py-3 sm:py-4 border-t border-[#F4C0D1] flex justify-end gap-2 sm:gap-3 bg-[#F9F8F2] flex-shrink-0">
          <button onClick={onClose} className="px-3 sm:px-5 py-2 sm:py-2.5 rounded-xl border border-[#F4C0D1] text-[#730042] text-xs sm:text-sm font-semibold hover:bg-[#FBEAF0]">Cancel</button>
          <button onClick={onSubmit} className="px-4 sm:px-6 py-2 sm:py-2.5 rounded-xl text-white text-xs sm:text-sm font-semibold hover:opacity-90" style={{background:accentColor}}>Submit</button>
        </div>
      </div>
    </div>
  );
}

function ConfirmModal({title,message,icon,confirmLabel,confirmColor,onConfirm,onCancel,children}){
  return(
    <div className="fixed inset-0 flex items-end sm:items-center justify-center z-50 p-0 sm:p-4" style={{background:"rgba(115,0,66,0.40)",backdropFilter:"blur(3px)"}}>
      <div className="bg-white rounded-t-2xl sm:rounded-2xl w-full sm:max-w-sm p-5 sm:p-6 flex flex-col gap-4 border-t sm:border border-[#F4C0D1] shadow-2xl">
        <div className="text-center">
          <div className="text-3xl sm:text-4xl mb-2">{icon}</div>
          <h3 className="text-base sm:text-lg font-bold text-[#730042]">{title}</h3>
          <p className="text-xs sm:text-sm text-[#993556] mt-1">{message}</p>
        </div>
        {children}
        <div className="flex gap-3 justify-center">
          <button onClick={onCancel} className="px-4 sm:px-5 py-2 rounded-xl border border-[#F4C0D1] text-xs sm:text-sm font-semibold text-[#730042] hover:bg-[#FBEAF0]">Cancel</button>
          <button onClick={onConfirm} className="px-4 sm:px-5 py-2 rounded-xl text-white text-xs sm:text-sm font-semibold hover:opacity-90" style={{background:confirmColor||"#A32D2D"}}>{confirmLabel}</button>
        </div>
      </div>
    </div>
  );
}

function ActionMenu({user,onView,onEdit,onDelete,onPromoteToManager,onPromoteToAdmin,onDemoteToEmployee,onDemoteToManager,onDemoteToEmployee2,currentAdminId}){
  const [open,setOpen]=useState(false);
  const ref=useRef();
  useEffect(()=>{
    const h=(e)=>{if(ref.current&&!ref.current.contains(e.target))setOpen(false);};
    document.addEventListener("mousedown",h);
    return()=>document.removeEventListener("mousedown",h);
  },[]);
  const effectiveType = user.type || (user.role === "manager" || user.role === "senior_manager" ? "manager" : "employee");
  const isEmployee = effectiveType === "employee";
  const isManager = effectiveType === "manager" || user.role === "senior_manager";
  const isAdmin = user.role === "admin" || user.role === "senior_admin";
  const isSelf=currentAdminId&&user._id&&currentAdminId===user._id;
  const isInactive=user.working_status&&user.working_status!=="working";
  return(
    <div className="relative" ref={ref} onClick={(e)=>e.stopPropagation()}>
      <button onClick={(e)=>{e.stopPropagation();setOpen((p)=>!p);}} className="w-7 h-7 lg:w-8 lg:h-8 rounded-lg flex items-center justify-center text-[#993556] border border-[#F4C0D1] hover:bg-[#FBEAF0]" style={{background:"#F9F8F2"}}>
        <FaEllipsisV size={10}/>
      </button>
      {open&&(
        <div className="absolute right-0 top-9 z-20 bg-white border border-[#F4C0D1] rounded-xl shadow-xl min-w-[185px] py-1 overflow-hidden">
          <button onClick={()=>{onView(user._id,user.role);setOpen(false);}} className="w-full flex items-center gap-2 px-3 py-2 text-xs text-[#730042] hover:bg-[#FBEAF0]">
            <FaUser size={10}/> View Profile
          </button>
          {!isInactive&&(
            <button onClick={()=>{onEdit(user);setOpen(false);}} className="w-full flex items-center gap-2 px-3 py-2 text-xs text-[#730042] hover:bg-[#FBEAF0]">
              <FaEdit size={10}/> Edit
            </button>
          )}
          {!isSelf&&!isInactive&&(
            <>
              {isEmployee&&(
                <>
                  <button onClick={()=>{onPromoteToManager(user);setOpen(false);}} className="w-full flex items-center gap-2 px-3 py-2 text-xs text-[#3C3489] hover:bg-[#EEEDFE]">
                    <FaArrowUp size={10}/> Promote to Manager
                  </button>
                  <button onClick={()=>{onPromoteToAdmin(user);setOpen(false);}} className="w-full flex items-center gap-2 px-3 py-2 text-xs text-[#92400E] hover:bg-[#FEF3C7]">
                    <FaArrowUp size={10}/> Promote to Admin
                  </button>
                </>
              )}
              {isManager&&!isAdmin&&(
                <>
                  <button onClick={()=>{onPromoteToAdmin(user);setOpen(false);}} className="w-full flex items-center gap-2 px-3 py-2 text-xs text-[#92400E] hover:bg-[#FEF3C7]">
                    <FaArrowUp size={10}/> Promote to Admin
                  </button>
                  <button onClick={()=>{onDemoteToEmployee(user);setOpen(false);}} className="w-full flex items-center gap-2 px-3 py-2 text-xs text-[#7A3500] hover:bg-[#FEF3E8]">
                    <FaArrowDown size={10}/> Demote to Employee
                  </button>
                </>
              )}
              {isAdmin&&(
                <>
                  <button onClick={()=>{onDemoteToManager(user);setOpen(false);}} className="w-full flex items-center gap-2 px-3 py-2 text-xs text-[#7A3500] hover:bg-[#FEF3E8]">
                    <FaArrowDown size={10}/> Demote to Manager
                  </button>
                  <button onClick={()=>{onDemoteToEmployee2(user);setOpen(false);}} className="w-full flex items-center gap-2 px-3 py-2 text-xs text-[#A32D2D] hover:bg-[#FCEBEB]">
                    <FaArrowDown size={10}/> Demote to Employee
                  </button>
                </>
              )}
              <div className="border-t border-[#F4C0D1] my-1"/>
            </>
          )}
          <button onClick={()=>{onDelete(user);setOpen(false);}} className="w-full flex items-center gap-2 px-3 py-2 text-xs text-[#A32D2D] hover:bg-[#FCEBEB]">
            <FaTrash size={10}/> Delete
          </button>
        </div>
      )}
    </div>
  );
}

function roleBadge(u){
  const effectiveType = u.type || (u.role === "manager" || u.role === "senior_manager" ? "manager" : "employee");
  if(effectiveType === "employee"){
    if(u.role === "official") return <Badge label="Official" type="role"/>;
    return <Badge label="Employee" type="role"/>;
  }
  if(u.role==="manager") return <Badge label="Manager" type="manager"/>;
  if(u.role==="senior_manager") return <Badge label="Sr. Manager" type="smgr"/>;
  if(u.role==="admin"||u.role==="senior_admin") return <Badge label="Admin" type="admin"/>;
  return <Badge label={u.role?.replace("_"," ")||"—"} type="manager"/>;
}

function SkeletonRows(){
  return Array.from({length:5}).map((_,i)=>(
    <tr key={i} className="border-b border-[#FBEAF0]">
      {Array.from({length:7}).map((_,j)=>(
        <td key={j} className="px-4 py-3"><div className="h-4 bg-[#FBEAF0] rounded animate-pulse" style={{width:j===0?"80%":"60%"}}/></td>
      ))}
    </tr>
  ));
}

function MobileSkeletons(){
  return Array.from({length:4}).map((_,i)=>(
    <div key={i} className="bg-white border border-[#F4C0D1] rounded-xl p-4 animate-pulse">
      <div className="flex gap-3">
        <div className="w-8 h-8 rounded-full bg-[#FBEAF0]"/>
        <div className="flex-1 space-y-2">
          <div className="h-4 bg-[#FBEAF0] rounded w-3/4"/>
          <div className="h-3 bg-[#FBEAF0] rounded w-1/2"/>
          <div className="h-3 bg-[#FBEAF0] rounded w-1/3"/>
        </div>
      </div>
    </div>
  ));
}

function EmptyState({onAdd}){
  return(
    <tr><td colSpan={8}>
      <div className="flex flex-col items-center justify-center py-12 sm:py-16 gap-3 text-center">
        <div className="text-4xl sm:text-5xl">👥</div>
        <p className="text-[#730042] font-medium text-sm sm:text-base">No employees found</p>
        <p className="text-[#993556] text-xs sm:text-sm">Add your first employee to get started</p>
        <button onClick={onAdd} className="mt-2 px-4 py-2 rounded-xl text-white text-sm font-semibold hover:opacity-90 transition" style={{background:"#730042"}}>+ Add Employee</button>
      </div>
    </td></tr>
  );
}

function Popup({type="success",message,onClose}){
  const styles={success:{background:"#CD166E"},error:{background:"#A32D2D"},info:{background:"#185FA5"}};
  return(
    <div className="fixed top-4 right-4 sm:top-5 sm:right-5 z-[100] max-w-[calc(100vw-2rem)]" style={{animation:"slideInPopup 0.3s ease forwards"}}>
      <style>{`@keyframes slideInPopup{from{opacity:0;transform:translateX(60px);}to{opacity:1;transform:translateX(0);}}`}</style>
      <div className="min-w-[240px] sm:min-w-[280px] max-w-sm px-3 sm:px-4 py-2.5 sm:py-3 rounded-xl text-white flex items-start justify-between gap-3" style={styles[type]}>
        <span className="text-xs sm:text-sm font-medium">{message}</span>
        <button onClick={onClose} className="text-white/80 hover:text-white flex-shrink-0">✕</button>
      </div>
    </div>
  );
}

function FilterChip({label,onRemove}){
  return(
    <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-[#FBEAF0] text-[#730042] text-xs font-medium border border-[#F4C0D1]">
      {label}
      <button onClick={onRemove} className="hover:text-[#CD166E]"><FaTimes size={9}/></button>
    </span>
  );
}

function MobileCard({u,onView,onEdit,onDelete,onPromoteToManager,onPromoteToAdmin,onDemoteToEmployee,onDemoteToManager,onDemoteToEmployee2,currentAdminId}){
  const effectiveType = u.type || (u.role === "manager" || u.role === "senior_manager" ? "manager" : "employee");
  const roleType = effectiveType === "manager"
    ? (u.role === "senior_manager" ? "smgr" : "manager")
    : u.role === "admin" || u.role === "senior_admin" ? "admin" : "role";
  const roleLabel = effectiveType === "manager"
    ? (u.role === "senior_manager" ? "Sr. Manager" : "Manager")
    : u.role === "official" ? "Official" : "Employee";
  const isInactive=u.working_status&&u.working_status!=="working";
  return(
    <div
      className={`bg-white border rounded-xl p-4 flex gap-3 cursor-pointer active:scale-[0.99] transition-transform ${isInactive?"border-[#E5E7EB] opacity-80":"border-[#F4C0D1]"}`}
      onClick={()=>onView(u._id,u.role)}
    >
      <div className="relative flex-shrink-0">
        <Avatar name={`${u.f_name??""} ${u.l_name??""}`}/>
        {isInactive&&(
          <div className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full bg-[#6B7280] border border-white flex items-center justify-center">
            <FaBan size={6} className="text-white"/>
          </div>
        )}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className={`font-semibold text-sm truncate ${isInactive?"text-[#6B7280]":"text-[#730042]"}`}>{u.f_name} {u.l_name}</p>
            <p className="text-xs text-[#993556] truncate">{u.work_email}</p>
          </div>
          <Badge label={roleLabel} type={roleType}/>
        </div>
        <div className="flex flex-wrap gap-1.5 mt-2">
          {u.department&&<Badge label={u.department} type="dept"/>}
          {u.office_location&&<span className="px-2 py-0.5 rounded-full text-xs bg-[#F9F8F2] text-[#993556] border border-[#F4C0D1]">📍 {u.office_location}</span>}
          <WorkingStatusBadge status={u.working_status}/>
        </div>
        <div className="flex items-center justify-between mt-3">
          {u.Under_manager?(
            <p className="text-[11px] text-[#993556]">Under: <span className="font-medium text-[#730042]">{u.Under_manager.f_name} {u.Under_manager.l_name}</span></p>
          ):u.reporting_manager?(
            <p className="text-[11px] text-[#993556]">Reports to: <span className="font-medium text-[#730042]">{u.reporting_manager.f_name} {u.reporting_manager.l_name}</span></p>
          ):<span/>}
          <div onClick={(e)=>e.stopPropagation()}>
            <ActionMenu user={u} onView={onView} onEdit={onEdit} onDelete={onDelete}
              onPromoteToManager={onPromoteToManager} onPromoteToAdmin={onPromoteToAdmin}
              onDemoteToEmployee={onDemoteToEmployee} onDemoteToManager={onDemoteToManager}
              onDemoteToEmployee2={onDemoteToEmployee2} currentAdminId={currentAdminId}/>
          </div>
        </div>
      </div>
    </div>
  );
}

function EmpStepFields({step,form,onChange,errors,managersOnly,perms,onPermChange}){
  if(step===0)return(
    <>
      <Field label="First Name" required error={errors.f_name}><input name="f_name" placeholder="First name" value={form.f_name} onChange={onChange} className={inputCls}/></Field>
      <Field label="Last Name" required error={errors.l_name}><input name="l_name" placeholder="Last name" value={form.l_name} onChange={onChange} className={inputCls}/></Field>
      <Field label="Work Email" required error={errors.work_email}><input name="work_email" type="email" placeholder="name@company.com" value={form.work_email} onChange={onChange} className={inputCls}/></Field>
      <PasswordField
        label="Password"
        name="password"
        value={form.password}
        onChange={onChange}
        error={errors.password}
        onGenerate={()=>{
          const pwd=generatePassword();
          onChange({target:{name:"password",value:pwd}});
          onChange({target:{name:"confirm_password",value:pwd}});
        }}
      />
      <PasswordField label="Confirm Password" name="confirm_password" value={form.confirm_password} onChange={onChange} error={errors.confirm_password}/>
      <Field label="Gender" required error={errors.gender}>
        <select name="gender" value={form.gender} onChange={onChange} className={inputCls}>
          <option value="">Select Gender</option><option value="male">Male</option><option value="female">Female</option><option value="other">Other</option>
        </select>
      </Field>
      <Field label="Marital Status">
        <select name="marital_status" value={form.marital_status} onChange={onChange} className={inputCls}>
          <option value="single">Single</option><option value="married">Married</option><option value="divorced">Divorced</option>
        </select>
      </Field>
      <Field label="Personal Contact" required error={errors.personal_contact}><input name="personal_contact" placeholder="10-digit mobile number" maxLength={10} value={form.personal_contact} onChange={onChange} className={inputCls}/></Field>
      <Field label="Emergency Contact" required error={errors.e_contact}><input name="e_contact" placeholder="10-digit mobile number" maxLength={10} value={form.e_contact} onChange={onChange} className={inputCls}/></Field>
    </>
  );
  if(step===1)return(
    <>
      <Field label="Department" required error={errors.department}>
        <select name="department" value={form.department} onChange={onChange} className={inputCls}>
          <option value="">Select Department</option>{DEPARTMENTS.map((d)=><option key={d} value={d}>{d}</option>)}
        </select>
      </Field>
      <Field label="Designation" required error={errors.designation}><input name="designation" placeholder="e.g. Software Engineer" value={form.designation} onChange={onChange} className={inputCls}/></Field>
      <Field label="Role">
        <select name="role" value={form.role} onChange={onChange} className={inputCls}>
          <option value="employee">Employee</option><option value="official">Official</option>
        </select>
      </Field>
      <OfficeLocationFields form={form} onChange={onChange} errors={errors}/>
      <div className="col-span-1 sm:col-span-2">
        <UnderManagerSelect value={form.Under_manager} onChange={onChange} managersOnly={managersOnly}/>
      </div>
    </>
  );
  if(step===2)return <AddressFields form={form} onChange={onChange} errors={errors}/>;
  if(step===3)return(
    <>
      <Field label="Aadhaar Number" error={errors.aadhaar_number}><input name="aadhaar_number" placeholder="12-digit Aadhaar number" maxLength={12} value={form.aadhaar_number} onChange={onChange} className={inputCls}/></Field>
      <Field label="PAN Number" error={errors.pan_number}><input name="pan_number" placeholder="ABCDE1234F" maxLength={10} value={form.pan_number} onChange={(e)=>onChange({target:{name:"pan_number",value:e.target.value.toUpperCase()}})} className={inputCls}/></Field>
    </>
  );
  if(step===4)return(
    <>
      <Field label="Is Fresher?" span2>
        <select name="is_fresher" value={form.is_fresher?"true":"false"} onChange={(e)=>onChange({target:{name:"is_fresher",value:e.target.value==="true"}})} className={inputCls}>
          <option value="true">Yes — Fresher</option><option value="false">No — Experienced</option>
        </select>
      </Field>
      {!form.is_fresher&&(
        <>
          <Field label="Total Experience (years)" error={errors.total_experience}><input name="total_experience" type="number" min="0" max="50" placeholder="e.g. 3" value={form.total_experience} onChange={onChange} className={inputCls}/></Field>
          <Field label="Previous Company"><input name="previous_company" placeholder="Company name" value={form.previous_company} onChange={onChange} className={inputCls}/></Field>
          <Field label="Previous Designation"><input name="previous_designation" placeholder="Previous role" value={form.previous_designation} onChange={onChange} className={inputCls}/></Field>
        </>
      )}
    </>
  );
  if(step===5)return(
    <>
      <Field label="Bank Name" error={errors.bank_group}><input name="bank_name" placeholder="e.g. State Bank of India" value={form.bank_name} onChange={onChange} className={inputCls}/></Field>
      <Field label="Account Holder Name"><input name="account_holder_name" placeholder="Name as per bank" value={form.account_holder_name} onChange={onChange} className={inputCls}/></Field>
      <Field label="Account Number" error={errors.account_number}><input name="account_number" placeholder="9-18 digit account number" maxLength={18} value={form.account_number} onChange={onChange} className={inputCls}/></Field>
      <Field label="IFSC Code" error={errors.ifsc_code}><input name="ifsc_code" placeholder="e.g. SBIN0001234" maxLength={11} value={form.ifsc_code} onChange={(e)=>onChange({target:{name:"ifsc_code",value:e.target.value.toUpperCase()}})} className={inputCls}/></Field>
      <div className="col-span-1 sm:col-span-2">
        <p className="text-[11px] font-semibold uppercase tracking-wider text-[#993556] mb-3">Document URLs (optional)</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
          <Field label="Resume URL" error={errors.resume}><input name="resume" placeholder="https://..." value={form.resume} onChange={onChange} className={inputCls}/></Field>
          <Field label="Aadhaar Card URL" error={errors.aadhaar_card}><input name="aadhaar_card" placeholder="https://..." value={form.aadhaar_card} onChange={onChange} className={inputCls}/></Field>
          <Field label="PAN Card URL" error={errors.pan_card}><input name="pan_card" placeholder="https://..." value={form.pan_card} onChange={onChange} className={inputCls}/></Field>
          <Field label="Experience Letter URL" error={errors.experience_letter}><input name="experience_letter" placeholder="https://..." value={form.experience_letter} onChange={onChange} className={inputCls}/></Field>
        </div>
      </div>
    </>
  );
  if(step===6)return(
    <div className="col-span-2">
      <p className="text-xs text-[#993556] mb-1">Set initial permissions for this employee.</p>
      <p className="text-[11px] text-[#993556]/70 mb-3">Greyed toggles are restricted by role and cannot be enabled.</p>
      <PermissionsPanel perms={perms} onChange={onPermChange} roleType="employee"/>
    </div>
  );
  return null;
}

function MgrStepFields({step,form,onChange,errors,managersOnly,managersWithAdmin,perms,onPermChange}){
  if(step===0)return(
    <>
      <Field label="First Name" required error={errors.f_name}><input name="f_name" placeholder="First name" value={form.f_name} onChange={onChange} className={inputCls}/></Field>
      <Field label="Last Name" required error={errors.l_name}><input name="l_name" placeholder="Last name" value={form.l_name} onChange={onChange} className={inputCls}/></Field>
      <Field label="Work Email" required error={errors.work_email}><input name="work_email" type="email" placeholder="name@company.com" value={form.work_email} onChange={onChange} className={inputCls}/></Field>
      <PasswordField
        label="Password"
        name="password"
        value={form.password}
        onChange={onChange}
        error={errors.password}
        onGenerate={()=>{
          const pwd=generatePassword();
          onChange({target:{name:"password",value:pwd}});
          onChange({target:{name:"confirm_password",value:pwd}});
        }}
      />
      <PasswordField label="Confirm Password" name="confirm_password" value={form.confirm_password} onChange={onChange} error={errors.confirm_password}/>
      <Field label="Gender" required error={errors.gender}>
        <select name="gender" value={form.gender} onChange={onChange} className={inputCls}>
          <option value="">Select Gender</option><option value="male">Male</option><option value="female">Female</option><option value="other">Other</option>
        </select>
      </Field>
      <Field label="Marital Status">
        <select name="marital_status" value={form.marital_status} onChange={onChange} className={inputCls}>
          <option value="single">Single</option><option value="married">Married</option><option value="divorced">Divorced</option>
        </select>
      </Field>
      <Field label="Personal Contact" required error={errors.personal_contact}><input name="personal_contact" placeholder="10-digit mobile number" maxLength={10} value={form.personal_contact} onChange={onChange} className={inputCls}/></Field>
      <Field label="Emergency Contact" required error={errors.e_contact}><input name="e_contact" placeholder="10-digit mobile number" maxLength={10} value={form.e_contact} onChange={onChange} className={inputCls}/></Field>
    </>
  );
  if(step===1)return(
    <>
      <Field label="Department" required error={errors.department}>
        <select name="department" value={form.department} onChange={onChange} className={inputCls}>
          <option value="">Select Department</option>{DEPARTMENTS.map((d)=><option key={d} value={d}>{d}</option>)}
        </select>
      </Field>
      <Field label="Designation" required error={errors.designation}><input name="designation" placeholder="e.g. Head of Engineering" value={form.designation} onChange={onChange} className={inputCls}/></Field>
      <Field label="Role">
        <select name="role" value={form.role} onChange={onChange} className={inputCls}>
          <option value="manager">Manager</option><option value="senior_manager">Senior Manager</option><option value="official">Official</option>
        </select>
      </Field>
      <OfficeLocationFields form={form} onChange={onChange} errors={errors}/>
      <div className="col-span-1 sm:col-span-2">
        <ReportingManagerSelect
          value={form.reporting_manager}
          onChange={onChange}
          managersOnly={managersOnly}
          managersWithAdmin={managersWithAdmin}
          label="Reporting Manager"
          name="reporting_manager"
        />
      </div>
    </>
  );
  if(step===2)return <AddressFields form={form} onChange={onChange} errors={errors}/>;
  if(step===3)return(
    <>
      <Field label="Aadhaar Number" error={errors.aadhaar_number}><input name="aadhaar_number" placeholder="12-digit Aadhaar number" maxLength={12} value={form.aadhaar_number} onChange={onChange} className={inputCls}/></Field>
      <Field label="PAN Number" error={errors.pan_number}><input name="pan_number" placeholder="ABCDE1234F" maxLength={10} value={form.pan_number} onChange={(e)=>onChange({target:{name:"pan_number",value:e.target.value.toUpperCase()}})} className={inputCls}/></Field>
    </>
  );
  if(step===4)return(
    <>
      <Field label="Is Fresher?" span2>
        <select name="is_fresher" value={form.is_fresher?"true":"false"} onChange={(e)=>onChange({target:{name:"is_fresher",value:e.target.value==="true"}})} className={inputCls}>
          <option value="true">Yes — Fresher</option><option value="false">No — Experienced</option>
        </select>
      </Field>
      {!form.is_fresher&&(
        <>
          <Field label="Total Experience (years)" error={errors.total_experience}><input name="total_experience" type="number" min="0" max="50" placeholder="e.g. 3" value={form.total_experience} onChange={onChange} className={inputCls}/></Field>
          <Field label="Previous Company"><input name="previous_company" placeholder="Company name" value={form.previous_company} onChange={onChange} className={inputCls}/></Field>
          <Field label="Previous Designation"><input name="previous_designation" placeholder="Previous role" value={form.previous_designation} onChange={onChange} className={inputCls}/></Field>
        </>
      )}
    </>
  );
  if(step===5)return(
    <>
      <Field label="Bank Name" error={errors.bank_group}><input name="bank_name" placeholder="e.g. State Bank of India" value={form.bank_name} onChange={onChange} className={inputCls}/></Field>
      <Field label="Account Holder Name"><input name="account_holder_name" placeholder="Name as per bank" value={form.account_holder_name} onChange={onChange} className={inputCls}/></Field>
      <Field label="Account Number" error={errors.account_number}><input name="account_number" placeholder="9-18 digit account number" maxLength={18} value={form.account_number} onChange={onChange} className={inputCls}/></Field>
      <Field label="IFSC Code" error={errors.ifsc_code}><input name="ifsc_code" placeholder="e.g. SBIN0001234" maxLength={11} value={form.ifsc_code} onChange={(e)=>onChange({target:{name:"ifsc_code",value:e.target.value.toUpperCase()}})} className={inputCls}/></Field>
      <div className="col-span-1 sm:col-span-2">
        <p className="text-[11px] font-semibold uppercase tracking-wider text-[#993556] mb-3">Document URLs (optional)</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
          <Field label="Resume URL" error={errors.resume}><input name="resume" placeholder="https://..." value={form.resume} onChange={onChange} className={inputCls}/></Field>
          <Field label="Aadhaar Card URL" error={errors.aadhaar_card}><input name="aadhaar_card" placeholder="https://..." value={form.aadhaar_card} onChange={onChange} className={inputCls}/></Field>
          <Field label="PAN Card URL" error={errors.pan_card}><input name="pan_card" placeholder="https://..." value={form.pan_card} onChange={onChange} className={inputCls}/></Field>
          <Field label="Experience Letter URL" error={errors.experience_letter}><input name="experience_letter" placeholder="https://..." value={form.experience_letter} onChange={onChange} className={inputCls}/></Field>
        </div>
      </div>
    </>
  );
  if(step===6)return(
    <div className="col-span-2">
      <p className="text-xs text-[#993556] mb-1">Set initial permissions for this manager.</p>
      <p className="text-[11px] text-[#993556]/70 mb-3">Greyed toggles are restricted by role and cannot be enabled.</p>
      <PermissionsPanel perms={perms} onChange={onPermChange} roleType="manager"/>
    </div>
  );
  return null;
}

function validateContactInfo(form){
  const err={};
  if(!form.f_name)err.f_name="Required";
  else if(!NAME_REGEX.test(form.f_name))err.f_name="Enter a valid name";
  if(!form.l_name)err.l_name="Required";
  else if(!NAME_REGEX.test(form.l_name))err.l_name="Enter a valid name";
  if(!form.work_email)err.work_email="Required";
  else if(!EMAIL_REGEX.test(form.work_email))err.work_email="Invalid email address";
  if(!form.password)err.password="Required";
  else if(!PWD_REGEX.test(form.password))err.password="Min 8 chars, 1 uppercase, 1 lowercase, 1 number, 1 special character";
  if(!form.confirm_password)err.confirm_password="Required";
  else if(form.confirm_password!==form.password)err.confirm_password="Passwords do not match";
  if(!form.gender)err.gender="Required";
  if(!form.personal_contact)err.personal_contact="Required";
  else if(!PHONE_REGEX.test(form.personal_contact))err.personal_contact="Must be a valid 10-digit Indian mobile number";
  if(!form.e_contact)err.e_contact="Required";
  else if(!PHONE_REGEX.test(form.e_contact))err.e_contact="Must be a valid 10-digit Indian mobile number";
  return err;
}

function validateWorkInfo(form){
  const err={};
  if(!form.department)err.department="Required";
  if(!form.designation?.trim())err.designation="Required";
  if(!form.office_location_country)err.office_location_country="Required";
  if(!form.office_location_state)err.office_location_state="Required";
  if(!form.office_location)err.office_location="Required";
  return err;
}

function validateAddressInfo(form){
  const err={};
  if(!form.address?.trim())err.address="Required";
  if(!form.country)err.country="Required";
  if(!form.state)err.state="Required";
  if(!form.city)err.city="Required";
  if(!form.pincode)err.pincode="Required";
  else if(!PINCODE_REGEX.test(form.pincode))err.pincode="Must be a valid 6-digit pincode";
  if(form.permanent_pincode&&!PINCODE_REGEX.test(form.permanent_pincode))err.permanent_pincode="Must be a valid 6-digit pincode";
  return err;
}

function validateIdentityInfo(form){
  const err={};
  if(form.aadhaar_number&&!AADHAAR_REGEX.test(form.aadhaar_number))err.aadhaar_number="Must be exactly 12 digits";
  if(form.pan_number&&!PAN_REGEX.test(form.pan_number))err.pan_number="Invalid PAN format (e.g. ABCDE1234F)";
  return err;
}

function validateExperienceInfo(form){
  const err={};
  if(!form.is_fresher&&form.total_experience){
    const exp=parseFloat(form.total_experience);
    if(isNaN(exp)||exp<0||exp>50)err.total_experience="Enter a valid experience (0-50 years)";
  }
  return err;
}

function validateBankInfo(form){
  const err={};
  const hasBankPartial=[form.bank_name,form.account_holder_name,form.account_number,form.ifsc_code].some(Boolean);
  const hasBankFull=[form.bank_name,form.account_holder_name,form.account_number,form.ifsc_code].every(Boolean);
  if(hasBankPartial&&!hasBankFull)err.bank_group="Fill all bank details together or leave all blank";
  if(form.account_number&&!ACCOUNT_REGEX.test(form.account_number))err.account_number="Account number must be 9-18 digits";
  if(form.ifsc_code&&!IFSC_REGEX.test(form.ifsc_code))err.ifsc_code="Invalid IFSC code format (e.g. SBIN0001234)";
  if(form.resume&&!URL_REGEX.test(form.resume))err.resume="Must be a valid URL starting with https://";
  if(form.aadhaar_card&&!URL_REGEX.test(form.aadhaar_card))err.aadhaar_card="Must be a valid URL starting with https://";
  if(form.pan_card&&!URL_REGEX.test(form.pan_card))err.pan_card="Must be a valid URL starting with https://";
  if(form.experience_letter&&!URL_REGEX.test(form.experience_letter))err.experience_letter="Must be a valid URL starting with https://";
  return err;
}

export default function EmployeeTable(){
  const [open,setOpen]=useState(false);
  const [openManager,setOpenManager]=useState(false);
  const [showFilters,setShowFilters]=useState(false);
  const [popup,setPopup]=useState({show:false,type:"success",message:""});
  const [selectedEmployeeId,setSelectedEmployeeId]=useState(null);
  const [selectedEmployeeRole,setSelectedEmployeeRole]=useState(null);
  const [empStep,setEmpStep]=useState(0);
  const [mgrStep,setMgrStep]=useState(0);
  const [empForm,setEmpForm]=useState(EMPTY_EMP);
  const [mgrForm,setMgrForm]=useState(EMPTY_MGR);
  const [empErrors,setEmpErrors]=useState({});
  const [mgrErrors,setMgrErrors]=useState({});
  const [empPerms,setEmpPerms]=useState({...EMP_DEFAULT_PERMISSIONS});
  const [mgrPerms,setMgrPerms]=useState({...MGR_DEFAULT_PERMISSIONS});
  const [editTarget,setEditTarget]=useState(null);
  const [editForm,setEditForm]=useState({});
  const [editErrors,setEditErrors]=useState({});
  const [openEdit,setOpenEdit]=useState(false);
  const [deleteTarget,setDeleteTarget]=useState(null);
  const [promoteToMgrTarget,setPromoteToMgrTarget]=useState(null);
  const [promoteToMgrForm,setPromoteToMgrForm]=useState({reporting_manager:"",designation:"",role:"manager"});
  const [promoteToAdminTarget,setPromoteToAdminTarget]=useState(null);
  const [promoteToAdminForm,setPromoteToAdminForm]=useState({reporting_manager:"",designation:"",role:"admin"});
  const [demoteMgrToEmpTarget,setDemoteMgrToEmpTarget]=useState(null);
  const [demoteMgrToEmpForm,setDemoteMgrToEmpForm]=useState({Under_manager:"",designation:""});
  const [demoteAdminToMgrTarget,setDemoteAdminToMgrTarget]=useState(null);
  const [demoteAdminToMgrForm,setDemoteAdminToMgrForm]=useState({reporting_manager:"",designation:"",role:"manager"});
  const [demoteAdminToEmpTarget,setDemoteAdminToEmpTarget]=useState(null);
  const [demoteAdminToEmpForm,setDemoteAdminToEmpForm]=useState({Under_manager:"",designation:""});
  const [filters,setFilters]=useState({search:"",department:"",role:"",location:"",gender:"",type:"",status:"",working_status:""});
  const [showInactive,setShowInactive]=useState(false);

  const {data:adminData}=useGetMeAdmin();
  const currentAdminId=adminData?.user?._id||adminData?._id;

  const {mutate:addEmployeeApi}=useAddEmployee();
  const {mutate:addManagerApi}=useAddManager();
  const {data:managersOnly}=useFindAllManagerswithoutAdmin();
  const {data:managersWithAdmin}=useFindAllManagers();
  const {data:employeeData,isLoading:listLoading,refetch:refetchList}=useGetAllEmployee();
  const {data:inactiveData}=useAdminInactiveUsers();
  const {data:activeUserCountData}=useGetActiveUserCount();

  const isLimitReached = activeUserCountData?.is_limit_reached ?? false;
  const remainingSlots = activeUserCountData?.remaining_slots ?? null;
  const allowedUsers = activeUserCountData?.allowed_users ?? null;

  const activeUsers = employeeData?.users ?? [];
  const inactiveUsers = inactiveData?.users ?? [];
  const allUsers = showInactive
    ? (() => {
        const ids = new Set(activeUsers.map(u => u._id));
        const merged = [...activeUsers];
        inactiveUsers.forEach(u => { if(!ids.has(u._id)) merged.push(u); });
        return merged;
      })()
    : activeUsers;

  const {mutate:editUserApi}=useEditEmployee(editTarget?._id);
  const {mutate:editManagerApi}=useEditManager(editTarget?._id);
  const {mutate:deleteUserApi}=useDeleteUser();
  const {mutate:promoteToMgrApi}=usePromoteEmployeeToManager();
  const {mutate:promoteToAdminFromEmpApi}=usePromoteEmployeeToAdmin();
  const {mutate:promoteToAdminFromMgrApi}=usePromoteManagerToAdmin();
  const {mutate:demoteMgrToEmpApi}=useDemoteManagerToEmployee();
  const {mutate:demoteAdminToMgrApi}=useDemoteAdminToManager();
  const {mutate:demoteAdminToEmpApi}=useDemoteAdminToEmployee();

  const showPopup=(type,message)=>{
    setPopup({show:true,type,message});
    setTimeout(()=>setPopup({show:false,type:"",message:""}),3500);
  };

  const handleView=(id,role)=>{setSelectedEmployeeId(id);setSelectedEmployeeRole(role);};

  const handleOpenEdit=(user)=>{
    setEditTarget(user);
    setEditForm({
      f_name:user.f_name??"",l_name:user.l_name??"",work_email:user.work_email??"",
      gender:user.gender??"",marital_status:user.marital_status??"single",
      personal_contact:user.personal_contact??"",e_contact:user.e_contact??"",
      role:user.role??"employee",office_location:user.office_location??"",
      designation:user.designation??"",department:user.department??"",
      Under_manager:user.Under_manager?._id??"",
      reporting_manager:user.reporting_manager?._id??"",
    });
    setEditErrors({});
    setOpenEdit(true);
  };

  const handleEditChange=(e)=>setEditForm({...editForm,[e.target.name]:e.target.value});

  const validateEdit=()=>{
    const err={};
    if(!editForm.f_name?.trim())err.f_name="Required";
    if(!editForm.l_name?.trim())err.l_name="Required";
    if(!editForm.work_email?.trim())err.work_email="Required";
    else if(!EMAIL_REGEX.test(editForm.work_email))err.work_email="Invalid email address";
    if(!editForm.department)err.department="Required";
    if(!editForm.designation?.trim())err.designation="Required";
    if(editForm.personal_contact&&!PHONE_REGEX.test(editForm.personal_contact))err.personal_contact="Must be a valid 10-digit Indian mobile number";
    if(editForm.e_contact&&!PHONE_REGEX.test(editForm.e_contact))err.e_contact="Must be a valid 10-digit Indian mobile number";
    setEditErrors(err);
    return Object.keys(err).length===0;
  };

  const handleEditSubmit=()=>{
    if(!validateEdit()){showPopup("error","Please fix the errors in the form");return;}
    const isManager=editTarget?.role==="manager"||editTarget?.role==="senior_manager";
    const mutate=isManager?editManagerApi:editUserApi;
    mutate(editForm,{
      onSuccess:(res)=>{showPopup("success",res?.message||"Updated successfully");setOpenEdit(false);setEditTarget(null);refetchList();},
      onError:(err)=>showPopup("error",err?.response?.data?.message||err?.message||"Update failed"),
    });
  };

  const handleConfirmDelete=()=>{
    deleteUserApi(deleteTarget._id,{
      onSuccess:()=>{showPopup("success","User deleted successfully");setDeleteTarget(null);refetchList();},
      onError:(err)=>{showPopup("error",err?.response?.data?.message||err?.message||"Delete failed");setDeleteTarget(null);},
    });
  };

  const handlePromoteToManager=()=>{
    promoteToMgrApi({id:promoteToMgrTarget._id,data:promoteToMgrForm},{
      onSuccess:(res)=>{showPopup("success",res?.message||"Promoted to Manager");setPromoteToMgrTarget(null);refetchList();},
      onError:(err)=>showPopup("error",err?.response?.data?.message||err?.message||"Promotion failed"),
    });
  };

  const handlePromoteToAdmin=()=>{
    const isManager=promoteToAdminTarget.role==="manager"||promoteToAdminTarget.role==="senior_manager";
    const mutate=isManager?promoteToAdminFromMgrApi:promoteToAdminFromEmpApi;
    mutate({id:promoteToAdminTarget._id,data:promoteToAdminForm},{
      onSuccess:(res)=>{showPopup("success",res?.message||"Promoted to Admin");setPromoteToAdminTarget(null);refetchList();},
      onError:(err)=>showPopup("error",err?.response?.data?.message||err?.message||"Promotion failed"),
    });
  };

  const handleDemoteMgrToEmp=()=>{
    demoteMgrToEmpApi({id:demoteMgrToEmpTarget._id,data:demoteMgrToEmpForm},{
      onSuccess:(res)=>{showPopup("success",res?.message||"Demoted to Employee");setDemoteMgrToEmpTarget(null);refetchList();},
      onError:(err)=>showPopup("error",err?.response?.data?.message||err?.message||"Demotion failed"),
    });
  };

  const handleDemoteAdminToMgr=()=>{
    demoteAdminToMgrApi({id:demoteAdminToMgrTarget._id,data:demoteAdminToMgrForm},{
      onSuccess:(res)=>{showPopup("success",res?.message||"Demoted to Manager");setDemoteAdminToMgrTarget(null);refetchList();},
      onError:(err)=>showPopup("error",err?.response?.data?.message||err?.message||"Demotion failed"),
    });
  };

  const handleDemoteAdminToEmp=()=>{
    demoteAdminToEmpApi({id:demoteAdminToEmpTarget._id,data:demoteAdminToEmpForm},{
      onSuccess:(res)=>{showPopup("success",res?.message||"Demoted to Employee");setDemoteAdminToEmpTarget(null);refetchList();},
      onError:(err)=>showPopup("error",err?.response?.data?.message||err?.message||"Demotion failed"),
    });
  };

  const makeChangeHandler=(setter)=>(e)=>{
    const {name,value}=e.target;
    let nextValue=value;
    if(["personal_contact","e_contact","aadhaar_number","pincode","permanent_pincode"].includes(name)){
      nextValue=numericOnly(value);
    }
    if(["f_name","l_name"].includes(name)&&value&&!/^[A-Za-z\s.'-]*$/.test(value)){
      return;
    }
    setter((prev)=>{
      const next={...prev,[name]:nextValue};
      if(name==="country") next.state="";
      if(name==="state") next.city="";
      if(name==="permanent_country") next.permanent_state="";
      if(name==="permanent_state") next.permanent_city="";
      if(name==="office_location_country"){next.office_location_state="";next.office_location="";}
      if(name==="office_location_state"){next.office_location="";}
      if(name==="same_as_residential") next.same_as_residential=nextValue;
      return next;
    });
  };

  const handleEmpChange=makeChangeHandler(setEmpForm);
  const handleMgrChange=makeChangeHandler(setMgrForm);

  const handleEmpPermChange=(section,key,val)=>{
    const disabled=getDisabledKeys("employee");
    if((disabled[section]||[]).includes(key))return;
    setEmpPerms((p)=>({...p,[section]:{...p[section],[key]:val}}));
  };

  const handleMgrPermChange=(section,key,val)=>{
    const disabled=getDisabledKeys("manager");
    if((disabled[section]||[]).includes(key))return;
    setMgrPerms((p)=>({...p,[section]:{...p[section],[key]:val}}));
  };

  const validateEmp=()=>{
    const err={
      ...validateContactInfo(empForm),
      ...validateWorkInfo(empForm),
      ...validateAddressInfo(empForm),
      ...validateIdentityInfo(empForm),
      ...validateExperienceInfo(empForm),
      ...validateBankInfo(empForm),
    };
    setEmpErrors(err);
    return Object.keys(err).length===0;
  };

  const handleEmpSubmit=()=>{
    if(!validateEmp()){showPopup("error","Please fix the errors in the form");setEmpStep(0);return;}
    addEmployeeApi({
      f_name:empForm.f_name,l_name:empForm.l_name,work_email:empForm.work_email,
      password:empForm.password,gender:empForm.gender,marital_status:empForm.marital_status,
      personal_contact:empForm.personal_contact,e_contact:empForm.e_contact,
      role:empForm.role,office_location:empForm.office_location,
      designation:empForm.designation,department:empForm.department,
      Under_manager:empForm.Under_manager||undefined,
      address:empForm.address,city:empForm.city,state:empForm.state,pincode:empForm.pincode,country:empForm.country,
      permanent_address:empForm.permanent_address||undefined,permanent_city:empForm.permanent_city||undefined,
      permanent_state:empForm.permanent_state||undefined,permanent_pincode:empForm.permanent_pincode||undefined,
      permanent_country:empForm.permanent_country||undefined,
      aadhaar_number:empForm.aadhaar_number||undefined,pan_number:empForm.pan_number||undefined,
      is_fresher:empForm.is_fresher,
      total_experience:empForm.is_fresher?undefined:empForm.total_experience||undefined,
      previous_company:empForm.is_fresher?undefined:empForm.previous_company||undefined,
      previous_designation:empForm.is_fresher?undefined:empForm.previous_designation||undefined,
      bank_name:empForm.bank_name||undefined,account_holder_name:empForm.account_holder_name||undefined,
      account_number:empForm.account_number||undefined,ifsc_code:empForm.ifsc_code||undefined,
      resume:empForm.resume||undefined,aadhaar_card:empForm.aadhaar_card||undefined,
      pan_card:empForm.pan_card||undefined,experience_letter:empForm.experience_letter||undefined,
      permissions:empPerms,
    },{
      onSuccess:(res)=>{showPopup("success",res?.message||"Employee added successfully");setOpen(false);setEmpForm(EMPTY_EMP);setEmpErrors({});setEmpStep(0);setEmpPerms({...EMP_DEFAULT_PERMISSIONS});refetchList();},
      onError:(err)=>showPopup("error",err?.response?.data?.message||err?.message||"Something went wrong"),
    });
  };

  const validateMgr=()=>{
    const err={
      ...validateContactInfo(mgrForm),
      ...validateWorkInfo(mgrForm),
      ...validateAddressInfo(mgrForm),
      ...validateIdentityInfo(mgrForm),
      ...validateExperienceInfo(mgrForm),
      ...validateBankInfo(mgrForm),
    };
    setMgrErrors(err);
    return Object.keys(err).length===0;
  };

  const handleMgrSubmit=()=>{
    if(!validateMgr()){showPopup("error","Please fix the errors in the form");setMgrStep(0);return;}
    addManagerApi({
      f_name:mgrForm.f_name,l_name:mgrForm.l_name,work_email:mgrForm.work_email,
      password:mgrForm.password,gender:mgrForm.gender,marital_status:mgrForm.marital_status,
      personal_contact:mgrForm.personal_contact,e_contact:mgrForm.e_contact,
      role:mgrForm.role,office_location:mgrForm.office_location,
      designation:mgrForm.designation,department:mgrForm.department,
      reporting_manager:mgrForm.reporting_manager||undefined,
      address:mgrForm.address,city:mgrForm.city,state:mgrForm.state,pincode:mgrForm.pincode,country:mgrForm.country,
      permanent_address:mgrForm.permanent_address||undefined,permanent_city:mgrForm.permanent_city||undefined,
      permanent_state:mgrForm.permanent_state||undefined,permanent_pincode:mgrForm.permanent_pincode||undefined,
      permanent_country:mgrForm.permanent_country||undefined,
      aadhaar_number:mgrForm.aadhaar_number||undefined,pan_number:mgrForm.pan_number||undefined,
      is_fresher:mgrForm.is_fresher,
      total_experience:mgrForm.is_fresher?undefined:mgrForm.total_experience||undefined,
      previous_company:mgrForm.is_fresher?undefined:mgrForm.previous_company||undefined,
      previous_designation:mgrForm.is_fresher?undefined:mgrForm.previous_designation||undefined,
      bank_name:mgrForm.bank_name||undefined,account_holder_name:mgrForm.account_holder_name||undefined,
      account_number:mgrForm.account_number||undefined,ifsc_code:mgrForm.ifsc_code||undefined,
      resume:mgrForm.resume||undefined,aadhaar_card:mgrForm.aadhaar_card||undefined,
      pan_card:mgrForm.pan_card||undefined,experience_letter:mgrForm.experience_letter||undefined,
      permissions:mgrPerms,
    },{
      onSuccess:(res)=>{showPopup("success",res?.message||"Manager added & verification email sent");setOpenManager(false);setMgrForm(EMPTY_MGR);setMgrErrors({});setMgrStep(0);setMgrPerms({...MGR_DEFAULT_PERMISSIONS});refetchList();},
      onError:(err)=>showPopup("error",err?.response?.data?.message||err?.message||"Something went wrong"),
    });
  };

  const filtered=allUsers.filter((u)=>{
    const name=`${u.f_name??""} ${u.l_name??""}`.toLowerCase();
    const q=filters.search.toLowerCase();
    const effectiveType = u.type || (u.role === "manager" || u.role === "senior_manager" ? "manager" : "employee");
    const matchType=filters.type?filters.type==="employee"?effectiveType==="employee":filters.type==="manager"?effectiveType==="manager":u.role===filters.type:true;
    return(
      (name.includes(q)||(u.work_email??"").toLowerCase().includes(q)||(u.uid??"").toLowerCase().includes(q)||(u.designation??"").toLowerCase().includes(q))&&
      (filters.department?u.department===filters.department:true)&&
      (filters.role?u.role===filters.role:true)&&
      (filters.location?u.office_location===filters.location:true)&&
      (filters.gender?u.gender===filters.gender:true)&&
      (filters.status?u.status===filters.status:true)&&
      (filters.working_status?u.working_status===filters.working_status:true)&&
      matchType
    );
  });

  const clearFilters=()=>setFilters({search:"",department:"",role:"",location:"",gender:"",type:"",status:"",working_status:""});
  const activeFilterCount=[filters.department,filters.role,filters.location,filters.gender,filters.type,filters.status,filters.working_status].filter(Boolean).length;

  const openPromoteToManager=(user)=>{setPromoteToMgrTarget(user);setPromoteToMgrForm({reporting_manager:"",designation:user.designation||"",role:"manager"});};
  const openPromoteToAdmin=(user)=>{setPromoteToAdminTarget(user);setPromoteToAdminForm({reporting_manager:"",designation:user.designation||"",role:"admin"});};
  const openDemoteMgrToEmp=(user)=>{setDemoteMgrToEmpTarget(user);setDemoteMgrToEmpForm({Under_manager:"",designation:user.designation||""});};
  const openDemoteAdminToMgr=(user)=>{setDemoteAdminToMgrTarget(user);setDemoteAdminToMgrForm({reporting_manager:"",designation:user.designation||"",role:"manager"});};
  const openDemoteAdminToEmp=(user)=>{setDemoteAdminToEmpTarget(user);setDemoteAdminToEmpForm({Under_manager:"",designation:user.designation||""});};

  const actionMenuProps={
    onPromoteToManager:openPromoteToManager,onPromoteToAdmin:openPromoteToAdmin,
    onDemoteToEmployee:openDemoteMgrToEmp,onDemoteToManager:openDemoteAdminToMgr,
    onDemoteToEmployee2:openDemoteAdminToEmp,currentAdminId,
  };

  const inactiveCount = inactiveData?.count ?? 0;

  return(
    <div className="min-h-screen p-3 sm:p-4 md:p-6 font-['DM_Sans',system-ui,sans-serif]" style={{background:"#F9F8F2"}}>
      <style>{`
        .scrollbar-hide::-webkit-scrollbar{display:none;}
        .scrollbar-hide{-ms-overflow-style:none;scrollbar-width:none;}
        @media(max-width:480px){.xs\\:inline{display:inline;}.xs\\:block{display:block;}}
      `}</style>

      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between mb-4 sm:mb-6">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-[#730042] tracking-tight">Employee Directory</h1>
            <p className="text-xs sm:text-sm text-[#993556] mt-0.5">
              {activeUsers.length} active · {filtered.length} shown · {employeeData?.employees??0} employees · {employeeData?.managers??0} managers
              {inactiveCount>0&&<> · <span className="text-[#6B7280]">{inactiveCount} inactive</span></>}
              {allowedUsers!==null&&<> · <span className={isLimitReached?"text-[#DC2626] font-semibold":"text-[#993556]"}>{remainingSlots} slot{remainingSlots!==1?"s":""} remaining of {allowedUsers}</span></>}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {inactiveCount>0&&(
              <button
                onClick={()=>setShowInactive(v=>!v)}
                className="flex items-center gap-1.5 px-3 sm:px-4 py-2 rounded-xl border-2 text-xs sm:text-sm font-semibold transition-all"
                style={showInactive
                  ?{borderColor:"#6B7280",background:"#6B7280",color:"#fff"}
                  :{borderColor:"#6B7280",color:"#6B7280",background:"transparent"}}
              >
                <FaBan size={11}/>
                <span>{showInactive?"Hide Inactive":"Show Inactive"}</span>
                <span className="ml-0.5 px-1.5 py-0.5 rounded-full text-[10px] font-bold"
                  style={showInactive?{background:"rgba(255,255,255,0.25)"}:{background:"#E5E7EB",color:"#374151"}}>
                  {inactiveCount}
                </span>
              </button>
            )}
            <button onClick={()=>exportToCSV(filtered)}
              className="flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-2 rounded-xl border-2 text-xs sm:text-sm font-semibold transition-all"
              style={{borderColor:"#085041",color:"#085041"}}
              onMouseEnter={(e)=>{e.currentTarget.style.background="#085041";e.currentTarget.style.color="#fff";}}
              onMouseLeave={(e)=>{e.currentTarget.style.background="transparent";e.currentTarget.style.color="#085041";}}>
              <FaFileExcel size={12}/><span>Export CSV</span>
            </button>
            {isLimitReached ? (
              <div className="flex items-center gap-2 px-3 sm:px-4 py-2 rounded-xl border-2 border-[#FCA5A5] bg-[#FFF5F5] text-xs sm:text-sm font-semibold text-[#991B1B]">
                <FaExclamationTriangle size={12}/>
                <span className="hidden sm:inline">Limit reached — contact your organization</span>
                <span className="sm:hidden">Limit reached</span>
              </div>
            ):(
              <>
                <button onClick={()=>{setOpenManager(true);setMgrStep(0);}}
                  className="flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-2 rounded-xl border-2 text-xs sm:text-sm font-semibold transition-all"
                  style={{borderColor:"#730042",color:"#730042"}}
                  onMouseEnter={(e)=>{e.currentTarget.style.background="#730042";e.currentTarget.style.color="#fff";}}
                  onMouseLeave={(e)=>{e.currentTarget.style.background="transparent";e.currentTarget.style.color="#730042";}}>
                  <FaUserTie size={12}/><span>Add Manager</span>
                </button>
                <button onClick={()=>{setOpen(true);setEmpStep(0);}}
                  className="flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-2 rounded-xl text-white text-xs sm:text-sm font-semibold hover:opacity-90"
                  style={{background:"#730042"}}>
                  <FaUserPlus size={12}/><span>Add Employee</span>
                </button>
              </>
            )}
          </div>
        </div>

        {showInactive&&inactiveCount>0&&(
          <div className="mb-3 flex items-center gap-2 px-3 py-2 rounded-xl border border-[#E5E7EB] bg-[#F9FAFB] text-xs text-[#6B7280]">
            <FaBan size={11} className="flex-shrink-0"/>
            <span>Showing <strong>{inactiveCount}</strong> inactive user{inactiveCount!==1?"s":""} (resigned / fired / terminated). Their profiles are read-only.</span>
          </div>
        )}

        <div className="bg-white rounded-2xl border border-[#F4C0D1] overflow-hidden">
          <div className="p-3 sm:p-4 border-b border-[#F4C0D1]" style={{background:"#F9F8F2"}}>
            <div className="flex gap-2 mb-2">
              <div className="relative flex-1">
                <FaSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-[#993556]" size={12}/>
                <input placeholder="Search name, email, UID or designation…"
                  className={`${inputCls} pl-8 sm:pl-9`}
                  value={filters.search}
                  onChange={(e)=>setFilters({...filters,search:e.target.value})}/>
              </div>
              <button onClick={()=>setShowFilters(!showFilters)}
                className="relative flex items-center gap-1.5 px-3 py-2 rounded-lg border text-xs sm:text-sm font-medium transition-colors flex-shrink-0"
                style={showFilters?{background:"#CD166E",color:"#fff",borderColor:"#CD166E"}:{background:"transparent",color:"#730042",borderColor:"#F4C0D1"}}>
                <FaFilter size={11}/>
                <span className="hidden sm:inline">Filters</span>
                {activeFilterCount>0&&(
                  <span className="absolute -top-1.5 -right-1.5 w-4 h-4 rounded-full text-white text-[10px] font-bold flex items-center justify-center" style={{background:"#730042"}}>
                    {activeFilterCount}
                  </span>
                )}
              </button>
            </div>
            <div className="hidden sm:flex gap-2">
              <select className={`${inputCls} flex-1`} value={filters.type} onChange={(e)=>setFilters({...filters,type:e.target.value})}>
                <option value="">All Types</option><option value="employee">Employees</option><option value="manager">Managers</option>
              </select>
              <select className={`${inputCls} flex-1`} value={filters.department} onChange={(e)=>setFilters({...filters,department:e.target.value})}>
                <option value="">All Departments</option>{DEPARTMENTS.map((d)=><option key={d} value={d}>{d}</option>)}
              </select>
              <select className={`${inputCls} flex-1`} value={filters.role} onChange={(e)=>setFilters({...filters,role:e.target.value})}>
                <option value="">All Roles</option>
                <option value="employee">Employee</option><option value="manager">Manager</option>
                <option value="senior_manager">Senior Manager</option><option value="official">Official</option>
              </select>
              <select className={`${inputCls} flex-1`} value={filters.location} onChange={(e)=>setFilters({...filters,location:e.target.value})}>
                <option value="">All Locations</option>{LOCATIONS.map((l)=><option key={l} value={l}>{l}</option>)}
              </select>
            </div>
            {showFilters&&(
              <div className="mt-2 pt-2 border-t border-[#F4C0D1]">
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  <select className={inputCls} value={filters.gender} onChange={(e)=>setFilters({...filters,gender:e.target.value})}>
                    <option value="">All Genders</option>
                    <option value="male">Male</option><option value="female">Female</option><option value="other">Other</option>
                  </select>
                  <select className={inputCls} value={filters.status} onChange={(e)=>setFilters({...filters,status:e.target.value})}>
                    <option value="">All Status</option>
                    <option value="active">Active</option><option value="inactive">Inactive</option><option value="suspended">Suspended</option>
                  </select>
                  <select className={inputCls} value={filters.working_status} onChange={(e)=>setFilters({...filters,working_status:e.target.value})}>
                    <option value="">All Employment</option>
                    {WORKING_STATUSES.map(s=><option key={s} value={s}>{s.charAt(0).toUpperCase()+s.slice(1)}</option>)}
                  </select>
                </div>
                {activeFilterCount>0&&(
                  <div className="flex flex-wrap gap-1.5 mt-2 items-center">
                    {filters.type&&<FilterChip label={`Type: ${filters.type}`} onRemove={()=>setFilters({...filters,type:""})}/>}
                    {filters.department&&<FilterChip label={`Dept: ${filters.department}`} onRemove={()=>setFilters({...filters,department:""})}/>}
                    {filters.role&&<FilterChip label={`Role: ${filters.role}`} onRemove={()=>setFilters({...filters,role:""})}/>}
                    {filters.location&&<FilterChip label={`Loc: ${filters.location}`} onRemove={()=>setFilters({...filters,location:""})}/>}
                    {filters.gender&&<FilterChip label={`Gender: ${filters.gender}`} onRemove={()=>setFilters({...filters,gender:""})}/>}
                    {filters.status&&<FilterChip label={`Status: ${filters.status}`} onRemove={()=>setFilters({...filters,status:""})}/>}
                    {filters.working_status&&<FilterChip label={`Employment: ${filters.working_status}`} onRemove={()=>setFilters({...filters,working_status:""})}/>}
                    <button onClick={clearFilters} className="text-xs text-[#A32D2D] font-semibold hover:underline ml-1">Clear All</button>
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="sm:hidden p-3 space-y-2.5" style={{background:"#F9F8F2"}}>
            {listLoading?<MobileSkeletons/>:filtered.length===0?(
              <div className="flex flex-col items-center justify-center py-12 gap-3 text-center">
                <div className="text-4xl">👥</div>
                <p className="text-[#730042] font-medium text-sm">No employees found</p>
                {!isLimitReached&&<button onClick={()=>setOpen(true)} className="mt-1 px-4 py-2 rounded-xl text-white text-sm font-semibold hover:opacity-90" style={{background:"#730042"}}>+ Add Employee</button>}
              </div>
            ):filtered.map((u)=>(
              <MobileCard key={u._id} u={u} onView={handleView} onEdit={handleOpenEdit} onDelete={setDeleteTarget} {...actionMenuProps}/>
            ))}
          </div>

          <div className="hidden sm:block overflow-x-auto">
            <table className="w-full min-w-[800px] text-sm">
              <thead>
                <tr className="border-b border-[#F4C0D1]" style={{background:"#F9F8F2"}}>
                  {["Employee","Department","Designation","Location","Manager / Reports To","Role","Employment","Actions"].map((h)=>(
                    <th key={h} className="px-3 lg:px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-[#993556] whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-[#FBEAF0]">
                {listLoading?<SkeletonRows/>:filtered.length===0?<EmptyState onAdd={()=>!isLimitReached&&setOpen(true)}/>:filtered.map((u)=>{
                  const isInactive=u.working_status&&u.working_status!=="working";
                  return(
                    <tr key={u._id}
                      className={`transition-colors group cursor-pointer ${isInactive?"opacity-70":""}`}
                      onMouseEnter={(e)=>e.currentTarget.style.background=isInactive?"#F9FAFB":"#FEF4F9"}
                      onMouseLeave={(e)=>e.currentTarget.style.background="transparent"}
                      onClick={()=>handleView(u._id,u.role)}>
                      <td className="px-3 lg:px-4 py-3">
                        <div className="flex items-center gap-2 lg:gap-3">
                          <div className="relative flex-shrink-0">
                            <Avatar name={`${u.f_name??""} ${u.l_name??""}`}/>
                            {isInactive&&(
                              <div className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full bg-[#6B7280] border border-white flex items-center justify-center">
                                <FaBan size={6} className="text-white"/>
                              </div>
                            )}
                          </div>
                          <div className="min-w-0">
                            <p className={`font-semibold text-xs lg:text-sm truncate max-w-[120px] lg:max-w-[160px] ${isInactive?"text-[#6B7280]":"text-[#730042]"}`}>{u.f_name} {u.l_name}</p>
                            <p className="text-[11px] text-[#993556] truncate max-w-[120px] lg:max-w-[160px]">{u.work_email}</p>
                            {u.uid&&<p className="text-[10px] text-[#993556]/60 font-mono">{u.uid}</p>}
                          </div>
                        </div>
                      </td>
                      <td className="px-3 lg:px-4 py-3"><Badge label={u.department||"—"} type="dept"/></td>
                      <td className="px-3 lg:px-4 py-3 text-[#730042] text-xs lg:text-sm max-w-[100px] lg:max-w-none truncate">{u.designation||"—"}</td>
                      <td className="px-3 lg:px-4 py-3 text-[#730042] text-xs lg:text-sm whitespace-nowrap">{u.office_location||"—"}</td>
                      <td className="px-3 lg:px-4 py-3">
                        {u.Under_manager?(
                          <div className="text-xs">
                            <p className="font-medium text-[#730042] truncate max-w-[80px] lg:max-w-none">{u.Under_manager.f_name} {u.Under_manager.l_name}</p>
                            <p className="text-[#993556] text-[10px] hidden lg:block">{u.Under_manager.uid}</p>
                          </div>
                        ):u.reporting_manager?(
                          <div className="text-xs">
                            <p className="font-medium text-[#730042] truncate max-w-[80px] lg:max-w-none">{u.reporting_manager.f_name} {u.reporting_manager.l_name}</p>
                            <p className="text-[#993556] text-[10px] hidden lg:block">{u.reporting_manager.work_email}</p>
                          </div>
                        ):<span className="text-[#F4C0D1] text-xs">—</span>}
                      </td>
                      <td className="px-3 lg:px-4 py-3">{roleBadge(u)}</td>
                      <td className="px-3 lg:px-4 py-3"><WorkingStatusBadge status={u.working_status}/></td>
                      <td className="px-3 lg:px-4 py-3">
                        <div className="opacity-0 group-hover:opacity-100 transition-opacity" onClick={(e)=>e.stopPropagation()}>
                          <ActionMenu user={u} onView={handleView} onEdit={handleOpenEdit} onDelete={setDeleteTarget} {...actionMenuProps}/>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {!listLoading&&filtered.length>0&&(
            <div className="px-3 sm:px-4 py-2.5 sm:py-3 border-t border-[#F4C0D1] text-[11px] sm:text-xs text-[#993556] flex items-center justify-between" style={{background:"#F9F8F2"}}>
              <span>Showing {filtered.length} of {allUsers.length}</span>
              {activeFilterCount>0&&<button onClick={clearFilters} className="text-[#A32D2D] font-medium hover:underline">Clear filters</button>}
            </div>
          )}
        </div>
      </div>

      {selectedEmployeeId&&(
        <AccountSummaryDrawer
          userId={selectedEmployeeId}
          userRole={selectedEmployeeRole}
          onClose={()=>{setSelectedEmployeeId(null);setSelectedEmployeeRole(null);}}
          onEdit={(person)=>handleOpenEdit(person)}
          onDelete={(person)=>setDeleteTarget(person)}
          onPromoteToManager={openPromoteToManager}
          onPromoteToAdmin={openPromoteToAdmin}
          onDemoteToEmployee={openDemoteMgrToEmp}
          onDemoteToManager={openDemoteAdminToMgr}
          onDemoteToEmployee2={openDemoteAdminToEmp}
          managersOnly={managersOnly}
          managersWithAdmin={managersWithAdmin}
          allEmployees={allUsers}
          currentAdminId={currentAdminId}
          onRefresh={refetchList}
        />
      )}

      {open&&(
        <StepModal title="Add Employee" icon={<FaUserPlus/>} onClose={()=>{setOpen(false);setEmpErrors({});setEmpStep(0);setEmpForm(EMPTY_EMP);}} onSubmit={handleEmpSubmit} steps={EMP_STEPS} currentStep={empStep} setCurrentStep={setEmpStep} accentColor="#730042">
          <EmpStepFields step={empStep} form={empForm} onChange={handleEmpChange} errors={empErrors} managersOnly={managersOnly} perms={empPerms} onPermChange={handleEmpPermChange}/>
        </StepModal>
      )}

      {openManager&&(
        <StepModal title="Add Manager" icon={<FaUserTie/>} onClose={()=>{setOpenManager(false);setMgrErrors({});setMgrStep(0);setMgrForm(EMPTY_MGR);}} onSubmit={handleMgrSubmit} steps={EMP_STEPS} currentStep={mgrStep} setCurrentStep={setMgrStep} accentColor="#730042">
          <MgrStepFields step={mgrStep} form={mgrForm} onChange={handleMgrChange} errors={mgrErrors} managersOnly={managersOnly} managersWithAdmin={managersWithAdmin} perms={mgrPerms} onPermChange={handleMgrPermChange}/>
        </StepModal>
      )}

      {openEdit&&editTarget&&(
        <Modal
          title={`Edit ${editTarget.role==="manager"||editTarget.role==="senior_manager"?"Manager":"Employee"}`}
          icon={editTarget.role==="manager"||editTarget.role==="senior_manager"?<FaUserTie/>:<FaUserPlus/>}
          onClose={()=>{setOpenEdit(false);setEditTarget(null);setEditErrors({});}}
          onSubmit={handleEditSubmit}
          accentColor={editTarget.role==="manager"||editTarget.role==="senior_manager"?"#730042":"#CD166E"}>
          <Field label="First Name" required error={editErrors.f_name}><input name="f_name" value={editForm.f_name} onChange={handleEditChange} className={inputCls}/></Field>
          <Field label="Last Name" required error={editErrors.l_name}><input name="l_name" value={editForm.l_name} onChange={handleEditChange} className={inputCls}/></Field>
          <Field label="Work Email" required error={editErrors.work_email}><input name="work_email" type="email" value={editForm.work_email} onChange={handleEditChange} className={inputCls}/></Field>
          <Field label="Department" required error={editErrors.department}>
            <select name="department" value={editForm.department} onChange={handleEditChange} className={inputCls}>
              <option value="">Select Department</option>{DEPARTMENTS.map((d)=><option key={d} value={d}>{d}</option>)}
            </select>
          </Field>
          <Field label="Designation" required error={editErrors.designation}><input name="designation" value={editForm.designation} onChange={handleEditChange} className={inputCls}/></Field>
          <Field label="Role">
            <select name="role" value={editForm.role} onChange={handleEditChange} className={inputCls}>
              <option value="employee">Employee</option><option value="manager">Manager</option>
              <option value="senior_manager">Senior Manager</option><option value="official">Official</option>
            </select>
          </Field>
          {(editTarget.role==="employee"||editTarget.role==="official"||editForm.role==="employee"||editForm.role==="official")&&(
            <div className="col-span-1 sm:col-span-2">
              <UnderManagerSelect value={editForm.Under_manager} onChange={handleEditChange} managersOnly={managersOnly}/>
            </div>
          )}
          {(editTarget.role==="manager"||editTarget.role==="senior_manager")&&(
            <div className="col-span-1 sm:col-span-2">
              <ReportingManagerSelect value={editForm.reporting_manager} onChange={handleEditChange} managersOnly={managersOnly} managersWithAdmin={managersWithAdmin} label="Reporting Manager" name="reporting_manager"/>
            </div>
          )}
          <Field label="Gender">
            <select name="gender" value={editForm.gender} onChange={handleEditChange} className={inputCls}>
              <option value="">Select Gender</option><option value="male">Male</option><option value="female">Female</option><option value="other">Other</option>
            </select>
          </Field>
          <Field label="Marital Status">
            <select name="marital_status" value={editForm.marital_status} onChange={handleEditChange} className={inputCls}>
              <option value="single">Single</option><option value="married">Married</option><option value="divorced">Divorced</option>
            </select>
          </Field>
          <Field label="Phone" error={editErrors.personal_contact}><input name="personal_contact" value={editForm.personal_contact} onChange={handleEditChange} className={inputCls}/></Field>
          <Field label="Emergency Contact" error={editErrors.e_contact}><input name="e_contact" value={editForm.e_contact} onChange={handleEditChange} className={inputCls}/></Field>
          <Field label="Office Location">
            <select name="office_location" value={editForm.office_location} onChange={handleEditChange} className={inputCls}>
              <option value="">Select Location</option>{LOCATIONS.map((l)=><option key={l} value={l}>{l}</option>)}
            </select>
          </Field>
        </Modal>
      )}

      {deleteTarget&&(
        <ConfirmModal title="Delete User?" icon="🗑️"
          message={`Are you sure you want to delete ${deleteTarget.f_name} ${deleteTarget.l_name}? This cannot be undone.`}
          confirmLabel="Delete" confirmColor="#A32D2D"
          onConfirm={handleConfirmDelete} onCancel={()=>setDeleteTarget(null)}/>
      )}

      {promoteToMgrTarget&&(
        <ConfirmModal title="Promote to Manager?" icon="⬆️"
          message={`Promote ${promoteToMgrTarget.f_name} ${promoteToMgrTarget.l_name} from Employee to Manager.`}
          confirmLabel="Promote" confirmColor="#3C3489"
          onConfirm={handlePromoteToManager} onCancel={()=>setPromoteToMgrTarget(null)}>
          <div className="flex flex-col gap-2 -mt-1">
            <Field label="New Designation"><input className={inputCls} placeholder="e.g. Team Lead" value={promoteToMgrForm.designation} onChange={(e)=>setPromoteToMgrForm({...promoteToMgrForm,designation:e.target.value})}/></Field>
            <Field label="Manager Role">
              <select className={inputCls} value={promoteToMgrForm.role} onChange={(e)=>setPromoteToMgrForm({...promoteToMgrForm,role:e.target.value})}>
                <option value="manager">Manager</option><option value="senior_manager">Senior Manager</option><option value="official">Official</option>
              </select>
            </Field>
            <ReportingManagerSelect value={promoteToMgrForm.reporting_manager} onChange={(e)=>setPromoteToMgrForm({...promoteToMgrForm,reporting_manager:e.target.value})} managersOnly={managersOnly} managersWithAdmin={managersWithAdmin} label="Reporting Manager" name="reporting_manager"/>
          </div>
        </ConfirmModal>
      )}

      {promoteToAdminTarget&&(
        <ConfirmModal title="Promote to Admin?" icon="🔝"
          message={`Promote ${promoteToAdminTarget.f_name} ${promoteToAdminTarget.l_name} to Admin.`}
          confirmLabel="Promote" confirmColor="#92400E"
          onConfirm={handlePromoteToAdmin} onCancel={()=>setPromoteToAdminTarget(null)}>
          <div className="flex flex-col gap-2 -mt-1">
            <Field label="New Designation"><input className={inputCls} placeholder="e.g. HR Manager" value={promoteToAdminForm.designation} onChange={(e)=>setPromoteToAdminForm({...promoteToAdminForm,designation:e.target.value})}/></Field>
            <ReportingManagerSelect value={promoteToAdminForm.reporting_manager} onChange={(e)=>setPromoteToAdminForm({...promoteToAdminForm,reporting_manager:e.target.value})} managersOnly={managersOnly} managersWithAdmin={managersWithAdmin} label="Reporting Manager (optional)" name="reporting_manager"/>
          </div>
        </ConfirmModal>
      )}

      {demoteMgrToEmpTarget&&(
        <ConfirmModal title="Demote to Employee?" icon="⬇️"
          message={`Demote ${demoteMgrToEmpTarget.f_name} ${demoteMgrToEmpTarget.l_name} from Manager to Employee.`}
          confirmLabel="Demote" confirmColor="#7A3500"
          onConfirm={handleDemoteMgrToEmp} onCancel={()=>setDemoteMgrToEmpTarget(null)}>
          <div className="flex flex-col gap-2 -mt-1">
            <Field label="New Designation"><input className={inputCls} placeholder="e.g. Senior Associate" value={demoteMgrToEmpForm.designation} onChange={(e)=>setDemoteMgrToEmpForm({...demoteMgrToEmpForm,designation:e.target.value})}/></Field>
            <UnderManagerSelect value={demoteMgrToEmpForm.Under_manager} onChange={(e)=>setDemoteMgrToEmpForm({...demoteMgrToEmpForm,Under_manager:e.target.value})} managersOnly={{managers:(managersOnly?.managers||[]).filter(m=>m._id!==demoteMgrToEmpTarget._id)}} label="Assign Under Manager"/>
          </div>
        </ConfirmModal>
      )}

      {demoteAdminToMgrTarget&&(
        <ConfirmModal title="Demote Admin to Manager?" icon="⬇️"
          message={`Demote ${demoteAdminToMgrTarget.f_name} ${demoteAdminToMgrTarget.l_name} from Admin to Manager.`}
          confirmLabel="Demote" confirmColor="#7A3500"
          onConfirm={handleDemoteAdminToMgr} onCancel={()=>setDemoteAdminToMgrTarget(null)}>
          <div className="flex flex-col gap-2 -mt-1">
            <Field label="New Designation"><input className={inputCls} placeholder="e.g. Team Lead" value={demoteAdminToMgrForm.designation} onChange={(e)=>setDemoteAdminToMgrForm({...demoteAdminToMgrForm,designation:e.target.value})}/></Field>
            <Field label="Manager Role">
              <select className={inputCls} value={demoteAdminToMgrForm.role} onChange={(e)=>setDemoteAdminToMgrForm({...demoteAdminToMgrForm,role:e.target.value})}>
                <option value="manager">Manager</option><option value="senior_manager">Senior Manager</option>
              </select>
            </Field>
            <ReportingManagerSelect value={demoteAdminToMgrForm.reporting_manager} onChange={(e)=>setDemoteAdminToMgrForm({...demoteAdminToMgrForm,reporting_manager:e.target.value})} managersOnly={managersOnly} managersWithAdmin={managersWithAdmin} label="Reporting Manager (optional)" name="reporting_manager"/>
          </div>
        </ConfirmModal>
      )}

      {demoteAdminToEmpTarget&&(
        <ConfirmModal title="Demote Admin to Employee?" icon="⬇️"
          message={`Demote ${demoteAdminToEmpTarget.f_name} ${demoteAdminToEmpTarget.l_name} from Admin directly to Employee.`}
          confirmLabel="Demote" confirmColor="#A32D2D"
          onConfirm={handleDemoteAdminToEmp} onCancel={()=>setDemoteAdminToEmpTarget(null)}>
          <div className="flex flex-col gap-2 -mt-1">
            <Field label="New Designation"><input className={inputCls} placeholder="e.g. Associate" value={demoteAdminToEmpForm.designation} onChange={(e)=>setDemoteAdminToEmpForm({...demoteAdminToEmpForm,designation:e.target.value})}/></Field>
            <UnderManagerSelect value={demoteAdminToEmpForm.Under_manager} onChange={(e)=>setDemoteAdminToEmpForm({...demoteAdminToEmpForm,Under_manager:e.target.value})} managersOnly={managersOnly} label="Assign Under Manager"/>
          </div>
        </ConfirmModal>
      )}

      {popup.show&&(
        <Popup type={popup.type} message={popup.message} onClose={()=>setPopup({show:false,type:"",message:""})}/>
      )}
    </div>
  );
}