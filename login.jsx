import { useState } from "react";
import { authRedirectTo, supabase } from "./supabase";

export default function Login({ onSwitchToSignup }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [showMissDialog, setShowMissDialog] = useState(false);

  const handleLogin = async (e) => {
    e.preventDefault();

    setLoading(true);
    setErrorMsg("");
    setShowMissDialog(false);

    try {
      const { error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });

      if (error) {
        setErrorMsg(
          "No account found for that email, or the password is wrong."
        );
        setShowMissDialog(true);
      }
    } catch (err) {
      console.error("Login error:", err);
      setErrorMsg("An unexpected error occurred.");
    } finally {
      setLoading(false);
    }
  };

  const handleGoogle = async () => {
    setLoading(true);
    setErrorMsg("");
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: authRedirectTo() },
    });
    if (error) {
      setErrorMsg(error.message);
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-6">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <p className="mb-2 text-sm font-semibold uppercase tracking-wider text-indigo-600">
            Class Finder
          </p>

          <h1 className="text-4xl font-bold text-gray-900">Welcome Back</h1>

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
              Email
            </label>

            <input
              type="email"
              placeholder="Enter your email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
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
              autoComplete="current-password"
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

          <p className="my-5 text-center text-sm text-gray-400">or</p>

          <button
            type="button"
            onClick={handleGoogle}
            disabled={loading}
            className="w-full rounded-xl border-2 border-gray-200 p-3 font-semibold text-gray-800 transition hover:border-indigo-300 hover:bg-gray-50 disabled:opacity-50"
          >
            Log in with Google
          </button>

          <div className="mt-6 border-t pt-6 text-center">
            <p className="text-sm text-gray-500">Don't have an account?</p>

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

      {showMissDialog && (
        <div className="fixed inset-0 z-10 flex items-center justify-center bg-black/35 px-6">
          <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-lg">
            <p className="text-gray-800">
              No account found for that email, or the password is wrong. If you
              do not have an account yet, go to the sign up page.
            </p>
            <div className="mt-5 flex gap-3">
              <button
                type="button"
                onClick={() => {
                  setShowMissDialog(false);
                  onSwitchToSignup();
                }}
                className="rounded-xl bg-indigo-600 px-4 py-2 font-semibold text-white hover:bg-indigo-700"
              >
                Go to Sign Up
              </button>
              <button
                type="button"
                onClick={() => setShowMissDialog(false)}
                className="rounded-xl px-4 py-2 font-medium text-gray-600 hover:bg-gray-100"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
