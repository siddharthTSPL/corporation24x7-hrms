import { usePermissionStore } from "../auth/store/permission/permissionStore";
import { FaLock } from "react-icons/fa";

const PermissionGate = ({ permission, children }) => {
  const can = usePermissionStore((state) => state.can);

  if (!permission || can(permission)) return children;

  return (
    <div className="flex items-center justify-center min-h-screen bg-[#F0F4F8] px-4">
      <div className="flex flex-col items-center text-center max-w-sm w-full">
        <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-full bg-[#730042]/10 flex items-center justify-center mb-6">
          <FaLock size={36} className="text-[#730042] sm:text-[44px]" />
        </div>
        <h2 className="text-2xl sm:text-3xl font-bold text-gray-700 mb-2">
          Access Restricted
        </h2>
        <p className="text-sm sm:text-base text-gray-400 leading-relaxed">
          You don't have permission to access this page. Contact your admin to request access.
        </p>
      </div>
    </div>
  );
};

export default PermissionGate;