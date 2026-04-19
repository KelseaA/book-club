import { Outlet, NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";

export default function Layout() {
  const { member, logout } = useAuth();
  const navigate = useNavigate();

  function handleLogout() {
    logout(undefined, { onSuccess: () => navigate("/login") });
  }

  return (
    <div className="min-h-screen flex flex-col">
      <header className="bg-brand-600 text-white shadow-md">
        <div className="max-w-5xl mx-auto px-4 h-14 flex items-center justify-between">
          <NavLink to="/dashboard" className="font-bold text-lg tracking-tight">
            Book Club
          </NavLink>
          <nav className="flex items-center gap-5 text-sm font-medium">
            <NavLink
              to="/dashboard"
              className={({ isActive }) =>
                isActive ? "underline underline-offset-4" : "hover:underline"
              }
            >
              This Month
            </NavLink>
            <NavLink
              to="/archive"
              className={({ isActive }) =>
                isActive ? "underline underline-offset-4" : "hover:underline"
              }
            >
              Archive
            </NavLink>
            <NavLink
              to="/help"
              className={({ isActive }) =>
                isActive ? "underline underline-offset-4" : "hover:underline"
              }
            >
              Help
            </NavLink>
            <NavLink
              to="/profile"
              className={({ isActive }) =>
                isActive ? "underline underline-offset-4" : "hover:underline"
              }
            >
              {member?.name ?? "Profile"}
            </NavLink>
            <button
              onClick={handleLogout}
              className="hover:underline opacity-80"
            >
              Log out
            </button>
          </nav>
        </div>
      </header>
      <main className="flex-1 max-w-5xl w-full mx-auto px-4 py-8">
        <Outlet />
      </main>
    </div>
  );
}
