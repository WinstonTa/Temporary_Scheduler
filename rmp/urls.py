"""Parse RateMyProfessors professor URLs into GraphQL IDs."""

from __future__ import annotations

import base64
import re
from dataclasses import dataclass
from urllib.parse import parse_qs, urlparse


class InvalidProfessorURL(ValueError):
    """Raised when a URL is not a RateMyProfessors professor page."""


@dataclass(frozen=True)
class ProfessorURL:
    source_url: str
    legacy_id: int
    graphql_id: str
    course_filter: str | None


_PROFESSOR_PATH = re.compile(r"^/professor/(\d+)/?$", re.IGNORECASE)


def teacher_graphql_id(legacy_id: int) -> str:
    return base64.b64encode(f"Teacher-{legacy_id}".encode("utf-8")).decode("ascii")


def parse_professor_url(raw_url: str) -> ProfessorURL:
    url = (raw_url or "").strip()
    if not url:
        raise InvalidProfessorURL("Paste a RateMyProfessors professor URL.")

    parsed = urlparse(url)
    host = (parsed.netloc or "").lower()
    if host.startswith("www."):
        host = host[4:]
    if host != "ratemyprofessors.com":
        raise InvalidProfessorURL(
            "URL must be a ratemyprofessors.com professor page, "
            "for example https://www.ratemyprofessors.com/professor/12345"
        )

    query = parse_qs(parsed.query)
    course_filter = _first(query.get("course")) or _first(query.get("filter"))

    path_match = _PROFESSOR_PATH.match(parsed.path or "")
    if path_match:
        legacy_id = int(path_match.group(1))
        return ProfessorURL(
            source_url=url,
            legacy_id=legacy_id,
            graphql_id=teacher_graphql_id(legacy_id),
            course_filter=course_filter,
        )

    if (parsed.path or "").lower().endswith("showratings.jsp"):
        tid = _first(query.get("tid"))
        if tid and tid.isdigit():
            legacy_id = int(tid)
            return ProfessorURL(
                source_url=url,
                legacy_id=legacy_id,
                graphql_id=teacher_graphql_id(legacy_id),
                course_filter=course_filter,
            )

    raise InvalidProfessorURL(
        "Could not find a professor ID in that URL. Use a link like "
        "https://www.ratemyprofessors.com/professor/12345"
    )


def _first(values: list[str] | None) -> str | None:
    if not values:
        return None
    text = values[0].strip()
    return text or None
