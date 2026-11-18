// Lecturer 的外框：自己的顶栏 + 页面。不使用 AppShell / TopBar / nav.js。
import { useMemo } from "react";
import { NavLink, Outlet } from "react-router-dom";
import { useAuth } from "../auth/useAuth.js";
import Logo from "../components/Logo.jsx";
import { LecturerContext } from "./LecturerContext.js";
import { PREVIEW_EMAIL, makeLecturerApi } from "./lecturerApi.js";

const prettyName = (email) =>
  email.split("@")[0].replace(/[._]/g, " ");
const initialsOf = (name) =>
  name
    .split(" ")
    .filter(Boolean)
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

export default function LecturerShell({ preview = false }) {
  const { user, signOut, authEnabled } = useAuth();
  const base = preview ? "/preview" : "";
  const email = preview ? PREVIEW_EMAIL : (user?.email ?? "");
  const name = prettyName(email);

  const ctx = useMemo(
    () => ({ api: makeLecturerApi(preview), preview, email }),
    [preview, email],
  );

  const links = [
    { to: `${base}/my-timetable`, label: "My timetable" },
    { to: `${base}/my-profile`, label: "My profile" },
  ];

  return (
    <LecturerContext.Provider value={ctx}>
      <div className="flex h-full flex-col bg-canvas">
        <header className="flex h-14 shrink-0 items-center gap-6 border-b border-line bg-white px-5 shadow-xs">
          <div className="flex items-center [&>div]:h-[50px] [&>div]:w-[200px] [&_img]:max-h-[44px]">
            <Logo bordered={false} />
          </div>
          <nav className="flex items-center gap-6" aria-label="Sections">
            {links.map((l) => (
              <NavLink
                key={l.to}
                to={l.to}
                className={({ isActive }) =>
                  `flex h-14 items-center border-b-2 px-1 text-[13px] font-medium transition-colors ${
                    isActive
                      ? "border-navy-700 font-semibold text-navy-700"
                      : "border-transparent text-ink-3 hover:text-ink"
                  }`
                }>
                {l.label}
              </NavLink>
            ))}
          </nav>

          <div className="ml-auto flex items-center gap-3">
            {preview && (
              <span className="rounded-full bg-[#FDF2DF] px-2 py-0.5 text-[11px] font-medium text-[#8A6212]">
                Preview (sample data)
              </span>
            )}
            <div className="hidden text-right capitalize sm:block">
              <div className="text-xs font-semibold text-ink">{name}</div>
              <div className="text-[11px] normal-case text-ink-4">Lecturer</div>
            </div>
            <span className="flex size-8 items-center justify-center rounded-full bg-navy-700 text-[11px] font-bold text-white shadow-xs">
              {initialsOf(name)}
            </span>
            {preview ? (
              <NavLink to="/" className="rounded px-2 py-1 text-xs text-ink-3 hover:bg-panel hover:text-ink">
                Exit preview
              </NavLink>
            ) : (
              authEnabled && (
                <button
                  type="button"
                  onClick={signOut}
                  className="rounded px-2 py-1 text-xs text-ink-3 hover:bg-panel hover:text-ink">
                  Sign out
                </button>
              )
            )}
          </div>
        </header>
        <div className="flex min-h-0 flex-1 flex-col">
          <Outlet />
        </div>
      </div>
    </LecturerContext.Provider>
  );
}
