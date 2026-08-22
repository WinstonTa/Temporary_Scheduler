import { useState } from "react";
import { appData, supabase } from "./supabase";
import ClassioNav from "./classio-nav.jsx";

const lowerDivisionCourses = [
  "MATH 122",
  "CECS 174",
  "ENGR 101",
  "MATH 123",
  "CECS 274",
  "CECS 225",
  "ENGR 102",
  "ENGR 105",
  "CECS 228",
  "CECS 229",
  "CECS 277",
];

const upperDivisionCourses = [
  "CECS 341",
  "CECS 328",
  "CECS 325",
  "CECS 343",
  "CECS 381",
  "CECS 329",
  "CECS 342",
  "CECS 326",
  "CECS 327",
  "ENGR 350",
  "ENGR 361",
  "CECS 378",
];

const baseQuestions = [
  {
    id: "year",
    type: "single",
    question: "What year are you?",
    options: ["Freshman", "Sophomore", "Junior", "Senior", "Senior+"],
  },
  {
    id: "lowerDivision",
    type: "multiple",
    question: "Select the lower division courses you have taken.",
    options: lowerDivisionCourses,
  },
  {
    id: "upperDivision",
    type: "multiple",
    question: "Select the upper division courses you have taken.",
    options: upperDivisionCourses,
  },
  {
    id: "professorTime",
    type: "single",
    question:
      "Is the time more important or is the quality of the professor more important",
    options: ["Time", "Professor"],
  },
  {
    id: "preferredClassTime",
    type: "text",
    question: "When do you prefer your classes to be?",
  },
  {
    id: "track",
    type: "single",
    question: "Have you picked a track?",
    options: ["Yes", "No"],
  },
];

const chosenTrackQuestion = {
  id: "chosenTrack",
  type: "single",
  question: "What track did you pick?",
  options: ["Software Engineering", "AI/ML", "Cybersecurity"],
};

const interestQuestions = [
  {
    id: "security",
    type: "text",
    question:
      "How do you feel about security, protection, and finding vulnerabilities?",
  },
  {
    id: "patterns",
    type: "text",
    question:
      "How do you feel about finding patterns, analyzing information, and leaning toward more mathematical topics?",
  },
  {
    id: "programming",
    type: "text",
    question:
      "How do you feel about programming, building, and creating products overall?",
  },
];

function getQuizPath(answers) {
  if (answers.track === "Yes") {
    return [...baseQuestions, chosenTrackQuestion];
  }
  if (answers.track === "No") {
    return [...baseQuestions, ...interestQuestions];
  }
  return baseQuestions;
}

function serializeAnswer(value) {
  if (Array.isArray(value)) {
    return JSON.stringify(value);
  }
  return String(value ?? "").trim();
}

function hasAnswer(value) {
  if (Array.isArray(value)) {
    return value.length > 0;
  }
  return String(value ?? "").trim().length > 0;
}

