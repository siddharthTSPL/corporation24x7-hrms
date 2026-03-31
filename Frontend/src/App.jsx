import { BrowserRouter, Routes, Route } from "react-router-dom";

// Auth Pages
import LandingPage from "./pages/auth/LandingPage";
import Login from "./pages/auth/Login";

// Layout
import MainLayout from "./layout/MainLayout";

// Dashboard Pages
import Dashboard from "./pages/dashboard/Dashboard";
import EmployeeTable from "./pages/employee/EmployeeTable";
import LeaveTable from "./pages/leave/LeaveTable";
import Announce from "./pages/announcement/Announce";
import Doc from "./pages/document/Doc";
import Set from "./pages/settings/Set";
import File from "./pages/file/File";

function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Public Routes */}
        <Route path="/" element={<LandingPage />} />
        <Route path="/login" element={<Login />} />

        {/* Protected / Layout Routes */}
        <Route element={<MainLayout />}>
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/employee" element={<EmployeeTable />} />
          <Route path="/leave" element={<LeaveTable />} />
          <Route path="/announcement" element={<Announce />} />
          <Route path="/document" element={<Doc />} />
          <Route path="/settings" element={<Set />} />
          <Route path="/file" element={<File />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;