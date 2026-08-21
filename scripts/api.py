"""
run with:
    uvicorn api:app --reload

Frontend calls it like:
    fetch("http://localhost:8000/generate-quiz-vector", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user_id: "the-students-uuid" })
    })
"""

from fastapi import FastAPI , HTTPException
from pydantic import BaseModel

from generate_quiz_vector import generate_quiz_vector

app = FastAPI()

class QuizVectorRequest(BaseModel):
    user_id:str

@app.post("/generate-quiz-vector")
def generate_quiz_vector_endpoint(request:QuizVectorRequest):
    try:
        vector = generate_quiz_vector(request.user_id)
        return {"status":"success", "vector_legnth":len(vector)}
    except ValueError as e:
        #no quize_response found
        raise HTTPException(status_code=400, detail=str(e))



