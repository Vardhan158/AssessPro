import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";
import { useAuth } from "./hooks/useAuth";
import Login from "./pages/Login";
import ActivateAccount from "./pages/ActivateAccount";
import ForgotPassword from "./pages/ForgotPassword";
import ResetPassword from "./pages/ResetPassword";
import StudentDashboard from "./pages/student/StudentDashboard";
import Instructions from "./pages/student/Instructions";
import ExamEngine from "./pages/student/ExamEngine";
import Results from "./pages/student/Results";
import SubmissionConfirmation from "./pages/student/SubmissionConfirmation";
import StudentProfile from "./pages/student/StudentProfile";
import AdminDashboard from "./pages/admin/AdminDashboard";
import SuperAdminDashboard from "./pages/admin/SuperAdminDashboard";
import AssessmentDetails from "./pages/admin/AssessmentDetails";
import "./App.css";

function ProtectedRoute({ children, allowedRoles }) {
  const { user, loading } = useAuth();

  if (loading)
    return <div className="loading-screen">Authenticating Session...</div>;
  if (!user) return <Navigate to="/login" replace />;
  if (allowedRoles && !allowedRoles.includes(user.role)) {
    return <Navigate to="/login" replace />;
  }

  return children;
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/activate" element={<ActivateAccount />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/reset-password" element={<ResetPassword />} />

          {/* Student Candidate Routes */}
          <Route
            path="/student/dashboard"
            element={
              <ProtectedRoute allowedRoles={["STUDENT"]}>
                <StudentDashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/student/profile"
            element={
              <ProtectedRoute allowedRoles={["STUDENT"]}>
                <StudentProfile />
              </ProtectedRoute>
            }
          />
          <Route
            path="/student/instructions/:assessmentId"
            element={
              <ProtectedRoute allowedRoles={["STUDENT"]}>
                <Instructions />
              </ProtectedRoute>
            }
          />
          <Route
            path="/student/exam/:attemptId"
            element={
              <ProtectedRoute allowedRoles={["STUDENT"]}>
                <ExamEngine />
              </ProtectedRoute>
            }
          />
          <Route
            path="/student/submission/:attemptId"
            element={
              <ProtectedRoute allowedRoles={["STUDENT"]}>
                <SubmissionConfirmation />
              </ProtectedRoute>
            }
          />
          <Route
            path="/student/results/:assessmentId"
            element={
              <ProtectedRoute allowedRoles={["STUDENT"]}>
                <Results />
              </ProtectedRoute>
            }
          />

          {/* Admin Routes */}
          <Route
            path="/admin/dashboard"
            element={
              <ProtectedRoute allowedRoles={["ADMIN", "SUPER_ADMIN"]}>
                <AdminDashboard />
              </ProtectedRoute>
            }
          />
          <Route path="/admin/reports" element={<ProtectedRoute allowedRoles={["ADMIN", "SUPER_ADMIN"]}><AdminDashboard /></ProtectedRoute>} />
          <Route path="/admin/students" element={<ProtectedRoute allowedRoles={["ADMIN", "SUPER_ADMIN"]}><AdminDashboard /></ProtectedRoute>} />
          <Route path="/admin/questions" element={<ProtectedRoute allowedRoles={["ADMIN", "SUPER_ADMIN"]}><AdminDashboard /></ProtectedRoute>} />
          <Route path="/admin/assessments" element={<ProtectedRoute allowedRoles={["ADMIN", "SUPER_ADMIN"]}><AdminDashboard /></ProtectedRoute>} />
          <Route path="/admin/schedule" element={<ProtectedRoute allowedRoles={["ADMIN", "SUPER_ADMIN"]}><AdminDashboard /></ProtectedRoute>} />
          <Route path="/admin/monitoring" element={<ProtectedRoute allowedRoles={["ADMIN", "SUPER_ADMIN"]}><AdminDashboard /></ProtectedRoute>} />
          <Route path="/admin/incidents" element={<ProtectedRoute allowedRoles={["ADMIN", "SUPER_ADMIN"]}><AdminDashboard /></ProtectedRoute>} />
          <Route path="/admin/results" element={<ProtectedRoute allowedRoles={["ADMIN", "SUPER_ADMIN"]}><AdminDashboard /></ProtectedRoute>} />
          <Route path="/admin/assessments/:assessmentId" element={<ProtectedRoute allowedRoles={["ADMIN", "SUPER_ADMIN"]}><AssessmentDetails /></ProtectedRoute>} />
          <Route
            path="/super-admin/dashboard"
            element={
              <ProtectedRoute allowedRoles={["SUPER_ADMIN"]}>
                <SuperAdminDashboard />
              </ProtectedRoute>
            }
          />

          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
