import { createClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const supabaseConfigured = Boolean(supabaseUrl && supabaseKey);
export const supabase = supabaseConfigured
  ? createClient(supabaseUrl, supabaseKey, {
      auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true },
    })
  : null;

export function accountFromUser(user) {
  if (!user) return null;
  return {
    id: user.id,
    email: user.email,
    username: user.user_metadata?.username || user.email?.split("@")[0] || "Käyttäjä",
    emailConfirmed: Boolean(user.email_confirmed_at),
  };
}
