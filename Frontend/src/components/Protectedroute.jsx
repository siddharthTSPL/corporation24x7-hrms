import { Navigate } from "react-router-dom";
import { useGetMeAdmin } from "../auth/server-state/adminauth/adminauth.hook";

const ProtectedRoute = ({ children }) => {
  const { data: admin, isLoading, isError } = useGetMeAdmin();

  if (isLoading) return <p>Loading...</p>;

  if (!admin || isError) {
    return <Navigate to="/login" replace />;
  }

  return children;
};

export default ProtectedRoute;