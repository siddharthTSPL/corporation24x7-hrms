import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { lazy, Suspense, useState, useEffect } from "react";
import { Player } from "@lottiefiles/react-lottie-player";
import { useAuth } from "./auth/store/getmeauth/getmeauth";
import LandingPage from "./pages/announcement/landingpage";

const Login = lazy(() => import("./pages/auth/Login"));
const Signup = lazy(() => import("./pages/auth/Signup"));

const FaceKiosk = lazy(() => import("./pages/attendance/FaceKiosk"));
const FaceEnrollment = lazy(() => import("./pages/attendance/FaceEnrollment"));

const MainLayout = lazy(() => import("./layout/MainLayout"));
const ProtectedRoute = lazy(() => import("./components/Protectedroute"));

const Dashboard = lazy(() => import("./pages/dashboard/Dashboard"));
const EmployeeDashboard = lazy(() => import("./pages/dashboard/EmployeeDashboard"));
const Managerdashboard = lazy(() => import("./pages/dashboard/Dashboardma"));

const EmployeeTable = lazy(() => import("./pages/employee/EmployeeTable"));

const LeaveTable = lazy(() => import("./pages/leave/LeaveTable"));
const LeaveTableem = lazy(() => import("./pages/leave/LeaveTableem"));
const LeaveTablema = lazy(() => import("./pages/leave/LeaveTablema"));
const LeaveTablead = lazy(() => import("./pages/leave/LeaveTablead"));

const Announce = lazy(() => import("./pages/announcement/admin/AnnouncementPage"));
const Announceem = lazy(() => import("./pages/announcement/employee/Announceem"));
const Announcema = lazy(() => import("./pages/announcement/manager/Announcema"));

const Doc = lazy(() => import("./pages/document/Doc"));
const Docma = lazy(() => import("./pages/document/Docma"));

const Set = lazy(() => import("./pages/settings/Set"));
const Setem = lazy(() => import("./pages/settings/Setem"));
const Setma = lazy(() => import("./pages/settings/Setma"));

const File = lazy(() => import("./pages/file/File"));
const Fileem = lazy(() => import("./pages/file/Fileem"));
const Filema = lazy(() => import("./pages/file/Filema"));

const Organisation = lazy(() => import("./pages/organisation/Organisation"));
const Organisationem = lazy(() => import("./pages/organisation/organisationem"));
const Organisationma = lazy(() => import("./pages/organisation/organisationma"));

const Reviewad = lazy(() => import("./pages/review/reviewad"));
const Reviewma = lazy(() => import("./pages/review/reviewma"));

const Attendancepage = lazy(() => import("./pages/attendance/attendancepage"));

const SuperAdminDashboard = lazy(() => import("./pages/dashboard/sudashboard"));
const SuperAdminOrganisations = lazy(() => import("./pages/organisation/suorganization"));
const SuperAdminAnnouncements = lazy(() => import("./pages/announcement/suannounce"));
const SuperAdminLeaves = lazy(() => import("./pages/leave/suleave"));
const SuperAdminReviews = lazy(() => import("./pages/review/sureview"));
const SuperAdminSettings = lazy(() => import("./pages/settings/susetting"));
const SuperAdminDocuments = lazy(() => import("./pages/document/sudocument"));
const SuperAdminComplaints = lazy(() => import("./pages/ticketpage/suticket"));
const AdminComplaints = lazy(() => import("./pages/ticketpage/adticket"));
const EmployeeComplaints = lazy(() => import("./pages/ticketpage/emticket"));
const ManagerComplaints = lazy(() => import("./pages/ticketpage/maticket"));
const Managerrecruitment = lazy(() => import("./pages/recruitment/recruitmentma"));
const Adminrecruitment = lazy(() => import("./pages/recruitment/recruitmentad"));
const Managerdocument = lazy(() => import("./pages/document/managerdocument"));
const Admindocument = lazy(() => import("./pages/document/admindocument"));
const Adminteamdocument = lazy(() => import("./pages/document/adminteamdocument"));
const Adminrimesheet = lazy(() => import("./pages/timesheet/adtimesheet"));
const Managertimesheet = lazy(() => import("./pages/timesheet/matimesheet"));
const Employeetimesheet = lazy(() => import("./pages/timesheet/emtimesheet"));
const SuperAdmintimesheet = lazy(() => import("./pages/timesheet/sutimesheet"));
const Pagenotfound = lazy(() => import("./pages/pagenotfound/pagenotfound"));
const Adminasset = lazy(() => import("./pages/asset/adminasset"));
const Superadminasset = lazy(() => import("./pages/asset/superadminasset"));

