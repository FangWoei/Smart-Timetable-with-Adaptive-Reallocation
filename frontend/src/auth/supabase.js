import { createClient } from "@supabase/supabase-js";

const url = import.meta.env.VITE_SUPABASE_URL;
const key = import.meta.env.VITE_SUPABASE_ANON_KEY;

// No Supabase keys in frontend/.env = login is switched off (local dev mode).
export const authEnabled = Boolean(url && key);
export const supabase = authEnabled ? createClient(url, key) : null;

export async function getToken() {
  if (!supabase) return null;
  const { data } = await supabase.auth.getSession();
  return data.session?.access_token ?? null;
}
