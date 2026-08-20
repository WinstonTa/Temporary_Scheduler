# Temporary Scheduler

Proof-of-concept slice of a larger course-recommendation project. This round only handles **one RateMyProfessors professor URL**: scrape public GraphQL data, write a JSON dump, then write a markdown briefing with Gemini.

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

Put a Gemini API key from [Google AI Studio](https://aistudio.google.com/apikey) into `.env` as `GEMINI_API_KEY`. Then restart `python app.py`. Leave the key empty to test scraping only.

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

`rmp/analyze.py` calls Gemini when `GEMINI_API_KEY` is set. The default model is `gemini-2.5-flash`; override it with `GEMINI_MODEL` in `.env` if you want a different Gemini model.
