import { Navigate, Route, Routes, useLocation } from "react-router-dom";
import { useAuth } from "./auth/useAuth.js";
import AppShell from "./layouts/AppShell.jsx";
import GroupViewPage from "./pages/GroupView/GroupViewPage.jsx";
import HolidaysPage from "./pages/Holidays/HolidaysPage.jsx";
import HomePage from "./pages/Home/HomePage.jsx";
import ImportDataPage from "./pages/ImportData/ImportDataPage.jsx";
import LoginPage from "./pages/Login/LoginPage.jsx";
import ManagePeoplePage from "./pages/ManagePeople/ManagePeoplePage.jsx";
import StudentViewPage from "./pages/StudentView/StudentViewPage.jsx";

// Everything except /login needs a signed-in user
function RequireAuth() {
  const { status } = useAuth();
  const location = useLocation();
  if (status === "loading")
    return <div className="p-8 text-ink-3">Loading…</div>;
  if (status === "signedOut")
    return <Navigate to="/login" replace state={{ from: location }} />;
  return <AppShell />;
}

export default function App() {
  return (
    <Routes>
      <Route path="login" element={<LoginPage />} />
      <Route element={<RequireAuth />}>
        {/* 将根路径直接重定向到 group-view */}
        <Route index element={<HomePage />} />
        <Route path="group" element={<Navigate to="/group-view" replace />} />
        <Route path="group-view" element={<GroupViewPage />} />
        <Route path="students" element={<StudentViewPage />} />
        <Route path="people" element={<ManagePeoplePage />} />
        <Route path="import" element={<ImportDataPage />} />
        <Route path="holidays" element={<HolidaysPage />} />
        <Route
          path="*"
          element={<div className="p-8 text-ink-3">Page not found</div>}
        />
      </Route>
    </Routes>
  );
}
