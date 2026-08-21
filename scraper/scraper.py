from playwright.sync_api import sync_playwright
import json
import re

PROGRAM_URL = (
    "https://csulb.catalog.acalog.com/"
    "preview_program.php?catoid=5&poid=1863"
)

BASE_URL = "https://csulb.catalog.acalog.com/"

COURSE_PATTERN = (
    r"(?:[A-Z]{2,5}|[A-Z]\s+[A-Z])\s+\d{2,3}[A-Z]?"
)



def extract_course_codes(text):
    return re.findall( rf"\b{COURSE_PATTERN}\b",
        text)


def parse_requirement_rule(text):
    text = text.replace("\xa0", " ").strip()

    text = re.sub(
        r"\s+or\s+equivalent\b",
        "",
        text,
        flags=re.IGNORECASE
    )

    # Remove label
    text = re.sub(
        r"^(Prerequisite\(s\)|Prerequisites|Prerequisite|"
        r"Corequisite\(s\)|Corequisites|Corequisite)"
        r"\s*:\s*",
        "",
        text,
        flags=re.IGNORECASE
    )

    # Remove common trailing grade language
    text = re.sub(
        r",?\s*(all|both)?\s*with\s+a\s+grade.*$",
        "",
        text,
        flags=re.IGNORECASE
    )

    course = COURSE_PATTERN

    # A and (B or C)
    match = re.search(
        rf"({course})\s+and\s+\(({course})\s+or\s+({course})\)",
        text,
        re.IGNORECASE
    )

    if match:
        return {
            "all": [
                match.group(1),
                {
                    "any": [
                        match.group(2),
                        match.group(3)
                    ]
                }
            ]
        }

    # (A or B) and (C or D)
    match = re.search(
        rf"\(?({course})\s+or\s+({course})\)?"
        rf"\s+and\s+"
        rf"\(?({course})\s+or\s+({course})\)?",
        text,
        re.IGNORECASE
    )

    if match:
        return {
            "all": [
                {
                    "any": [
                        match.group(1),
                        match.group(2)
                    ]
                },
                {
                    "any": [
                        match.group(3),
                        match.group(4)
                    ]
                }
            ]
        }

    # A and B or C
    match = re.search(
        rf"({course})\s+and\s+({course})\s+or\s+({course})",
        text,
        re.IGNORECASE
    )

    if match:
        return {
            "all": [
                match.group(1),
                {
                    "any": [
                        match.group(2),
                        match.group(3)
                    ]
                }
            ]
        }

    # A or B and C or D
    match = re.search(
        rf"({course})\s+or\s+({course})\s+and\s+"
        rf"({course})\s+or\s+({course})",
        text,
        re.IGNORECASE
    )

    if match:
        return {
            "all": [
                {
                    "any": [
                        match.group(1),
                        match.group(2)
                    ]
                },
                {
                    "any": [
                        match.group(3),
                        match.group(4)
                    ]
                }
            ]
        }

    # Pure A and B and C
    if " and " in text.lower() and " or " not in text.lower():
        courses = re.findall(course, text)

        if len(courses) >= 2:
            return {
                "all": courses
            }

    # Pure A or B or C
    if " or " in text.lower() and " and " not in text.lower():
        courses = re.findall(course, text)

        if len(courses) >= 2:
            return {
                "any": courses
            }

    # Single course
    courses = re.findall(course, text)

    if len(courses) == 1:
        return courses[0]

    return None

