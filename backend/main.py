from fastapi import FastAPI, HTTPException, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
import os

from models import QuizSubmission, JobResponse, RecommendationResults, CourseResult
from questions import get_questions, validate_answers
from supabase_client import get_supabase
from job_processor import process_recommendation_job

app = FastAPI(title="CS Track Quiz API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[os.environ.get("FRONTEND_URL", "http://localhost:5173")],
    allow_methods=["GET", "POST"],
    allow_headers=["*"],
)


@app.get("/api/quiz/questions")
def list_questions():
    return {"questions": get_questions()}


@app.post("/api/quiz/submit", response_model=JobResponse)
async def submit_quiz(submission: QuizSubmission, background_tasks: BackgroundTasks):
    answers_dict = {qid: a.model_dump() for qid, a in submission.answers.items()}

    missing = validate_answers(answers_dict)
    if missing:
        raise HTTPException(status_code=400, detail=f"Missing answers for: {missing}")

    supabase = get_supabase()

    # 1. Save the raw submission
    quiz_response = (
        supabase.table("quiz_responses")
        .insert({"user_id": submission.user_id, "answers": answers_dict})
        .execute()
    )
    quiz_response_id = quiz_response.data[0]["id"]

    # 2. Create the job row (frontend subscribes to this row via Realtime)
    job = (
        supabase.table("recommendation_jobs")
        .insert(
            {
                "user_id": submission.user_id,
                "quiz_response_id": quiz_response_id,
                "status": "pending",
            }
        )
        .execute()
    )
    job_id = job.data[0]["id"]

    # 3. Kick off the pipeline without blocking the response
    background_tasks.add_task(
        process_recommendation_job,
        job_id,
        submission.user_id,
        quiz_response_id,
        answers_dict,
    )

    return JobResponse(job_id=job_id, status="pending")


@app.get("/api/quiz/results/{job_id}", response_model=RecommendationResults)
def get_results(job_id: str):
    supabase = get_supabase()

    job = supabase.table("recommendation_jobs").select("*").eq("id", job_id).execute()
    if not job.data:
        raise HTTPException(status_code=404, detail="Job not found")
    job_row = job.data[0]

    if job_row["status"] != "complete":
        return RecommendationResults(
            job_id=job_id,
            status=job_row["status"],
            error_message=job_row.get("error_message"),
        )

    results = (
        supabase.table("recommendation_results")
        .select("*")
        .eq("job_id", job_id)
        .order("rank")
        .execute()
    )

    course_results = [
        CourseResult(
            course_id=r["course_id"],
            course_code=r["course_code"],
            course_title=r["course_title"],
            similarity=r["similarity"],
            rank=r["rank"],
            professor_id=r.get("professor_id"),
            professor_name=r.get("professor_name"),
            professor_rating=r.get("professor_rating"),
        )
        for r in results.data
    ]

    return RecommendationResults(job_id=job_id, status="complete", results=course_results)