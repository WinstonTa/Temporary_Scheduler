import { createClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabasePublishableKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

export const supabaseConfigured = Boolean(
  supabaseUrl && supabasePublishableKey
);

export const supabase = createClient(
  supabaseUrl || "",
  supabasePublishableKey || ""
);

export function authRedirectTo() {
  return window.location.origin;
}

export function appData() {
  return supabase.schema("app_data");
}
