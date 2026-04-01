import { Navigate } from "react-router-dom";
import { useGetMeAdmin } from "../auth/server-state/adminauth/adminauth.hook";

const ProtectedRoute = ({ children }) => {
  const { data: admin, isLoading } = useGetMeAdmin();

  if (isLoading) return <p>Loading...</p>;

  return admin ? children : <Navigate to="/login" replace />;
};

export default ProtectedRoute;