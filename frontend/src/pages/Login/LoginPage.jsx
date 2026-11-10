import { useState } from "react";
import { Navigate, useLocation, Link } from "react-router-dom";
import { useAuth } from "../../auth/useAuth.js";
import Logo from "../../components/Logo.jsx";

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
    <div className="flex min-h-screen w-full items-center justify-center bg-gray-50 p-4 sm:p-6 lg:p-8">
      {/* 核心卡片 */}
      <div className="flex w-full max-w-5xl overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-xl">
        
        {/* 左侧表单 */}
        <div className="flex w-full flex-col justify-center px-8 py-12 sm:px-12 lg:w-1/2">
          
          {/* 超大 Logo 居中/靠左展示 */}
          <div className="mb-12 flex justify-start pl-4 pt-2">
            <div className="scale-[2.5] origin-left">
              <Logo />
            </div>
          </div>

          <form onSubmit={onSubmit} className="space-y-5">
            {/* 邮箱输入框 */}
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1.5" htmlFor="email">
                Email Address
              </label>
              <input
                id="email"
                type="email"
                autoComplete="username"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@example.com"
                className="w-full rounded-lg border border-gray-300 px-3.5 py-2.5 text-sm text-gray-900 placeholder:text-gray-400 focus:border-navy-700 focus:outline-none focus:ring-1 focus:ring-navy-700 transition-all"
              />
            </div>

            {/* 密码输入框 */}
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1.5" htmlFor="password">
                Password
              </label>
              <input
                id="password"
                type="password"
                autoComplete="current-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full rounded-lg border border-gray-300 px-3.5 py-2.5 text-sm text-gray-900 placeholder:text-gray-400 focus:border-navy-700 focus:outline-none focus:ring-1 focus:ring-navy-700 transition-all"
              />
              {/* 放在 password 格子下方 */}
              <div className="mt-1.5 flex justify-end">
                <Link
                  to="/forget-password"
                  className="text-xs font-medium text-navy-700 hover:underline"
                >
                  Forgot password?
                </Link>
              </div>
            </div>

            {(error || sessionError) && (
              <div className="rounded-lg bg-red-50 p-3 text-xs text-red-600 border border-red-100">
                {error || sessionError}
              </div>
            )}

            {/* 登录主按钮 */}
            <button
              type="submit"
              disabled={busy}
              className="w-full rounded-lg bg-navy-700 py-3 text-sm font-semibold text-white shadow-md hover:bg-navy-900 active:scale-[0.99] transition-all disabled:opacity-60"
            >
              {busy ? "Signing in…" : "Sign In"}
            </button>
          </form>
        </div>

        {/* 右侧：纯实景建筑图片展示 */}
        <div className="relative hidden w-1/2 overflow-hidden lg:block bg-gray-100">
          <img
            src="/TSC_0018e-scaled.jpg"
            alt="Campus Building"
            className="h-full w-full object-cover transition-transform duration-700 hover:scale-105"
          />
        </div>

      </div>
    </div>
  );
}
