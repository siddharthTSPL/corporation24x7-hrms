// Single source of truth for "where should this notification take me?".
// Guarantees: ALWAYS returns a route that exists in App.jsx (never a 404).
// Order:
//   1) saved link (fixed for the user's role)
//   2) page for the notification type
//   3) role dashboard (last resort)
//
// NOTE: App uses <BrowserRouter basename="/talent">, so never prefix "/talent".

// section -> role -> real route (from App.jsx). Missing role = no page for that role.
const SECTION_ROUTES = {
  dashboard: {
    superadmin: "/superadmin-dashboard",
    admin: "/dashboard",
    manager: "/manager-dashboard",
    employee: "/employee-dashboard",
  },
  leave: {
    superadmin: "/superadmin-leaves",
    admin: "/leave-admin",
    manager: "/leave-manager",
    employee: "/leave-employee",
  },
  reimbursement: {
    superadmin: "/superadmin-reimbursement",
    admin: "/reimbursement-admin",
    manager: "/reimbursement-manager",
    employee: "/reimbursement-employee",
  },
  timesheet: {
    superadmin: "/superadmin-timesheet",
    admin: "/admin-timesheet",
    manager: "/manager-timesheet",
    employee: "/employee-timesheet",
  },
  complaints: {
    superadmin: "/superadmin-complaints",
    admin: "/admin-complaints",
    manager: "/manager-complaints",
    employee: "/employee-complaints",
  },
  review: {
    superadmin: "/superadmin-reviews",
    admin: "/review-admin",
    manager: "/review-manager",
    employee: "/review-employee",
  },
  recruitment: {
    superadmin: "/superadmin-recruitment",
    admin: "/recruitment-admin",
    manager: "/recruitment-manager",
    employee: "/recruitment-manager",
  },
  announcement: {
    superadmin: "/superadmin-announcements",
    admin: "/announcement",
    manager: "/announcement-manager",
    employee: "/announcement-employee",
  },
  document: {
    superadmin: "/superadmin-documents",
    admin: "/document-admin",
    manager: "/document-manager",
    employee: "/document",
  },
  asset: {
    superadmin: "/superadmin-asset-management",
    admin: "/admin-asset-management",
  },
  payroll: {
    superadmin: "/superadmin-payroll",
    admin: "/payroll",
    manager: "/payroll",
    employee: "/payroll",
  },
  policy: {
    superadmin: "/superadmin-policy-management",
    admin: "/admin-policy-management",
    manager: "/my-policies",
    employee: "/my-policies",
  },
  training: {
    superadmin: "/superadmin-training",
    admin: "/training-admin",
    manager: "/training",
    employee: "/training",
  },
  settings: {
    superadmin: "/superadmin-settings",
    admin: "/settings",
    manager: "/settings-manager",
    employee: "/settings-employee",
  },
  file: {
    admin: "/file",
    manager: "/file-manager",
    employee: "/file-employee",
  },
  organisation: {
    superadmin: "/superadmin-organisations",
    admin: "/organisation",
    manager: "/organisation-manager",
    employee: "/organisation-employee",
  },
  overtime: {
    superadmin: "/overtime",
    admin: "/overtime",
    manager: "/overtime",
    employee: "/overtime",
  },
  meeting: {
    superadmin: "/meetings",
    admin: "/meetings",
    manager: "/meetings",
    employee: "/meetings",
  },
  gamification: {
    superadmin: "/gamification-admin",
    admin: "/gamification",
    manager: "/gamification",
    employee: "/gamification",
  },
};

// notification.type -> section (used when link is missing / unusable)
const TYPE_TO_SECTION = {
  leave_applied: "leave",
  leave_approved: "leave",
  leave_rejected: "leave",
  leave_forwarded: "leave",
  wfh_applied: "leave",
  wfh_approved: "leave",
  wfh_rejected: "leave",
  wfh_forwarded: "leave",
  asset_assigned: "asset",
  asset_returned: "asset",
  announcement: "announcement",
  ticket: "complaints",
  reimbursement: "reimbursement",
  document: "document",
  policy: "policy",
  payroll: "payroll",
  review: "review",
  training: "training",
  timesheet: "timesheet",
  overtime: "overtime",
  holiday: "dashboard",
  birthday: "dashboard",
  meeting: "meeting",
  gamification: "gamification",
  // system, general, chat -> no dedicated page -> role dashboard (fallback)
};

