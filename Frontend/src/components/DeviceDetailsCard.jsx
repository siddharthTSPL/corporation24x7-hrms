import {
  FaDesktop,
  FaMobileAlt,
  FaTabletAlt,
  FaGlobe,
  FaMapMarkerAlt,
  FaClock,
  FaNetworkWired,
} from "react-icons/fa";

// One shared "device card" used by BOTH single sign-in screens, so the person
// sees identical details wherever they're asked to act:
//   - WaitingForApprovalPanel (new device, shows the device that's signed in)
//   - SingleSignInApprovalBanner (old device, shows the device trying to sign in)
//
// `device` shape (all optional):
//   { name, model, type, browser, os, city, country, ip, timeLabel, timeValue }

const DEVICE_TYPE_LABEL = { desktop: "Desktop / Laptop", mobile: "Mobile phone", tablet: "Tablet" };

const BADGE_TONES = {
  green: "text-green-700 bg-green-50 border-green-200",
  amber: "text-amber-700 bg-amber-50 border-amber-200",
};
const DOT_TONES = { green: "bg-green-500", amber: "bg-amber-500" };

export const DeviceIcon = ({ type, className }) => {
  if (type === "mobile") return <FaMobileAlt className={className} />;
  if (type === "tablet") return <FaTabletAlt className={className} />;
  return <FaDesktop className={className} />;
};

export const countryName = (code) => {
  if (!code) return "";
  try {
    return new Intl.DisplayNames(["en"], { type: "region" }).of(code) || code;
  } catch {
    return code;
  }
};

export const formatDateTime = (value) => {
  if (!value) return "";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleString(undefined, { day: "numeric", month: "short", hour: "numeric", minute: "2-digit" });
};

const Detail = ({ icon, label, value }) => {
  if (!value) return null;
  return (
    <div className="flex items-center gap-2.5 px-3 py-2">
      <span className="text-[#b0948a] text-xs shrink-0">{icon}</span>
      <div className="min-w-0 text-left">
        <p className="text-[10px] uppercase tracking-wide text-[#b0948a]">{label}</p>
        <p className="text-xs font-medium text-[#2a1a16] break-words">{value}</p>
      </div>
    </div>
  );
};

export default function DeviceDetailsCard({ caption, device, badge, className = "" }) {
  if (!device) return null;

  const hasName = device.name && device.name !== "Unknown device";
  const title = hasName ? device.name : "Unrecognized device";
  const typeLabel = DEVICE_TYPE_LABEL[device.type];
  const subtitle = [device.model && device.model !== device.name ? device.model : null, typeLabel]
    .filter(Boolean)
    .join(" · ");
  const browserOs = [device.browser, device.os].filter(Boolean).join(" · ");
  const location = [device.city, countryName(device.country)].filter(Boolean).join(", ");
  const tone = badge?.tone === "amber" ? "amber" : "green";

  return (
    <div className={`w-full rounded-xl border border-[#f0e8e4] bg-[#faf8f6] overflow-hidden ${className}`}>
      <div className="flex items-center gap-3 px-3 py-3 bg-[#730042]/5 border-b border-[#f0e8e4] text-left">
        <div className="shrink-0 w-10 h-10 rounded-full bg-white border border-[#f0e8e4] flex items-center justify-center">
          <DeviceIcon type={device.type} className="text-[#730042]" />
        </div>
        <div className="min-w-0">
          {caption && <p className="text-[10px] uppercase tracking-wide text-[#b0948a]">{caption}</p>}
          <p className="text-sm font-semibold text-[#2a1a16] truncate">{title}</p>
          {subtitle && <p className="text-[11px] text-[#8a7a75] truncate">{subtitle}</p>}
        </div>
        {badge?.text && (
          <span
            className={`ml-auto shrink-0 inline-flex items-center gap-1 text-[10px] font-medium border rounded-full px-2 py-0.5 ${BADGE_TONES[tone]}`}
          >
            <span className={`w-1.5 h-1.5 rounded-full ${DOT_TONES[tone]}`} />
            {badge.text}
          </span>
        )}
      </div>
      <div className="divide-y divide-[#f0e8e4]">
        <Detail icon={<FaGlobe />} label="Browser & system" value={browserOs} />
        <Detail icon={<FaMapMarkerAlt />} label="Approx. location" value={location} />
        <Detail icon={<FaNetworkWired />} label="IP address" value={device.ip} />
        <Detail icon={<FaClock />} label={device.timeLabel || "Time"} value={formatDateTime(device.timeValue)} />
      </div>
    </div>
  );
}