// NOTE: renamed to PascalCase — lowercase-first identifiers are
// interpreted by JSX as native DOM tags (e.g. <adminmanagement />
// would render as an unrecognized custom element, not your component).
const AdminManagement = lazy(() => import("./pages/torchx-management/adminmanagement"));
const SuperAdminManagement = lazy(() => import("./pages/torchx-management/superadminmanagement"));

function PageSkeleton() {
  const [animationData, setAnimationData] = useState(null);

  useEffect(() => {
    fetch("/talent/loader.json")
      .then((r) => r.json())
      .then(setAnimationData)
      .catch(() => setAnimationData(null));
  }, []);

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0, 0, 0, 0.50)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 9999,
      }}
    >
      {animationData ? (
        <Player
          autoplay
          loop
          src={animationData}
          style={{ height: "140px", width: "140px" }}
        />
      ) : (
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: 12,
          }}
        >
          <style>{`@keyframes _spin { to { transform: rotate(360deg); } }`}</style>
          <div
            style={{
              width: 40,
              height: 40,
              border: "3px solid rgba(255,255,255,.2)",
              borderTop: "3px solid #CD166E",
              borderRadius: "50%",
              animation: "_spin 0.7s linear infinite",
            }}
          />
          <span
            style={{
              fontSize: 13,
              color: "rgba(255,255,255,.7)",
              fontFamily: "sans-serif",
              letterSpacing: "0.05em",
            }}
          >
            Loading…
          </span>
        </div>
      )}
    </div>
  );
}

function RoleBasedRedirect() {
  const { data: auth, isLoading } = useAuth();

  if (isLoading) return <PageSkeleton />;
  if (!auth) return <Navigate to="/login" replace />;
  if (auth.role === "superadmin") return <Navigate to="/superadmin-dashboard" replace />;
  if (auth.role === "admin") return <Navigate to="/dashboard" replace />;
  if (auth.role === "manager") return <Navigate to="/manager-dashboard" replace />;
  return <Navigate to="/employee-dashboard" replace />;
}

