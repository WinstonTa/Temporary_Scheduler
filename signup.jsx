import { useState } from "react";
import { supabase } from "./supabase";

export default function Signup({ onSwitchToLogin }) {
  const [email, setEmail] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  const handleSignup = async (e) => {
    e.preventDefault();

    setLoading(true);
    setErrorMsg("");
    setSuccessMsg("");

    try {
      // Create the Supabase Auth account
      const { data, error } = await supabase.auth.signUp({
        email: email.trim(),
        password: password,
      });

      if (error) {
        setErrorMsg(error.message);
        return;
      }

      // Make sure we received a user
      if (!data.user) {
        setErrorMsg("Account could not be created.");
        return;
      }

      // Create the user's profile
      const { error: profileError } = await supabase
        .from("profiles")
        .insert({
          id: data.user.id,
          email: email.trim(),
          username: username.trim(),
        });

      if (profileError) {
        console.error("Profile error:", profileError);
        setErrorMsg(
          "Account was created, but the profile could not be saved."
        );
        return;
      }

      setSuccessMsg(
        "Account created successfully! Please check your email for confirmation."
      );

      setEmail("");
      setUsername("");
      setPassword("");
    } catch (err) {
      console.error("Signup error:", err);
      setErrorMsg("An unexpected error occurred.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-6">
      <div className="w-full max-w-md">

        {/* Header */}
        <div className="mb-8 text-center">
          <p className="mb-2 text-sm font-semibold uppercase tracking-wider text-indigo-600">
            Class Finder
          </p>

          <h1 className="text-4xl font-bold text-gray-900">
            Create an Account
          </h1>

          <p className="mt-3 text-gray-500">
            Sign up to find classes that fit you.
          </p>
        </div>

        {/* Card */}
        <div className="rounded-2xl bg-white p-8 shadow-sm">

          {/* Error */}
          {errorMsg && (
            <div className="mb-4 rounded-xl bg-red-50 p-3 text-sm text-red-600">
              {errorMsg}
            </div>
          )}

          {/* Success */}
          {successMsg && (
            <div className="mb-4 rounded-xl bg-green-50 p-3 text-sm text-green-600">
              {successMsg}
            </div>
          )}

          <form onSubmit={handleSignup}>

            {/* Email */}
            <label className="mb-2 block text-sm font-medium text-gray-700">
              Email
            </label>

            <input
              type="email"
              placeholder="Enter your email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="mb-5 w-full rounded-xl border-2 border-gray-200 p-3 outline-none focus:border-indigo-600"
            />

            {/* Username */}
            <label className="mb-2 block text-sm font-medium text-gray-700">
              Username
            </label>

            <input
              type="text"
              placeholder="Choose a username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
              className="mb-5 w-full rounded-xl border-2 border-gray-200 p-3 outline-none focus:border-indigo-600"
            />

            {/* Password */}
            <label className="mb-2 block text-sm font-medium text-gray-700">
              Password
            </label>

            <input
              type="password"
              placeholder="Create a password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="mb-6 w-full rounded-xl border-2 border-gray-200 p-3 outline-none focus:border-indigo-600"
            />

            {/* Sign Up */}
            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-xl bg-indigo-600 p-3 font-semibold text-white transition hover:bg-indigo-700 disabled:opacity-50"
            >
              {loading ? "Creating Account..." : "Sign Up"}
            </button>

          </form>

          {/* Login */}
          <div className="mt-6 border-t pt-6 text-center">
            <p className="text-sm text-gray-500">
              Already have an account?
            </p>

            <button
              type="button"
              onClick={onSwitchToLogin}
              className="mt-2 font-semibold text-indigo-600 hover:text-indigo-700"
            >
              Sign in
            </button>
          </div>

        </div>
      </div>
    </div>
  );
}