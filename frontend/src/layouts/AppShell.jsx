import { Outlet, useLocation } from "react-router-dom";
import { useAuth } from "../auth/useAuth.js";
import LoadingBar from "../loading/LoadingBar.jsx";
import TopBar from "./TopBar.jsx";

function describe(user) {
  const name = user.email.split("@")[0].replace(/[._]/g, " ");
  const initials = name
    .split(" ")
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
  return {
    name,
    email: user.email,
    initials,
    role: user.role === "admin" ? "Admin" : "Lecturer",
  };
}

export default function AppShell() {
  const { pathname } = useLocation();
  const isHome = pathname === "/";
  const { user, signOut, authEnabled } = useAuth();
  // No loading on page change. The loading screen only shows while the app is
  // really waiting for the backend (every api.js call is counted automatically).

  return (
    <div className="flex h-full flex-col bg-canvas">
      <LoadingBar />
      <TopBar
        variant={isHome ? "home" : "workspace"}
        user={describe(user)}
        onSignOut={authEnabled ? signOut : undefined}
      />
      <div className="flex min-h-0 flex-1 flex-col">
        <Outlet />
      </div>
    </div>
  );
}
