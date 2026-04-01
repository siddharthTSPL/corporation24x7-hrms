import { BrowserRouter, Routes, Route } from "react-router-dom";

import LandingPage from "./pages/auth/LandingPage";
import Login from "./pages/auth/Login";
import Dashboard from "./pages/dashboard/Dashboard";
import MainLayout from "./layout/MainLayout";
import Register from "./pages/auth/signup";
import ProtectedRoute from "./components/Protectedroute";

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />

        <Route
          element={
            <ProtectedRoute>
              <MainLayout />
            </ProtectedRoute>
          }
        >
          <Route path="/dashboard" element={<Dashboard />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;