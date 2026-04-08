import { Navigate } from "react-router-dom";
import { useAuth } from "../auth/store/getmeauth/getmeauth";

const ProtectedRoute = ({ children, allowedRoles }) => {
  const { data, isLoading } = useAuth();

  if (isLoading) return <p>Loading...</p>;

  if (!data) {
    return <Navigate to="/login" replace />;
  }
console.log(data.role);

  if (allowedRoles && !allowedRoles.includes(data.role)) {
    return <Navigate to="/unauthorized" replace />;
  }

  return children;
};

export default ProtectedRoute;