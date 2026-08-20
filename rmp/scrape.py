"""Fetch a professor page from RMP GraphQL and assemble extracted JSON."""

from __future__ import annotations

from datetime import datetime, timezone
from typing import Any

from rmp.client import RMPClient
from rmp.stats import build_summary, normalize_rating
from rmp.urls import ProfessorURL


def scrape_professor(parsed: ProfessorURL, client: RMPClient | None = None) -> dict[str, Any]:
    client = client or RMPClient()
    profile = client.get_teacher_profile(parsed.graphql_id)
    raw_ratings = client.iter_ratings(
        parsed.graphql_id,
        course_filter=parsed.course_filter,
    )
    ratings = [normalize_rating(item) for item in raw_ratings]
    summary = build_summary(ratings)

    would_take_again = profile.get("wouldTakeAgainPercent")
    if would_take_again is not None and would_take_again < 0:
        would_take_again = None
    elif would_take_again is not None:
        would_take_again = round(float(would_take_again), 1)

    school = profile.get("school") or {}
    official_tags = [
        {
            "name": tag.get("tagName"),
            "count": tag.get("tagCount"),
        }
        for tag in (profile.get("teacherRatingTags") or [])
        if tag.get("tagName")
    ]
    official_tags.sort(key=lambda item: item.get("count") or 0, reverse=True)

    first = (profile.get("firstName") or "").strip()
    last = (profile.get("lastName") or "").strip()
    full_name = " ".join(part for part in (first, last) if part) or f"Professor {parsed.legacy_id}"

    return {
        "source": {
            "url": parsed.source_url,
            "scraped_at": datetime.now(timezone.utc).isoformat(),
            "graphql_id": parsed.graphql_id,
            "course_filter": parsed.course_filter,
        },
        "professor": {
            "legacy_id": profile.get("legacyId") or parsed.legacy_id,
            "first_name": first,
            "last_name": last,
            "full_name": full_name,
            "department": profile.get("department"),
            "avg_rating": profile.get("avgRating"),
            "avg_difficulty": profile.get("avgDifficulty"),
            "num_ratings_listed": profile.get("numRatings"),
            "would_take_again_percent": would_take_again,
            "school": {
                "legacy_id": school.get("legacyId"),
                "name": school.get("name"),
                "city": school.get("city"),
                "state": school.get("state"),
            },
            "official_tags": official_tags,
            "course_codes": profile.get("courseCodes") or [],
        },
        "summary": summary,
        "ratings": ratings,
    }
