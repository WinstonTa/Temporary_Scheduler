import { useEffect, useState } from "react";
import LandingPage from "./landing.jsx";
import Login from "./login.jsx";
import Signup from "./signup.jsx";
import Quiz from "./quiz.jsx";
import Recommendations from "./recommendations.jsx";
import Schedule from "./schedule.jsx";
import { supabase, supabaseConfigured } from "./supabase";

function ClassioMessage({ children, error = false }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-black px-6">
      <p className={`max-w-md text-center ${error ? "text-red-400" : "text-zinc-400"}`}>
        {children}
      </p>
    </div>
  );
}

const SIGNED_IN_PAGES = ["landing", "quiz", "schedule", "recommendations"];

export default function App() {
  const [session, setSession] = useState(undefined);
  const [guestView, setGuestView] = useState("landing");
  const [signedInView, setSignedInView] = useState("quiz");

  useEffect(() => {
    if (!supabaseConfigured) {
      setSession(null);
      return;
    }

    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session ?? null);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
    });

    return () => subscription.unsubscribe();
  }, []);

  const goToLogin = () => setGuestView("login");
  const goToSignup = () => setGuestView("signup");
  const goToLanding = () => {
    if (session) {
      setSignedInView("landing");
      return;
    }
    setGuestView("landing");
  };

  const handleNavigate = (page) => {
    if (page === "quiz" || page === "schedule" || page === "recommendations") {
      setGuestView("login");
    }
  };

  const handleSignedInNavigate = (page) => {
    if (SIGNED_IN_PAGES.includes(page)) {
      setSignedInView(page);
    }
  };

  const signOut = () => {
    setGuestView("landing");
    setSignedInView("quiz");
    supabase.auth.signOut();
  };

  if (!supabaseConfigured) {
    return (
      <ClassioMessage error>
        Missing <code>VITE_SUPABASE_URL</code> or{" "}
        <code>VITE_SUPABASE_PUBLISHABLE_KEY</code> in <code>.env</code>.
      </ClassioMessage>
    );
  }

  if (session === undefined) {
    return <ClassioMessage>Checking your session...</ClassioMessage>;
  }

  if (session) {
    if (signedInView === "landing") {
      return (
        <LandingPage
          isSignedIn
          onSignOut={signOut}
          onNavigate={handleSignedInNavigate}
        />
      );
    }

    if (signedInView === "recommendations") {
      return (
        <Recommendations
          onNavigate={handleSignedInNavigate}
          onBackToHome={goToLanding}
          onSignOut={signOut}
        />
      );
    }

    if (signedInView === "schedule") {
      return (
        <Schedule
          onNavigate={handleSignedInNavigate}
          onBackToHome={goToLanding}
          onSignOut={signOut}
        />
      );
    }

    return (
      <Quiz
        onSignOut={signOut}
        onNavigate={handleSignedInNavigate}
        onGoHome={goToLanding}
      />
    );
  }

  if (guestView === "login") {
    return (
      <Login
        onSwitchToSignup={goToSignup}
        onBackToHome={goToLanding}
        onNavigate={handleNavigate}
      />
    );
  }

  if (guestView === "signup") {
    return (
      <Signup
        onSwitchToLogin={goToLogin}
        onBackToHome={goToLanding}
        onNavigate={handleNavigate}
      />
    );
  }

  return (
    <LandingPage
      onLoginClick={goToLogin}
      onSignupClick={goToSignup}
      onNavigate={handleNavigate}
    />
  );
}
