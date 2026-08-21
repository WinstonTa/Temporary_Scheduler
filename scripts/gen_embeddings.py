import os
from pathlib import Path
from supabase import create_client
from sentence_transformers import SentenceTransformer
from dotenv import load_dotenv
"""
Embedding all the information into one text blob that says everything about the class/professor

That text blob turns into embeddings and that is what is compared

<<<<<<< HEAD
<<<<<<< HEAD:scripts/gen_embeddings.py
The embeddings after this would look like -> type(numpy.ndarray), vector.shape = (384,), vector[:5] = [0.0231, -0.1502,0.0891,0.027]


=======
>>>>>>> b8835a9 (added description to embeddings script):gen_embeddings.py
=======
The embeddings after this would look like -> type(numpy.ndarray), vector.shape = (384,), vector[:5] = [0.0231, -0.1502,0.0891,0.027]


>>>>>>> d0f62ec (added quiz vector + api)
"""

ROOT = Path(__file__).resolve().parent
load_dotenv(ROOT / ".env")

SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_KEY")

supabase = create_client(SUPABASE_URL, SUPABASE_KEY)
model = SentenceTransformer("all-MiniLM-L6-v2")

def embed_text(text:str) -> list[float]:
    #turn text blob -> 384 dim vector
    return model.encode(text).tolist()

def build_prof_text(prof: dict, tags:list[dict], reviews: list[dict]) -> str:
    #one text blob that represents a prof
    parts = [f"{prof['first_name']} {prof['last_name']}{prof['department']} prof."]

    for tag in tags:
        #repeat each tag word by how often it is said
        repeat_count = min(tag["tag_count"], 10) # capping at 10 times

        parts.extend([tag["tag_name"] * repeat_count])

    #Include review blobs into embeddings
    for review in reviews[:15]:
        if review.get("rating_text"):
            parts.append(review["rating_text"])
    return " ".join(parts)

def build_course_text(course:dict) -> str:
    #text blob for course
    return f"{course['course_code']}: {course['title']}. {course['description'] or ''}"

def process_professors():
    # Pull professors that don't have an embedding yet
    professors = (
        supabase.schema("raw_data")
        .table("professors")
        .select("*")
        .is_("embedding", "null")
        .execute()
        .data
    )
 
    for professor in professors:
        tags = (
            supabase.schema("raw_data")
            .table("professor_tags")
            .select("*")
            .eq("professor_id", professor["id"])
            .execute()
            .data
        )
        reviews = (
            supabase.schema("raw_data")
            .table("reviews")
            .select("rating_text")
            .eq("professor_id", professor["id"])
            .execute()
            .data
        )
 
        text = build_prof_text(professor, tags, reviews)
        vector = embed_text(text)
 
        supabase.schema("raw_data").table("professors").update(
            {"embedding": vector}
        ).eq("id", professor["id"]).execute()
 
        print(f"Embedded professor: {professor['first_name']} {professor['last_name']}")
 
 
def process_courses():
    courses = (
        supabase.schema("raw_data")
        .table("courses")
        .select("*")
        .is_("embedding", "null")
        .execute()
        .data
    )
 
    for course in courses:
        text = build_course_text(course)
        vector = embed_text(text)
 
        supabase.schema("raw_data").table("courses").update(
            {"embedding": vector}
        ).eq("id", course["id"]).execute()
 
        print(f"Embedded course: {course['course_code']}")


if __name__ == "__main__":
    print("Emeddings Proffessors")
    process_professors()

    print("Embedding courses")
    process_courses()

    print("Done")

