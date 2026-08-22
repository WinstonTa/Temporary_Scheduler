import os
import sys
from pathlib import Path

from dotenv import load_dotenv
from supabase import create_client

ROOT = Path(__file__).resolve().parent.parent
load_dotenv(ROOT / ".env")

SUPABASE_URL = os.getenv("SUPABASE_URL")
_SERVICE_KEY = os.getenv("SUPABASE_KEY") or os.getenv("SUPABASE_SERVICE_ROLE_KEY")
_PUBLISHABLE_KEY = os.getenv("SUPABASE_PUBLISHABLE_KEY")
SUPABASE_KEY = _SERVICE_KEY or _PUBLISHABLE_KEY
USING_SERVICE_ROLE = bool(_SERVICE_KEY)


def _make_client(access_token: str | None = None):
    if not SUPABASE_URL or not SUPABASE_KEY:
        raise ValueError("Supabase URL/key missing from environment")
    client = create_client(SUPABASE_URL, SUPABASE_KEY)
    if access_token and not USING_SERVICE_ROLE:
        client.postgrest.auth(access_token)
    return client


def get_quiz_vector(user_id: str, client=None, access_token: str | None = None):
    db = client or _make_client(access_token)
    result = (
        db.schema("app_data")
        .table("profiles")
        .select("quiz_vector")
        .eq("id", user_id)
        .execute()
        .data
    )
    vector = result[0]["quiz_vector"] if result else None
    if vector is not None:
        return vector

    scripts_dir = str(ROOT / "scripts")
    if scripts_dir not in sys.path:
        sys.path.insert(0, scripts_dir)
    try:
        from generate_quiz_vector import generate_quiz_vector
        return generate_quiz_vector(user_id, client=db)
    except Exception as exc:
        raise ValueError("No quiz vector found; complete the quiz first") from exc


def get_reccomendations(user_id: str, term: str = None, match_count: int = 10, access_token: str | None = None):
    db = _make_client(access_token)
    quiz_vector = get_quiz_vector(user_id, client=db, access_token=access_token)
    result = db.rpc(
        "match_offerings",
        {
            "query_embedding": quiz_vector,
            "filter_term": term,
            "match_count": match_count,
        },
    ).execute()
    return result.data


if __name__ == "__main__":
    student_id = "Replace with Real ID"
    reccomendations = get_reccomendations(student_id, term="Fall 2026")
    for rec in reccomendations:
        print(
            f"{rec['course_code']} — {rec['course_title']} "
            f"with {rec['professor_first_name']} {rec['professor_last_name']} "
            f"({rec['days']} {rec['start_time']}-{rec['end_time']}) "
            f"[similarity: {rec['similarity']:.3f}]"
        )
