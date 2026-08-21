import { useState } from "react";

export default function Login() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loggedIn, setLoggedIn] = useState(false);

  const handleLogin = (e) => {
    e.preventDefault();

    // Temporary test login
    setLoggedIn(true);
  };

  if (loggedIn) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-gray-900">
            Successfully Logged In!
          </h1>

          <p className="mt-3 text-gray-500">
            Welcome, {username}!
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-6">
      <div className="w-full max-w-md">

        {/* Header */}
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

        {/* Login Card */}
        <div className="rounded-2xl bg-white p-8 shadow-sm">

          <form onSubmit={handleLogin}>

            {/* Username */}
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

            {/* Password */}
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

            {/* Login */}
            <button
              type="submit"
              className="w-full rounded-xl bg-indigo-600 p-3 font-semibold text-white transition hover:bg-indigo-700"
            >
              Sign In
            </button>

          </form>

          {/* Create Account */}
          <div className="mt-6 border-t pt-6 text-center">
            <p className="text-sm text-gray-500">
              Don't have an account?
            </p>

            <button
              type="button"
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