import { useState } from "react";
import { authRedirectTo, supabase } from "./supabase";

export default function Signup({ onSwitchToLogin, onNavigate, onBackToHome }) {
  const [email, setEmail] = useState("");
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
      const { data, error } = await supabase.auth.signUp({
        email: email.trim(),
        password,
        options: { emailRedirectTo: authRedirectTo() },
      });

      if (error) {
        setErrorMsg(error.message);
        return;
      }

      if (data.session) {
        return;
      }

      setSuccessMsg(
        "Account created. Check your email for a confirmation link before you can log in."
      );
      setEmail("");
      setPassword("");
    } catch (err) {
      console.error("Signup error:", err);
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

      {/* Background Subtle Animated Graph / Grid Lines */}
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
          
          {/* Brand Logo */}
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


          <div className="flex items-center">
            <button
              onClick={onSwitchToLogin}
              className="rounded-xl bg-amber-400 px-5 py-2.5 text-sm font-semibold text-black transition hover:bg-amber-300 active:scale-[0.99] focus:outline-none shadow-lg shadow-amber-400/10"
            >
              Login
            </button>
          </div>
        </div>
      </header>


      <nav className="flex lg:hidden items-center justify-center space-x-8 px-6 py-3 text-xs font-medium text-zinc-400 border-b border-zinc-800 bg-zinc-950" aria-label="Mobile Navigation">
        <button onClick={() => onNavigate?.("schedule")} className="hover:text-amber-400">Schedule</button>
        <button onClick={() => onNavigate?.("quiz")} className="hover:text-amber-400">Quiz</button>
        <button onClick={() => onNavigate?.("recommendations")} className="hover:text-amber-400">Recommendations</button>
      </nav>

      {/* Main Content / Sign Up Container */}
      <div className="relative z-10 flex flex-1 items-center justify-center px-6 py-12" style={{ fontFamily: "'Lexend', sans-serif" }}>
        <div className="w-full max-w-md animate-pop-up space-y-6">

          <header className="text-center space-y-2">
            <p className="text-xs font-semibold uppercase tracking-widest text-amber-400">
              Course Finder & Recommender
            </p>
            <h1 className="text-5xl font-normal tracking-wide text-amber-300" style={{ fontFamily: "'Caveat', cursive" }}>
              Create an Account
            </h1>
            <p className="text-sm text-zinc-400 max-w-xs mx-auto font-light">
              Sign up to unlock personalized course summaries and recommendations.
            </p>
          </header>

          <section className="rounded-2xl border border-zinc-800 bg-zinc-950 p-8 shadow-xl">
            
            {errorMsg && (
              <div role="alert" className="mb-6 rounded-xl border border-red-900/40 bg-red-950/30 p-3.5 text-sm text-red-400">
                {errorMsg}
              </div>
            )}

            {successMsg && (
              <div role="status" className="mb-6 rounded-xl border border-emerald-900/40 bg-emerald-950/30 p-3.5 text-sm text-emerald-400">
                {successMsg}
              </div>
            )}

            <form onSubmit={handleSignup} className="space-y-5" noValidate>

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
                  placeholder="Create a password"
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
                  {loading ? "Creating Account..." : "Sign Up"}
                </button>
              </div>

            </form>

            <div className="my-6 flex items-center gap-3">
              <div className="h-px flex-1 bg-zinc-800" />
              <span className="text-xs uppercase tracking-wider text-zinc-500">or</span>
              <div className="h-px flex-1 bg-zinc-800" />
            </div>

            <button
              type="button"
              onClick={handleGoogle}
              disabled={loading}
              className="flex w-full items-center justify-center gap-3 rounded-xl border border-zinc-700 bg-zinc-900 p-3 font-semibold text-white transition hover:border-amber-400 hover:bg-zinc-800 active:scale-[0.99] disabled:opacity-50"
            >
              <svg aria-hidden="true" className="h-5 w-5" viewBox="0 0 24 24">
                <path
                  fill="#4285F4"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="#34A853"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                />
                <path
                  fill="#EA4335"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                />
              </svg>
              Sign Up with Google
            </button>

            <footer className="mt-6 border-t border-zinc-800 pt-6 text-center space-y-1">
              <p className="text-xs text-zinc-400">
                Already have an account?
              </p>
              <button
                type="button"
                onClick={onSwitchToLogin}
                className="text-sm font-semibold text-amber-400 transition hover:text-amber-300"
              >
                Sign in
              </button>
            </footer>

          </section>
        </div>
      </div>
    </main>
  );
}
