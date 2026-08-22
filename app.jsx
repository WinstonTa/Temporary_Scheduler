import { useEffect, useState } from "react";
import Login from "./login.jsx";
import Signup from "./signup.jsx";
import Quiz from "./quiz.jsx";
import { supabase, supabaseConfigured } from "./supabase";

export default function App() {
  const [session, setSession] = useState(undefined);
  const [authView, setAuthView] = useState("login");

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

  if (!supabaseConfigured) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50 px-6">
        <p className="max-w-md text-center text-red-600">
          Missing <code>VITE_SUPABASE_URL</code> or{" "}
          <code>VITE_SUPABASE_PUBLISHABLE_KEY</code> in <code>.env</code>.
        </p>
      </div>
    );
  }

  if (session === undefined) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <p className="text-gray-500">Checking your session...</p>
      </div>
    );
  }

  if (session) {
    return (
      <Quiz
        onSignOut={() => {
          supabase.auth.signOut();
        }}
      />
    );
  }

  return authView === "login" ? (
    <Login onSwitchToSignup={() => setAuthView("signup")} />
  ) : (
    <Signup onSwitchToLogin={() => setAuthView("login")} />
  );
}
