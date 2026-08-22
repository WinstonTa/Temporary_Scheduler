export default function ClassioNav({
  activePage,
  onNavigate,
  onLogoClick,
  actionLabel,
  onAction,
}) {
  const linkClass = (page) =>
    page === activePage
      ? "text-amber-400 font-semibold focus:outline-none"
      : "transition hover:text-amber-400 focus:outline-none";

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Caveat:wght@500;600&family=Lexend:wght@300;400;500;600&display=swap');
      `}</style>
      <header className="relative z-10 w-full border-b border-zinc-800 bg-zinc-950/80 backdrop-blur-md">
        <div className="mx-auto flex h-20 max-w-7xl items-center justify-between px-8 md:px-12">
          <div className="flex items-center">
            <button
              type="button"
              onClick={onLogoClick}
              className="text-3xl font-normal tracking-wide text-amber-300 focus:outline-none"
              style={{ fontFamily: "'Caveat', cursive" }}
            >
              Classio
            </button>
          </div>

          <nav
            className="hidden items-center space-x-12 text-sm font-medium text-zinc-300 lg:flex"
            aria-label="Main Navigation"
          >
            <button
              type="button"
              onClick={() => onNavigate?.("schedule")}
              className={linkClass("schedule")}
            >
              Schedule
            </button>
            <button
              type="button"
              onClick={() => onNavigate?.("quiz")}
              className={linkClass("quiz")}
            >
              Quiz
            </button>
            <button
              type="button"
              onClick={() => onNavigate?.("recommendations")}
              className={linkClass("recommendations")}
            >
              Course Recommendations
            </button>
          </nav>

          <div className="flex items-center">
            <button
              type="button"
              onClick={onAction}
              className="rounded-xl bg-amber-400 px-5 py-2.5 text-sm font-semibold text-black shadow-lg shadow-amber-400/10 transition hover:bg-amber-300 active:scale-[0.99] focus:outline-none"
            >
              {actionLabel}
            </button>
          </div>
        </div>
      </header>

      <nav
        className="flex items-center justify-center space-x-8 border-b border-zinc-800 bg-zinc-950 px-6 py-3 text-xs font-medium text-zinc-400 lg:hidden"
        aria-label="Mobile Navigation"
      >
        <button
          type="button"
          onClick={() => onNavigate?.("schedule")}
          className={linkClass("schedule")}
        >
          Schedule
        </button>
        <button
          type="button"
          onClick={() => onNavigate?.("quiz")}
          className={linkClass("quiz")}
        >
          Quiz
        </button>
        <button
          type="button"
          onClick={() => onNavigate?.("recommendations")}
          className={linkClass("recommendations")}
        >
          Recommendations
        </button>
      </nav>
    </>
  );
}
