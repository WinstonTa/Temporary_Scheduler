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



TERM = "Fall 2026"
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
    return datetime.strptime(cleaned, "%Y-%m-%d %H:%M:%S %z").isoformat() # format the data into Year-Month-date, Hour:Minute:seconds UTC  offset


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
    courses = supabase.schema("raw_data").table("courses").select("id, course_code").execute().data
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
                        "created_at": parse_review_data(rating["date"]) if rating.get("date") else None,
                    },
                ).execute()

def load_course_file(filepath:str):
    #loading pre-reqs/ course information
    with open(filepath) as f:
        data = json.load(f)
    course_data = data["course"]
    course_code = normalize_course_code(data["code"])

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
 # ------------------------------------------------------------
# Course catalog + prerequisites
# ------------------------------------------------------------
 
def extract_prereq_codes_from_rule(rule) -> list[str]:
    """
    prerequisite_rule shapes seen so far:
      - a plain string: "MATH 122"
      - a dict: {"all": ["CECS 174", "MATH 113"]} — every listed course required
      - a dict with "any": {"any": [...]} — one of these required (OR)
      - NESTED: an "all" list can itself contain a dict, e.g.
        {"all": ["CECS 174", {"any": ["MATH 111", "MATH 113"]}]}
        meaning "CECS 174 AND (one of MATH 111/113)"
 
    Our prerequisites table can only represent hard "all required" rows —
    there's no way to store "one of these". So at any depth, an "any"
    group is skipped with a warning rather than silently inserted as if
    every alternative were required (which would wrongly block students
    who only took one of the valid options).
    """
    if not rule:
        return []
    if isinstance(rule, str):
        return parse_prerequisite_courses(rule)
    if isinstance(rule, list):
        codes = []
        for item in rule:
            codes.extend(extract_prereq_codes_from_rule(item))
        return codes
    if isinstance(rule, dict):
        codes = []
        if "all" in rule:
            codes.extend(extract_prereq_codes_from_rule(rule["all"]))
        if "any" in rule:
            print(f"  WARNING: 'any' (OR) prerequisite found — current schema can't "
                  f"represent alternatives, skipping: {rule['any']}")
        return codes
    return []
 
 
def parse_prerequisite_courses(text: str) -> list[str]:
    """
    Scans free-form prerequisite text and pulls out course-code-shaped
    patterns, e.g. "MATH 111", "MATH 112B", ignoring the surrounding
    grammar. Returns codes in the same "DEPT ###" format as your
    catalog's own `code` field, so they match directly.
    """
    if not text:
        return []
    # Matches 2-4 uppercase letters, a space, 2-3 digits, optional trailing letter
    matches = re.findall(r'\b[A-Z]{2,4}\s+\d{2,3}[A-Z]?\b', text)
    return list(dict.fromkeys(matches))  # dedupe while preserving order
 
 
 
def parse_credit_range(units) -> tuple:
    """
    Handles two shapes seen in the catalog:
      - a plain number as a string: "4" -> (4.0, 4.0)
      - a variable-unit range: "1-3" -> (1.0, 3.0)
 
    Returns (credits_min, credits_max) — for a fixed-credit course,
    both values are the same.
    """
    if units is None:
        return None, None
    units_str = str(units).strip()
 
    if "-" in units_str:
        parts = units_str.split("-")
        try:
            nums = [float(p) for p in parts]
            return min(nums), max(nums)
        except ValueError:
            return None, None
 
    try:
        value = float(units_str)
        return value, value
    except ValueError:
        return None, None
 
 
def upsert_course(course_data: dict) -> int:
    credits_min, credits_max = parse_credit_range(course_data.get("units"))
 
    result = (
        supabase.schema("raw_data")
        .table("courses")
        .upsert(
            {
                "course_code": course_data["code"],
                "title": course_data["title"],
                "description": course_data.get("description"),
                "credits_min": credits_min,
                "credits_max": credits_max,
            },
            on_conflict="course_code",
        )
        .execute()
    )
    return result.data[0]["id"]
 
 
def load_course_file(filepath: str):
    """
    Loads the course catalog: a JSON array of course objects.
    Two passes — first insert every course, THEN resolve prerequisites,
    since a prerequisite might be a course later in the same file.
    """
    with open(filepath) as f:
        courses = json.load(f)  # expects a list of course dicts
 
    # Pass 1: insert/update every course, remembering each one's raw
    # prerequisite text for pass 2
    course_ids_by_code = {}
    prereq_codes_by_course = {}
 
    for course_data in courses:
        course_id = upsert_course(course_data)
        course_ids_by_code[course_data["code"]] = course_id
 
        # Combine codes pulled from prerequisite_rule (structured or string)
        # with codes parsed out of prerequisite_text (free-form prose)
        rule_codes = extract_prereq_codes_from_rule(course_data.get("prerequisite_rule"))
        text_codes = parse_prerequisite_courses(course_data.get("prerequisite_text"))
        all_codes = list(dict.fromkeys(rule_codes + text_codes))  # dedupe, preserve order
        prereq_codes_by_course[course_data["code"]] = all_codes
 
    print(f"Loaded {len(course_ids_by_code)} courses")
 
    # Pass 2: parse and insert prerequisite relationships, now that
    # every course referenced by a prerequisite is guaranteed to exist
    prereq_count = 0
    for code, course_id in course_ids_by_code.items():
        prereq_codes = prereq_codes_by_course.get(code, [])
 
        for prereq_code in prereq_codes:
            prereq_id = course_ids_by_code.get(prereq_code)
            if prereq_id is None:
                print(f"  WARNING: {code} requires {prereq_code}, but that course wasn't found in this file")
                continue
 
            supabase.schema("raw_data").table("prerequisites").upsert(
                {"course_id": course_id, "prerequisite_course_id": prereq_id},
                on_conflict="course_id,prerequisite_course_id",
            ).execute()
            prereq_count += 1
 
    print(f"Loaded {prereq_count} prerequisite relationships")
 
 
