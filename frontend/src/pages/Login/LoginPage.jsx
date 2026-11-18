// src/pages/Login/LoginPage.jsx
import { useState } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../../auth/useAuth.js";
import Logo from "../../components/Logo.jsx";
import ThemeToggle from "../../components/ThemeToggle.jsx";

const CAMPUS_IMAGE =
  "https://cdn.eduadvisor.my/university/gallery/2025/04/gallery-peninsula-the-ship-01.webp";

export default function LoginPage() {
  const { status, error: sessionError, signIn } = useAuth();
  const location = useLocation();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  if (status === "signedIn") {
    return <Navigate to={location.state?.from?.pathname ?? "/"} replace />;
  }

  async function onSubmit(e) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      await signIn(email, password);
    } catch (err) {
      setError(err.message || "Unable to sign in. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="relative min-h-screen overflow-hidden bg-canvas text-ink lg:grid lg:grid-cols-[1.12fr_0.88fr]">
      {/* Campus image panel */}
      <section className="relative isolate flex min-h-[34vh] flex-col justify-between overflow-hidden bg-[#0b2948] px-7 py-8 text-white sm:min-h-[40vh] sm:px-10 lg:min-h-screen lg:px-14 lg:py-12 xl:px-20">
        <div
          className="absolute inset-0 z-0 bg-cover bg-center transition-transform duration-700"
          style={{ backgroundImage: `url("${CAMPUS_IMAGE}")` }}
          role="img"
          aria-label="The Ship Campus at Batu Kawan, Penang"
        />
        <div className="absolute inset-0 z-[1] bg-gradient-to-br from-[#071a30]/90 via-[#0b2948]/70 to-[#0b2948]/35" />
        <div className="absolute inset-0 z-[1] bg-gradient-to-t from-[#06172b]/85 via-transparent to-[#06172b]/25" />

        <div className="relative z-10 flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl border border-white/25 bg-white/10 shadow-lg backdrop-blur-sm">
            <svg
              viewBox="0 0 40 40"
              className="h-7 w-7"
              fill="none"
              aria-hidden="true">
              <path
                d="M20 4 34 12v16l-14 8L6 28V12L20 4Z"
                stroke="currentColor"
                strokeWidth="1.7"
              />
              <path
                d="M13 25V15l7-4 7 4v10l-7 4-7-4Z"
                stroke="currentColor"
                strokeWidth="1.7"
              />
              <path
                d="M20 11v18M13 15l14 10M27 15 13 25"
                stroke="currentColor"
                strokeWidth="1.2"
                opacity=".8"
              />
            </svg>
          </div>
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-white/75">
              Peninsula College
            </p>
            <p className="mt-0.5 text-sm font-semibold tracking-wide text-white">
              The Ship Campus · Penang
            </p>
          </div>
        </div>

        <div className="relative z-10 max-w-2xl py-9 lg:pb-16 lg:pt-20">
          <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-white/25 bg-white/10 px-3.5 py-2 text-[10px] font-semibold uppercase tracking-[0.2em] text-[#eff6ff] backdrop-blur-md sm:text-xs">
            <span className="h-1.5 w-1.5 rounded-full bg-sky-300 shadow-[0_0_12px_rgba(125,211,252,0.9)]" />
            Academic Scheduling Platform
          </div>
          <h1 className="max-w-xl text-4xl font-semibold leading-[1.08] tracking-tight text-white sm:text-5xl lg:text-6xl xl:text-[4.25rem]">
            Every class.
            <br />
            <span className="text-sky-200">In the right place.</span>
          </h1>
          <p className="mt-6 max-w-lg text-sm leading-7 text-[#eff6ff]/85 sm:text-base sm:leading-8">
            A smarter way to plan the semester. STAR helps coordinate classes,
            lecturers and classrooms through intelligent timetable scheduling.
          </p>
          <div className="mt-9 hidden items-center gap-3 text-xs font-medium tracking-wide text-white/75 sm:flex">
            <span className="h-px w-10 bg-sky-200/70" />
            SMART TIMETABLE WITH ADAPTIVE REALLOCATION
          </div>
        </div>

        <div className="relative z-10 hidden items-center justify-between border-t border-white/20 pt-5 text-[11px] text-white/65 lg:flex">
          <span>Batu Kawan, Penang, Malaysia</span>
          <span>STAR · Academic Management</span>
        </div>
      </section>

      {/* Login panel */}
      <section className="relative flex min-h-[66vh] items-center justify-center px-6 py-12 sm:px-10 lg:min-h-screen lg:px-12 xl:px-20">
        <div className="absolute right-5 top-5 z-10 sm:right-8 sm:top-8">
          <ThemeToggle />
        </div>

        <div className="w-full max-w-md">
          <div className="mb-10 flex items-center justify-between gap-4">
            <div className="max-w-[190px] [&_img]:max-h-12 [&_img]:w-auto">
              <Logo />
            </div>
            <span className="rounded-full border border-line bg-panel px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.16em] text-ink-3">
              Secure access
            </span>
          </div>

          <div className="mb-8">
            <p className="mb-3 text-xs font-bold uppercase tracking-[0.22em] text-navy-700">
              Welcome aboard
            </p>
            <h2 className="text-3xl font-bold tracking-tight text-ink sm:text-[2.15rem]">
              Sign in to STAR
            </h2>
            <p className="mt-3 max-w-sm text-sm leading-6 text-ink-3">
              Access your academic scheduling workspace. Use the account an
              administrator created for you.
            </p>
          </div>

          <form onSubmit={onSubmit} className="space-y-5">
            <div>
              <label
                htmlFor="email"
                className="mb-2 block text-xs font-semibold text-ink-2">
                Email address
              </label>
              <div className="relative">
                <svg
                  className="pointer-events-none absolute left-4 top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-ink-4"
                  viewBox="0 0 24 24"
                  fill="none"
                  aria-hidden="true">
                  <rect
                    x="3.5"
                    y="5"
                    width="17"
                    height="14"
                    rx="2.5"
                    stroke="currentColor"
                    strokeWidth="1.6"
                  />
                  <path
                    d="m5 7 7 5.5L19 7"
                    stroke="currentColor"
                    strokeWidth="1.6"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
                <input
                  id="email"
                  type="email"
                  autoComplete="username"
                  autoCapitalize="none"
                  spellCheck="false"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@college.edu.my"
                  className="w-full rounded-xl border border-line bg-surface py-3.5 pl-11 pr-4 text-sm text-ink shadow-sm outline-none transition placeholder:text-ink-4 hover:border-line-strong focus:border-navy-500 focus:ring-4 focus:ring-navy-500/10"
                />
              </div>
            </div>

            <div>
              <label
                htmlFor="password"
                className="mb-2 block text-xs font-semibold text-ink-2">
                Password
              </label>
              <div className="relative">
                <svg
                  className="pointer-events-none absolute left-4 top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-ink-4"
                  viewBox="0 0 24 24"
                  fill="none"
                  aria-hidden="true">
                  <rect
                    x="4.5"
                    y="10"
                    width="15"
                    height="10"
                    rx="2.2"
                    stroke="currentColor"
                    strokeWidth="1.6"
                  />
                  <path
                    d="M8 10V7.5a4 4 0 0 1 8 0V10"
                    stroke="currentColor"
                    strokeWidth="1.6"
                    strokeLinecap="round"
                  />
                  <path
                    d="M12 14v2"
                    stroke="currentColor"
                    strokeWidth="1.6"
                    strokeLinecap="round"
                  />
                </svg>
                <input
                  id="password"
                  type="password"
                  autoComplete="current-password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  className="w-full rounded-xl border border-line bg-surface py-3.5 pl-11 pr-4 text-sm text-ink shadow-sm outline-none transition placeholder:text-ink-4 hover:border-line-strong focus:border-navy-500 focus:ring-4 focus:ring-navy-500/10"
                />
              </div>
            </div>

            {(error || sessionError) && (
              <p
                role="alert"
                className="rounded-lg border border-danger/20 bg-danger-soft px-4 py-3 text-xs leading-5 text-danger">
                {error || sessionError}
              </p>
            )}

            <button
              type="submit"
              disabled={busy}
              className="group flex w-full items-center justify-center gap-2 rounded-xl bg-navy-700 px-5 py-3.5 text-sm font-semibold text-white shadow-lg shadow-navy-900/15 transition duration-200 hover:-translate-y-0.5 hover:bg-navy-900 hover:shadow-xl disabled:translate-y-0 disabled:cursor-not-allowed disabled:opacity-60">
              {busy ? "Signing in…" : "Sign in to your account"}
              {!busy && (
                <svg
                  className="h-4 w-4 transition-transform group-hover:translate-x-1"
                  viewBox="0 0 24 24"
                  fill="none"
                  aria-hidden="true">
                  <path
                    d="M5 12h14m-6-6 6 6-6 6"
                    stroke="currentColor"
                    strokeWidth="1.8"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              )}
            </button>
          </form>

          <div className="mt-8 flex items-start gap-3 border-t border-line pt-6">
            <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-navy-50 text-navy-700">
              <svg
                className="h-4 w-4"
                viewBox="0 0 24 24"
                fill="none"
                aria-hidden="true">
                <path
                  d="M12 3 19 6v5c0 4.7-2.9 8-7 10-4.1-2-7-5.3-7-10V6l7-3Z"
                  stroke="currentColor"
                  strokeWidth="1.6"
                  strokeLinejoin="round"
                />
                <path
                  d="m9 12 2 2 4-4"
                  stroke="currentColor"
                  strokeWidth="1.6"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </div>
            <p className="text-xs leading-5 text-ink-3">
              <span className="font-semibold text-ink-2">
                Your workspace is protected.
              </span>
              <br />
              Sign-in is restricted to authorised STAR users.
            </p>
          </div>

          <p className="mt-10 text-center text-[10px] tracking-wide text-ink-4">
            © {new Date().getFullYear()} STAR · Smart Timetable with Adaptive
            Reallocation
          </p>
        </div>
      </section>
    </main>
  );
}