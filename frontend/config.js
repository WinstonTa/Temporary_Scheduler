// Fill these in with your actual project values.
// This file is loaded as a plain <script> tag, so there's no build-time
// env var injection (no Vite/webpack) — these are just globals.

const CONFIG = {
  SUPABASE_URL: "https://your-project.supabase.co",
  SUPABASE_ANON_KEY: "your-anon-key",   // safe for the browser; RLS restricts access
  API_BASE_URL: "http://localhost:8000", // your FastAPI backend

  // Set this once you have a real auth flow. For now, hardcode a test user's UUID
  // (must exist in Supabase auth.users) if you're testing before auth is wired up.
  USER_ID: "replace-with-a-real-user-id",
};