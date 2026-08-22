from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from script import get_reccomendations
import os
import sys

sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "recc"))

app = FastAPI()

from fastapi.middleware.cors import CORSMiddleware

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],  # match your actual React dev server port
    allow_methods=["*"],
    allow_headers=["*"],
)

class reccomend_classes(BaseModel):
    user_id:str
    term: str = "Fall 2026"
    match_count: int = 10
    #input whatever added attributes you need for the rquest

@app.post("/reccomend-classes")
def reccomend_classes_request(request: reccomend_classes):
    try:
        reccs = get_reccomendations(
            request.user_id, 
            term = request.term,
            match_count = request.match_count,
        )
        return {"status": "success", "reccomendations": reccs}
    except ValueError as e:
        raise HTTPException(status=400, details=str(e))

