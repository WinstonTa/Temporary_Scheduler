from playwright.sync_api import sync_playwright
import json
import re

URL = (
    "https://web.csulb.edu/depts/enrollment/registration/"
    "class_schedule/Fall_2026/By_College/CECS.html"
)

with sync_playwright() as p:
    browser = p.chromium.launch(headless=True)
    page = browser.new_page()

    page.goto(
        URL,
        wait_until="domcontentloaded",
        timeout=30000
    )

    print("Page title:", page.title())

    headings = page.locator("h4")

    courses = []

    for i in range(headings.count()):
        heading = headings.nth(i)

        heading_text = heading.inner_text().strip()

        # Only actual CECS course headings
        match = re.match(
            r"^(CECS\s+\d+[A-Z]?)\s*-\s*(.+)$",
            heading_text
        )

        if not match:
            continue

        course_code = match.group(1).strip()
        course_title = match.group(2).strip()

        print(f"Scraping {course_code}...")

        course = {
            "code": course_code,
            "title": course_title,
            "sections": []
        }

        # Look for the next table after this h4
        table = heading.locator("xpath=following::table[1]")

        if table.count() == 0:
            courses.append(course)
            continue

        rows = table.locator("tbody tr")

        # Some tables may not use tbody
        if rows.count() == 0:
            rows = table.locator("tr")

        for j in range(rows.count()):
            row = rows.nth(j)

            cells = row.locator("td")

            if cells.count() == 0:
                continue

            values = [
                cells.nth(k).inner_text().strip()
                for k in range(cells.count())
            ]

            # Debug if needed
            # print(course_code, values)

            if len(values) < 5:
                continue

            if len(values) >= 11:
                section = {
                    "class_number": values[0],
                    "section": values[3],
                    "type": values[4],
                    "days": values[5],
                    "time": values[6],
                    "location": values[8],
                    "instructor": values[9],
                    "comment": values[10]
                }

                course["sections"].append(section)

        courses.append(course)

    with open(
        "schedule.json",
        "w",
        encoding="utf-8"
    ) as f:
        json.dump(
            courses,
            f,
            indent=2,
            ensure_ascii=False
        )

    browser.close()

print(f"Saved {len(courses)} courses to schedule.json")