// Other names the backend may have used in `link`
const ALIASES = {
  leaves: "leave",
  wfh: "leave",
  reimbursements: "reimbursement",
  timesheets: "timesheet",
  tickets: "complaints",
  ticket: "complaints",
  complaint: "complaints",
  reviews: "review",
  announcements: "announcement",
  documents: "document",
  "document-admin-team": "document",
  assets: "asset",
  "asset-management": "asset",
  policies: "policy",
  "policy-management": "policy",
  organisations: "organisation",
  organization: "organisation",
  organizations: "organisation",
  "manager/recruitment": "recruitment",
  "superadmin-recruitment-approvals": "recruitment",
  meetings: "meeting",
  "gamification-admin": "gamification",
  "employee-dashboard": "dashboard",
  "manager-dashboard": "dashboard",
  "superadmin-dashboard": "dashboard",
};

// Routes that are valid for everyone and need no role mapping
const COMMON_ROUTES = [
  "/notifications",
  "/help-center",
  "/self-service",
  "/my-policies",
  "/field-operations",
  "/reports",
  "/mark-attendance",
  "/employee",
];

// Dynamic routes that exist in App.jsx
const DYNAMIC_ROUTES = [/^\/reports\/[^/]+$/, /^\/meetings\/[^/]+$/];

// Last-resort landing page per role, so a click always goes somewhere valid.
const FALLBACK_ROUTE = {
  superadmin: "/superadmin-dashboard",
  admin: "/dashboard",
  manager: "/manager-dashboard",
  employee: "/employee-dashboard",
};

const ROUTE_INDEX = {};
const KNOWN_ROUTES = new Set(COMMON_ROUTES);

Object.entries(SECTION_ROUTES).forEach(([section, byRole]) => {
  ROUTE_INDEX[section] = section;
  Object.values(byRole).forEach((route) => {
    KNOWN_ROUTES.add(route);
    ROUTE_INDEX[route.replace(/^\//, "")] = section;
  });
});
Object.entries(ALIASES).forEach(([alias, section]) => {
  ROUTE_INDEX[alias] = section;
});

const BROKEN_SEGMENT = /\/(undefined|null|NaN)(\/|$)/;

const normalizeRole = (role) => {
  const r = String(role || "").toLowerCase().replace(/[\s_-]/g, "");
  if (r === "superadmin") return "superadmin";
  if (r === "admin") return "admin";
  if (r === "manager") return "manager";
  return "employee"; // "user" / "employee" / unknown
};

const splitPath = (link) => {
  let value = String(link).trim();

  // full URL -> keep only path + query + hash
  if (/^https?:\/\//i.test(value)) {
    try {
      const u = new URL(value);
      value = u.pathname + u.search + u.hash;
    } catch {
      return null;
    }
  }

  const match = value.match(/^([^?#]*)(.*)$/);
  let path = match[1] || "";
  const query = match[2] || "";

  // basename is already /talent
  path = path.replace(/^\/?talent(?=\/|$)/, "");
  if (!path.startsWith("/")) path = `/${path}`;
  path = path.replace(/\/{2,}/g, "/");
  if (path.length > 1) path = path.replace(/\/+$/, "");

  return { path, query };
};

export const isKnownRoute = (path) =>
  path !== "/" && (KNOWN_ROUTES.has(path) || DYNAMIC_ROUTES.some((re) => re.test(path)));

/**
 * @param {object} notification  the notification document ({ link, type, ... })
 * @param {string} role          auth.role ("superadmin" | "admin" | "manager" | "employee")
 * @returns {string}             a valid in-app route (always; never a 404)
 */
export const resolveNotificationLink = (notification, role) => {
  const r = normalizeRole(role);
  let target = null;

  // 1) Use the saved link (fixed for this role)
  const raw = notification?.link;
  if (typeof raw === "string" && raw.trim()) {
    const parts = splitPath(raw);
    if (parts && !BROKEN_SEGMENT.test(parts.path)) {
      const full = parts.path.replace(/^\//, "");
      const section = ROUTE_INDEX[full] || ROUTE_INDEX[full.split("/")[0]];

      if (section) {
        const mapped = SECTION_ROUTES[section]?.[r];
        if (mapped) target = mapped + parts.query;
      } else if (isKnownRoute(parts.path)) {
        target = parts.path + parts.query;
      }
    }
  }

  // 2) Link unusable -> page for this notification type
  if (!target) {
    const section = TYPE_TO_SECTION[notification?.type];
    const mapped = section && SECTION_ROUTES[section]?.[r];
    if (mapped) target = mapped;
  }

  // 3) Still nothing -> role dashboard (never a 404)
  if (!target) target = FALLBACK_ROUTE[r];

  // Final guard
  if (!isKnownRoute(target.split(/[?#]/)[0])) {
    console.warn("[notification] unresolved link:", notification?.type, raw);
    return FALLBACK_ROUTE[r];
  }

  return target;
};