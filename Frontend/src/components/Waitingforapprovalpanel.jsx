import { useEffect, useState } from "react";
import {
  FaShieldAlt,
  FaDesktop,
  FaMobileAlt,
  FaTabletAlt,
  FaGlobe,
  FaMapMarkerAlt,
  FaClock,
  FaNetworkWired,
} from "react-icons/fa";

// Shown on the NEW device's login screen while it waits for the person to
// approve the sign-in from the device that already holds the session. Its
// whole job is to answer: "where is my account signed in right now, and what
// do I need to do?" — so the person isn't left staring at a spinner.

const DEVICE_TYPE_LABEL = { desktop: "Desktop / Laptop", mobile: "Mobile phone", tablet: "Tablet" };

const DeviceIcon = ({ type, className }) => {
  if (type === "mobile") return <FaMobileAlt className={className} />;
  if (type === "tablet") return <FaTabletAlt className={className} />;
  return <FaDesktop className={className} />;
};

const countryName = (code) => {
  if (!code) return "";
  try {
    return new Intl.DisplayNames(["en"], { type: "region" }).of(code) || code;
  } catch {
    return code;
  }
};

const formatSignedIn = (value) => {
  if (!value) return "";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleString(undefined, { day: "numeric", month: "short", hour: "numeric", minute: "2-digit" });
};

const formatCountdown = (seconds) => {
  const s = Math.max(0, seconds);
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
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

export default function WaitingForApprovalPanel({ activeDevice, expiresAt, onCancel }) {
  const [secondsLeft, setSecondsLeft] = useState(null);

  useEffect(() => {
    if (!expiresAt) return;
    const tick = () =>
      setSecondsLeft(Math.max(0, Math.round((new Date(expiresAt).getTime() - Date.now()) / 1000)));
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [expiresAt]);

  const d = activeDevice;
  const hasName = d?.deviceName && d.deviceName !== "Unknown device";
  const deviceTitle = hasName ? d.deviceName : d?.label || "Another device";
  const typeLabel = DEVICE_TYPE_LABEL[d?.deviceType];
  const location = [d?.city, countryName(d?.country)].filter(Boolean).join(", ");
  const browserOs = [d?.browser, d?.os].filter(Boolean).join(" · ");

  return (
    <div className="flex flex-col items-center text-center py-2">
      <div className="relative w-12 h-12 mb-3">
        <div className="absolute inset-0 border-4 border-[#730042]/20 border-t-[#730042] rounded-full animate-spin" />
        <FaShieldAlt className="absolute inset-0 m-auto text-[#730042] text-sm" />
      </div>

      <h2 className="text-xl font-bold text-[#730042] mb-1">Approval required</h2>
      <p className="text-gray-500 text-sm mb-4 max-w-xs">
        Your account is already signed in on another device. Approve this sign-in from that device to continue.
      </p>

      {d && (
        <div className="w-full rounded-xl border border-[#f0e8e4] bg-[#faf8f6] overflow-hidden mb-4">
          <div className="flex items-center gap-3 px-3 py-3 bg-[#730042]/5 border-b border-[#f0e8e4] text-left">
            <div className="shrink-0 w-10 h-10 rounded-full bg-white border border-[#f0e8e4] flex items-center justify-center">
              <DeviceIcon type={d.deviceType} className="text-[#730042]" />
            </div>
            <div className="min-w-0">
              <p className="text-[10px] uppercase tracking-wide text-[#b0948a]">Currently signed in on</p>
              <p className="text-sm font-semibold text-[#2a1a16] truncate">{deviceTitle}</p>
              {typeLabel && <p className="text-[11px] text-[#8a7a75]">{typeLabel}</p>}
            </div>
            <span className="ml-auto shrink-0 inline-flex items-center gap-1 text-[10px] font-medium text-green-700 bg-green-50 border border-green-200 rounded-full px-2 py-0.5">
              <span className="w-1.5 h-1.5 rounded-full bg-green-500" />
              Active
            </span>
          </div>
          <div className="divide-y divide-[#f0e8e4]">
            <Detail icon={<FaGlobe />} label="Browser & system" value={browserOs} />
            <Detail icon={<FaMapMarkerAlt />} label="Approx. location" value={location} />
            <Detail icon={<FaNetworkWired />} label="IP address" value={d.ipMasked} />
            <Detail icon={<FaClock />} label="Signed in at" value={formatSignedIn(d.signedInAt)} />
          </div>
        </div>
      )}

      <div className="w-full text-left rounded-xl border border-[#f0dcd0] bg-[#fdf6f2] px-4 py-3 mb-4">
        <p className="text-xs font-semibold text-[#8a5a3a] mb-1.5">What to do next</p>
        <ol className="text-xs text-[#8a5a3a] space-y-1 list-decimal list-inside leading-relaxed">
          <li>
            Open your account on <span className="font-semibold">{hasName ? d.deviceName : "your other device"}</span>
            {d?.browser ? ` (${d.browser})` : ""}.
          </li>
          <li>Look for the “New sign-in request” card at the top right.</li>
          <li>
            Choose <span className="font-semibold">“Yes, this was me”</span>. This page will sign you in
            automatically.
          </li>
        </ol>
      </div>

      {secondsLeft !== null && (
        <p className="text-[11px] text-gray-400 mb-3">
          Request expires in <span className="font-medium tabular-nums text-gray-500">{formatCountdown(secondsLeft)}</span>
        </p>
      )}

      <p className="text-[11px] text-gray-400 max-w-xs mb-3">
        Can’t access that device? Cancel and contact your administrator for help.
      </p>

      <button onClick={onCancel} className="text-sm text-[#730042] font-medium hover:underline">
        Cancel and go back
      </button>
    </div>
  );
}