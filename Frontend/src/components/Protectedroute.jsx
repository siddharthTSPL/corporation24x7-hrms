import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "../auth/store/getmeauth/getmeauth";
import { usePermissionStore } from "../auth/store/permission/permissionStore";
import { FaLock } from "react-icons/fa";

const AccessDenied = () => (
  <div className="flex flex-col items-center justify-center min-h-screen gap-3 text-gray-400 bg-gray-50">
    <div className="bg-[#730042]/10 p-5 rounded-full">
      <FaLock size={36} className="text-[#730042]" />
    </div>
    <p className="text-2xl font-bold text-gray-600">Access Restricted</p>
    <p className="text-sm text-gray-400 text-center max-w-sm">
      You don't have permission to access this page. Contact your admin to request access.
    </p>
  </div>
);

const ProtectedRoute = ({ children, allowedRoles, permission }) => {
  const { data, isLoading } = useAuth();
  const can = usePermissionStore((state) => state.can);

  if (isLoading) return <p>Loading...</p>;

  if (!data) return <Navigate to="/login" replace />;

  if (allowedRoles && !allowedRoles.includes(data.role))
    return <AccessDenied />;

  if (permission && !can(permission))
    return <AccessDenied />;

  return children ?? <Outlet />;
};

export default ProtectedRoute;