# ------------------------------------------------------------
# Course offerings (schedule)
# ------------------------------------------------------------
 
def parse_time_range(time_str: str):
    """
    Parses schedule time ranges like '8-8:50AM' or '9:30-10:45AM' into
    (start_time, end_time) as "HH:MM" 24-hour strings.
 
    Returns (None, None) for anything that isn't a real time range —
    "TBA"/"ARR" (arranged, no fixed time) shows up for some sections,
    and scraped data sometimes uses an en-dash (–) instead of a plain
    hyphen (-), which is normalized here too.
    """
    if not time_str:
        return None, None
 
    normalized = time_str.replace("–", "-").replace("—", "-").strip()
 
    if normalized.upper() in ("TBA", "ARR", "ARRANGED", "N/A", ""):
        return None, None
 
    parts = normalized.split("-")
    if len(parts) != 2:
        print(f"  WARNING: couldn't parse time range '{time_str}' — leaving time blank for this section")
        return None, None
 
    start_str, end_str = parts
 
    def parse_piece(piece, fallback_meridiem=None):
        match = re.match(r'(\d{1,2})(?::(\d{2}))?\s*(AM|PM)?', piece.strip())
        if not match:
            return None
        hour = int(match.group(1))
        minute = int(match.group(2) or 0)
        meridiem = match.group(3) or fallback_meridiem
        if meridiem == "PM" and hour != 12:
            hour += 12
        elif meridiem == "AM" and hour == 12:
            hour = 0
        return hour, minute
 
    end_match = re.search(r'(AM|PM)', end_str)
    end_meridiem = end_match.group(1) if end_match else None
 
    start_parsed = parse_piece(start_str, fallback_meridiem=end_meridiem)
    end_parsed = parse_piece(end_str, fallback_meridiem=end_meridiem)
 
    if start_parsed is None or end_parsed is None:
        print(f"  WARNING: couldn't parse time range '{time_str}' — leaving time blank for this section")
        return None, None
 
    start_hour, start_minute = start_parsed
    end_hour, end_minute = end_parsed
 
    return f"{start_hour:02d}:{start_minute:02d}", f"{end_hour:02d}:{end_minute:02d}"
 
 
def match_professor_id(instructor_str: str):
    """
    Matches a schedule's 'LastName F' format (e.g. 'Nachawati S') against
    the professors table on last name + first-initial. Not foolproof —
    two instructors sharing a last name and first initial would collide.
    """
    if not instructor_str:
        return None
 
    parts = instructor_str.strip().rsplit(" ", 1)
    if len(parts) != 2:
        return None
    last_name, first_initial = parts
 
    matches = (
        supabase.schema("raw_data")
        .table("professors")
        .select("id")
        .ilike("last_name", last_name)
        .ilike("first_name", f"{first_initial}%")
        .execute()
        .data
    )
    return matches[0]["id"] if matches else None
 
 
def load_offerings_file(filepath: str):
    """
    Loads the course schedule: a JSON array of {code, title, sections}.
    """
    with open(filepath) as f:
        offerings_data = json.load(f)
 
    for entry in offerings_data:
        course_code = entry["code"]
 
        course_match = (
            supabase.schema("raw_data")
            .table("courses")
            .select("id")
            .eq("course_code", course_code)
            .execute()
            .data
        )
        if not course_match:
            print(f"  WARNING: no course found for {course_code} — skipping its sections")
            continue
        course_id = course_match[0]["id"]
 
        # Clear existing offerings for this course+term before reinserting,
        # so rerunning this script doesn't create duplicate sections
        supabase.schema("raw_data").table("course_offerings").delete().eq(
            "course_id", course_id
        ).eq("term", TERM).execute()
 
        for section in entry.get("sections", []):
            start_time, end_time = parse_time_range(section["time"])
            professor_id = match_professor_id(section.get("instructor"))
 
            supabase.schema("raw_data").table("course_offerings").insert(
                {
                    "course_id": course_id,
                    "professor_id": professor_id,
                    "term": TERM,
                    "days": section.get("days"),
                    "start_time": start_time,
                    "end_time": end_time,
                    "location": section.get("location"),
                    "class_number": section.get("class_number"),
                    "section_number": section.get("section"),
                    "section_type": section.get("type"),
                }
            ).execute()
 
        print(f"Loaded {len(entry.get('sections', []))} offerings for {course_code}")
 
 
if __name__ == "__main__":
    filepath = os.path.join(ROOT.parent,"scraper/" "schedule.json")
    
    load_offerings_file(filepath)
    print("finished")


