import Recommendations from "./recommendations.jsx";

export default function App() {
  const handleNavigate = (page) => {
    console.log("Navigating to:", page);
  };

  const handleBackToHome = () => {
    console.log("Back to home clicked");
  };

  const handleLoginClick = () => {
    console.log("Login clicked");
  };

  return (
    <Recommendations 
      onNavigate={handleNavigate} 
      onBackToHome={handleBackToHome} 
      onLoginClick={handleLoginClick} 
    />
  );
}