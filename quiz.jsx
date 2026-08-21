import { useState } from "react";

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
    question: "Is the time more important or is the quality of the professor more important",
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

export default function App() {
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [answers, setAnswers] = useState({});
  const [finished, setFinished] = useState(false);

  const question = questions[currentQuestion];

  const progress =
    ((currentQuestion + 1) / questions.length) * 100;

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

  const nextQuestion = () => {
    if (question.id === "track" && answers.track === "Yes") {
      finishQuiz();
      return;
    }

    if (currentQuestion < questions.length - 1) {
      setCurrentQuestion(currentQuestion + 1);
    } else {
      finishQuiz();
    }
  };

  const previousQuestion = () => {
    if (currentQuestion > 0) {
      setCurrentQuestion(currentQuestion - 1);
    }
  };

  const finishQuiz = () => {
    console.log("Quiz complete:", answers);
    setFinished(true);
  };

  const restartQuiz = () => {
    setCurrentQuestion(0);
    setAnswers({});
    setFinished(false);
  };

  if (finished) {
    return (
      <div className="min-h-screen bg-gray-50 px-6 py-12">
        <div className="mx-auto max-w-2xl text-center">
          <div className="rounded-2xl bg-white p-10 shadow-sm">
            <div className="mb-5 text-5xl">✓</div>

            <h1 className="text-3xl font-bold text-gray-900">
              Quiz Complete
            </h1>

            <p className="mt-3 text-gray-500">
              Thanks! We have everything we need to help recommend
              classes for you.
            </p>

            <button
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

        {/* Header */}
        <div className="mb-10 text-center">
          <p className="mb-2 text-sm font-semibold uppercase tracking-wider text-indigo-600">
            Class Finder
          </p>

          <h1 className="text-4xl font-bold tracking-tight">
            Find the right classes for you
          </h1>

          <p className="mx-auto mt-3 max-w-xl text-gray-500">
            Tell us about your experience and interests so we can
            recommend classes and tracks that fit you.
          </p>
        </div>

        {/* Progress */}
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

        {/* Question */}
        <div className="rounded-2xl bg-white p-8 shadow-sm ring-1 ring-gray-100">

          <h2 className="mb-7 text-2xl font-semibold">
            {question.question}
          </h2>

          {/* SINGLE CHOICE */}
          {question.type === "single" && (
            <div className="space-y-3">
              {question.options.map((option) => {
                const selected = currentAnswer === option;

                return (
                  <button
                    key={option}
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

          {/* MULTIPLE CHOICE */}
          {question.type === "multiple" && (
            <>
              <p className="mb-5 text-sm text-gray-500">
                Select all that apply.
              </p>

              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                {question.options.map((option) => {
                  const selected =
                    currentAnswer?.includes(option);

                  return (
                    <button
                      key={option}
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

          {/* FREE RESPONSE */}
          {question.type === "text" && (
            <textarea
              value={currentAnswer || ""}
              onChange={(e) => updateTextAnswer(e.target.value)}
              placeholder={question.placeholder}
              rows={7}
              className="w-full resize-none rounded-xl border-2 border-gray-200 p-4 text-gray-900 outline-none transition placeholder:text-gray-400 focus:border-indigo-600 focus:ring-2 focus:ring-indigo-100"
            />
          )}

          {/* Navigation */}
          <div className="mt-8 flex items-center justify-between border-t pt-6">

            <button
              onClick={previousQuestion}
              disabled={currentQuestion === 0}
              className="rounded-lg px-5 py-2.5 font-medium text-gray-600 hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-30"
            >
              Back
            </button>

            <button
              onClick={nextQuestion}
              disabled={!canContinue}
              className="rounded-xl bg-indigo-600 px-6 py-3 font-semibold text-white transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-40"
            >
              {question.id === "track" &&
              answers.track === "Yes"
                ? "Finish Quiz"
                : currentQuestion === questions.length - 1
                ? "Finish Quiz"
                : "Next"}
            </button>

          </div>
        </div>

        <p className="mt-5 text-center text-sm text-gray-400">
        </p>
      </div>
    </div>
  );
}