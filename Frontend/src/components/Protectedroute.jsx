import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "../auth/store/getmeauth/getmeauth";
import { usePermissionStore } from "../auth/store/permission/permissionStore";

/**
 * ProtectedRoute
 *  - allowedRoles: string[]   – redirect to /unauthorized if role not in list
 *  - permission: string       – e.g. "tickets.can_raise_ticket"
 *                               redirect to /unauthorized if user lacks that permission
 */
const ProtectedRoute = ({ children, allowedRoles, permission }) => {
  const { data, isLoading } = useAuth();
  const can = usePermissionStore((state) => state.can);

  if (isLoading) return <p>Loading...</p>;

  if (!data) return <Navigate to="/login" replace />;

  if (allowedRoles && !allowedRoles.includes(data.role))
    return <Navigate to="/unauthorized" replace />;

  if (permission && !can(permission))
    return <Navigate to="/unauthorized" replace />;

  return children ?? <Outlet />;
};

export default ProtectedRoute;