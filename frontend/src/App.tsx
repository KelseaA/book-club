import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { useAuth } from "./hooks/useAuth";
import Layout from "./components/Layout";
import LoginPage from "./pages/LoginPage";
import RegisterPage from "./pages/RegisterPage";
import DashboardPage from "./pages/DashboardPage";
import ArchiveListPage from "./pages/ArchiveListPage";
import ArchiveDetailPage from "./pages/ArchiveDetailPage";
import ProfilePage from "./pages/ProfilePage";
import HelpPage from "./pages/HelpPage";
import MembersPage from "./pages/MembersPage";
import ForgotPasswordPage from "./pages/ForgotPasswordPage";
import ResetPasswordPage from "./pages/ResetPasswordPage";

function RequireAuth({ children }: { children: React.ReactNode }) {
  const { member, isLoading } = useAuth();
  if (isLoading)
    return (
      <div className="flex items-center justify-center h-screen text-gray-500">
        Loading…
      </div>
    );
  if (!member) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        {/* Registration is invite-only: the join link carries the token */}
        <Route path="/join/:token" element={<RegisterPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/forgot-password" element={<ForgotPasswordPage />} />
        <Route path="/reset-password" element={<ResetPasswordPage />} />
        <Route
          path="/"
          element={
            <RequireAuth>
              <Layout />
            </RequireAuth>
          }
        >
          <Route index element={<Navigate to="/dashboard" replace />} />
          <Route path="dashboard" element={<DashboardPage />} />
          <Route path="archive" element={<ArchiveListPage />} />
          <Route path="members" element={<MembersPage />} />
          <Route path="archive/:meetingId" element={<ArchiveDetailPage />} />
          <Route path="profile" element={<ProfilePage />} />
          <Route path="help" element={<HelpPage />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
