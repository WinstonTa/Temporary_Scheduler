import os
from pathlib import Path
from supabase import create_client
from sentence_transformers import SentenceTransformer
from dotenv import load_dotenv
"""


"""

ROOT = Path(__file__).resolve().parent
load_dotenv(ROOT / ".env")

SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_KEY")

supabase = create_client(SUPABASE_URL, SUPABASE_KEY)
model = SentenceTransformer("all-MiniLM-L6-v2")

def embed_text(text:str) -> list[float]:
    return model.encode(text).tolist()

def build_quiz_text(responses:list[dict]) -> str:
    #combines all the answers into text blob
    answers = [r["answer_value"] for r in responses if r.get("answer_value")]
    return " ".join(answers)



def generate_quiz_vector(user_id:str):
    #generates and stores quiz vectors for one student
    responses = (
        supabase.schema("app_data")
        .table("quiz_responses")
        .select("answer_value")
        .eq("user_id",user_id)
        .execute()
        .data
    )
    if not responses:
        raise ValueError(f"No quiz responses found ")
    text = build_quiz_text(responses)
    vector = embed_text(text)

    supabase.schema("app_data").table("profiles").update(
        {"quiz_vector":vector}
    ).eq("id",user_id).execute()

    print("Generated Quiz vectors")
    return vector
def process_all_pending_profiles():
    """Batch-processes every profile that doesn't have a quiz_vector yet."""
    profiles = (
        supabase.schema("app_data")
        .table("profiles")
        .select("id")
        .is_("quiz_vector", "null")
        .execute()
        .data
    )
 
    print(f"Found {len(profiles)} profiles missing a quiz_vector")
 
    for profile in profiles:
        user_id = profile["id"]
        try:
            generate_quiz_vector(user_id)
        except ValueError as e:
            print(f"  Skipped {user_id}: {e}")
            continue
 
    print("Done.")
 
 
if __name__ == "__main__":
    process_all_pending_profiles()