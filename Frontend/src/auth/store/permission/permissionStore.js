import { create } from "zustand";

const resolvePath = (obj, path) => {
  if (!obj) return undefined;
  return path.split(".").reduce((acc, key) => acc?.[key], obj);
};

export const usePermissionStore = create((set, get) => ({
  permissions: {},
  role: null,

  setPermissions: (role, permissions) => set({ role, permissions: permissions ?? {} }),

  clearPermissions: () => set({ role: null, permissions: {} }),

  can: (permissionPath) => {
    const { role, permissions } = get();
    if (role === "superadmin") return true;
    if (permissionPath === "payroll.can_manage_payroll" && role === "admin") return true;
    if (permissionPath.startsWith("adminAccess.") && role === "admin") return true;
    const value = resolvePath(permissions, permissionPath);
    if (value !== undefined) return !!value;

    // Keep existing users enabled for newly introduced self-service controls
    // until an admin explicitly saves a value for them.
    return Boolean(role) && [
      "leave.can_apply_leave",
      "reimbursement.can_submit_claim",
      "timesheet.can_access",
      "review.can_access",
      "navigation.can_view_dashboard",
      "navigation.can_view_self_service",
      "navigation.can_view_organisation",
      "navigation.can_view_settings",
      "navigation.can_view_policies",
      "navigation.can_view_training",
      "navigation.can_view_field_operations",
      "payroll.can_view_own_payslips",
    ].includes(permissionPath);
  },
}));
