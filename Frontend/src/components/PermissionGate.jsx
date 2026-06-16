import { usePermissionStore } from "../auth/store/permission/permissionStore";
import { FaLock } from "react-icons/fa";

const PermissionGate = ({ permission, children }) => {
  const can = usePermissionStore((state) => state.can);

  if (!permission || can(permission)) return children;

  return (
    <div className="flex flex-col items-center justify-center min-h-[70vh] gap-4 text-center px-4">
      <div className="bg-[#730042]/10 p-5 rounded-full">
        <FaLock size={32} className="text-[#730042]" />
      </div>
      <h2 className="text-xl font-semibold text-gray-700">Access Restricted</h2>
      <p className="text-sm text-gray-400 max-w-sm">
        You don't have permission to access this feature. Please contact your admin to request access.
      </p>
    </div>
  );
};

export default PermissionGate;