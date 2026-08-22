import json
import os
import sys
import time
from pathlib import Path

from dotenv import load_dotenv
from supabase import create_client

# #region agent log
_DEBUG_LOG = Path(__file__).resolve().parent.parent / "debug-509fd1.log"


def _dbg(location, message, data, hypothesisId, runId="pre-fix"):
    try:
        with open(_DEBUG_LOG, "a", encoding="utf-8") as f:
            f.write(json.dumps({
                "sessionId": "509fd1",
                "location": location,
                "message": message,
                "data": data,
                "timestamp": int(time.time() * 1000),
                "hypothesisId": hypothesisId,
                "runId": runId,
            }) + "\n")
    except Exception:
        pass
# #endregion

ROOT = Path(__file__).resolve().parent.parent
env_path = ROOT / ".env"
load_dotenv(env_path)

SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_KEY") or os.getenv("SUPABASE_SERVICE_ROLE_KEY")

# #region agent log
_dbg(
    "recc/script.py:init",
    "env loaded",
    {
        "envExists": env_path.exists(),
        "hasUrl": bool(SUPABASE_URL),
        "hasKey": bool(SUPABASE_KEY),
        "root": str(ROOT),
    },
    "D",
)
# #endregion

supabase = create_client(SUPABASE_URL, SUPABASE_KEY)


def get_quiz_vector(user_id: str):
    result = (
        supabase.schema("app_data")
        .table("profiles")
        .select("quiz_vector")
        .eq("id", user_id)
        .execute()
        .data
    )
    vector = result[0]["quiz_vector"] if result else None
    # #region agent log
    _dbg(
        "recc/script.py:get_quiz_vector",
        "profile quiz_vector lookup",
        {"hasRow": bool(result), "hasVector": vector is not None, "vectorLen": len(vector) if vector else 0},
        "E",
    )
    # #endregion
    if vector is not None:
        return vector

    scripts_dir = str(ROOT / "scripts")
    if scripts_dir not in sys.path:
        sys.path.insert(0, scripts_dir)
    try:
        from generate_quiz_vector import generate_quiz_vector
        generated = generate_quiz_vector(user_id)
        # #region agent log
        _dbg(
            "recc/script.py:get_quiz_vector",
            "generated missing quiz_vector",
            {"vectorLen": len(generated) if generated else 0},
            "E",
        )
        # #endregion
        return generated
    except Exception as exc:
        # #region agent log
        _dbg(
            "recc/script.py:get_quiz_vector",
            "quiz_vector generate failed",
            {"error": type(exc).__name__, "msg": str(exc)},
            "E",
        )
        # #endregion
        raise ValueError("No quiz vector found; complete the quiz first") from exc


def get_reccomendations(user_id: str, term: str = None, match_count: int = 10):
    quiz_vector = get_quiz_vector(user_id)
    params = {
        "query_embedding": quiz_vector,
        "filter_term": term,
        "match_count": match_count,
    }
    # #region agent log
    _dbg(
        "recc/script.py:rpc",
        "calling match_offerings",
        {"paramKeys": list(params.keys()), "vectorLen": len(quiz_vector) if quiz_vector else 0, "term": term},
        "D",
    )
    # #endregion
    result = supabase.rpc("match_offerings", params).execute()
    # #region agent log
    _dbg(
        "recc/script.py:rpc",
        "match_offerings returned",
        {"count": len(result.data) if result.data is not None else 0},
        "D",
    )
    # #endregion
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
