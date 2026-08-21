import os 
import re
import glob
from datetime import datetime
from pathlib import Path
import json
from supabase import create_client
from dotenv import load_dotenv
#json_dir -> past_output

"""
Loads per-professor RPM JSON file 
into -> Supabase's raw_data schema: schools, professors, professor_tags, reviews

reviews is where the text embedddings will be found

Expects dictionary of JSON files:
{
  "professor": { "legacy_id": ..., "first_name": ..., ..., "school": {...} },
  "summary": { "tag_counts": [...] },
  "ratings": [ { "course": ..., "comment": ..., "tags": [...], "date": ... } ]
}
 
Saves the reviews to the database but is waiting until we link the course ID from the CSULb catalouge 
"""
ROOT = Path(__file__).resolve().parent
load_dotenv(ROOT / ".env")
SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_KEY")


supabase = create_client(SUPABASE_URL, SUPABASE_KEY)

def normalize_tag_name(tag_name:str) -> str:
    #normalizing capitalization
    return tag_name.strip().title()

def normalize_course_code(code:str) -> str:
    #Strips spaces/uppercases, CECS 450 -> CECS450
    return re.sub(r"\s+", "", code).upper()

def parse_review_data(date_str:str):
    #parses RMP date to remove all extra characters
    cleaned = date_str.replace(" UTC", "")
    return datetime.strptime(cleaned, "%Y-%m-%d %H:%M:%S %z").isforamt() # format the data into Year-Month-date, Hour:Minute:seconds UTC  offset


def get_or_create_school(school_data:dict) -> int:
    #returns the database id for CSULB 
    rmp_school_id = str(school_data["legacy_id"])
    existing = (
        supabase.schema("raw_data")
        .table("schools")
        .select("*") #equivilant to SQL: SELECT * FROM schools
        .eq("rmp_school_id", rmp_school_id)#grab the school with the rmp id for CSULB
        .execute() # Sends the query to supabase/waits for a response
        .data # grabbing just the rows into a list format of dictionaries
    )
    #existing -> [{"id": 1, "name": "California State University Long Beach", "rmp_school_id": "18846"}]
    if existing:
        return existing[0]["id"]

    #if the id doesn't exist, it adds it into the schema
    result = (
        supabase.schema("raw_data")
        .table("schools")
        .insert({"name":school_data["name"], "rmp_school_id":rmp_school_id})
        .execute()
    )
    return result.data[0]["id"]

def upsert_prof(prof_data:dict, school_id: int) -> int:
    #updating or adding the professors data into the schema database, if they dont exist already
    result = (
        supabase.schema("raw_data")
        .table("professors")
        .upsert( # insert these labels but if already exists, then update these categories
             {
                "school_id": school_id,
                "rmp_professor_id": str(prof_data["legacy_id"]),
                "first_name": prof_data["first_name"],
                "last_name": prof_data["last_name"],
                "department": prof_data.get("department"),
                "avg_rating": prof_data.get("avg_rating"),
                "avg_difficulty": prof_data.get("avg_difficulty"),
                "would_take_again_pct": prof_data.get("would_take_again_percent"),
                "num_ratings": prof_data.get("num_ratings_listed", 0),
            },
            on_conflict = "rmp_professor_id" # checking the rmp_prof_id cols to see if it exist already
        )
        .execute() 
    )
    return result.data[0]["id"]

def load_tags(prof_row_id:int, tag_counts:list[dict]):
    #merge casing varients into one, ex: GOOD + good
    merged: dict[str,int] = {}
    for tag in tag_counts:
        name = normalize_tag_name(tag["name"])
        merged[name] = merged.get(name, 0) + tag["count"]
    #clear the old tags
    supabase.schema("raw_data").table("professor_tags").delete().eq("professor_id", prof_row_id).execute()

    for tag_name, count in merged.items():
        supabase.schema("raw_data").table("professor_tags").insert(
            {"professor_id":prof_row_id, "tag_name":tag_name, "tag_count":count}
        ).execute()

def find_course_id(course_code_raw: str):
    if not course_code_raw:
        return None
    target = normalize_course_code(course_code_raw)
    #Best -Effort, implement course catalouge into this section
    courses = supabase.schema("raw_data").tables("courses").select("id, course_code").execute().data
    for course in courses:
        if normalize_course_code(course["course_code"]) == target:
            return course["id"]
        return None

def load_reviews(prof_row_id:int, ratings:list[dict]):
    #clear old reviews for every prof specific, no duplicates
    supabase.schema("raw_data").table("reviews").delete().eq("professor_id", prof_row_id).execute()

    for rating in ratings:
        course_id = find_course_id(rating.get("course"))
        supabase.schema("raw_data").table("reviews").insert( 
                     {
                        "professor_id": prof_row_id,
                        "course_id": course_id,
                        "source":"rmp",
                        "rating_text":rating.get("comment"),
                        "created_at":parse_review_data(rating["date"] if rating["date"] else None),
                    },
                    on_conflict = "rmp_professor_id" # checking the rmp_prof_id cols to see if it exist already
                ).execute()
def load_prof_file(filepath:str):
    with open(filepath) as f:
        data = json.load(f)
    prof_data = data["professor"]
    school_id = get_or_create_school(prof_data["school"])
    prof_row_id = upsert_prof(prof_data,school_id)

    load_tags(prof_row_id, data["summary"].get("tag_counts", []))
    load_reviews(prof_row_id, data.get("ratings", []))

    print(f"Loaded: {prof_data['first_name']} {prof_data['last_name']} "
          f"({len(data.get('ratings', []))} reviews)")
 

if __name__ == "__main__":
    files = glob.glob(os.path.join("/past_output", "*.json")) #directory that pulls the .json files
    print(f"found {len(files)} in directory")

    for filepath in files:
        load_prof_file(filepath)
    print("finished")