def parse_details(raw_text, code, title, units):
    text = raw_text.replace("\xa0", " ")

    lines = [
        line.strip()
        for line in text.splitlines()
        if line.strip()
    ]

    prerequisite_rule = None
    corequisite_rule = None

    prerequisite_text = None
    corequisite_text = None

    description = None

    # Find the course heading
    heading_index = None

    for i, line in enumerate(lines):
        if code in line and title in line:
            heading_index = i
            break

    # Must return FIVE values
    if heading_index is None:
        return (
            prerequisite_rule,
            corequisite_rule,
            prerequisite_text,
            corequisite_text,
            description
        )

    course_lines = lines[heading_index + 1:]

    # Skip "(3 units)" etc.
    if course_lines and "unit" in course_lines[0].lower():
        course_lines = course_lines[1:]

    description_candidates = []

    for line in course_lines:
        lower = line.lower()

        # Stop at page footer
        if (
            line == "Print (opens a new window)"
            or line == "SERVICES"
        ):
            break

        # Combined prerequisite/corequisite
        if (
            "prerequisite/corequisite:" in lower
            or "prerequisites/corequisites:" in lower
            or "prerequisite(s)/corequisite(s):" in lower
            or "prerequisite(s)corequisite(s):" in lower
            or "prerequisites/corequisites:" in lower
        ):
            prerequisite_text = line
            corequisite_text = line

            rule = parse_requirement_rule(line)

            prerequisite_rule = rule
            corequisite_rule = rule

            continue

        # Prerequisite only
        if (
            lower.startswith("prerequisite:")
            or lower.startswith("prerequisites:")
            or lower.startswith("prerequisite(s):")
        ):
            prerequisite_text = line
            prerequisite_rule = parse_requirement_rule(line)
            continue

        # Corequisite only
        if (
            lower.startswith("corequisite:")
            or lower.startswith("corequisites:")
            or lower.startswith("corequisite(s):")
        ):
            corequisite_text = line
            corequisite_rule = parse_requirement_rule(line)
            continue

        # Don't put grading information in description
        if (
            lower.startswith("letter grade")
            or lower.startswith("both grading")
            or lower.startswith("course fee")
        ):
            continue

        description_candidates.append(line)

    if description_candidates:
        description = " ".join(description_candidates)

    return (
        prerequisite_rule,
        corequisite_rule,
        prerequisite_text,
        corequisite_text,
        description
    )


with sync_playwright() as p:
    browser = p.chromium.launch(headless=True)

    page = browser.new_page()

    # Load the main program page
    page.goto(
        PROGRAM_URL,
        wait_until="networkidle",
        timeout=30000
    )

    body_text = page.locator("body").inner_text()

    pattern = (
        r"\b([A-Z]{2,5}(?:\s+[A-Z])?\s+\d{3}[A-Z]?)"
        r"\s+-\s+(.+?)\s+\((\d+(?:-\d+)?) units?\)"
    )

    matches = re.findall(pattern, body_text)

    print("Matches found:", len(matches))

    courses = []
    seen = set()

    for code, title, units in matches:
        code = code.strip()

        if code in seen:
            continue

        seen.add(code)

        courses.append({
            "code": code,
            "title": title.strip(),
            "units": units.strip(),
            "course_url": None,

            "prerequisite_text": None,
            "prerequisite_rule": None,

            "corequisite_text": None,
            "corequisite_rule": None,

            "description": None
        })

    print(f"Found {len(courses)} courses")

    # Find catoid and coid for each course
    for course in courses:
        code = course["code"]

        locator = page.locator(
            f'a[aria-label*="{code}"]'
        ).first

        if locator.count() == 0:
            print(f"No link found for {code}")
            continue

        onclick = locator.get_attribute("onclick")

        if not onclick:
            continue

        match = re.search(
            r"showCourse\('(\d+)',\s*'(\d+)'",
            onclick
        )

        if not match:
            continue

        catoid = match.group(1)
        coid = match.group(2)

        course["course_url"] = (
            f"{BASE_URL}preview_course_nopop.php?"
            f"catoid={catoid}&coid={coid}"
        )

    detail_page = browser.new_page()

    # Scrape individual course pages
    for course in courses:
        if not course["course_url"]:
            continue

        print(f"Scraping {course['code']}...")

        try:
            detail_page.goto(
                course["course_url"],
                wait_until="domcontentloaded",
                timeout=30000
            )

            raw_details = detail_page.locator("body").inner_text()

            (
                prerequisite_rule,
                corequisite_rule,
                prerequisite_text,
                corequisite_text,
                description
            ) = parse_details(
                raw_details,
                course["code"],
                course["title"],
                course["units"]
            )

            course["prerequisite_rule"] = prerequisite_rule
            course["corequisite_rule"] = corequisite_rule

            course["prerequisite_text"] = prerequisite_text
            course["corequisite_text"] = corequisite_text

            course["description"] = description

        except Exception as e:
            print(
                f"Failed to scrape {course['code']}: {e}"
            )

            course["scrape_error"] = str(e)

        # Save after every course
        with open(
            "courses.json",
            "w",
            encoding="utf-8"
        ) as f:
            json.dump(
                courses,
                f,
                indent=2,
                ensure_ascii=False
            )

        detail_page.wait_for_timeout(500)

    detail_page.close()
    browser.close()