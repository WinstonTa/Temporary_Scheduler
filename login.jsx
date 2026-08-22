import { useState } from "react";
import { supabase } from "./supabase";

export default function Login({ onSwitchToSignup, onNavigate, onBackToHome }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [loggedIn, setLoggedIn] = useState(false);

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg("");

    try {
      const { error: authError } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password: password,
      });

      if (authError) {
        console.error("Auth error:", authError);
        setErrorMsg("Invalid email or password. Please try again.");
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

  return (
    <main className="relative flex min-h-screen flex-col bg-gradient-to-br from-zinc-950 via-black to-black text-white overflow-hidden">
      
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Caveat:wght@500;600&family=Lexend:wght@300;400;500;600&display=swap');

        @keyframes popUp {
          0% {
            opacity: 0;
            transform: translateY(12px) scale(0.98);
          }
          100% {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }
        .animate-pop-up {
          animation: popUp 2.5s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }
      `}</style>

      <div className="absolute inset-0 pointer-events-none flex items-center justify-center opacity-40" aria-hidden="true">
        <svg className="w-full h-full max-w-4xl" viewBox="0 0 800 600" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M0 150H800M0 300H800M0 450H800" stroke="#27272a" strokeWidth="1" strokeDasharray="4 4" />
          <path d="M200 0V600M400 0V600M600 0V600" stroke="#27272a" strokeWidth="1" strokeDasharray="4 4" />
          <path 
            d="M50 450Q200 350 350 380T650 200T750 120" 
            stroke="url(#goldGradient)" 
            strokeWidth="2.5" 
            className="animate-pulse"
          />
          <defs>
            <linearGradient id="goldGradient" x1="0" y1="0" x2="800" y2="0" gradientUnits="userSpaceOnUse">
              <stop stopColor="#dea81f" stopOpacity="0.1" />
              <stop offset="0.5" stopColor="#dea81f" stopOpacity="0.6" />
              <stop offset="1" stopColor="#dea81f" stopOpacity="0.1" />
            </linearGradient>
          </defs>
        </svg>
      </div>


      <header className="relative z-10 w-full border-b border-zinc-800 bg-zinc-950/80 backdrop-blur-md">
        <div className="max-w-7xl mx-auto flex h-20 items-center justify-between px-8 md:px-12">
          
          <div className="flex items-center">
            <button 
              onClick={onBackToHome}
              className="text-3xl font-normal tracking-wide text-amber-300 focus:outline-none" 
              style={{ fontFamily: "'Caveat', cursive" }}
            >
              Classio
            </button>
          </div>

          <nav className="hidden lg:flex items-center space-x-12 text-sm font-medium text-zinc-300" aria-label="Main Navigation">
            <button 
              onClick={() => onNavigate?.("schedule")} 
              className="transition hover:text-amber-400 focus:outline-none"
            >
              Schedule
            </button>
            <button 
              onClick={() => onNavigate?.("quiz")} 
              className="transition hover:text-amber-400 focus:outline-none"
            >
              Quiz
            </button>
            <button 
              onClick={() => onNavigate?.("recommendations")} 
              className="transition hover:text-amber-400 focus:outline-none"
            >
              Course Recommendations
            </button>
          </nav>

          {/* Far Right Action Button (Sign Up) */}
          <div className="flex items-center">
            <button
              onClick={onSwitchToSignup}
              className="rounded-xl bg-amber-400 px-5 py-2.5 text-sm font-semibold text-black transition hover:bg-amber-300 active:scale-[0.99] focus:outline-none shadow-lg shadow-amber-400/10"
            >
              Sign Up
            </button>
          </div>

        </div>
      </header>

      {/* Mobile Navigation Bar Line (Home removed) */}
      <nav className="flex lg:hidden items-center justify-center space-x-8 px-6 py-3 text-xs font-medium text-zinc-400 border-b border-zinc-800 bg-zinc-950" aria-label="Mobile Navigation">
        <button onClick={() => onNavigate?.("schedule")} className="hover:text-amber-400">Schedule</button>
        <button onClick={() => onNavigate?.("quiz")} className="hover:text-amber-400">Quiz</button>
        <button onClick={() => onNavigate?.("recommendations")} className="hover:text-amber-400">Recommendations</button>
      </nav>

      {/* Main Content Area */}
      <div className="relative z-10 flex flex-1 items-center justify-center px-6 py-12" style={{ fontFamily: "'Lexend', sans-serif" }}>
        
        {loggedIn ? (
          <div className="text-center animate-pop-up space-y-3">
            <h1 className="text-4xl font-normal tracking-wide text-amber-400" style={{ fontFamily: "'Caveat', cursive" }}>
              Welcome Back!
            </h1>
            <p className="text-sm text-zinc-400 font-light">
              Loading your recommended courses and summaries...
            </p>
          </div>
        ) : (
          <div className="w-full max-w-md animate-pop-up space-y-6">

            <header className="text-center space-y-2">
              <p className="text-xs font-semibold uppercase tracking-widest text-amber-400">
                Course Finder & Recommender
              </p>
              <h1 className="text-5xl font-normal tracking-wide text-amber-300" style={{ fontFamily: "'Caveat', cursive" }}>
                Welcome Back
              </h1>
              <p className="text-sm text-zinc-400 max-w-xs mx-auto font-light">
                Sign in to access your curated course recommendations and summaries.
              </p>
            </header>

            <section className="rounded-2xl border border-zinc-800 bg-zinc-950 p-8 shadow-xl">

              {errorMsg && (
                <div role="alert" className="mb-6 rounded-xl border border-red-900/40 bg-red-950/30 p-3.5 text-sm text-red-400">
                  {errorMsg}
                </div>
              )}

              <form onSubmit={handleLogin} className="space-y-5" noValidate>

                <div className="space-y-2">
                  <label htmlFor="email" className="block text-xs font-medium uppercase tracking-wider text-zinc-300">
                    Email
                  </label>
                  <input
                    id="email"
                    type="email"
                    placeholder="Enter your email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    className="w-full rounded-xl border border-zinc-800 bg-zinc-900 p-3 text-white placeholder-zinc-600 outline-none transition focus:border-amber-400 focus:ring-1 focus:ring-amber-400"
                  />
                </div>

                <div className="space-y-2">
                  <label htmlFor="password" className="block text-xs font-medium uppercase tracking-wider text-zinc-300">
                    Password
                  </label>
                  <input
                    id="password"
                    type="password"
                    placeholder="Enter your password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    className="w-full rounded-xl border border-zinc-800 bg-zinc-900 p-3 text-white placeholder-zinc-600 outline-none transition focus:border-amber-400 focus:ring-1 focus:ring-amber-400"
                  />
                </div>

                <div className="pt-2">
                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full rounded-xl bg-amber-400 p-3 font-semibold text-black transition hover:bg-amber-300 active:scale-[0.99] disabled:opacity-50"
                  >
                    {loading ? "Signing In..." : "Sign In"}
                  </button>
                </div>

              </form>

              <footer className="mt-6 border-t border-zinc-800 pt-6 text-center space-y-1">
                <p className="text-xs text-zinc-400">
                  New to course recommendations?
                </p>
                <button
                  type="button"
                  onClick={onSwitchToSignup}
                  className="text-sm font-semibold text-amber-400 transition hover:text-amber-300"
                >
                  Create an account
                </button>
              </footer>

            </section>
          </div>
        )}

      </div>
    </main>
  );
}