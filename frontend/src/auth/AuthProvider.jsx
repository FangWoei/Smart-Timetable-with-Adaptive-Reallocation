import { useEffect, useMemo, useState } from "react";
import { api } from "../api.js";
import { AuthContext } from "./AuthContext.js";
import { authEnabled, supabase } from "./supabase.js";

const DEV_USER = { email: "dev@local", role: "admin", lecturer_id: null };

export function AuthProvider({ children }) {
  // undefined = still checking, null = signed out
  const [session, setSession] = useState(authEnabled ? undefined : null);
  const [me, setMe] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!authEnabled) return;
    supabase.auth.getSession().then(({ data }) => setSession(data.session));
    const { data } = supabase.auth.onAuthStateChange((_event, next) =>
      setSession(next),
    );
    return () => data.subscription.unsubscribe();
  }, []);

  const token = session?.access_token;

  // Ask our own API who this is (role comes from the allowed_users table)
  useEffect(() => {
    if (!authEnabled || !token) return;
    let cancelled = false;
    api
      .me()
      .then((user) => {
        if (cancelled) return;
        setMe(user);
        setError("");
      })
      .catch((e) => {
        if (cancelled) return;
        setError(e.message);
        supabase.auth.signOut();
      });
    return () => {
      cancelled = true;
    };
  }, [token]);

  const value = useMemo(() => {
    const user = authEnabled ? (token ? me : null) : DEV_USER;
    let status = "signedIn";
    if (authEnabled) {
      if (session === undefined) status = "loading";
      else if (!token) status = "signedOut";
      else if (!me) status = error ? "signedOut" : "loading";
    }
    return {
      status,
      user,
      error,
      authEnabled,
      async signIn(email, password) {
        setError("");
        const { error: err } = await supabase.auth.signInWithPassword({
          email: email.trim(),
          password,
        });
        if (err) {
          throw new Error(
            err.message === "Invalid login credentials"
              ? "Wrong email or password."
              : err.message,
          );
        }
      },
      async signOut() {
        setMe(null);
        await supabase?.auth.signOut();
      },
    };
  }, [session, token, me, error]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
