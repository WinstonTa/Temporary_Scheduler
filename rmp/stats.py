"""Turn raw GraphQL ratings into summary stats for JSON + LLM input."""

from __future__ import annotations

from collections import Counter, defaultdict
from typing import Any


def parse_rating_tags(raw: Any) -> list[str]:
    if not raw:
        return []
    if isinstance(raw, list):
        return [str(tag).strip() for tag in raw if str(tag).strip()]
    return [part.strip() for part in str(raw).split("--") if part.strip()]


def normalize_rating(raw: dict[str, Any]) -> dict[str, Any]:
    note = raw.get("teacherNote") or {}
    return {
        "id": raw.get("id"),
        "legacy_id": raw.get("legacyId"),
        "date": raw.get("date"),
        "course": (raw.get("class") or "").strip() or None,
        "comment": (raw.get("comment") or "").strip(),
        "quality": _mean(
            [_number(raw.get("helpfulRating")), _number(raw.get("clarityRating"))]
        ),
        "helpful": _number(raw.get("helpfulRating")),
        "clarity": _number(raw.get("clarityRating")),
        "difficulty": _number(raw.get("difficultyRating")),
        "tags": parse_rating_tags(raw.get("ratingTags")),
        "grade": _clean_grade(raw.get("grade")),
        "would_take_again": _boolish(raw.get("wouldTakeAgain")),
        "attendance_mandatory": _clean_text(raw.get("attendanceMandatory")),
        "textbook_use": _number(raw.get("textbookUse")),
        "is_online": bool(raw.get("isForOnlineClass")),
        "is_for_credit": bool(raw.get("isForCredit")),
        "thumbs_up": raw.get("thumbsUpTotal") or 0,
        "thumbs_down": raw.get("thumbsDownTotal") or 0,
        "professor_reply": _clean_text((note or {}).get("comment")) if note else None,
        "flag_status": raw.get("flagStatus"),
    }


def build_summary(ratings: list[dict[str, Any]]) -> dict[str, Any]:
    if not ratings:
        return {
            "review_count_collected": 0,
            "avg_quality": None,
            "avg_difficulty": None,
            "would_take_again_percent": None,
            "online_percent": None,
            "tag_counts": [],
            "grade_counts": [],
            "difficulty_histogram": {str(i): 0 for i in range(1, 6)},
            "attendance": {},
            "courses": [],
        }

    qualities = [r["quality"] for r in ratings if r["quality"] is not None]
    difficulties = [r["difficulty"] for r in ratings if r["difficulty"] is not None]
    take_again = [r["would_take_again"] for r in ratings if r["would_take_again"] is not None]

    tag_counter: Counter[str] = Counter()
    grade_counter: Counter[str] = Counter()
    difficulty_hist: Counter[int] = Counter()
    attendance_counter: Counter[str] = Counter()
    courses: dict[str, dict[str, Any]] = defaultdict(
        lambda: {
            "course": "",
            "review_count": 0,
            "qualities": [],
            "difficulties": [],
            "take_again": [],
            "tags": Counter(),
        }
    )

    online_count = 0
    for rating in ratings:
        if rating["is_online"]:
            online_count += 1
        tag_counter.update(rating["tags"])
        if rating["grade"]:
            grade_counter[rating["grade"]] += 1
        if rating["difficulty"] is not None:
            difficulty_hist[int(round(rating["difficulty"]))] += 1
        if rating["attendance_mandatory"]:
            attendance_counter[rating["attendance_mandatory"]] += 1

        course_name = rating["course"] or "Unknown"
        bucket = courses[course_name]
        bucket["course"] = course_name
        bucket["review_count"] += 1
        if rating["quality"] is not None:
            bucket["qualities"].append(rating["quality"])
        if rating["difficulty"] is not None:
            bucket["difficulties"].append(rating["difficulty"])
        if rating["would_take_again"] is not None:
            bucket["take_again"].append(rating["would_take_again"])
        bucket["tags"].update(rating["tags"])

    course_rows = []
    for bucket in courses.values():
        course_rows.append(
            {
                "course": bucket["course"],
                "review_count": bucket["review_count"],
                "avg_quality": _mean(bucket["qualities"]),
                "avg_difficulty": _mean(bucket["difficulties"]),
                "would_take_again_percent": _percent_true(bucket["take_again"]),
                "top_tags": _top_counts(bucket["tags"]),
            }
        )
    course_rows.sort(key=lambda row: row["review_count"], reverse=True)

    return {
        "review_count_collected": len(ratings),
        "avg_quality": _mean(qualities),
        "avg_difficulty": _mean(difficulties),
        "would_take_again_percent": _percent_true(take_again),
        "online_percent": round(100.0 * online_count / len(ratings), 1),
        "tag_counts": _top_counts(tag_counter, limit=20),
        "grade_counts": _top_counts(grade_counter, limit=20),
        "difficulty_histogram": {str(i): difficulty_hist.get(i, 0) for i in range(1, 6)},
        "attendance": dict(attendance_counter),
        "courses": course_rows,
    }


def _number(value: Any) -> float | None:
    if value is None or value == "":
        return None
    try:
        number = float(value)
    except (TypeError, ValueError):
        return None
    if number < 0:
        return None
    return number


def _mean(values: list[float]) -> float | None:
    if not values:
        return None
    return round(sum(values) / len(values), 2)


def _percent_true(values: list[bool]) -> float | None:
    if not values:
        return None
    return round(100.0 * sum(1 for item in values if item) / len(values), 1)


def _top_counts(counter: Counter[str], limit: int = 8) -> list[dict[str, Any]]:
    return [{"name": name, "count": count} for name, count in counter.most_common(limit)]


def _clean_text(value: Any) -> str | None:
    if value is None:
        return None
    text = str(value).strip()
    return text or None


def _clean_grade(value: Any) -> str | None:
    text = _clean_text(value)
    if not text:
        return None
    if text.lower() in {"not sure yet", "n/a", "na", "none"}:
        return None
    return text


def _boolish(value: Any) -> bool | None:
    if value is None or value == "":
        return None
    if isinstance(value, bool):
        return value
    try:
        number = int(value)
    except (TypeError, ValueError):
        return None
    if number == 1:
        return True
    if number == 0:
        return False
    return None
