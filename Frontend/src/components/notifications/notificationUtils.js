import {
  FaCalendarAlt,
  FaHouseUser,
  FaLaptop,
  FaBullhorn,
  FaShieldAlt,
  FaMoneyCheckAlt,
  FaFileAlt,
  FaCog,
  FaBell,
  FaCheckCircle,
  FaTimesCircle,
  FaBirthdayCake,
  FaClipboardCheck,
  FaClock,
  FaUmbrellaBeach,
} from "react-icons/fa";

export const TYPE_META = {
  leave_applied: { icon: FaCalendarAlt, color: "#730042", bg: "#F6E8EF" },
  leave_approved: { icon: FaCheckCircle, color: "#16A34A", bg: "#E7F7EC" },
  leave_rejected: { icon: FaTimesCircle, color: "#EB5757", bg: "#FDEBEB" },
  leave_forwarded: { icon: FaCalendarAlt, color: "#730042", bg: "#F6E8EF" },
  wfh_applied: { icon: FaHouseUser, color: "#00A8E8", bg: "#E6F6FD" },
  wfh_approved: { icon: FaCheckCircle, color: "#16A34A", bg: "#E7F7EC" },
  wfh_rejected: { icon: FaTimesCircle, color: "#EB5757", bg: "#FDEBEB" },
  wfh_forwarded: { icon: FaHouseUser, color: "#00A8E8", bg: "#E6F6FD" },
  asset_assigned: { icon: FaLaptop, color: "#8B5CF6", bg: "#F1EBFD" },
  asset_returned: { icon: FaLaptop, color: "#8B5CF6", bg: "#F1EBFD" },
  announcement: { icon: FaBullhorn, color: "#FDCB6E", bg: "#FEF6E7" },
  ticket: { icon: FaShieldAlt, color: "#0EA5E9", bg: "#E6F5FD" },
  reimbursement: { icon: FaMoneyCheckAlt, color: "#16A34A", bg: "#E7F7EC" },
  document: { icon: FaFileAlt, color: "#6B7280", bg: "#F1F2F4" },
  payroll: { icon: FaMoneyCheckAlt, color: "#16A34A", bg: "#E7F7EC" },
  review: { icon: FaClipboardCheck, color: "#0EA5E9", bg: "#E6F5FD" },
  timesheet: { icon: FaClock, color: "#F59E0B", bg: "#FEF3E2" },
  holiday: { icon: FaUmbrellaBeach, color: "#00A8E8", bg: "#E6F6FD" },
  birthday: { icon: FaBirthdayCake, color: "#EC4899", bg: "#FDE7F3" },
  system: { icon: FaCog, color: "#6B7280", bg: "#F1F2F4" },
  general: { icon: FaBell, color: "#730042", bg: "#F6E8EF" },
};

export const getTypeMeta = (type) => TYPE_META[type] || TYPE_META.general;

export const formatRelativeTime = (dateInput) => {
  const date = new Date(dateInput);
  const now = new Date();
  const diffMs = now - date;
  const diffSec = Math.round(diffMs / 1000);
  const diffMin = Math.round(diffSec / 60);
  const diffHr = Math.round(diffMin / 60);
  const diffDay = Math.round(diffHr / 24);

  if (diffSec < 45) return "just now";
  if (diffMin < 60) return `${diffMin}m ago`;
  if (diffHr < 24) return `${diffHr}h ago`;
  if (diffDay < 7) return `${diffDay}d ago`;

  return date.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: diffDay > 365 ? "numeric" : undefined });
};

export const groupByDay = (items) => {
  const groups = { Today: [], Yesterday: [], Earlier: [] };
  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const startOfYesterday = new Date(startOfToday);
  startOfYesterday.setDate(startOfYesterday.getDate() - 1);

  items.forEach((item) => {
    const created = new Date(item.createdAt);
    if (created >= startOfToday) groups.Today.push(item);
    else if (created >= startOfYesterday) groups.Yesterday.push(item);
    else groups.Earlier.push(item);
  });

  return Object.entries(groups).filter(([, list]) => list.length > 0);
};
