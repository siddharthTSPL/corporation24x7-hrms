import { BrowserRouter, Routes, Route } from "react-router-dom";
import LandingPage from "./pages/auth/LandingPage";
import Login from "./pages/auth/Login";
import Signup from "./pages/auth/Signup";
import MainLayout from "./layout/MainLayout";
import ProtectedRoute from "./components/Protectedroute";
import Dashboard from "./pages/dashboard/Dashboard";
import Dashboardem from "./pages/dashboard/Dashboardem";
import Dashboardma from "./pages/dashboard/Dashboardma";
import EmployeeTable from "./pages/employee/EmployeeTable";
import LeaveTable from "./pages/leave/LeaveTable";
import Announce from "./pages/announcement/Announce";
import Doc from "./pages/document/Doc";
import Set from "./pages/settings/Set";
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

        {/* Admin only */}
        <Route
          element={
            <ProtectedRoute allowedRoles={["admin"]}>
              <MainLayout />
            </ProtectedRoute>
          }
        >
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/employee" element={<EmployeeTable />} />
          <Route path="/leave" element={<LeaveTable />} />
          <Route path="/announcement" element={<Announce />} />
          <Route path="/document" element={<Doc />} />
          <Route path="/file" element={<File />} />
          <Route path="/settings" element={<Set />} />
          <Route path="/organisation" element={<Organisation />} />
        </Route>

        {/* Manager only */}
        <Route
          element={
            <ProtectedRoute allowedRoles={["manager"]}>
              <MainLayout />
            </ProtectedRoute>
          }
        >
          <Route path="/manager-dashboard" element={<Dashboardma />} />
        </Route>

        {/* Employee only */}
        <Route
          element={
            <ProtectedRoute allowedRoles={["employee"]}>
              <MainLayout />
            </ProtectedRoute>
          }
        >
          <Route path="/employee-dashboard" element={<Dashboardem />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;