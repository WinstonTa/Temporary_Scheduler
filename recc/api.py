from pathlib import Path
import json
import sys
import time

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

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

RECC_DIR = Path(__file__).resolve().parent
if str(RECC_DIR) not in sys.path:
    sys.path.insert(0, str(RECC_DIR))

try:
    from script import get_reccomendations
    # #region agent log
    _dbg("recc/api.py:import", "script import succeeded", {"reccDir": str(RECC_DIR)}, "A")
    # #endregion
except Exception as exc:
    # #region agent log
    _dbg("recc/api.py:import", "script import failed", {"error": type(exc).__name__, "msg": str(exc)}, "A")
    # #endregion
    raise

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
    ],
    allow_methods=["*"],
    allow_headers=["*"],
)


class RecommendClasses(BaseModel):
    user_id: str
    term: str = "Fall 2026"
    match_count: int = 10


@app.get("/health")
def health():
    return {"status": "ok"}


@app.post("/recommend-classes")
@app.post("/reccomend-classes")
def recommend_classes_request(request: RecommendClasses):
    # #region agent log
    _dbg(
        "recc/api.py:recommend",
        "recommend request received",
        {"hasUserId": bool(request.user_id), "term": request.term, "matchCount": request.match_count},
        "B",
    )
    # #endregion
    try:
        recs = get_reccomendations(
            request.user_id,
            term=request.term,
            match_count=request.match_count,
        )
        # #region agent log
        _dbg(
            "recc/api.py:recommend",
            "recommend succeeded",
            {"count": len(recs) if recs is not None else 0},
            "D",
        )
        # #endregion
        return {"status": "success", "recommendations": recs, "reccomendations": recs}
    except ValueError as e:
        # #region agent log
        _dbg("recc/api.py:recommend", "recommend ValueError", {"error": str(e)}, "E")
        # #endregion
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        # #region agent log
        _dbg("recc/api.py:recommend", "recommend unexpected error", {"error": type(e).__name__, "msg": str(e)}, "D")
        # #endregion
        raise HTTPException(status_code=500, detail=str(e))
