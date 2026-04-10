import { BrowserRouter, Routes, Route } from "react-router-dom";
import LandingPage from "./pages/auth/LandingPage";
import Login from "./pages/auth/Login";
import Signup from "./pages/auth/Signup";
import MainLayout from "./layout/MainLayout";
import ProtectedRoute from "./components/Protectedroute";
import Dashboard from "./pages/dashboard/Dashboard";
import EmployeeDashboard from "./pages/dashboard/EmployeeDashboard";
import EmployeeTable from "./pages/employee/EmployeeTable";
import LeaveTable from "./pages/leave/LeaveTable";
import LeaveTableem from "./pages/leave/LeaveTableem";
import Announce from "./pages/announcement/Announce";
import Doc from "./pages/document/Doc";
import Set from "./pages/settings/Set";
import Setem from "./pages/settings/Setem";
import File from "./pages/file/File";
import Organisation from "./pages/organisation/Organisation";

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<Signup />} />
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
          <Route path="/employee" element={<EmployeeTable />} />
          <Route path="/leave-employee" element={<LeaveTableem />} />
          <Route path="/leave" element={<LeaveTable />} />
          <Route path="/announcement" element={<Announce />} />
          <Route path="/document" element={<Doc />} />
          <Route path="/file" element={<File />} />
          <Route path="/settings" element={<Set />} />
          <Route path="/settings-employee" element={<Setem />} />
          <Route path="/organisation" element={<Organisation />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;