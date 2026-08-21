import os
from supabase import create_client
from dotenv import load_dotenv
from pathlib import Path


ROOT = Path(__file__).resolve().parent
load_dotenv(ROOT / ".env")


SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_KEY")

supabase = create_client(SUPABASE_URL, SUPABASE_KEY)

def get_quiz_vector(user_id:str):
    #Based off of thier user_id, it pulls their specific quiz vector
    result = (
        supabase.schema("app_data")
        .table("profiles")
        .select("quiz_vector")
        .eq("id",user_id)
        .execute()
        .data
    )
    #raise value error if cannot find value within table
    if not result or result[0]["quiz_vector"] is None:
        raise ValueError(f"No quiz vector found for {user_id}, the quiz has not been completed")
    return result[0]["quiz_vector"]

#match count is how many classes is returned
def get_reccomendations(user_id:str, term:str = None, match_count:int =10):
    quiz_vector = get_quiz_vector(user_id)
    #rpc calls a function in PostGres, passing python values as function arguments, performs vector math <=>
    result = supabase.rpc(
        "match_offerings", 
        {
            "query_embeddings":quiz_vector, # matching the similirity of the embeddings
            "filter_term": term, # change to pre-reqs once we have a list 
            "match_count":match_count, # cap on how many classes are returned 
        },
    ).execute()

    return result.data

if __name__ =="__main__":
    student_id = "Replace with Real ID" # REPLACE WITH CALL FROM USER_TABLE WITH UNIQUE ID
    reccomendations = get_reccomendations(student_id, term="Fall 2026") # MATCH WITH COURSE OFFERINGS TERM
<<<<<<< HEAD
    student_id = "Replace with Real ID"
    reccomendations = get_reccomendations(student_id, term="Fall 2026")
    student_id = "Replace with Real ID"
    reccomendations = get_reccomendations(student_id, term="Fall 2026")
=======
>>>>>>> jason
    for rec in reccomendations:
          print(
            f"{rec['course_code']} — {rec['course_title']} "
            f"with {rec['professor_first_name']} {rec['professor_last_name']} "
            f"({rec['days']} {rec['start_time']}-{rec['end_time']}) "
            f"[similarity: {rec['similarity']:.3f}]"
        )

