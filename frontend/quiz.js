// ============================================================
// Quiz app — plain JS, no framework.
// Mirrors the same flow as the React version:
//   fetch questions -> step through -> submit -> subscribe to
//   Realtime job status -> fetch + render results
// ============================================================

const supabaseClient = supabase.createClient(CONFIG.SUPABASE_URL, CONFIG.SUPABASE_ANON_KEY);

const state = {
  questions: [],
  step: 0,
  answers: {},        // { q1: { type: "mc", value: "Backend" } }
  status: "loading",  // loading | idle | submitting | pending | processing | complete | failed
  results: [],
  errorMessage: null,
  channel: null,
};

const root = document.getElementById("quiz-app");

// ---------- Init ----------

async function init() {
  try {
    const res = await fetch(`${CONFIG.API_BASE_URL}/api/quiz/questions`);
    const data = await res.json();
    state.questions = data.questions;
    state.status = "idle";
  } catch (err) {
    state.status = "failed";
    state.errorMessage = "Couldn't load the quiz. Check that the backend is running.";
  }
  render();
}

// ---------- Submission ----------

async function submitQuiz() {
  state.status = "submitting";
  state.errorMessage = null;
  render();

  try {
    const res = await fetch(`${CONFIG.API_BASE_URL}/api/quiz/submit`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ user_id: CONFIG.USER_ID, answers: state.answers }),
    });

    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      throw new Error(body.detail || "Failed to submit quiz");
    }

    const { job_id } = await res.json();
    state.status = "pending";
    render();

    subscribeToJob(job_id);
  } catch (err) {
    state.status = "failed";
    state.errorMessage = err.message;
    render();
  }
}

function subscribeToJob(jobId) {
  state.channel = supabaseClient
    .channel(`job-${jobId}`)
    .on(
      "postgres_changes",
      {
        event: "UPDATE",
        schema: "public",
        table: "recommendation_jobs",
        filter: `id=eq.${jobId}`,
      },
      (payload) => {
        const newStatus = payload.new.status;
        state.status = newStatus;
        render();

        if (newStatus === "complete" || newStatus === "failed") {
          fetchResults(jobId);
          supabaseClient.removeChannel(state.channel);
          state.channel = null;
        }
      }
    )
    .subscribe();
}

async function fetchResults(jobId) {
  const res = await fetch(`${CONFIG.API_BASE_URL}/api/quiz/results/${jobId}`);
  const data = await res.json();
  state.results = data.results || [];
  if (data.status === "failed") {
    state.errorMessage = data.error_message || "Something went wrong generating your recommendations.";
  }
  state.status = data.status;
  render();
}

// ---------- Rendering ----------

function render() {
  if (state.status === "loading") {
    root.innerHTML = `<p class="muted center">Loading quiz...</p>`;
    return;
  }

  if (["submitting", "pending", "processing"].includes(state.status)) {
    renderGenerating();
    return;
  }

  if (state.status === "complete") {
    renderResults();
    return;
  }

  if (state.status === "failed" && state.results.length === 0 && state.questions.length === 0) {
    root.innerHTML = `<div class="error-banner">${escapeHtml(state.errorMessage)}</div>`;
    return;
  }

  renderQuestion();
}

const STATUS_COPY = {
  submitting: "Sending your answers...",
  pending: "Queued...",
  processing: "Matching your interests to courses...",
};

function renderGenerating() {
  root.innerHTML = `
    <div class="center">
      <div class="spinner"></div>
      <p class="muted">${STATUS_COPY[state.status] || "Working on it..."}</p>
    </div>
  `;
}

function renderQuestion() {
  const question = state.questions[state.step];
  const currentValue = state.answers[question.id]?.value || "";
  const canGoNext = Boolean(currentValue.trim());
  const isLastStep = state.step === state.questions.length - 1;
  const pct = Math.round(((state.step + 1) / state.questions.length) * 100);

  const errorBanner =
    state.status === "failed" && state.errorMessage
      ? `<div class="error-banner">${escapeHtml(state.errorMessage)}</div>`
      : "";

  root.innerHTML = `
    ${errorBanner}
    <div class="progress-label">${state.step + 1} / ${state.questions.length}</div>
    <div class="progress-track"><div class="progress-fill" style="width:${pct}%"></div></div>

    <div id="question-body"></div>

    <div class="nav-row">
      <button class="btn-back ${state.step === 0 ? "hidden" : ""}" id="back-btn">Back</button>
      <button class="btn-next" id="next-btn" ${canGoNext ? "" : "disabled"}>
        ${isLastStep ? "Get my recommendations" : "Next"}
      </button>
    </div>
  `;

  renderQuestionBody(question, currentValue);

  document.getElementById("back-btn").addEventListener("click", () => {
    state.step = Math.max(0, state.step - 1);
    render();
  });

  document.getElementById("next-btn").addEventListener("click", () => {
    if (isLastStep) {
      submitQuiz();
    } else {
      state.step += 1;
      render();
    }
  });
}

