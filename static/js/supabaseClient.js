function getSupabaseConfig() {
  const url = document.body.dataset.supabaseUrl;
  const key = document.body.dataset.supabaseKey;
  if (!url || !key) {
    throw new Error("Missing SUPABASE_URL or SUPABASE_PUBLISHABLE_KEY.");
  }
  return { url, key };
}

function getSupabaseClient() {
  const { url, key } = getSupabaseConfig();
  return window.supabase.createClient(url, key);
}

function homeRedirect() {
  return `${window.location.origin}/home`;
}
