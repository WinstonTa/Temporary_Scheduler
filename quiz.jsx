import { useState } from "react";
import { appData, supabase } from "./supabase";

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

const questions = [
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

export default function Quiz({ onSignOut }) {
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [answers, setAnswers] = useState({});
  const [finished, setFinished] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");

  const question = questions[currentQuestion];
  const isLastQuestion = currentQuestion === questions.length - 1;

  const progress = ((currentQuestion + 1) / questions.length) * 100;

  const selectSingleAnswer = (answer) => {
    setAnswers((previous) => ({
      ...previous,
      [question.id]: answer,
    }));
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

    const rows = Object.entries(answers)
      .filter(([, value]) => hasAnswer(value))
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

  const signOutButton = (
    <button
      type="button"
      onClick={onSignOut}
      className="rounded-lg px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100"
    >
      Sign out
    </button>
  );

  if (finished) {
    return (
      <div className="min-h-screen bg-gray-50 px-6 py-12">
        <div className="mx-auto max-w-2xl">
          <div className="mb-6 flex justify-end">{signOutButton}</div>
          <div className="rounded-2xl bg-white p-10 text-center shadow-sm">
            <div className="mb-5 text-5xl">✓</div>

            <h1 className="text-3xl font-bold text-gray-900">Quiz Complete</h1>

            <p className="mt-3 text-gray-500">
              Thanks! We have everything we need to help recommend classes for
              you.
            </p>

            {submitError && (
              <p className="mt-4 text-sm text-red-600">{submitError}</p>
            )}

            <button
              type="button"
              onClick={restartQuiz}
              className="mt-8 rounded-xl bg-indigo-600 px-6 py-3 font-semibold text-white hover:bg-indigo-700"
            >
              Retake Quiz
            </button>
          </div>
        </div>
      </div>
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
    <div className="min-h-screen bg-gray-50 px-6 py-10 text-gray-900">
      <div className="mx-auto max-w-3xl">
        <div className="mb-6 flex justify-end">{signOutButton}</div>

        <div className="mb-10 text-center">
          <p className="mb-2 text-sm font-semibold uppercase tracking-wider text-indigo-600">
            Class Finder
          </p>

          <h1 className="text-4xl font-bold tracking-tight">
            Find the right classes for you
          </h1>

          <p className="mx-auto mt-3 max-w-xl text-gray-500">
            Tell us about your experience and interests so we can recommend
            classes and tracks that fit you.
          </p>
        </div>

        <div className="mb-8">
          <div className="mb-2 flex justify-between text-sm text-gray-500">
            <span>
              Question {currentQuestion + 1} of {questions.length}
            </span>

            <span>{Math.round(progress)}%</span>
          </div>

          <div className="h-2 overflow-hidden rounded-full bg-gray-200">
            <div
              className="h-full rounded-full bg-indigo-600 transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        <div className="rounded-2xl bg-white p-8 shadow-sm ring-1 ring-gray-100">
          <h2 className="mb-7 text-2xl font-semibold">{question.question}</h2>

          {question.type === "single" && (
            <div className="space-y-3">
              {question.options.map((option) => {
                const selected = currentAnswer === option;

                return (
                  <button
                    key={option}
                    type="button"
                    onClick={() => selectSingleAnswer(option)}
                    className={`flex w-full items-center justify-between rounded-xl border-2 p-4 text-left transition ${
                      selected
                        ? "border-indigo-600 bg-indigo-50 text-indigo-900"
                        : "border-gray-200 hover:border-indigo-300 hover:bg-gray-50"
                    }`}
                  >
                    <span className="font-medium">{option}</span>

                    <span
                      className={`flex h-5 w-5 items-center justify-center rounded-full border-2 ${
                        selected
                          ? "border-indigo-600 bg-indigo-600"
                          : "border-gray-300"
                      }`}
                    >
                      {selected && (
                        <span className="h-2 w-2 rounded-full bg-white" />
                      )}
                    </span>
                  </button>
                );
              })}
            </div>
          )}

          {question.type === "multiple" && (
            <>
              <p className="mb-5 text-sm text-gray-500">
                Select all that apply.
              </p>

              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                {question.options.map((option) => {
                  const selected = currentAnswer?.includes(option);

                  return (
                    <button
                      key={option}
                      type="button"
                      onClick={() => toggleMultipleAnswer(option)}
                      className={`rounded-xl border-2 p-4 font-medium transition ${
                        selected
                          ? "border-indigo-600 bg-indigo-50 text-indigo-900"
                          : "border-gray-200 hover:border-indigo-300 hover:bg-gray-50"
                      }`}
                    >
                      <div className="flex items-center justify-center gap-2">
                        <span
                          className={`flex h-5 w-5 items-center justify-center rounded border ${
                            selected
                              ? "border-indigo-600 bg-indigo-600 text-white"
                              : "border-gray-300"
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
              className="w-full resize-none rounded-xl border-2 border-gray-200 p-4 text-gray-900 outline-none transition placeholder:text-gray-400 focus:border-indigo-600 focus:ring-2 focus:ring-indigo-100"
            />
          )}

          {submitError && (
            <p className="mt-6 text-sm text-red-600">{submitError}</p>
          )}

          <div className="mt-8 flex items-center justify-between border-t pt-6">
            <button
              type="button"
              onClick={previousQuestion}
              disabled={currentQuestion === 0 || submitting}
              className="rounded-lg px-5 py-2.5 font-medium text-gray-600 hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-30"
            >
              Back
            </button>

            <button
              type="button"
              onClick={nextQuestion}
              disabled={!canContinue || submitting}
              className="rounded-xl bg-indigo-600 px-6 py-3 font-semibold text-white transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-40"
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
    </div>
  );
}
