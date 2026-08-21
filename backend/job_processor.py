from datetime import datetime, timezone
from supabase_client import get_supabase
from gemini import synthesize_profile
from embedding import embed_text

MATCH_COUNT = 10


def _update_job_status(job_id: str, status: str, error_message: str | None = None):
    supabase = get_supabase()
    payload = {"status": status}
    if error_message:
        payload["error_message"] = error_message
    if status in ("complete", "failed"):
        payload["completed_at"] = datetime.now(timezone.utc).isoformat()
    supabase.table("recommendation_jobs").update(payload).eq("id", job_id).execute()


async def process_recommendation_job(job_id: str, user_id: str, quiz_response_id: str, answers: dict):
    """
    The full async pipeline, run as a background task after
    POST /api/quiz/submit returns. Updates recommendation_jobs.status
    as it progresses so the frontend (subscribed via Supabase Realtime)
    can reflect state changes live.
    """
    supabase = get_supabase()
    _update_job_status(job_id, "processing")

    try:
        # 1. Gemini: raw answers -> clean profile paragraph
        profile_text = await synthesize_profile(answers)

        # 2. sentence-transformers: paragraph -> vector
        embedding = embed_text(profile_text)

        # 3. Store the profile (mark prior profiles for this user as not-current)
        supabase.table("user_profiles").update({"is_current": False}).eq(
            "user_id", user_id
        ).eq("is_current", True).execute()

        supabase.table("user_profiles").insert(
            {
                "user_id": user_id,
                "quiz_response_id": quiz_response_id,
                "profile_text": profile_text,
                "embedding": embedding,
                "is_current": True,
            }
        ).execute()

        # 4. pgvector similarity search via the match_courses() SQL function
        matches = supabase.rpc(
            "match_courses",
            {"query_embedding": embedding, "match_count": MATCH_COUNT},
        ).execute()

        # 5. Write ranked results (denormalized — course + best professor
        # info stored directly, so reads never need to cross into raw_data)
        rows = [
            {
                "job_id": job_id,
                "course_id": m["course_id"],
                "course_code": m["course_code"],
                "course_title": m["course_title"],
                "similarity": m["similarity"],
                "rank": i + 1,
                "professor_id": m.get("professor_id"),
                "professor_name": m.get("professor_name"),
                "professor_rating": m.get("professor_rating"),
            }
            for i, m in enumerate(matches.data)
        ]
        if rows:
            supabase.table("recommendation_results").insert(rows).execute()

        _update_job_status(job_id, "complete")

    except Exception as e:
        # Swallow the exception here (it's a background task — nothing is
        # awaiting it directly) but record it so the frontend can show a
        # real error state instead of hanging on "generating...".
        _update_job_status(job_id, "failed", error_message=str(e))