import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { useAuth } from "./auth/store/getmeauth/getmeauth";
import Login from "./pages/auth/Login";
import Signup from "./pages/auth/Signup";
import LandingPage from "./pages/auth/LandingPage";
import MainLayout from "./layout/MainLayout";
import ProtectedRoute from "./components/Protectedroute";
import Dashboard from "./pages/dashboard/Dashboard";
import EmployeeDashboard from "./pages/dashboard/EmployeeDashboard";
import Managerdashboard from "./pages/dashboard/Dashboardma";
import EmployeeTable from "./pages/employee/EmployeeTable";
import LeaveTable from "./pages/leave/LeaveTable";
import LeaveTableem from "./pages/leave/LeaveTableem";
import LeaveTablema from "./pages/leave/LeaveTablema";
import LeaveTablead from "./pages/leave/LeaveTablead";
import Announce from "./pages/announcement/Announce";
import Announceem from "./pages/announcement/Announceem";
import Announcema from "./pages/announcement/Announcema";
import Doc from "./pages/document/Doc";
import Docma from "./pages/document/Docma";
import Set from "./pages/settings/Set";
import Setem from "./pages/settings/Setem";
import Setma from "./pages/settings/Setma";
import File from "./pages/file/File";
import Fileem from "./pages/file/Fileem";
import Filema from "./pages/file/Filema";
import Organisation from "./pages/organisation/Organisation";
import Organisationem from "./pages/organisation/organisationem";
import Organisationma from "./pages/organisation/organisationma";
import Reviewad from "./pages/review/reviewad";
import Reviewma from "./pages/review/reviewma";
import Attendancepage from "./pages/attendance/attendancepage";

function RoleBasedRedirect() {
  const { data: auth, isLoading } = useAuth();

  if (isLoading) return <p>Loading...</p>;
  if (!auth) return <Navigate to="/login" replace />;
  if (auth.role === "admin") return <Navigate to="/dashboard" replace />;
  if (auth.role === "manager") return <Navigate to="/manager-dashboard" replace />;
  return <Navigate to="/employee-dashboard" replace />;
}

function App() {
  return (
    <BrowserRouter>
      <Routes>
      
        <Route path="/" element={<LandingPage />} />
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<Signup />} />
        <Route path="/redirect" element={<RoleBasedRedirect />} />
        <Route
          path="/unauthorized"
          element={
            <div className="min-h-screen flex items-center justify-center">
              <div className="text-center">
                <h2 className="text-2xl font-bold text-gray-800 mb-2">Access Denied</h2>
                <p className="text-gray-500">You don't have permission to view this page.</p>
              </div>
            </div>
          }
        />

       
        <Route
          element={
            <ProtectedRoute allowedRoles={["admin", "manager", "employee"]}>
              <MainLayout />
            </ProtectedRoute>
          }
        >
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/employee-dashboard" element={<EmployeeDashboard />} />
          <Route path="/manager-dashboard" element={<Managerdashboard />} />
          <Route path="/employee" element={<EmployeeTable />} />
          <Route path="/leave-manager" element={<LeaveTablema />} />
          <Route path="/leave-employee" element={<LeaveTableem />} />
          <Route path="/leave-admin" element={<LeaveTablead />} />
          <Route path="/leave" element={<LeaveTable />} />
          <Route path="/announcement" element={<Announce />} />
          <Route path="/announcement-employee" element={<Announceem />} />
          <Route path="/announcement-manager" element={<Announcema />} />
          <Route path="/document" element={<Doc />} />
          <Route path="/document-manager" element={<Docma />} />
          <Route path="/file" element={<File />} />
          <Route path="/file-employee" element={<Fileem />} />
          <Route path="/file-manager" element={<Filema />} />
          <Route path="/settings" element={<Set />} />
          <Route path="/settings-employee" element={<Setem />} />
          <Route path="/settings-manager" element={<Setma />} />
          <Route path="/organisation" element={<Organisation />} />
          <Route path="/organisation-employee" element={<Organisationem />} />
          <Route path="/organisation-manager" element={<Organisationma />} />
          <Route path="/review-admin" element={<Reviewad />} />
          <Route path="/review-manager" element={<Reviewma />} />
          <Route path="/mark-attendance" element={<Attendancepage />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;