function renderQuestionBody(question, currentValue) {
  const body = document.getElementById("question-body");

  if (question.type === "mc") {
    body.innerHTML = `
      <div class="question-prompt">${escapeHtml(question.prompt)}</div>
      <div class="options">
        ${question.options
          .map(
            (option) => `
          <label class="option ${option === currentValue ? "selected" : ""}">
            <input type="radio" name="${question.id}" value="${escapeHtml(option)}"
                   ${option === currentValue ? "checked" : ""} />
            <span>${escapeHtml(option)}</span>
          </label>
        `
          )
          .join("")}
      </div>
    `;
    body.querySelectorAll(`input[name="${question.id}"]`).forEach((input) => {
      input.addEventListener("change", (e) => {
        setAnswer(question, e.target.value);
      });
    });
  } else {
    body.innerHTML = `
      <label class="question-prompt" for="${question.id}">${escapeHtml(question.prompt)}</label>
      <textarea id="${question.id}" rows="4" placeholder="Type your answer...">${escapeHtml(currentValue)}</textarea>
    `;
    const textarea = document.getElementById(question.id);
    textarea.addEventListener("input", (e) => {
      setAnswer(question, e.target.value);
    });
  }
}

function setAnswer(question, value) {
  state.answers[question.id] = { type: question.type, value };
  // Only re-render the next-button enabled state, not the whole question
  // (avoids losing textarea focus on every keystroke)
  const nextBtn = document.getElementById("next-btn");
  if (nextBtn) nextBtn.disabled = !value.trim();

  // Keep option highlighting in sync for MC questions
  if (question.type === "mc") {
    document.querySelectorAll(".option").forEach((el) => {
      const input = el.querySelector("input");
      el.classList.toggle("selected", input.value === value);
    });
  }
}

function professorLine(course) {
  if (!course.professor_name) return "";
  const rating = course.professor_rating;
  const name = escapeHtml(course.professor_name);

  // Rating-aware copy — a flat "students loved" line would be actively
  // misleading for a professor with a 1.5/5 average, which real RMP
  // data shows happens often. Tone scales with the actual number.
  let line, cssClass = "";
  if (rating == null) {
    line = `Taught by Professor ${name}`;
  } else if (rating >= 4.0) {
    line = `Students loved Professor ${name}'s section (${rating.toFixed(1)}/5)`;
  } else if (rating >= 3.0) {
    line = `Professor ${name}'s section — solid reviews (${rating.toFixed(1)}/5)`;
  } else {
    line = `Professor ${name}'s section — mixed reviews (${rating.toFixed(1)}/5), worth reading up before enrolling`;
    cssClass = "warning";
  }

  return `<div class="result-professor ${cssClass}">${line}</div>`;
}

function renderResults() {
  root.innerHTML = `
    <div class="results-title">Your recommended courses</div>
    <p class="muted">Ranked by fit to your quiz answers.</p>
    <ol class="results-list">
      ${state.results
        .map(
          (course) => `
        <li class="result-item">
          <div class="result-left">
            <span class="result-rank">${course.rank}</span>
            <div>
              <div class="result-code">${escapeHtml(course.course_code)}</div>
              <div class="result-title">${escapeHtml(course.course_title)}</div>
              ${professorLine(course)}
            </div>
          </div>
          <span class="result-match">${Math.round(course.similarity * 100)}% match</span>
        </li>
      `
        )
        .join("")}
    </ol>
    <button class="retake-link" id="retake-btn">Retake the quiz</button>
  `;

  document.getElementById("retake-btn").addEventListener("click", () => {
    // Simplest reset: reload the page for a clean state
    window.location.reload();
  });
}

// ---------- Utils ----------

function escapeHtml(str) {
  const div = document.createElement("div");
  div.textContent = str;
  return div.innerHTML;
}

// ---------- Go ----------

init();