// The account button in the top bar. Hover (or click) opens a small menu under
// it. Sign out lives here, and later the account settings go in the same menu.
import { useEffect, useRef, useState } from "react";

export default function UserMenu({ user, onSignOut }) {
  const [open, setOpen] = useState(false);
  const box = useRef(null);
  const timer = useRef(null);

  // Opens on hover; closes a moment after the mouse leaves, so a quick move
  // from the button down to the menu does not close it.
  const show = () => {
    clearTimeout(timer.current);
    setOpen(true);
  };
  const hideSoon = () => {
    clearTimeout(timer.current);
    timer.current = setTimeout(() => setOpen(false), 160);
  };

  useEffect(() => () => clearTimeout(timer.current), []);

  // Click outside or press Escape = close (also for touch and keyboard users)
  useEffect(() => {
    if (!open) return undefined;
    const onDown = (e) => {
      if (!box.current?.contains(e.target)) setOpen(false);
    };
    const onKey = (e) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div
      ref={box}
      className="relative"
      onMouseEnter={show}
      onMouseLeave={hideSoon}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="menu"
        aria-expanded={open}
        className="flex items-center gap-2.5 rounded-lg py-1 pl-2 pr-1.5 transition-colors hover:bg-panel">
        <span className="hidden text-right sm:block">
          <span className="block text-xs font-semibold leading-4 text-ink">
            {user.name}
          </span>
          {user.role && (
            <span className="block text-[11px] leading-4 text-ink-4">
              {user.role}
            </span>
          )}
        </span>
        <span
          aria-hidden
          className="flex size-8 items-center justify-center rounded-full bg-navy-700 text-[11px] font-bold text-white shadow-xs">
          {user.initials}
        </span>
        <svg
          className={`h-3.5 w-3.5 text-ink-4 transition-transform duration-200 ${open ? "rotate-180" : ""}`}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true">
          <path d="m6 9 6 6 6-6" />
        </svg>
      </button>

      {/* pt-2 keeps the hover going across the gap between button and menu */}
      <div
        className={`absolute right-0 top-full z-50 w-64 pt-2 transition duration-150 ${
          open
            ? "translate-y-0 opacity-100"
            : "pointer-events-none -translate-y-1 opacity-0"
        }`}>
        <div
          role="menu"
          aria-label="Account"
          className="overflow-hidden rounded-xl border border-line bg-surface shadow-xl">
          <div className="flex items-center gap-3 border-b border-line px-4 py-3.5">
            <span
              aria-hidden
              className="flex size-10 shrink-0 items-center justify-center rounded-full bg-navy-700 text-sm font-bold text-white">
              {user.initials}
            </span>
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-ink">
                {user.name}
              </p>
              {user.email && (
                <p className="truncate text-xs text-ink-3">{user.email}</p>
              )}
              {user.role && (
                <span className="mt-1 inline-block rounded-full bg-tint px-2 py-0.5 text-[10px] font-semibold text-navy-700">
                  {user.role}
                </span>
              )}
            </div>
          </div>

          <div className="p-1.5">
            {/* Placeholder: account settings come later */}
            <button
              type="button"
              disabled
              role="menuitem"
              className="flex w-full cursor-not-allowed items-center gap-2.5 rounded-lg px-3 py-2 text-left text-[13px] text-ink-4">
              <svg
                className="h-4 w-4"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.7"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true">
                <circle cx="12" cy="8" r="4" />
                <path d="M4 20c0-4 3.6-6 8-6s8 2 8 6" />
              </svg>
              Account settings
              <span className="ml-auto rounded-full bg-panel px-2 py-0.5 text-[10px] font-semibold">
                Soon
              </span>
            </button>

            {onSignOut && (
              <button
                type="button"
                role="menuitem"
                onClick={onSignOut}
                className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-[13px] font-medium text-danger transition-colors hover:bg-danger-soft">
                <svg
                  className="h-4 w-4"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.7"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true">
                  <path d="M9 4H6a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h3M16 8l4 4-4 4M20 12H9" />
                </svg>
                Sign out
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
