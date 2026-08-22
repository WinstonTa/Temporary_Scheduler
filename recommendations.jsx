import { useState } from "react";

export default function Recommendations({ onNavigate, onBackToHome, onLoginClick }) {
  const [showRecommendations, setShowRecommendations] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [enrolledCourses, setEnrolledCourses] = useState([]);

  // Sample course data tailored for Classio
  const courses = [
    {
      id: 1,
      code: "CS 101",
      title: "Introduction to Computer Science",
      category: "Computer Science",
      difficulty: "Beginner",
      credits: 4,
      description: "Learn the foundational principles of programming using Python. Covers loops, functions, data structures, and algorithmic thinking.",
      tags: ["Python", "Algorithms", "Coding"]
    },
    {
      id: 2,
      code: "MATH 201",
      title: "Calculus for Engineers & Scientists",
      category: "Mathematics",
      difficulty: "Intermediate",
      credits: 4,
      description: "Dive into limits, derivatives, integrals, and series expansions with practical applications in physical and computational sciences.",
      tags: ["Calculus", "Analysis", "STEM"]
    },
    {
      id: 3,
      code: "DATA 150",
      title: "Applied Data Analytics",
      category: "Data Science",
      difficulty: "Intermediate",
      credits: 3,
      description: "Transform raw data into meaningful insights. Gain hands-on experience cleaning datasets, building visualizations, and running statistical tests.",
      tags: ["Pandas", "Visualization", "Statistics"]
    },
    {
      id: 4,
      code: "AI 305",
      title: "Foundations of Artificial Intelligence",
      category: "Computer Science",
      difficulty: "Advanced",
      credits: 4,
      description: "Explore search algorithms, knowledge representation, probabilistic reasoning, and an introduction to machine learning models.",
      tags: ["Machine Learning", "Python", "Neural Nets"]
    },
    {
      id: 5,
      code: "BUS 110",
      title: "Principles of Entrepreneurship",
      category: "Business",
      difficulty: "Beginner",
      credits: 3,
      description: "Learn how to spot market opportunities, validate business models, draft lean canvases, and pitch ideas effectively.",
      tags: ["Startups", "Strategy", "Marketing"]
    },
    {
      id: 6,
      code: "PHYS 102",
      title: "General Physics: Electricity & Magnetism",
      category: "Science",
      difficulty: "Intermediate",
      credits: 4,
      description: "Understand electric fields, Gauss's law, circuits, magnetic induction, and Maxwell's equations through laboratory practice.",
      tags: ["Physics", "Circuits", "Lab"]
    }
  ];

  const toggleEnroll = (id) => {
    setEnrolledCourses(prev => 
      prev.includes(id) ? prev.filter(cId => cId !== id) : [...prev, id]
    );
  };

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

      {/* Top Header Navigation Bar */}
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

          {/* Centered Navigation Links with Even Spacing */}
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
              className="text-amber-400 font-semibold focus:outline-none"
            >
              Course Recommendations
            </button>
          </nav>

          {/* Far Right Action Button */}
          <div className="flex items-center">
            <button
              onClick={onLoginClick}
              className="rounded-xl bg-amber-400 px-5 py-2.5 text-sm font-semibold text-black transition hover:bg-amber-300 active:scale-[0.99] focus:outline-none shadow-lg shadow-amber-400/10"
            >
              Login
            </button>
          </div>

        </div>
      </header>

      {/* Mobile Navigation Bar */}
      <nav className="flex lg:hidden items-center justify-center space-x-8 px-6 py-3 text-xs font-medium text-zinc-400 border-b border-zinc-800 bg-zinc-950" aria-label="Mobile Navigation">
        <button onClick={() => onNavigate?.("schedule")} className="hover:text-amber-400">Schedule</button>
        <button onClick={() => onNavigate?.("quiz")} className="hover:text-amber-400">Quiz</button>
        <button onClick={() => onNavigate?.("recommendations")} className="text-amber-400 font-semibold">Recommendations</button>
      </nav>

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
              onClick={() => setShowRecommendations(true)}
              className="rounded-xl bg-amber-400 px-8 py-4 text-base font-semibold text-black transition hover:bg-amber-300 active:scale-[0.99] shadow-xl shadow-amber-400/10 focus:outline-none"
            >
              Recommend Me Courses
            </button>
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