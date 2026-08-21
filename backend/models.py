from pydantic import BaseModel
from typing import Literal


class Answer(BaseModel):
    type: Literal["mc", "text"]
    value: str


class QuizSubmission(BaseModel):
    user_id: str
    answers: dict[str, Answer]  # keyed by question id, e.g. "q1"


class JobResponse(BaseModel):
    job_id: str
    status: str


class CourseResult(BaseModel):
    course_id: str
    course_code: str
    course_title: str
    similarity: float
    rank: int
    professor_id: str | None = None
    professor_name: str | None = None
    professor_rating: float | None = None


class RecommendationResults(BaseModel):
    job_id: str
    status: str
    results: list[CourseResult] = []
    error_message: str | None = None