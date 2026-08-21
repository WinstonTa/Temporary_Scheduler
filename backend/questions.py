"""
Quiz question bank for CS track recommendation.
Mix of multiple-choice (fast signal, easy to answer) and free-text
(nuance, phrasing that embeds well against course profiles).

Edit this list to add/remove/reorder questions — the frontend fetches
this via GET /api/quiz/questions, so no frontend changes are needed
when you tweak content here.
"""

QUIZ_QUESTIONS = [
    {
        "id": "q1",
        "type": "mc",
        "prompt": "Which of these sounds most like a fun weekend project?",
        "options": [
            "Training a model to classify something",
            "Breaking into a deliberately vulnerable app to find flaws",
            "Building a full-stack app from scratch",
            "Writing a script to automate a tedious task",
            "Designing a system that handles millions of requests",
        ],
    },
    {
        "id": "q2",
        "type": "mc",
        "prompt": "When a project breaks, what do you usually enjoy most about fixing it?",
        "options": [
            "Digging into why the algorithm produced a weird result",
            "Tracing exactly how an attacker could exploit it",
            "Figuring out which part of the stack is misbehaving",
            "Untangling a gnarly bug in the core logic",
            "Realizing it's a scaling/performance issue, not a logic one",
        ],
    },
    {
        "id": "q3",
        "type": "text",
        "prompt": "Describe a class, project, or topic in CS that you found genuinely interesting — and why.",
    },
    {
        "id": "q4",
        "type": "mc",
        "prompt": "Which work environment appeals to you more?",
        "options": [
            "Research-adjacent, reading papers and experimenting",
            "Security-focused, thinking like an adversary",
            "Product-focused, shipping features users touch directly",
            "Infrastructure-focused, keeping systems reliable at scale",
        ],
    },
    {
        "id": "q5",
        "type": "text",
        "prompt": "What kind of problems do you want to be solving in your first job out of college?",
    },
    {
        "id": "q6",
        "type": "mc",
        "prompt": "How do you feel about math-heavy coursework (linear algebra, probability, stats)?",
        "options": [
            "Love it — I want more, not less",
            "Fine with it if it's clearly applied to something concrete",
            "Prefer to minimize it if I can",
        ],
    },
    {
        "id": "q7",
        "type": "text",
        "prompt": "Any specific tools, languages, or technologies you've used and enjoyed (or want to learn)?",
    },
]


def get_questions():
    """Returns the question bank without answer-sensitive metadata."""
    return QUIZ_QUESTIONS


def validate_answers(answers: dict) -> list[str]:
    """Returns a list of missing/invalid question ids, empty if valid."""
    errors = []
    question_ids = {q["id"] for q in QUIZ_QUESTIONS}
    for qid in question_ids:
        if qid not in answers or not str(answers[qid].get("value", "")).strip():
            errors.append(qid)
    return errors