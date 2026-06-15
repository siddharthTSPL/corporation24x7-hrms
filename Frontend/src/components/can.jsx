import { usePermissionStore } from "../auth/store/permission/permissionStore";

const Can = ({ do: action, children, fallback = null }) => {
  const can = usePermissionStore((state) => state.can);
  return can(action) ? children : fallback;
};

export default Can;