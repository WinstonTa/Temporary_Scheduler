
import re
 
# TODO: confirm this matches your actual schedule data's term
TERM = "Fall 2026"
 
 
# ------------------------------------------------------------
# Course catalog + prerequisites
# ------------------------------------------------------------
 
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
 
 
def upsert_course(course_data: dict) -> int:
    result = (
        supabase.schema("raw_data")
        .table("courses")
        .upsert(
            {
                "course_code": course_data["code"],
                "title": course_data["title"],
                "description": course_data.get("description"),
                "credits": course_data.get("units"),
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
    prereq_text_by_code = {}
 
    for course_data in courses:
        course_id = upsert_course(course_data)
        course_ids_by_code[course_data["code"]] = course_id
 
        # prerequisite_rule turns out to be a plain course-code string
        # (e.g. "MATH 122"), same format the regex already extracts from
        # prerequisite_text — so just combine both sources into one blob
        # and parse it once.
        combined_prereq_text = " ".join(filter(None, [
            course_data.get("prerequisite_rule"),
            course_data.get("prerequisite_text"),
        ]))
        prereq_text_by_code[course_data["code"]] = combined_prereq_text
 
    print(f"Loaded {len(course_ids_by_code)} courses")
 
    # Pass 2: parse and insert prerequisite relationships, now that
    # every course referenced by a prerequisite is guaranteed to exist
    prereq_count = 0
    for code, course_id in course_ids_by_code.items():
        prereq_codes = parse_prerequisite_courses(prereq_text_by_code.get(code))
 
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
 
    Handles the common case where only the END time states AM/PM and
    the start time is assumed to share it. This can be wrong for a
    range that crosses noon with no meridiem on the start piece —
    rare for daytime class schedules, but worth spot-checking results.
    """
    start_str, end_str = time_str.split("-")
 
    def parse_piece(piece, fallback_meridiem=None):
        match = re.match(r'(\d{1,2})(?::(\d{2}))?\s*(AM|PM)?', piece.strip())
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
 
    start_hour, start_minute = parse_piece(start_str, fallback_meridiem=end_meridiem)
    end_hour, end_minute = parse_piece(end_str, fallback_meridiem=end_meridiem)
 
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