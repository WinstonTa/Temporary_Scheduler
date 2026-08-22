import { useState } from "react";
import { supabase } from "./supabase";

export default function Login({ onSwitchToSignup }) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [loggedIn, setLoggedIn] = useState(false);

  const handleLogin = async (e) => {
    e.preventDefault();

    setLoading(true);
    setErrorMsg("");

    try {
      // Find the email connected to this username
      const { data: profileData, error: profileError } = await supabase
        .from("profiles")
        .select("email")
        .eq("username", username.trim())
        .single();

      if (profileError || !profileData) {
        console.error("Profile lookup error:", profileError);
        setErrorMsg("Username not found.");
        return;
      }

      // Log in through Supabase Auth
      const { error: authError } =
        await supabase.auth.signInWithPassword({
          email: profileData.email,
          password: password,
        });

      if (authError) {
        console.error("Auth error:", authError);
        setErrorMsg("Invalid password. Please try again.");
        return;
      }

      setLoggedIn(true);
    } catch (err) {
      console.error("Login error:", err);
      setErrorMsg("An unexpected error occurred.");
    } finally {
      setLoading(false);
    }
  };

  if (loggedIn) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-gray-900">
            Successfully Logged In!
          </h1>

          <p className="mt-3 text-gray-500">
            Welcome back, {username}!
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-6">
      <div className="w-full max-w-md">

        <div className="mb-8 text-center">
          <p className="mb-2 text-sm font-semibold uppercase tracking-wider text-indigo-600">
            Class Finder
          </p>

          <h1 className="text-4xl font-bold text-gray-900">
            Welcome Back
          </h1>

          <p className="mt-3 text-gray-500">
            Sign in to find classes that fit you.
          </p>
        </div>

        <div className="rounded-2xl bg-white p-8 shadow-sm">

          {errorMsg && (
            <div className="mb-4 rounded-xl bg-red-50 p-3 text-sm text-red-600">
              {errorMsg}
            </div>
          )}

          <form onSubmit={handleLogin}>

            <label className="mb-2 block text-sm font-medium text-gray-700">
              Username
            </label>

            <input
              type="text"
              placeholder="Enter your username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
              className="mb-5 w-full rounded-xl border-2 border-gray-200 p-3 outline-none focus:border-indigo-600"
            />

            <label className="mb-2 block text-sm font-medium text-gray-700">
              Password
            </label>

            <input
              type="password"
              placeholder="Enter your password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="mb-6 w-full rounded-xl border-2 border-gray-200 p-3 outline-none focus:border-indigo-600"
            />

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-xl bg-indigo-600 p-3 font-semibold text-white transition hover:bg-indigo-700 disabled:opacity-50"
            >
              {loading ? "Signing In..." : "Sign In"}
            </button>

          </form>

          <div className="mt-6 border-t pt-6 text-center">
            <p className="text-sm text-gray-500">
              Don't have an account?
            </p>

            <button
              type="button"
              onClick={onSwitchToSignup}
              className="mt-2 font-semibold text-indigo-600 hover:text-indigo-700"
            >
              Create an account
            </button>
          </div>

        </div>
      </div>
    </div>
  );
}