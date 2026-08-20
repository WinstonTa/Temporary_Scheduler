# Temporary Scheduler

Proof-of-concept slice of a larger course-recommendation project. This round only handles **one RateMyProfessors professor URL**: scrape public GraphQL data, write a JSON dump, then write a markdown briefing. A later step will add Gemini analysis of that JSON (and a real UI after that).

## What you get

For a URL like `https://www.ratemyprofessors.com/professor/12345`, the pipeline writes two files under `output/`:

- `{professor}_{id}.json` — extracted RMP data (profile, tags, course list, reviews, and computed totals)
- `{professor}_{id}.md` — briefing. Stats-only until a Gemini API key is configured; LLM insights after that

## Setup

```bash
python -m venv .venv
.venv\Scripts\activate
pip install -r requirements.txt
copy .env.example .env
```

Gemini is optional right now. Leave `GEMINI_API_KEY` empty to test scraping. When you are ready, put a key from [Google AI Studio](https://aistudio.google.com/apikey) in `.env`.

## Run the tiny UI

```bash
python app.py
```

Open `http://127.0.0.1:5000`, paste the exact professor URL, submit. Files land in `output/`.

## Or run from the command line

```bash
python -m rmp "https://www.ratemyprofessors.com/professor/12345"
python -m rmp "https://www.ratemyprofessors.com/professor/12345" --skip-llm
```

## How scraping works

The site's public GraphQL endpoint is `POST https://www.ratemyprofessors.com/graphql`. The professor's numeric ID in the URL is encoded as a Relay node ID (`Teacher-{id}`, base64) and used in:

- `TeacherRatingsPageQuery` — name, school, department, rating, difficulty, would-take-again, official tags, course codes
- `RatingsListQuery` — paginated student reviews (comments, scores, tags, grades, attendance, online/in-person)

This is an unofficial API and can change without notice. Be gentle with request volume; the client pauses briefly between review pages.

## LLM hook

`rmp/analyze.py` is the file we will iterate on next. It already calls Gemini when `GEMINI_API_KEY` is set and otherwise writes a stats-only markdown file so the rest of the pipeline can be tested now.
