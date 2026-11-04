import { useState } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../../auth/useAuth.js";
import Logo from "../../components/Logo.jsx";

// Simple on purpose: layout and wiring only. Styling is for the design pass.
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
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex h-full items-center justify-center bg-canvas p-6">
      <form
        onSubmit={onSubmit}
        className="w-full max-w-sm rounded border border-line bg-white p-8 shadow-xs">
        <div className="mb-6 flex justify-center">
          <Logo />
        </div>
        <h1 className="mb-1 text-lg font-bold text-navy-900">Sign in</h1>
        <p className="mb-5 text-xs text-ink-3">
          Use the account an admin created for you.
        </p>

        <label
          className="mb-1 block text-xs font-semibold text-ink-2"
          htmlFor="email">
          Email
        </label>
        <input
          id="email"
          type="email"
          autoComplete="username"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="mb-4 w-full rounded border border-line px-3 py-2 text-sm"
        />

        <label
          className="mb-1 block text-xs font-semibold text-ink-2"
          htmlFor="password">
          Password
        </label>
        <input
          id="password"
          type="password"
          autoComplete="current-password"
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="mb-4 w-full rounded border border-line px-3 py-2 text-sm"
        />

        {(error || sessionError) && (
          <p role="alert" className="mb-4 text-xs text-danger">
            {error || sessionError}
          </p>
        )}

        <button
          type="submit"
          disabled={busy}
          className="w-full rounded bg-navy-700 py-2.5 text-[13px] font-semibold text-white hover:bg-navy-900 disabled:opacity-60">
          {busy ? "Signing in…" : "Sign in"}
        </button>
      </form>
    </div>
  );
}