export default function Quiz({ onSignOut, onNavigate, onGoHome }) {
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [answers, setAnswers] = useState({});
  const [finished, setFinished] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");

  const questions = getQuizPath(answers);
  const question = questions[currentQuestion] ?? questions[questions.length - 1];
  const isLastQuestion = currentQuestion >= questions.length - 1;
  const progress = ((currentQuestion + 1) / questions.length) * 100;

  const selectSingleAnswer = (answer) => {
    setAnswers((previous) => {
      const next = {
        ...previous,
        [question.id]: answer,
      };

      if (question.id === "track") {
        if (answer === "Yes") {
          delete next.security;
          delete next.patterns;
          delete next.programming;
        } else {
          delete next.chosenTrack;
        }
      }

      return next;
    });
  };

  const toggleMultipleAnswer = (answer) => {
    const currentAnswers = answers[question.id] || [];

    const newAnswers = currentAnswers.includes(answer)
      ? currentAnswers.filter((item) => item !== answer)
      : [...currentAnswers, answer];

    setAnswers((previous) => ({
      ...previous,
      [question.id]: newAnswers,
    }));
  };

  const updateTextAnswer = (answer) => {
    setAnswers((previous) => ({
      ...previous,
      [question.id]: answer,
    }));
  };

  const submitQuiz = async () => {
    setSubmitting(true);
    setSubmitError("");

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      setSubmitError("You are not signed in. Please log in again.");
      setSubmitting(false);
      return;
    }

    const pathIds = new Set(getQuizPath(answers).map((item) => item.id));
    const rows = Object.entries(answers)
      .filter(([questionId, value]) => pathIds.has(questionId) && hasAnswer(value))
      .map(([question_id, value]) => ({
        user_id: user.id,
        question_id,
        answer_value: serializeAnswer(value),
      }));

    if (rows.length === 0) {
      setSubmitError("Please answer the questions before submitting.");
      setSubmitting(false);
      return;
    }

    const { error } = await appData()
      .from("quiz_responses")
      .upsert(rows, { onConflict: "user_id,question_id" });

    if (error) {
      setSubmitError(error.message);
      setSubmitting(false);
      return;
    }

    if (answers.year) {
      const { error: profileError } = await appData()
        .from("profiles")
        .update({ class_standing: answers.year })
        .eq("id", user.id);

      if (profileError) {
        setSubmitError(
          `Answers saved, but class standing could not be updated: ${profileError.message}`
        );
        setSubmitting(false);
        setFinished(true);
        return;
      }
    }

    setSubmitting(false);
    setFinished(true);
  };

  const nextQuestion = () => {
    if (!isLastQuestion) {
      setCurrentQuestion(currentQuestion + 1);
      return;
    }
    submitQuiz();
  };

  const previousQuestion = () => {
    if (currentQuestion > 0) {
      setCurrentQuestion(currentQuestion - 1);
    }
  };

  const restartQuiz = () => {
    setCurrentQuestion(0);
    setAnswers({});
    setFinished(false);
    setSubmitError("");
  };

  const nav = (
    <ClassioNav
      activePage="quiz"
      onNavigate={onNavigate}
      onLogoClick={onGoHome}
      actionLabel="Sign out"
      onAction={onSignOut}
    />
  );

  if (finished) {
    return (
      <main className="relative flex min-h-screen flex-col bg-gradient-to-br from-zinc-950 via-black to-black text-white">
        {nav}
        <div className="mx-auto w-full max-w-2xl px-6 py-16" style={{ fontFamily: "'Lexend', sans-serif" }}>
          <div className="rounded-2xl border border-zinc-800 bg-zinc-950 p-10 text-center shadow-xl">
            <p className="text-xs font-semibold uppercase tracking-widest text-amber-400">
              Class Finder
            </p>
            <h1
              className="mt-4 text-5xl font-normal tracking-wide text-amber-300"
              style={{ fontFamily: "'Caveat', cursive" }}
            >
              Quiz Complete
            </h1>
            <p className="mt-3 text-sm font-light text-zinc-400">
              Thanks! We have everything we need to help recommend classes for
              you.
            </p>

            {submitError && (
              <p className="mt-4 text-sm text-red-400">{submitError}</p>
            )}

            <button
              type="button"
              onClick={() => onNavigate?.("recommendations")}
              className="mt-8 rounded-xl bg-amber-400 px-6 py-3 font-semibold text-black transition hover:bg-amber-300"
            >
              View recommendations
            </button>

            <button
              type="button"
              onClick={restartQuiz}
              className="mt-4 block w-full rounded-xl px-6 py-3 font-semibold text-zinc-400 transition hover:bg-zinc-900 hover:text-amber-300"
            >
              Retake Quiz
            </button>
          </div>
        </div>
      </main>
    );
  }

  const currentAnswer = answers[question.id];

  const canContinue =
    question.type === "multiple"
      ? currentAnswer && currentAnswer.length > 0
      : question.type === "text"
        ? currentAnswer && currentAnswer.trim().length > 0
        : Boolean(currentAnswer);

  return (
    <main className="relative flex min-h-screen flex-col bg-gradient-to-br from-zinc-950 via-black to-black text-white">
      {nav}
      <div
        className="mx-auto w-full max-w-3xl px-6 py-12"
        style={{ fontFamily: "'Lexend', sans-serif" }}
      >
        <div className="mb-10 text-center">
          <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-amber-400">
            Class Finder
          </p>
          <h1
            className="text-5xl font-normal tracking-wide text-amber-300"
            style={{ fontFamily: "'Caveat', cursive" }}
          >
            Find the right classes for you
          </h1>
          <p className="mx-auto mt-3 max-w-xl text-sm font-light text-zinc-400">
            Tell us about your experience and interests so we can recommend
            classes and tracks that fit you.
          </p>
        </div>

        <div className="mb-8">
          <div className="mb-2 flex justify-between text-xs text-zinc-500">
            <span>
              Question {currentQuestion + 1} of {questions.length}
            </span>
            <span>{Math.round(progress)}%</span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-zinc-800">
            <div
              className="h-full rounded-full bg-amber-400 transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        <div className="rounded-2xl border border-zinc-800 bg-zinc-950 p-8 shadow-xl">
          <h2 className="mb-7 text-2xl font-normal text-white">
            {question.question}
          </h2>

          {question.type === "single" && (
            <div className="space-y-3">
              {question.options.map((option) => {
                const selected = currentAnswer === option;

                return (
                  <button
                    key={option}
                    type="button"
                    onClick={() => selectSingleAnswer(option)}
                    className={`flex w-full items-center justify-between rounded-xl border p-4 text-left transition ${
                      selected
                        ? "border-amber-400 bg-amber-950/40 text-amber-200"
                        : "border-zinc-800 bg-zinc-900 hover:border-amber-400/60 hover:bg-zinc-900/80"
                    }`}
                  >
                    <span className="font-medium">{option}</span>
                    <span
                      className={`flex h-5 w-5 items-center justify-center rounded-full border-2 ${
                        selected
                          ? "border-amber-400 bg-amber-400"
                          : "border-zinc-600"
                      }`}
                    >
                      {selected && (
                        <span className="h-2 w-2 rounded-full bg-black" />
                      )}
                    </span>
                  </button>
                );
              })}
            </div>
          )}

          {question.type === "multiple" && (
            <>
              <p className="mb-5 text-sm text-zinc-500">Select all that apply.</p>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                {question.options.map((option) => {
                  const selected = currentAnswer?.includes(option);

                  return (
                    <button
                      key={option}
                      type="button"
                      onClick={() => toggleMultipleAnswer(option)}
                      className={`rounded-xl border p-4 font-medium transition ${
                        selected
                          ? "border-amber-400 bg-amber-950/40 text-amber-200"
                          : "border-zinc-800 bg-zinc-900 hover:border-amber-400/60"
                      }`}
                    >
                      <div className="flex items-center justify-center gap-2">
                        <span
                          className={`flex h-5 w-5 items-center justify-center rounded border ${
                            selected
                              ? "border-amber-400 bg-amber-400 text-black"
                              : "border-zinc-600"
                          }`}
                        >
                          {selected && "✓"}
                        </span>
                        {option}
                      </div>
                    </button>
                  );
                })}
              </div>
            </>
          )}

          {question.type === "text" && (
            <textarea
              value={currentAnswer || ""}
              onChange={(e) => updateTextAnswer(e.target.value)}
              placeholder={question.placeholder}
              rows={7}
              className="w-full resize-none rounded-xl border border-zinc-800 bg-zinc-900 p-4 text-white outline-none transition placeholder:text-zinc-600 focus:border-amber-400 focus:ring-1 focus:ring-amber-400"
            />
          )}

          {submitError && (
            <p className="mt-6 text-sm text-red-400">{submitError}</p>
          )}

          <div className="mt-8 flex items-center justify-between border-t border-zinc-800 pt-6">
            <button
              type="button"
              onClick={previousQuestion}
              disabled={currentQuestion === 0 || submitting}
              className="rounded-lg px-5 py-2.5 font-medium text-zinc-400 transition hover:bg-zinc-900 hover:text-amber-300 disabled:cursor-not-allowed disabled:opacity-30"
            >
              Back
            </button>

            <button
              type="button"
              onClick={nextQuestion}
              disabled={!canContinue || submitting}
              className="rounded-xl bg-amber-400 px-6 py-3 font-semibold text-black transition hover:bg-amber-300 disabled:cursor-not-allowed disabled:opacity-40"
            >
              {isLastQuestion
                ? submitting
                  ? "Submitting..."
                  : "Submit Quiz"
                : "Next"}
            </button>
          </div>
        </div>
      </div>
    </main>
  );
}
