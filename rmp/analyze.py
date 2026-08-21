"""Turn scraped professor JSON into a markdown briefing.

Gemini is optional for this PoC. If GEMINI_API_KEY is set, the model writes
the insights file. If it is not set, a stats-only briefing is written instead
so scraping can be tested without LLM setup.
"""

from __future__ import annotations

import json
import os
from typing import Any

SYSTEM_PROMPT = """You are helping a student decide what to expect from a college professor and their courses.

You are given structured data scraped from RateMyProfessors. Write a practical briefing in Markdown.

Rules:
- Be specific and evidence-based. Cite patterns from tags, numeric scores, grades, and review comments.
- Do not invent facts that are not in the data.
- Call out when the sample is small, old, mixed, or contradictory.
- RateMyProfessors is biased toward students who bother to review; say so briefly.
- Write for a student who has not taken the class yet.
- Do not include a title like "Markdown Briefing". Start with a heading that uses the professor's name.

Required sections:
1. Snapshot (school, department, rating, difficulty, would-take-again, review count)
2. Personality and teaching style
3. Course difficulty and workload
4. Tags (use official RMP tags when present; otherwise use tags collected from reviews)
5. Grading, exams, and what tends to determine the grade
6. What to expect week to week
7. Advice for students who take this professor
8. Caveats
"""


def analyze_professor(payload: dict[str, Any], *, skip_llm: bool = False) -> str:
    if skip_llm or not _load_api_key():
        return _stats_briefing(payload)
    return _gemini_briefing(payload)


def llm_configured(skip_llm: bool = False) -> bool:
    return (not skip_llm) and bool(_load_api_key())


def _load_api_key() -> str:
    return (os.getenv("GEMINI_API_KEY") or "").strip().strip('"').strip("'")


def _gemini_briefing(payload: dict[str, Any]) -> str:
    from google import genai
    from google.genai.errors import ClientError

    api_key = _load_api_key()
    model = os.getenv("GEMINI_MODEL", "gemini-2.5-flash")
    compact = _compact_for_llm(payload)
    contents = (
        SYSTEM_PROMPT
        + "\n\nHere is the extracted RateMyProfessors data as JSON:\n\n"
        + json.dumps(compact, ensure_ascii=False, indent=2)
    )

    last_error: Exception | None = None
    for vertexai in (False, True):
        try:
            client = genai.Client(api_key=api_key, vertexai=vertexai)
            response = client.models.generate_content(model=model, contents=contents)
            text = (response.text or "").strip()
            if not text:
                raise RuntimeError("Gemini returned an empty response.")
            return text + "\n"
        except ClientError as exc:
            last_error = exc
            if not _is_auth_error(exc):
                raise RuntimeError(f"Gemini request failed: {exc}") from exc
            continue

    raise RuntimeError(_gemini_auth_help(last_error, api_key)) from last_error


def _is_auth_error(exc: Exception) -> bool:
    text = str(exc)
    return (
        "401" in text
        or "UNAUTHENTICATED" in text
        or "ACCESS_TOKEN_TYPE_UNSUPPORTED" in text
        or "API_KEY_INVALID" in text
    )


def _gemini_auth_help(exc: Exception | None, api_key: str) -> str:
    kind = "new AI Studio auth key (AQ.)" if api_key.startswith("AQ.") else "API key"
    return (
        "Gemini rejected this API key. "
        f"The value in GEMINI_API_KEY looks like a {kind}. "
        "Put a Gemini API key from https://aistudio.google.com/apikey into `.env`, "
        "then restart the Flask server. "
        f"Details: {exc}"
    )


def _compact_for_llm(payload: dict[str, Any], max_reviews: int = 80) -> dict[str, Any]:
    ratings = list(payload.get("ratings") or [])
    sampled = ratings[:max_reviews]
    return {
        "source": payload.get("source"),
        "professor": payload.get("professor"),
        "summary": payload.get("summary"),
        "review_sample_note": (
            f"Showing {len(sampled)} of {len(ratings)} reviews (newest first)."
            if len(ratings) > max_reviews
            else f"Showing all {len(ratings)} reviews."
        ),
        "reviews": [
            {
                "date": item.get("date"),
                "course": item.get("course"),
                "quality": item.get("quality"),
                "difficulty": item.get("difficulty"),
                "tags": item.get("tags"),
                "grade": item.get("grade"),
                "would_take_again": item.get("would_take_again"),
                "attendance_mandatory": item.get("attendance_mandatory"),
                "is_online": item.get("is_online"),
                "comment": item.get("comment"),
            }
            for item in sampled
        ],
    }


def _format_tag_line(payload: dict[str, Any]) -> str:
    professor = payload.get("professor") or {}
    summary = payload.get("summary") or {}
    official_tags = professor.get("official_tags") or []
    review_tags = summary.get("tag_counts") or []
    tags = official_tags or review_tags
    if not tags:
        return "No tags were present in the scraped data."
    return ", ".join(f"{item['name']} ({item['count']})" for item in tags[:10])


def _format_course_lines(payload: dict[str, Any]) -> str:
    courses = (payload.get("summary") or {}).get("courses") or []
    if not courses:
        return "- No course-level reviews were collected."
    lines = []
    for course in courses[:12]:
        count = course["review_count"]
        noun = "review" if count == 1 else "reviews"
        lines.append(
            f"- **{course['course']}**: {count} {noun}, "
            f"quality {course['avg_quality']}, difficulty {course['avg_difficulty']}"
        )
    return "\n".join(lines)


def _stats_briefing(payload: dict[str, Any]) -> str:
    professor = payload.get("professor") or {}
    summary = payload.get("summary") or {}
    source = payload.get("source") or {}
    school = professor.get("school") or {}
    name = professor.get("full_name") or "this professor"
    location = ", ".join(part for part in (school.get("city"), school.get("state")) if part)

    return f"""# {name}

LLM analysis was skipped because `GEMINI_API_KEY` is not set. This file currently contains extracted stats only. Add a Gemini API key to `.env` and re-run to fill in personality and course-expectation insights.

## Snapshot

- **School:** {school.get("name") or "Unknown"} ({location})
- **Department:** {professor.get("department") or "Unknown"}
- **RMP rating:** {professor.get("avg_rating")}
- **RMP difficulty:** {professor.get("avg_difficulty")}
- **Would take again (RMP):** {professor.get("would_take_again_percent")}%
- **Reviews listed on RMP:** {professor.get("num_ratings_listed")}
- **Reviews collected:** {summary.get("review_count_collected")}
- **Source:** {source.get("url")}

## Personality and teaching style

Pending Gemini analysis. Review tags and comments in the JSON file for now.

## Course difficulty and workload

- Average quality from collected reviews: {summary.get("avg_quality")}
- Average difficulty from collected reviews: {summary.get("avg_difficulty")}
- Would take again from collected reviews: {summary.get("would_take_again_percent")}%
- Online reviews: {summary.get("online_percent")}%
- Difficulty histogram (1-5): {summary.get("difficulty_histogram")}

## Tags

{_format_tag_line(payload)}

## Courses in the dataset

{_format_course_lines(payload)}

## Advice for students who take this professor

Pending Gemini analysis.

## Caveats

RateMyProfessors reviews are voluntary and can over-represent very happy or very unhappy students. Treat this as a signal, not a transcript.
"""
