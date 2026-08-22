# Temporary Scheduler

CSULB course-planner prototype. This repo now has a primitive **account layer** (landing, sign up, log in, sign out) on top of the existing RateMyProfessors scrape PoC.

## Run the app

```bash
python -m venv .venv
.venv\Scripts\activate
pip install -r requirements.txt
copy .env.example .env
```

Fill `.env`:

- `SUPABASE_URL` — project URL from [API settings](https://supabase.com/dashboard/project/cfwswtlludbqmwmqaqqq/settings/api)
- `SUPABASE_PUBLISHABLE_KEY` — publishable (or legacy anon) key. This is what the browser uses.
- `SUPABASE_KEY` — secret / service role key. Python loaders only. Never put this in HTML or JS.
- `GEMINI_API_KEY` — optional, scrape insights only

```bash
python app.py
```

Open `http://127.0.0.1:5000` (use `127.0.0.1`, not `localhost`, so auth redirects stay on one origin).

| Path | Page |
| --- | --- |
| `/` | Landing with Sign Up and Log In |
| `/signup` | Email/password or Google |
| `/login` | Email/password or Google |
| `/check-email` | After email sign-up, while confirmation is pending |
| `/home` | Logged-in page and Sign out |
| `/rmp` | RateMyProfessors scrape PoC |

Email sign-up sends a confirmation link. The user is not logged in until they click it. Google sign-in goes straight to `/home`. A failed password login shows a dialog pointing at Sign Up (Supabase does not say whether the email exists).

## Supabase dashboard steps (required)

Project: **TemporaryScheduler** (`cfwswtlludbqmwmqaqqq`).

### Auth URLs

In [URL configuration](https://supabase.com/dashboard/project/cfwswtlludbqmwmqaqqq/auth/url-configuration):

- Site URL: `http://127.0.0.1:5000`
- Redirect URLs: `http://127.0.0.1:5000/**` and `http://localhost:5000/**`

Keep **Confirm email** enabled on [Auth providers](https://supabase.com/dashboard/project/cfwswtlludbqmwmqaqqq/auth/providers). Enable automatic identity linking if the same person might use Google and a password on one email.

### Google sign-in

1. Create a **Web application** OAuth client in [Google Auth Platform](https://console.cloud.google.com/auth/clients/create).
2. Authorized JavaScript origins: `http://127.0.0.1:5000`, `http://localhost:5000`.
3. Authorized redirect URI: `https://cfwswtlludbqmwmqaqqq.supabase.co/auth/v1/callback` (copy from the [Google provider page](https://supabase.com/dashboard/project/cfwswtlludbqmwmqaqqq/auth/providers?provider=Google) if it differs).
4. Consent screen scopes: `openid`, `email`, `profile`. Add yourself as a test user if the app is in testing.
5. Paste the Client ID and Client Secret into that Supabase Google provider page and enable Google.

### Exposed schemas

In [API settings](https://supabase.com/dashboard/project/cfwswtlludbqmwmqaqqq/settings/api), **Exposed schemas** must include `app_data` and `raw_data`. If `/home` cannot read the profile row, add them and save.

Auth creates `auth.users`. A trigger (`public.handle_new_user`) inserts `app_data.profiles` with the same UUID. Row-level security lets a signed-in user read only their own profile. Schema SQL is in `scripts/SQLSchema.sql`; incremental auth/RLS is in `scripts/SQL_auth.sql`.

## RateMyProfessors scrape PoC

`/rmp` still scrapes one professor URL and writes JSON + markdown under `output/`.

```bash
python -m rmp "https://www.ratemyprofessors.com/professor/12345"
python -m rmp "https://www.ratemyprofessors.com/professor/12345" --skip-llm
```

### Batch scrape

`batch_scrape.py` reads professor links from `helper_resources/csulb_cs_professors.html` (97 unique `/professor/{id}` URLs), runs each through the scrape pipeline with `--skip-llm`, and waits 60 seconds between professors by default. Completed IDs already present as `output/*_{id}.json` are skipped.

```powershell
.venv\Scripts\activate
python batch_scrape.py --dry-run
python batch_scrape.py --limit 1
python batch_scrape.py
```

Useful flags: `--delay 90`, `--urls-file path.txt`, `--limit N`.

### How scraping works

The site's public GraphQL endpoint is `POST https://www.ratemyprofessors.com/graphql`. The professor's numeric ID in the URL is encoded as a Relay node ID (`Teacher-{id}`, base64) and used in:

- `TeacherRatingsPageQuery` — name, school, department, rating, difficulty, would-take-again, official tags, course codes
- `RatingsListQuery` — paginated student reviews

This is an unofficial API and can change without notice.

### LLM hook

`rmp/analyze.py` calls Gemini when `GEMINI_API_KEY` is set. The default model is `gemini-2.5-flash`; override it with `GEMINI_MODEL`.
