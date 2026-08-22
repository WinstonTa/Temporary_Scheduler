import { useState } from "react";

export default function Schedule({ onNavigate, onBackToHome, onLoginClick }) {
  // Free-form schedule state (starts empty)
  const [events, setEvents] = useState([]);

  const days = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
  const hours = [
    "08:00 AM", "09:00 AM", "10:00 AM", "11:00 AM", 
    "12:00 PM", "01:00 PM", "02:00 PM", "03:00 PM", 
    "04:00 PM", "05:00 PM"
  ];

  // Modal & Editing State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [newEvent, setNewEvent] = useState({
    title: "",
    code: "",
    day: "Monday",
    startTime: "09:00",
    endTime: "11:00",
    location: "",
    color: "amber",
  });

  // Consistent brand color mapping helper (sticking strictly to brand amber/zinc tones)
  const getColorStyles = (color) => {
    switch (color) {
      case "gold":
        return "bg-amber-900/40 border-amber-600/60 text-amber-200";
      case "subtle":
        return "bg-zinc-900/90 border-zinc-700/80 text-zinc-300";
      case "amber":
      default:
        return "bg-amber-950/80 border-amber-800/80 text-amber-300";
    }
  };

  const handleOpenAddModal = () => {
    setEditingId(null);
    setNewEvent({
      title: "",
      code: "",
      day: "Monday",
      startTime: "09:00",
      endTime: "11:00",
      location: "",
      color: "amber",
    });
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (item) => {
    setEditingId(item.id);
    setNewEvent({
      title: item.title,
      code: item.code,
      day: item.day,
      startTime: item.startTime,
      endTime: item.endTime,
      location: item.location,
      color: item.color,
    });
    setIsModalOpen(true);
  };

  const handleSaveEvent = (e) => {
    e.preventDefault();
    if (!newEvent.title.trim()) return;

    if (editingId) {
      // Update existing event
      setEvents((prev) =>
        prev.map((event) =>
          event.id === editingId
            ? { ...newEvent, id: editingId, code: newEvent.code.trim().toUpperCase() || "CLASS" }
            : event
        )
      );
    } else {
      // Create new event
      const itemToAdd = {
        ...newEvent,
        id: Date.now(),
        code: newEvent.code.trim().toUpperCase() || "CLASS",
      };
      setEvents((prev) => [...prev, itemToAdd]);
    }

    setIsModalOpen(false);
    setEditingId(null);
  };

  const handleDeleteEvent = (id) => {
    setEvents((prev) => prev.filter((event) => event.id !== id));
  };

  // Helper to convert "HH:MM" (24hr) into total minutes from midnight
  const timeToMinutes = (timeStr) => {
    const [h, m] = timeStr.split(":").map(Number);
    return h * 60 + m;
  };

  return (
    <main className="relative flex min-h-screen flex-col bg-zinc-950 text-white overflow-x-hidden">
      
      {/* Styles & Animations */}
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
          animation: popUp 1.8s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }
      `}</style>

      {/* Background Subtle Animated Graph / Grid Lines */}
      <div className="absolute inset-0 pointer-events-none z-0 flex items-center justify-center opacity-35" aria-hidden="true">
        <svg className="w-full h-full" viewBox="0 0 1200 800" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M0 200H1200M0 400H1200M0 600H1200" stroke="#27272a" strokeWidth="1" strokeDasharray="6 6" />
          <path d="M200 0V800M400 0V800M600 0V800M800 0V800M1000 0V800" stroke="#27272a" strokeWidth="1" strokeDasharray="6 6" />
          <path 
            d="M50 600Q300 400 600 450T1050 250T1150 150" 
            stroke="url(#goldGradient)" 
            strokeWidth="2.5" 
            className="animate-pulse"
          />
          <defs>
            <linearGradient id="goldGradient" x1="0" y1="0" x2="1200" y2="0" gradientUnits="userSpaceOnUse">
              <stop stopColor="#f59e0b" stopOpacity="0.05" />
              <stop offset="0.5" stopColor="#f59e0b" stopOpacity="0.55" />
              <stop offset="1" stopColor="#f59e0b" stopOpacity="0.05" />
            </linearGradient>
          </defs>
        </svg>
      </div>

      {/* Navigation Header */}
      <header className="relative z-10 w-full border-b border-zinc-800 bg-zinc-950/90 backdrop-blur-md">
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
              className="text-amber-400 font-semibold focus:outline-none"
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
              onClick={onLoginClick}
              className="rounded-xl bg-amber-400 px-5 py-2.5 text-sm font-semibold text-black transition hover:bg-amber-300 active:scale-[0.99] focus:outline-none shadow-lg shadow-amber-400/10"
            >
              Login
            </button>
          </div>

        </div>
      </header>

      {/* Mobile Navigation Bar */}
      <nav className="flex lg:hidden items-center justify-center space-x-8 px-6 py-3 text-xs font-medium text-zinc-400 border-b border-zinc-800 bg-zinc-950 relative z-10" aria-label="Mobile Navigation">
        <button onClick={() => onNavigate?.("schedule")} className="text-amber-400 font-semibold">Schedule</button>
        <button onClick={() => onNavigate?.("quiz")} className="hover:text-amber-400">Quiz</button>
        <button onClick={() => onNavigate?.("recommendations")} className="hover:text-amber-400">Recommendations</button>
      </nav>

      {/* Main Centered Content Area */}
      <div className="relative z-10 flex flex-1 flex-col items-center px-4 md:px-8 py-12 max-w-7xl mx-auto w-full" style={{ fontFamily: "'Lexend', sans-serif" }}>
        
        {/* Page Heading & Add Event Action */}
        <div className="w-full flex flex-col md:flex-row md:items-end justify-between gap-6 mb-10 animate-pop-up border-b border-zinc-800/80 pb-8">
          <div className="space-y-2">
            <p className="text-xs font-semibold uppercase tracking-widest text-amber-400">
              Weekly Calendar
            </p>
            <h1 className="text-5xl md:text-6xl font-normal tracking-wide text-amber-300" style={{ fontFamily: "'Caveat', cursive" }}>
              My Calendar
            </h1>
            <p className="text-sm text-zinc-400 font-light max-w-md">
              Organize your 7-day week. Click any event card to edit its details or correct its ending time.
            </p>
          </div>

          <button
            onClick={handleOpenAddModal}
            className="self-start md:self-auto rounded-xl bg-amber-400 px-6 py-3 text-sm font-semibold text-black transition hover:bg-amber-300 active:scale-[0.99] focus:outline-none shadow-lg shadow-amber-400/10 flex items-center space-x-2"
          >
            <span>+ Add Class / Event</span>
          </button>
        </div>

        {/* Calendar-Style 7-Day Grid Container */}
        <div className="w-full rounded-2xl border border-zinc-800/80 bg-zinc-950/90 backdrop-blur-xl shadow-2xl overflow-x-auto animate-pop-up">
          <div className="min-w-[1100px]">
            
            {/* Calendar Header Row */}
            <div className="grid grid-cols-8 border-b border-zinc-800 bg-zinc-900/60 sticky top-0 z-20">
              <div className="p-3 text-center text-xs font-semibold uppercase tracking-wider text-zinc-500 border-r border-zinc-800">
                Time
              </div>
              {days.map((day, idx) => (
                <div 
                  key={day} 
                  className={`p-3 text-center text-xs md:text-sm font-semibold text-zinc-200 ${idx !== days.length - 1 ? 'border-r border-zinc-800' : ''}`}
                >
                  {day}
                </div>
              ))}
            </div>

            {/* Calendar Body Rows (Time Slots starting at 8:00 AM / 480 minutes) */}
            {hours.map((hour, hIdx) => {
              const rowStartMinutes = 480 + hIdx * 60; // 8:00 AM is 480 mins

              return (
                <div key={hour} className="grid grid-cols-8 border-b border-zinc-900/80 min-h-[95px] relative">
                  
                  {/* Time Label Column */}
                  <div className="p-3 text-right text-[11px] font-light text-zinc-500 border-r border-zinc-800 bg-zinc-950/60 select-none">
                    {hour}
                  </div>

                  {/* Day Columns */}
                  {days.map((day, dIdx) => {
                    const slotEvents = events.filter((e) => {
                      if (e.day !== day) return false;
                      const eventStartMin = timeToMinutes(e.startTime);
                      // Render event in the row matching its start time block
                      return eventStartMin >= rowStartMinutes && eventStartMin < rowStartMinutes + 60;
                    });

                    return (
                      <div 
                        key={day} 
                        className={`p-1.5 relative transition hover:bg-zinc-900/20 ${dIdx !== days.length - 1 ? 'border-r border-zinc-900/60' : ''}`}
                      >
                        {slotEvents.map((item) => {
                          const startMin = timeToMinutes(item.startTime);
                          const endMin = timeToMinutes(item.endTime);
                          const durationMins = Math.max(30, endMin - startMin);
                          
                          // Calculate precise height relative to 95px per hour row
                          const heightPx = (durationMins / 60) * 95 - 6;

                          return (
                            <div
                              key={item.id}
                              style={{ height: `${heightPx}px` }}
                              className={`group absolute inset-x-1.5 top-1.5 z-10 flex flex-col justify-between overflow-hidden rounded-xl border p-2.5 shadow-lg transition-all ${getColorStyles(item.color)}`}
                            >
                              <div>
                                <div className="flex items-start justify-between gap-1">
                                  <span className="text-[9px] font-semibold tracking-wider uppercase opacity-90">
                                    {item.code}
                                  </span>
                                  
                                  {/* Action Buttons */}
                                  <div className="flex items-center space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <button
                                      onClick={() => handleOpenEditModal(item)}
                                      className="text-zinc-400 hover:text-amber-300 text-xs px-1"
                                      title="Edit event"
                                      aria-label="Edit event"
                                    >
                                      ✏️
                                    </button>
                                    <button
                                      onClick={() => handleDeleteEvent(item.id)}
                                      className="text-zinc-400 hover:text-red-400 text-xs px-1"
                                      title="Delete event"
                                      aria-label="Delete event"
                                    >
                                      ✕
                                    </button>
                                  </div>
                                </div>

                                <h4 className="text-xs font-semibold text-white mt-0.5 leading-snug truncate">
                                  {item.title}
                                </h4>
                              </div>

                              <div className="space-y-0.5 text-[10px] text-zinc-300 font-light mt-1">
                                <p className="flex items-center space-x-1">
                                  <span>🕒</span>
                                  <span>{item.startTime} - {item.endTime}</span>
                                </p>
                                {item.location && (
                                  <p className="flex items-center space-x-1 text-zinc-400 truncate">
                                    <span>📍</span>
                                    <span>{item.location}</span>
                                  </p>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    );
                  })}

                </div>
              );
            })}

          </div>
        </div>

      </div>

      {/* Add / Edit Class Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4">
          <div className="w-full max-w-lg rounded-2xl border border-zinc-800 bg-zinc-950 p-6 shadow-2xl space-y-6 animate-pop-up">
            
            <div className="flex items-center justify-between border-b border-zinc-800 pb-4">
              <h2 className="text-2xl font-normal text-amber-300" style={{ fontFamily: "'Caveat', cursive" }}>
                {editingId ? "Edit Calendar Event" : "Add Calendar Event"}
              </h2>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-zinc-500 hover:text-white transition focus:outline-none"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveEvent} className="space-y-4 text-xs font-medium text-zinc-300">
              
              <div className="space-y-1.5">
                <label htmlFor="courseTitle" className="block uppercase tracking-wider text-zinc-400">
                  Event / Class Name *
                </label>
                <input
                  id="courseTitle"
                  type="text"
                  required
                  placeholder="e.g. Data Structures Lecture"
                  value={newEvent.title}
                  onChange={(e) => setNewEvent({ ...newEvent, title: e.target.value })}
                  className="w-full rounded-xl border border-zinc-800 bg-zinc-900 p-3 text-white placeholder-zinc-600 outline-none transition focus:border-amber-400"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label htmlFor="courseCode" className="block uppercase tracking-wider text-zinc-400">
                    Code / Tag
                  </label>
                  <input
                    id="courseCode"
                    type="text"
                    placeholder="e.g. CS 201"
                    value={newEvent.code}
                    onChange={(e) => setNewEvent({ ...newEvent, code: e.target.value })}
                    className="w-full rounded-xl border border-zinc-800 bg-zinc-900 p-3 text-white placeholder-zinc-600 outline-none transition focus:border-amber-400"
                  />
                </div>
                <div className="space-y-1.5">
                  <label htmlFor="courseLocation" className="block uppercase tracking-wider text-zinc-400">
                    Location
                  </label>
                  <input
                    id="courseLocation"
                    type="text"
                    placeholder="e.g. Hall 4B"
                    value={newEvent.location}
                    onChange={(e) => setNewEvent({ ...newEvent, location: e.target.value })}
                    className="w-full rounded-xl border border-zinc-800 bg-zinc-900 p-3 text-white placeholder-zinc-600 outline-none transition focus:border-amber-400"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div className="space-y-1.5">
                  <label htmlFor="courseDay" className="block uppercase tracking-wider text-zinc-400">
                    Day
                  </label>
                  <select
                    id="courseDay"
                    value={newEvent.day}
                    onChange={(e) => setNewEvent({ ...newEvent, day: e.target.value })}
                    className="w-full rounded-xl border border-zinc-800 bg-zinc-900 p-3 text-white outline-none transition focus:border-amber-400"
                  >
                    {days.map((d) => (
                      <option key={d} value={d}>{d}</option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label htmlFor="startTime" className="block uppercase tracking-wider text-zinc-400">
                    Start Time
                  </label>
                  <input
                    id="startTime"
                    type="time"
                    required
                    value={newEvent.startTime}
                    onChange={(e) => setNewEvent({ ...newEvent, startTime: e.target.value })}
                    className="w-full rounded-xl border border-zinc-800 bg-zinc-900 p-3 text-white outline-none transition focus:border-amber-400"
                  />
                </div>

                <div className="space-y-1.5">
                  <label htmlFor="endTime" className="block uppercase tracking-wider text-zinc-400">
                    End Time
                  </label>
                  <input
                    id="endTime"
                    type="time"
                    required
                    value={newEvent.endTime}
                    onChange={(e) => setNewEvent({ ...newEvent, endTime: e.target.value })}
                    className="w-full rounded-xl border border-zinc-800 bg-zinc-900 p-3 text-white outline-none transition focus:border-amber-400"
                  />
                </div>
              </div>

              <div className="space-y-1.5 pt-2">
                <label className="block uppercase tracking-wider text-zinc-400">
                  Theme Accent Color
                </label>
                <div className="flex items-center space-x-3">
                  {["amber", "gold", "subtle"].map((c) => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => setNewEvent({ ...newEvent, color: c })}
                      className={`h-7 w-7 rounded-full border transition ${
                        newEvent.color === c ? "border-white scale-110" : "border-transparent opacity-60 hover:opacity-100"
                      } ${
                        c === "amber" ? "bg-amber-600" :
                        c === "gold" ? "bg-amber-400" : "bg-zinc-700"
                      }`}
                    />
                  ))}
                </div>
              </div>

              <div className="pt-4 flex items-center justify-end space-x-3 border-t border-zinc-800">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="rounded-xl border border-zinc-800 px-4 py-2.5 text-zinc-400 hover:text-white transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="rounded-xl bg-amber-400 px-5 py-2.5 text-black font-semibold hover:bg-amber-300 transition"
                >
                  {editingId ? "Update Event" : "Save Event"}
                </button>
              </div>

            </form>

          </div>
        </div>
      )}

    </main>
  );
}