import { usePermissionStore } from "../auth/store/permission/permissionStore";
import { FaLock } from "react-icons/fa";

const Can = ({ do: action, children, fallback }) => {
  const can = usePermissionStore((state) => state.can);

  if (can(action)) return children;

  if (fallback !== undefined) return fallback;

  return (
    <div className="flex flex-col items-center justify-center min-h-[300px] gap-3 text-gray-400">
      <FaLock size={36} />
      <p className="text-lg font-semibold text-gray-500">Access Restricted</p>
      <p className="text-sm text-gray-400 text-center max-w-xs">
        You don't have permission to use this feature. Contact your admin.
      </p>
    </div>
  );
};

export default Can;