function App() {
  return (
    <BrowserRouter basename="/talent">
      <Suspense fallback={<PageSkeleton />}>
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<Signup />} />
          <Route path="/redirect" element={<RoleBasedRedirect />} />

          {/* Public — this is a shared kiosk device, not a logged-in person.
              It authenticates itself with its own long-lived kiosk token,
              so it deliberately lives outside ProtectedRoute. */}
          <Route path="/live-attendance" element={<FaceKiosk />} />

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
            <Route path="/dashboard"                element={<Dashboard />} />
            <Route path="/employee-dashboard"       element={<EmployeeDashboard />} />
            <Route path="/manager-dashboard"        element={<Managerdashboard />} />
            <Route path="/employee"                 element={<EmployeeTable />} />
            <Route path="/leave-manager"            element={<LeaveTablema />} />
            <Route path="/leave-employee"           element={<LeaveTableem />} />
            <Route path="/leave-admin"              element={<LeaveTablead />} />
            <Route path="/leave"                    element={<LeaveTable />} />
            <Route path="/file"                     element={<File />} />
            <Route path="/file-employee"            element={<Fileem />} />
            <Route path="/file-manager"             element={<Filema />} />
            <Route path="/settings"                 element={<Set />} />
            <Route path="/settings-employee"        element={<Setem />} />
            <Route path="/settings-manager"         element={<Setma />} />
            <Route path="/organisation"             element={<Organisation />} />
            <Route path="/organisation-employee"    element={<Organisationem />} />
            <Route path="/organisation-manager"     element={<Organisationma />} />
            <Route path="/review-admin"             element={<Reviewad />} />
            <Route path="/review-manager"           element={<Reviewma />} />
            <Route path="/mark-attendance"          element={<Attendancepage />} />
            <Route path="/admin-timesheet"          element={<Adminrimesheet />} />
            <Route path="/manager-timesheet"        element={<Managertimesheet />} />
            <Route path="/employee-timesheet"       element={<Employeetimesheet />} />
            <Route path="/admin-asset-management"   element={<Adminasset />} />

            {/* Restricted to admins only — enrolling faces is a sensitive
                per-employee action, same pattern as /admin-management */}
            <Route
              path="/face-enrollment"
              element={
                <ProtectedRoute allowedRoles={["admin"]}>
                  <FaceEnrollment />
                </ProtectedRoute>
              }
            />

            {/* Restricted via ProtectedRoute so managers/employees can't hit it
                directly even though they share this layout block */}
            <Route
              path="/admin-management"
              element={
                <ProtectedRoute allowedRoles={["admin"]}>
                  <AdminManagement />
                </ProtectedRoute>
              }
            />

            <Route
              path="/announcement"
              element={
                <ProtectedRoute permission="announcements.can_view_announcements">
                  <Announce />
                </ProtectedRoute>
              }
            />
            <Route
              path="/announcement-employee"
              element={
                <ProtectedRoute permission="announcements.can_view_announcements">
                  <Announceem />
                </ProtectedRoute>
              }
            />
            <Route
              path="/announcement-manager"
              element={
                <ProtectedRoute permission="announcements.can_view_announcements">
                  <Announcema />
                </ProtectedRoute>
              }
            />

            <Route
              path="/document"
              element={
                <ProtectedRoute permission="documents.can_view_all_documents">
                  <Doc />
                </ProtectedRoute>
              }
            />
            <Route
              path="/document-manager"
              element={
                <ProtectedRoute
                  permissionGroup={[
                    "documents.can_view_all_documents",
                    "documents.can_upload_documents",
                  ]}
                >
                  <Managerdocument />
                </ProtectedRoute>
              }
            />
            <Route
              path="/document-admin"
              element={
                <ProtectedRoute permission="documents.can_upload_documents">
                  <Admindocument />
                </ProtectedRoute>
              }
            />
            <Route
              path="/document-admin-team"
              element={
                <ProtectedRoute permission="documents.can_view_all_documents">
                  <Adminteamdocument />
                </ProtectedRoute>
              }
            />

            <Route
              path="/admin-complaints"
              element={
                <ProtectedRoute permission="tickets.can_raise_ticket">
                  <AdminComplaints />
                </ProtectedRoute>
              }
            />
            <Route
              path="/manager-complaints"
              element={
                <ProtectedRoute permission="tickets.can_raise_ticket">
                  <ManagerComplaints />
                </ProtectedRoute>
              }
            />
            <Route
              path="/employee-complaints"
              element={
                <ProtectedRoute permission="tickets.can_raise_ticket">
                  <EmployeeComplaints />
                </ProtectedRoute>
              }
            />

            <Route
              path="/recruitment-admin"
              element={
                <ProtectedRoute
                  permissionGroup={[
                    "recruitment.can_view_hiring_requisitions",
                    "recruitment.can_create_hiring_requisition",
                    "recruitment.can_view_candidates",
                    "recruitment.can_add_candidate",
                  ]}
                >
                  <Adminrecruitment />
                </ProtectedRoute>
              }
            />
            <Route
              path="/recruitment-manager"
              element={
                <ProtectedRoute
                  permissionGroup={[
                    "recruitment.can_view_hiring_requisitions",
                    "recruitment.can_create_hiring_requisition",
                    "recruitment.can_view_candidates",
                    "recruitment.can_add_candidate",
                  ]}
                >
                  <Managerrecruitment />
                </ProtectedRoute>
              }
            />
            <Route
              path="/manager/recruitment"
              element={
                <ProtectedRoute
                  permissionGroup={[
                    "recruitment.can_view_hiring_requisitions",
                    "recruitment.can_create_hiring_requisition",
                    "recruitment.can_view_candidates",
                    "recruitment.can_add_candidate",
                  ]}
                >
                  <Managerrecruitment />
                </ProtectedRoute>
              }
            />
          </Route>

          <Route
            element={
              <ProtectedRoute allowedRoles={["superadmin"]}>
                <MainLayout />
              </ProtectedRoute>
            }
          >
            <Route path="/superadmin-dashboard"          element={<SuperAdminDashboard />} />
            <Route path="/superadmin-organisations"      element={<SuperAdminOrganisations />} />
            <Route path="/superadmin-announcements"      element={<SuperAdminAnnouncements />} />
            <Route path="/superadmin-leaves"              element={<SuperAdminLeaves />} />
            <Route path="/superadmin-reviews"             element={<SuperAdminReviews />} />
            <Route path="/superadmin-settings"            element={<SuperAdminSettings />} />
            <Route path="/superadmin-documents"           element={<SuperAdminDocuments />} />
            <Route path="/superadmin-complaints"          element={<SuperAdminComplaints />} />
            <Route path="/superadmin-timesheet"           element={<SuperAdmintimesheet />} />
            <Route path="/superadmin-asset-management"    element={<Superadminasset />} />
            <Route path="/superadmin-management"          element={<SuperAdminManagement />} />
          </Route>

          <Route path="*" element={<Pagenotfound />} />
        </Routes>
      </Suspense>
    </BrowserRouter>
  );
}

export default App;