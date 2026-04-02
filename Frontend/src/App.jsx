import { BrowserRouter, Routes, Route } from "react-router-dom";

// Auth Pages
import LandingPage from "./pages/auth/LandingPage";
import Login from "./pages/auth/Login";
import Signup from "./pages/auth/Signup";
import MainLayout from "./layout/MainLayout";

import ProtectedRoute from "./components/Protectedroute";
import Dashboard from "./pages/dashboard/Dashboard";
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
          element={
            <ProtectedRoute>
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
      </Routes>
    </BrowserRouter>
  );
}

export default App;