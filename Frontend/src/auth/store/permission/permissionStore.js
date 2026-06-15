import { create } from "zustand";

const resolvePath = (obj, path) => {
  if (!obj) return false;
  return path.split(".").reduce((acc, key) => acc?.[key], obj) ?? false;
};

export const usePermissionStore = create((set, get) => ({
  permissions: {},
  role: null,

  setPermissions: (role, permissions) => set({ role, permissions: permissions ?? {} }),

  clearPermissions: () => set({ role: null, permissions: {} }),

  can: (permissionPath) => {
    const { role, permissions } = get();
    if (role === "superadmin") return true;
    return !!resolvePath(permissions, permissionPath);
  },
}));