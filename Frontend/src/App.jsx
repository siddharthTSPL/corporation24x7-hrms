import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { lazy, Suspense } from "react";
import { useAuth } from "./auth/store/getmeauth/getmeauth";

const Login = lazy(() => import("./pages/auth/Login"));
const Signup = lazy(() => import("./pages/auth/Signup"));
const LandingPage = lazy(() => import("./pages/auth/LandingPage"));

const MainLayout = lazy(() => import("./layout/MainLayout"));
const ProtectedRoute = lazy(() => import("./components/Protectedroute"));

const Dashboard = lazy(() => import("./pages/dashboard/Dashboard"));
const EmployeeDashboard = lazy(
  () => import("./pages/dashboard/EmployeeDashboard"),
);
const Managerdashboard = lazy(() => import("./pages/dashboard/Dashboardma"));

const EmployeeTable = lazy(() => import("./pages/employee/EmployeeTable"));

const LeaveTable = lazy(() => import("./pages/leave/LeaveTable"));
const LeaveTableem = lazy(() => import("./pages/leave/LeaveTableem"));
const LeaveTablema = lazy(() => import("./pages/leave/LeaveTablema"));
const LeaveTablead = lazy(() => import("./pages/leave/LeaveTablead"));

const Announce = lazy(
  () => import("./pages/announcement/admin/AnnouncementPage"),
);
const Announceem = lazy(
  () => import("./pages/announcement/employee/Announceem"),
);
const Announcema = lazy(
  () => import("./pages/announcement/manager/Announcema"),
);

const Doc = lazy(() => import("./pages/document/Doc"));
const Docma = lazy(() => import("./pages/document/Docma"));

const Set = lazy(() => import("./pages/settings/Set"));
const Setem = lazy(() => import("./pages/settings/Setem"));
const Setma = lazy(() => import("./pages/settings/Setma"));

const File = lazy(() => import("./pages/file/File"));
const Fileem = lazy(() => import("./pages/file/Fileem"));
const Filema = lazy(() => import("./pages/file/Filema"));

const Organisation = lazy(() => import("./pages/organisation/Organisation"));
const Organisationem = lazy(
  () => import("./pages/organisation/organisationem"),
);
const Organisationma = lazy(
  () => import("./pages/organisation/organisationma"),
);

const Reviewad = lazy(() => import("./pages/review/reviewad"));
const Reviewma = lazy(() => import("./pages/review/reviewma"));

const Attendancepage = lazy(() => import("./pages/attendance/attendancepage"));

const SuperAdminDashboard = lazy(() => import("./pages/dashboard/sudashboard"));

const SuperAdminOrganisations = lazy(
  () => import("./pages/organisation/suorganization"),
);

const SuperAdminAnnouncements = lazy(
  () => import("./pages/announcement/suannounce"),
);

const SuperAdminLeaves = lazy(() => import("./pages/leave/suleave"));

const SuperAdminReviews = lazy(() => import("./pages/review/sureview"));

const SuperAdminSettings = lazy(() => import("./pages/settings/susetting"));

const SuperAdminDocuments = lazy(() => import("./pages/document/sudocument"));

function PageSkeleton() {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        minHeight: "100vh",
        background: "#f9fafb",
      }}
    >
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: 12,
        }}
      >
        <div
          style={{
            width: 36,
            height: 36,
            border: "3px solid #e5e7eb",
            borderTop: "3px solid #6366f1",
            borderRadius: "50%",
            animation: "spin 0.7s linear infinite",
          }}
        />

        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>

        <span
          style={{
            fontSize: 13,
            color: "#9ca3af",
            letterSpacing: "0.05em",
          }}
        >
          Loading…
        </span>
      </div>
    </div>
  );
}

function RoleBasedRedirect() {
  const { data: auth, isLoading } = useAuth();

  if (isLoading) return <PageSkeleton />;

  if (!auth) return <Navigate to="/login" replace />;

  if (auth.role === "superadmin") {
    return <Navigate to="/superadmin-dashboard" replace />;
  }

  if (auth.role === "admin") {
    return <Navigate to="/dashboard" replace />;
  }

  if (auth.role === "manager") {
    return <Navigate to="/manager-dashboard" replace />;
  }

  return <Navigate to="/employee-dashboard" replace />;
}

function App() {
  return (
    <BrowserRouter>
      <Suspense fallback={<PageSkeleton />}>
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
                  <h2 className="text-2xl font-bold text-gray-800 mb-2">
                    Access Denied
                  </h2>

                  <p className="text-gray-500">
                    You don't have permission to view this page.
                  </p>
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

          <Route
            element={
              <ProtectedRoute allowedRoles={["superadmin"]}>
                <MainLayout />
              </ProtectedRoute>
            }
          >
            <Route
              path="/superadmin-dashboard"
              element={<SuperAdminDashboard />}
            />

            <Route
              path="/superadmin-organisations"
              element={<SuperAdminOrganisations />}
            />

            <Route
              path="/superadmin-announcements"
              element={<SuperAdminAnnouncements />}
            />

            <Route path="/superadmin-leaves" element={<SuperAdminLeaves />} />

            <Route path="/superadmin-reviews" element={<SuperAdminReviews />} />

            <Route
              path="/superadmin-settings"
              element={<SuperAdminSettings />}
            />

            <Route
              path="/superadmin-documents"
              element={<SuperAdminDocuments />}
            />
          </Route>
        </Routes>
      </Suspense>
    </BrowserRouter>
  );
}

export default App;
