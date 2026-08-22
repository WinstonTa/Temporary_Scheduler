export default function LandingPage({ onNavigate, onLoginClick, onSignupClick }) {
  return (
    <main className="relative flex min-h-screen flex-col bg-gradient-to-br from-zinc-950 via-black to-black text-white overflow-hidden selection:bg-amber-400 selection:text-black">
      
      {/* Google Font Import & Refined Keyframe Animations */}
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Caveat:wght@500;600&family=Lexend:wght@300;400;500;600&display=swap');

        @keyframes fadeInUp {
          0% {
            opacity: 0;
            transform: translateY(16px);
          }
          100% {
            opacity: 1;
            transform: translateY(0);
          }
        }

        .animate-fade-in-1 {
          animation: fadeInUp 2.5s cubic-bezier(0.16, 1, 0.3, 1) 0.1s forwards;
          opacity: 0;
        }

        .animate-fade-in-2 {
          animation: fadeInUp 2.5s cubic-bezier(0.16, 1, 0.3, 1) 0.25s forwards;
          opacity: 0;
        }

        .animate-fade-in-3 {
          animation: fadeInUp 2.5s cubic-bezier(0.16, 1, 0.3, 1) 0.4s forwards;
          opacity: 0;
        }

        @keyframes spinSlow {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
        .animate-spin-slow {
          animation: spinSlow 45s linear infinite;
        }

        .gold-gradient-text {
          background: linear-gradient(135deg, #fde68a 0%, #fbbf24 50%, #d97706 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
        }
      `}</style>

      <div className="absolute inset-x-0 top-[calc(50%+40px)] -translate-y-1/2 pointer-events-none flex items-center justify-center opacity-25 overflow-hidden" aria-hidden="true">
        <div className="absolute w-[600px] h-[600px] bg-amber-500/10 rounded-full blur-3xl"></div>
        <svg className="w-[850px] h-[850px] max-w-none animate-spin-slow" viewBox="0 0 600 600" fill="none" xmlns="http://www.w3.org/2000/svg">
          <circle cx="300" cy="300" r="220" stroke="url(#goldGradient)" strokeWidth="1" strokeDasharray="3 6" />
          <circle cx="300" cy="300" r="160" stroke="url(#goldGradient)" strokeWidth="1.5" />
          <circle cx="300" cy="300" r="100" stroke="url(#goldGradient)" strokeWidth="1" strokeDasharray="4 4" />
          <path d="M300 80V520M80 300H520" stroke="url(#goldGradient)" strokeWidth="1" strokeDasharray="5 5" />
          <path d="M145 145L455 455M145 455L455 145" stroke="url(#goldGradient)" strokeWidth="0.8" strokeDasharray="4 4" />
          <path d="M80 300C80 180 180 80 300 80C420 80 520 180 520 300C520 420 420 520 300 520C180 520 80 420 80 300Z" stroke="url(#goldGradient)" strokeWidth="1.5" />
          <defs>
            <linearGradient id="goldGradient" x1="0" y1="0" x2="600" y2="600" gradientUnits="userSpaceOnUse">
              <stop stopColor="#fbbf24" stopOpacity="0.9" />
              <stop offset="0.5" stopColor="#d97706" stopOpacity="0.3" />
              <stop offset="1" stopColor="#fef3c7" stopOpacity="0.8" />
            </linearGradient>
          </defs>
        </svg>
      </div>

      {/* Top Header Navigation Bar */}
      <header className="relative z-10 w-full border-b border-zinc-800 bg-zinc-950/80 backdrop-blur-md">
        <div className="max-w-7xl mx-auto flex h-20 items-center justify-between px-8 md:px-12">
          
          {/* Brand Logo */}
          <div className="flex items-center">
            <span className="text-3xl font-normal tracking-wide text-amber-300" style={{ fontFamily: "'Caveat', cursive" }}>
              Classio
            </span>
          </div>

          {/* Centered Navigation Links with Even Spacing (Home removed) */}
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

          {/* Far Right Action Buttons */}
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={onLoginClick}
              className="px-4 py-2.5 text-sm font-medium text-zinc-300 transition hover:text-amber-400 focus:outline-none"
            >
              Login
            </button>
            <button
              type="button"
              onClick={onSignupClick}
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

      <section className="relative z-10 flex flex-1 flex-col items-center justify-center px-6 py-24 text-center" style={{ fontFamily: "'Lexend', sans-serif" }}>
        <div className="max-w-2xl space-y-4">
          
          <div className="animate-fade-in-1">
            <p className="text-xs font-semibold uppercase tracking-widest text-amber-400">
              Course Finder & Recommender
            </p>
          </div>

          <div className="animate-fade-in-2">
            <h1 className="text-6xl md:text-7xl font-normal tracking-wide gold-gradient-text leading-tight" style={{ fontFamily: "'Caveat', cursive" }}>
              Shape Your Academic Journey
            </h1>
          </div>

          <div className="animate-fade-in-3 space-y-8">
            <p className="text-sm md:text-base text-zinc-400 max-w-md mx-auto font-light leading-relaxed">
              Discover ideal courses, map your schedule, take diagnostic quizzes, and review instant summaries tailored just for you.
            </p>
            <div className="flex flex-wrap items-center justify-center gap-3">
              <button
                type="button"
                onClick={onSignupClick}
                className="rounded-xl bg-amber-400 px-6 py-3 text-sm font-semibold text-black transition hover:bg-amber-300 active:scale-[0.99] focus:outline-none shadow-lg shadow-amber-400/10"
              >
                Get started
              </button>
              <button
                type="button"
                onClick={onLoginClick}
                className="rounded-xl border border-zinc-700 px-6 py-3 text-sm font-semibold text-zinc-200 transition hover:border-amber-400 hover:text-amber-300 focus:outline-none"
              >
                Login
              </button>
            </div>
          </div>

        </div>
      </section>

    </main>
  );
}