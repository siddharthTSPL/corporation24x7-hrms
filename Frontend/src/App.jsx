import { BrowserRouter, Routes, Route } from "react-router-dom";
import LandingPage from "./pages/auth/LandingPage";
import Dashboard from "./pages/dashboard/Dashboard";
import EmployeeTable from "./pages/employee/EmployeeTable";
import LeaveTable from "./pages/leave/LeaveTable";
import Announce from "./pages/announcement/Announce";
import Doc from "./pages/document/Doc";
import Set from "./pages/settings/Set";
import File from "./pages/file/File";
import Login from "./pages/auth/Login";
import MainLayout from "./layout/MainLayout";


function App() {

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<LandingPage />} />
 <Route path="/login" element={<Login/>} />

        <Route element={<MainLayout />}>
          <Route path="/dashboard" element={<Dashboard />} />
         <Route path="/employee" element={<EmployeeTable />} />
         <Route path="/leave" element={<LeaveTable />} />
         <Route path="/announcement" element={<Announce/>} />
          <Route path="/document" element={<Doc/>} />
          <Route path="/settings" element={<Set/>} />


          
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;