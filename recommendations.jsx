import { useState } from "react";
import ClassioNav from "./classio-nav.jsx";
import { authRedirectTo, supabase } from "./supabase";

export default function Recommendations({ onNavigate, onBackToHome, onSignOut }) {
  const [showRecommendations, setShowRecommendations] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [enrolledCourses, setEnrolledCourses] = useState([]);
  const [courses, setCourses] = useState([]);     
  const [loading, setLoading] = useState(false);   
  const [error, setError] = useState(null);        

  const toggleEnroll = (id) => {
    setEnrolledCourses(prev => 
      prev.includes(id) ? prev.filter(cId => cId !== id) : [...prev, id]
    );
  };
// Buckets a 1-5 RMP difficulty score into a label the card UI already
  // has styling for. Thresholds are a reasonable starting guess —
  // tune them if real data skews the buckets oddly.
  function difficultyLabel(avgDifficulty) {
    if (avgDifficulty == null) return "Intermediate"; // fallback for TBA/no-professor sections
    if (avgDifficulty <= 2.5) return "Beginner";
    if (avgDifficulty <= 3.5) return "Intermediate";
    return "Advanced";
  }

  // Formats credits_min/credits_max into what the card expects as a
  // single "credits" number, or a "1-3" style string if it's a range.
  function formatCredits(min, max) {
    if (min == null) return null;
    if (min === max) return min;
    return `${min}-${max}`;
  }

  async function fetchRecommendations() {
    setLoading(true);
    setError(null);
    try {
      const { data: { user } } = await supabase.auth.getUser();

      const response = await fetch("http://localhost:8000/recommend-classes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user_id: user.id, term: "Fall 2026", match_count: 10 }),
      });

      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.detail || "Failed to get recommendations");
      }

      const result = await response.json();

      const mapped = result.recommendations.map((rec) => ({
        id: rec.offering_id,
        code: rec.course_code,
        title: rec.course_title,
        category: rec.department || "General",
        difficulty: difficultyLabel(rec.avg_difficulty),
        credits: formatCredits(rec.credits_min, rec.credits_max),
        description: `${rec.professor_first_name || "TBA"} ${rec.professor_last_name || ""} · ${rec.days || "TBA"} ${rec.start_time || ""}-${rec.end_time || ""}`,
        tags: [], // no clean data source yet — see note in chat
      }));

      setCourses(mapped);
      setShowRecommendations(true);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }
  const filteredCourses = courses.filter(course => {
    return course.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
           course.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
           course.tags.some(t => t.toLowerCase().includes(searchQuery.toLowerCase()));
  });

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
          animation: popUp 2s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }
      `}</style>

      {/* Background Grid & Gradient */}
      <div className="absolute inset-0 pointer-events-none flex items-center justify-center opacity-30" aria-hidden="true">
        <svg className="w-full h-full max-w-6xl" viewBox="0 0 800 600" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M0 150H800M0 300H800M0 450H800" stroke="#27272a" strokeWidth="1" strokeDasharray="4 4" />
          <path d="M200 0V600M400 0V600M600 0V600" stroke="#27272a" strokeWidth="1" strokeDasharray="4 4" />
        </svg>
      </div>

      <ClassioNav
        activePage="recommendations"
        onNavigate={onNavigate}
        onLogoClick={onBackToHome}
        actionLabel="Sign out"
        onAction={onSignOut}
      />

      {/* Main Recommendations Content */}
      <div className="relative z-10 flex flex-1 flex-col items-center px-6 py-16 max-w-7xl mx-auto w-full" style={{ fontFamily: "'Lexend', sans-serif" }}>
        
        {/* Page Heading */}
        <div className="text-center space-y-3 mb-8 animate-pop-up">
          <p className="text-xs font-semibold uppercase tracking-widest text-amber-400">
            Curated For Your Goals
          </p>
          <h1 className="text-5xl md:text-6xl font-normal tracking-wide text-amber-300" style={{ fontFamily: "'Caveat', cursive" }}>
            Course Recommendations
          </h1>
          <p className="text-sm md:text-base text-zinc-400 max-w-lg mx-auto font-light">
            Generate personalized academic matches based on your interests and skill levels.
          </p>
        </div>

        {/* Initial Action Button (Hidden after clicked) */}
        {!showRecommendations && (
          <div className="my-12 animate-pop-up">
            <button
               onClick={fetchRecommendations}
               disabled={loading}
               className="rounded-xl bg-amber-400 px-8 py-4 text-base font-semibold text-black transition hover:bg-amber-300 active:scale-[0.99] shadow-xl shadow-amber-400/10 focus:outline-none disabled:opacity-50"
               >
               {loading ? "Finding your matches..." : "Recommend Me Courses"}
            </button>
            {error && <p className="text-red-400 text-sm mt-3">{error}</p>}
          </div>
        )}

        {/* Recommendations View (Appears after clicking button) */}
        {showRecommendations && (
          <div className="w-full space-y-8 animate-pop-up">
            
            {/* Search Bar */}
            <div className="max-w-xl mx-auto">
              <input
                type="text"
                placeholder="Search courses by code, title, or keywords..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full rounded-xl border border-zinc-800 bg-zinc-900 px-4 py-3 text-sm text-white placeholder-zinc-500 outline-none transition focus:border-amber-400 focus:ring-1 focus:ring-amber-400"
              />
            </div>

            {/* Course Cards Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 w-full">
              {filteredCourses.length > 0 ? (
                filteredCourses.map((course) => {
                  const isEnrolled = enrolledCourses.includes(course.id);
                  return (
                    <div
                      key={course.id}
                      className="flex flex-col justify-between rounded-2xl border border-zinc-800 bg-zinc-950 p-6 shadow-xl transition hover:border-zinc-700"
                    >
                      <div className="space-y-4">
                        
                        {/* Card Top: Code & Difficulty */}
                        <div className="flex items-center justify-between">
                          <span className="rounded-lg bg-zinc-900 border border-zinc-800 px-2.5 py-1 text-xs font-semibold text-amber-300">
                            {course.code}
                          </span>
                          <div className="flex items-center space-x-2">
                            <span className="text-xs text-zinc-500">{course.credits} Credits</span>
                            <span className={`rounded-lg px-2.5 py-1 text-xs font-medium ${
                              course.difficulty === 'Beginner' ? 'bg-emerald-950/40 text-emerald-400 border border-emerald-900/40' :
                              course.difficulty === 'Intermediate' ? 'bg-amber-950/40 text-amber-400 border border-amber-900/40' :
                              'bg-purple-950/40 text-purple-400 border border-purple-900/40'
                            }`}>
                              {course.difficulty}
                            </span>
                          </div>
                        </div>

                        {/* Course Title & Description */}
                        <div className="space-y-2">
                          <h2 className="text-xl font-normal text-white" style={{ fontFamily: "'Caveat', cursive" }}>
                            {course.title}
                          </h2>
                          <p className="text-xs text-zinc-400 font-light leading-relaxed">
                            {course.description}
                          </p>
                        </div>

                        {/* Tags */}
                        <div className="flex flex-wrap gap-1.5 pt-1">
                          {course.tags.map((tag, index) => (
                            <span key={index} className="rounded-md bg-zinc-900 px-2 py-0.5 text-[10px] text-zinc-400">
                              #{tag}
                            </span>
                          ))}
                        </div>

                      </div>

                      {/* Card Footer: Action Button */}
                      <div className="pt-6 mt-6 border-t border-zinc-900 flex items-center justify-between">
                        <span className="text-xs text-zinc-500">{course.category}</span>
                        <button
                          onClick={() => toggleEnroll(course.id)}
                          className={`rounded-xl px-4 py-2 text-xs font-semibold transition ${
                            isEnrolled
                              ? "bg-emerald-400 text-black hover:bg-emerald-300"
                              : "bg-zinc-900 text-white border border-zinc-800 hover:border-amber-400 hover:text-amber-400"
                          }`}
                        >
                          {isEnrolled ? "Saved to Schedule ✓" : "+ Add to Schedule"}
                        </button>
                      </div>

                    </div>
                  );
                })
              ) : (
                <div className="col-span-full text-center py-16 space-y-2">
                  <p className="text-lg font-normal text-zinc-300" style={{ fontFamily: "'Caveat', cursive" }}>
                    No courses found matching your search.
                  </p>
                  <p className="text-xs text-zinc-500 font-light">
                    Try entering different keywords.
                  </p>
                </div>
              )}
            </div>

          </div>
        )}

      </div>
    </main>
  );
}