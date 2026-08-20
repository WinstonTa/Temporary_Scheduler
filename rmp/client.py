"""Thin client for RateMyProfessors' unofficial GraphQL API."""

from __future__ import annotations

import time
from typing import Any

import requests

from rmp.queries import RATINGS_LIST_QUERY, TEACHER_PROFILE_QUERY

GRAPHQL_URL = "https://www.ratemyprofessors.com/graphql"

# Public client token embedded in RMP's frontend (base64 of "test:test").
_AUTH_HEADER = "Basic dGVzdDp0ZXN0"

_HEADERS = {
    "Accept": "*/*",
    "Authorization": _AUTH_HEADER,
    "Content-Type": "application/json",
    "Origin": "https://www.ratemyprofessors.com",
    "Referer": "https://www.ratemyprofessors.com/",
    "User-Agent": (
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
        "AppleWebKit/537.36 (KHTML, like Gecko) "
        "Chrome/128.0.0.0 Safari/537.36"
    ),
}


class RMPGraphQLError(RuntimeError):
    """Raised when the GraphQL endpoint returns errors or unexpected data."""


class RMPClient:
    def __init__(self, timeout_seconds: float = 30.0, page_pause_seconds: float = 0.35):
        self.timeout_seconds = timeout_seconds
        self.page_pause_seconds = page_pause_seconds
        self._session = requests.Session()
        self._session.headers.update(_HEADERS)

    def graphql(self, query: str, variables: dict[str, Any]) -> dict[str, Any]:
        response = self._session.post(
            GRAPHQL_URL,
            json={"query": query, "variables": variables},
            timeout=self.timeout_seconds,
        )
        response.raise_for_status()
        payload = response.json()
        if payload.get("errors"):
            raise RMPGraphQLError(payload["errors"])
        data = payload.get("data")
        if not data:
            raise RMPGraphQLError("GraphQL response contained no data")
        return data

    def get_teacher_profile(self, teacher_id: str) -> dict[str, Any]:
        data = self.graphql(TEACHER_PROFILE_QUERY, {"id": teacher_id})
        node = data.get("node")
        if not node or node.get("__typename") != "Teacher":
            raise RMPGraphQLError(
                "That URL did not resolve to a professor. Check the RateMyProfessors link."
            )
        return node

    def iter_ratings(
        self,
        teacher_id: str,
        *,
        page_size: int = 20,
        course_filter: str | None = None,
        max_ratings: int = 500,
    ) -> list[dict[str, Any]]:
        ratings: list[dict[str, Any]] = []
        cursor: str | None = None
        first_page = True

        while len(ratings) < max_ratings:
            if not first_page:
                time.sleep(self.page_pause_seconds)
            first_page = False

            remaining = max_ratings - len(ratings)
            data = self.graphql(
                RATINGS_LIST_QUERY,
                {
                    "id": teacher_id,
                    "count": min(page_size, remaining),
                    "courseFilter": course_filter,
                    "cursor": cursor,
                },
            )
            node = data.get("node") or {}
            connection = node.get("ratings") or {}
            edges = connection.get("edges") or []
            for edge in edges:
                rating = (edge or {}).get("node")
                if rating:
                    ratings.append(rating)

            page_info = connection.get("pageInfo") or {}
            if not page_info.get("hasNextPage"):
                break
            cursor = page_info.get("endCursor")
            if not cursor:
                break

        return ratings
