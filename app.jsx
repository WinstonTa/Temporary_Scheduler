import { useState } from "react";
import Login from "./login.jsx";
import Signup from "./signup.jsx";

export default function App() {
  const [currentView, setCurrentView] = useState("login");

  return (
    <div>
      {currentView === "login" ? (
        <Login
          onSwitchToSignup={() => setCurrentView("signup")}
        />
      ) : (
        <Signup
          onSwitchToLogin={() => setCurrentView("login")}
        />
      )}
    </div>
  );
}