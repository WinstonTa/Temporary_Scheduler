import { useState } from "react";
import Login from "./Login";
import Quiz from "./Quiz";

export default function App() {
  const [user, setUser] = useState(null);

  if (!user) {
    return <Login onLogin={setUser} />;
  }

  return <Quiz user={user} />;
}