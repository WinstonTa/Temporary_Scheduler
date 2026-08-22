from pathlib import Path
import sys

from fastapi import FastAPI, Header, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

RECC_DIR = Path(__file__).resolve().parent
if str(RECC_DIR) not in sys.path:
    sys.path.insert(0, str(RECC_DIR))

from script import get_reccomendations

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


def _bearer_token(authorization: str | None) -> str | None:
    if not authorization:
        return None
    scheme, _, token = authorization.partition(" ")
    if scheme.lower() != "bearer" or not token:
        return None
    return token


@app.post("/recommend-classes")
@app.post("/reccomend-classes")
def recommend_classes_request(
    request: RecommendClasses,
    authorization: str | None = Header(default=None),
):
    access_token = _bearer_token(authorization)
    try:
        recs = get_reccomendations(
            request.user_id,
            term=request.term,
            match_count=request.match_count,
            access_token=access_token,
        )
        return {"status": "success", "recommendations": recs, "reccomendations": recs}
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
