// src/layouts/TopBar.jsx
import { useState, useRef } from "react";
import { NavLink } from "react-router-dom";
import Logo from "../components/Logo.jsx";
import { NAV_ITEMS } from "../nav.js";

const MENUS = [
  "File",
  "Edit",
  "Data",
  "Constraints",
  "Timetable",
  "View",
  "Help",
];

export default function TopBar({
  variant = "workspace",
  user,
  fileName,
  dirty,
  onSignOut,
}) {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const timeoutRef = useRef(null);

  // 鼠标移入：清除关闭定时器并打开菜单
  const handleMouseEnter = () => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    setIsMenuOpen(true);
  };

  // 鼠标移出：延迟关闭，防止移到菜单间隙时闪烁关闭
  const handleMouseLeave = () => {
    timeoutRef.current = setTimeout(() => {
      setIsMenuOpen(false);
    }, 150);
  };

  return (
    <header className="flex h-14 shrink-0 items-center border-b border-line bg-white px-5 shadow-xs">
      {/* 放大后的 Logo 容器 */}
      <div className="flex items-center [&>div]:h-[50px] [&>div]:w-[250px] [&_img]:max-h-[44px]">
        <Logo bordered={false} />
      </div>

      {/* 导航栏 */}
      <nav className="-ml-19 flex items-center gap-6" aria-label="Sections">
        {NAV_ITEMS.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.end}
            className={({ isActive }) =>
              [
                "relative flex h-6 items-center px-1 text-[13px] overflow-hidden group transition-colors font-medium",
                isActive
                  ? "text-navy-700 font-semibold"
                  : "text-ink-3 hover:text-ink",
              ].join(" ")
            }
          >
            {() => (
              <>
                <span className="block group-hover:-translate-y-full transition-transform duration-300">
                  {item.label}
                </span>
                <span className="block absolute top-full left-1 group-hover:translate-y-[-100%] transition-transform duration-300">
                  {item.label}
                </span>
              </>
            )}
          </NavLink>
        ))}
      </nav>

      {fileName && (
        <div className="ml-6 hidden items-center gap-2 text-[13px] text-ink-3 lg:flex">
          <span>{fileName}</span>
          {dirty && (
            <span className="flex items-center gap-1.5 text-xs">
              <span className="size-2 rounded-full bg-warn" />
              unsaved changes
            </span>
          )}
        </div>
      )}

      {variant === "workspace" && fileName && (
        <div className="hidden items-center gap-1 2xl:flex">
          {MENUS.map((m) => (
            <button
              key={m}
              type="button"
              className="rounded px-2.5 py-1 text-[13px] text-ink-2 hover:bg-panel hover:text-ink transition-colors"
            >
              {m}
            </button>
          ))}
        </div>
      )}

      {/* 右侧用户信息及 Hover 下拉菜单 */}
      <div
        className="relative ml-auto flex items-center gap-3"
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
      >
        <div className="hidden text-right sm:block">
          <div className="text-xs font-semibold text-ink">{user.name}</div>
          {user.role && (
            <div className="text-[11px] text-ink-4">{user.role}</div>
          )}
        </div>

        {/* 头像 */}
        <div className="flex size-8 cursor-pointer items-center justify-center rounded-full bg-navy-700 text-[11px] font-bold text-white shadow-xs transition-transform active:scale-95">
          {user.initials}
        </div>

        {/* 下拉 Popover 菜单 */}
        {isMenuOpen && (
          <ul
            role="menu"
            className="absolute top-full right-0 mt-1 z-50 flex min-w-[180px] flex-col gap-1 overflow-auto rounded-md border border-line bg-white p-2 font-sans text-sm font-normal text-ink-2 shadow-lg shadow-black/5 focus:outline-none animate-in fade-in zoom-in-95 duration-100"
          >
            {/* My Profile */}
            <button
              role="menuitem"
              type="button"
              onClick={() => setIsMenuOpen(false)}
              className="flex w-full cursor-pointer select-none items-center gap-2 rounded-md px-3 py-2 text-start text-xs font-medium leading-tight outline-none transition-all hover:bg-navy-50 hover:text-navy-700"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth="2"
                stroke="currentColor"
                className="h-4 w-4"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M17.982 18.725A7.488 7.488 0 0012 15.75a7.488 7.488 0 00-5.982 2.975m11.963 0a9 9 0 10-11.963 0m11.963 0A8.966 8.966 0 0112 21a8.966 8.966 0 01-5.982-2.275M15 9.75a3 3 0 11-6 0 3 3 0 016 0z"
                />
              </svg>
              <span>My Profile</span>
            </button>

            <hr className="my-1 border-line" />

            {/* Sign Out 按钮 */}
            {onSignOut && (
              <button
                role="menuitem"
                type="button"
                onClick={() => {
                  setIsMenuOpen(false);
                  onSignOut();
                }}
                className="flex w-full cursor-pointer select-none items-center gap-2 rounded-md px-3 py-2 text-start text-xs font-medium leading-tight outline-none transition-all text-red-600 hover:bg-red-50 hover:text-red-700"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth="2"
                  stroke="currentColor"
                  className="h-4 w-4"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M5.636 5.636a9 9 0 1012.728 0M12 3v9"
                  />
                </svg>
                <span>Sign Out</span>
              </button>
            )}
          </ul>
        )}
      </div>
    </header>
  );
}