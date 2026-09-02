import { Navigate, Outlet } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { useAuth } from "../auth/store/getmeauth/getmeauth";
import { usePermissionStore } from "../auth/store/permission/permissionStore";
import { usePlanFeatures } from "../auth/server-state/planFeature/planFeature.hook";
import { FaLock } from "react-icons/fa";

const NoIndex = () => (
  <Helmet>
    <meta name="robots" content="noindex, nofollow" />
  </Helmet>
);

const AccessDenied = () => (
  <>
    <NoIndex />
    <div className="flex flex-col items-center justify-center min-h-screen gap-3 text-gray-400 bg-gray-50">
      <div className="bg-[#730042]/10 p-5 rounded-full">
        <FaLock size={36} className="text-[#730042]" />
      </div>
      <p className="text-2xl font-bold text-gray-600">Access Restricted</p>
      <p className="text-sm text-gray-400 text-center max-w-sm">
        You don't have permission to access this page. Contact your admin to request access.
      </p>
    </div>
  </>
);

const UpgradeRequired = () => (
  <>
    <NoIndex />
    <div className="flex flex-col items-center justify-center min-h-screen gap-3 text-gray-400 bg-gray-50">
      <div className="bg-[#730042]/10 p-5 rounded-full">
        <FaLock size={36} className="text-[#730042]" />
      </div>
      <p className="text-2xl font-bold text-gray-600">Upgrade Required</p>
      <p className="text-sm text-gray-400 text-center max-w-sm">
        This feature isn't available on your organisation's current plan. Upgrade to Advance or Enterprise to unlock it.
      </p>
    </div>
  </>
);

const ProtectedRoute = ({ children, allowedRoles, permission, permissionGroup, planFeature }) => {
  const { data, isLoading } = useAuth();
  const can = usePermissionStore((state) => state.can);
  const permRole = usePermissionStore((state) => state.role);
  const { data: planFeatures, isLoading: planLoading } = usePlanFeatures();

  if (isLoading) return (<><NoIndex /><p>Loading...</p></>);

  if (!data) return <Navigate to="/login" replace />;

  if (allowedRoles && !allowedRoles.includes(data.role))
    return <AccessDenied />;

  const hasPermissionCheck = permission || permissionGroup?.length;

  if (hasPermissionCheck) {
    const permissionsNotYetLoaded = !permRole && data.role !== "superadmin";
    if (permissionsNotYetLoaded) return (<><NoIndex /><p>Loading...</p></>);

    if (permission && !can(permission)) return <AccessDenied />;
    if (permissionGroup?.length && !permissionGroup.some((p) => can(p)))
      return <AccessDenied />;
  }

  if (planFeature) {
    if (planLoading) return (<><NoIndex /><p>Loading...</p></>);
    if (planFeatures?.features?.[planFeature] === false) return <UpgradeRequired />;
  }

  return <>
    <NoIndex />
    {children ?? <Outlet />}
  </>;
};

export default ProtectedRoute;