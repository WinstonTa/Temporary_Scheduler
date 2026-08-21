-- ============================================================
-- Quiz pipeline schema (run in Supabase SQL editor)
--
-- Assumes the scraping team's schema already exists:
--   raw_data.courses      (id, course_code, title, description, embedding vector(384), ...)
--   raw_data.professors   (id, first_name, last_name, department, embedding vector(384), ...)
--   raw_data.professor_tags (professor_id, tag_name, tag_count)
--   raw_data.reviews      (professor_id, rating_text, ...)
--
-- ⚠️ ASSUMPTION TO CONFIRM WITH SCRAPING TEAM:
-- `raw_data.reviews` needs a numeric `quality` column per review (RMP's
-- own scrape gives this — see sample payload, `ratings[].quality`) to
-- rank professors within a course. Confirm the actual column name they
-- used when persisting reviews to Supabase — it may not be `quality`.
--
-- Also confirm how course codes are normalized: RMP data itself is
-- inconsistent (e.g. "491A" vs "CECS491"), so matching `course_id` in
-- the junction table below likely needs a normalization step upstream,
-- not a raw string match.
-- ============================================================

create extension if not exists vector;
create extension if not exists pgcrypto;

-- ============================================================
-- course_professor_offerings — links a course to who teaches it.
--
-- May be populate-able DIRECTLY from RMP data already being scraped:
-- each professor payload includes `course_codes` (courses they teach,
-- with counts) and `summary.courses` (per-course rating breakdown) —
-- see sample RMP payload. Confirm with the scraping team whether this
-- can be derived from data they already have vs. needing a separate
-- school-catalog scrape. Either way, course code normalization is
-- needed first (RMP codes are inconsistent — "491A" vs "CECS491").
-- ============================================================
create table if not exists raw_data.course_professor_offerings (
  id uuid primary key default gen_random_uuid(),
  course_id uuid references raw_data.courses(id) not null,
  professor_id uuid references raw_data.professors(id) not null,
  term text,                      -- e.g. "Fall 2025", nullable if unknown
  created_at timestamptz default now(),
  unique (course_id, professor_id, term)
);

-- ============================================================
-- App-side tables (quiz flow) — public schema, owned by the quiz side
-- ============================================================

create table if not exists quiz_responses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) not null,
  answers jsonb not null,
  created_at timestamptz default now()
);

create table if not exists user_profiles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) not null,
  quiz_response_id uuid references quiz_responses(id) not null,
  profile_text text not null,
  embedding vector(384),          -- matches all-MiniLM-L6-v2
  is_current boolean default true,
  created_at timestamptz default now()
);

create table if not exists recommendation_jobs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) not null,
  quiz_response_id uuid references quiz_responses(id) not null,
  status text not null default 'pending',
  error_message text,
  created_at timestamptz default now(),
  completed_at timestamptz
);

-- Results are denormalized (course + professor info stored directly)
-- rather than re-joined at read time, so the frontend doesn't need to
-- know how to query across the raw_data schema.
create table if not exists recommendation_results (
  id uuid primary key default gen_random_uuid(),
  job_id uuid references recommendation_jobs(id) not null,
  course_id uuid not null,
  course_code text not null,
  course_title text not null,
  similarity float not null,
  rank int not null,
  professor_id uuid,
  professor_name text,
  professor_rating float
);

create index if not exists user_profiles_embedding_idx
  on user_profiles using ivfflat (embedding vector_cosine_ops);

create index if not exists recommendation_jobs_user_idx on recommendation_jobs(user_id);
create index if not exists recommendation_results_job_idx on recommendation_results(job_id);

-- ============================================================
-- Row Level Security
-- ============================================================
alter table quiz_responses enable row level security;
alter table user_profiles enable row level security;
alter table recommendation_jobs enable row level security;
alter table recommendation_results enable row level security;

create policy "Users read own quiz responses" on quiz_responses
  for select using (auth.uid() = user_id);

create policy "Users read own profiles" on user_profiles
  for select using (auth.uid() = user_id);

create policy "Users read own jobs" on recommendation_jobs
  for select using (auth.uid() = user_id);

create policy "Users read own results" on recommendation_results
  for select using (
    job_id in (select id from recommendation_jobs where user_id = auth.uid())
  );

-- Backend writes go through the service_role key, which bypasses RLS.

-- ============================================================
-- match_courses: course similarity + best-reviewed professor per course
--
-- Two-stage logic:
--   1. Rank raw_data.courses by cosine similarity to the student's
--      interest embedding (topic/content fit).
--   2. For each matched course, find who teaches it via the new
--      junction table, and pick the professor with the highest
--      average rating (ties broken by review count).
--
-- If a course has no professor mapping yet (junction table not
-- populated for it), professor fields come back null — the frontend
-- should handle that gracefully (see quiz.js).
-- ============================================================
create or replace function match_courses(
  query_embedding vector(384),
  match_count int default 10
)
returns table (
  course_id uuid,
  course_code text,
  course_title text,
  similarity float,
  professor_id uuid,
  professor_name text,
  professor_rating float
)
language sql stable
as $$
  with top_courses as (
    select id, course_code, title,
           1 - (embedding <=> query_embedding) as similarity
    from raw_data.courses
    order by embedding <=> query_embedding
    limit match_count
  ),
  professor_ratings as (
    select
      cpo.course_id,
      p.id as professor_id,
      p.first_name || ' ' || p.last_name as professor_name,
      avg(r.quality) as avg_rating,   -- matches RMP scrape's per-review "quality" field
      count(r.id) as review_count
    from raw_data.course_professor_offerings cpo
    join raw_data.professors p on p.id = cpo.professor_id
    left join raw_data.reviews r on r.professor_id = cpo.professor_id
    group by cpo.course_id, p.id, p.first_name, p.last_name
  ),
  best_professor as (
    select distinct on (course_id) *
    from professor_ratings
    order by course_id, avg_rating desc nulls last, review_count desc
  )
  select
    tc.id, tc.course_code, tc.title, tc.similarity,
    bp.professor_id, bp.professor_name, bp.avg_rating
  from top_courses tc
  left join best_professor bp on bp.course_id = tc.id;
$$;