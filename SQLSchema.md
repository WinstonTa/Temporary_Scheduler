-- ============================================================
-- CSULB Planner — Database Schema
-- Two schemas in ONE Postgres instance (e.g. Supabase):
--   raw_data  -> pre-generated, scraped/batch-loaded data
--   app_data  -> user-generated, written live by the app
-- Same-instance schemas let us use real foreign keys across
-- both halves, which we couldn't do with two separate DBs.
-- ============================================================

CREATE EXTENSION IF NOT EXISTS vector;  -- pgvector, for embeddings

CREATE SCHEMA IF NOT EXISTS raw_data;
CREATE SCHEMA IF NOT EXISTS app_data;

-- ------------------------------------------------------------
-- raw_data: pre-generated (batch-loaded from RMP / Reddit / manual)
-- ------------------------------------------------------------

CREATE TABLE raw_data.schools (
    id              SERIAL PRIMARY KEY,
    name            TEXT NOT NULL,
    rmp_school_id   TEXT UNIQUE  -- the encoded ID from the RMP GraphQL API
);

CREATE TABLE raw_data.professors (
    id                      SERIAL PRIMARY KEY,
    school_id               INT NOT NULL REFERENCES raw_data.schools(id),
    rmp_professor_id        TEXT UNIQUE,  -- e.g. "Teacher-506498" decoded
    first_name              TEXT NOT NULL,
    last_name                TEXT NOT NULL,
    department              TEXT,
    avg_rating               NUMERIC(3,2),
    avg_difficulty           NUMERIC(3,2),
    would_take_again_pct     NUMERIC(5,2),
    num_ratings               INT DEFAULT 0,
    embedding                 VECTOR(384),  -- built from tags + review text
    updated_at                TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX idx_professors_department ON raw_data.professors(department);

CREATE TABLE raw_data.professor_tags (
    id              SERIAL PRIMARY KEY,
    professor_id    INT NOT NULL REFERENCES raw_data.professors(id) ON DELETE CASCADE,
    tag_name        TEXT NOT NULL,
    tag_count       INT NOT NULL
);
CREATE INDEX idx_professor_tags_professor ON raw_data.professor_tags(professor_id);

CREATE TABLE raw_data.courses (
    id              SERIAL PRIMARY KEY,
    course_code     TEXT NOT NULL,        -- e.g. "CECS 174"
    title           TEXT NOT NULL,
    description     TEXT,
    department      TEXT,
    credits         NUMERIC(3,1),
    embedding       VECTOR(384),         -- built from description text
    UNIQUE (course_code)
);
CREATE INDEX idx_courses_department ON raw_data.courses(department);

-- Self-referencing many-to-many: a course can require other courses
CREATE TABLE raw_data.prerequisites (
    course_id               INT NOT NULL REFERENCES raw_data.courses(id) ON DELETE CASCADE,
    prerequisite_course_id  INT NOT NULL REFERENCES raw_data.courses(id) ON DELETE CASCADE,
    PRIMARY KEY (course_id, prerequisite_course_id),
    CHECK (course_id <> prerequisite_course_id)  -- a course can't require itself
);

-- A specific section: this course, this professor, this term/time
CREATE TABLE raw_data.course_offerings (
    id              SERIAL PRIMARY KEY,
    course_id       INT NOT NULL REFERENCES raw_data.courses(id) ON DELETE CASCADE,
    professor_id    INT REFERENCES raw_data.professors(id),
    term            TEXT NOT NULL,   -- e.g. "Fall 2026"
    days            TEXT,            -- e.g. "MWF"
    start_time      TIME,
    end_time        TIME,
    location        TEXT
);
CREATE INDEX idx_offerings_course ON raw_data.course_offerings(course_id);
CREATE INDEX idx_offerings_term ON raw_data.course_offerings(term);

CREATE TABLE raw_data.reviews (
    id              SERIAL PRIMARY KEY,
    professor_id    INT NOT NULL REFERENCES raw_data.professors(id) ON DELETE CASCADE,
    course_id       INT REFERENCES raw_data.courses(id),  -- nullable: not every review names a course
    source          TEXT NOT NULL CHECK (source IN ('rmp', 'reddit', 'manual')),
    rating_text     TEXT,
    sentiment_score NUMERIC(4,3),  -- optional, -1.0 to 1.0
    created_at      TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX idx_reviews_professor ON raw_data.reviews(professor_id);

-- ------------------------------------------------------------
-- app_data: user-generated (live writes from the app)
-- ------------------------------------------------------------

-- If using Supabase Auth, this extends auth.users rather than
-- storing credentials directly.
CREATE TABLE app_data.profiles (
    id              UUID PRIMARY KEY,  -- REFERENCES auth.users(id) on Supabase
    major           TEXT,
    class_standing  TEXT,  -- freshman / sophomore / junior / senior
    quiz_vector     VECTOR(384),  -- computed once quiz is complete
    created_at      TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE app_data.quiz_responses (
    id              SERIAL PRIMARY KEY,
    user_id         UUID NOT NULL REFERENCES app_data.profiles(id) ON DELETE CASCADE,
    question_id     TEXT NOT NULL,
    answer_value    TEXT NOT NULL,
    created_at      TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX idx_quiz_responses_user ON app_data.quiz_responses(user_id);

CREATE TABLE app_data.saved_schedules (
    id              SERIAL PRIMARY KEY,
    user_id         UUID NOT NULL REFERENCES app_data.profiles(id) ON DELETE CASCADE,
    term            TEXT NOT NULL,
    name            TEXT NOT NULL DEFAULT 'My Schedule',
    created_at      TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX idx_saved_schedules_user ON app_data.saved_schedules(user_id);

-- Many-to-many junction: a schedule contains many offerings
CREATE TABLE app_data.schedule_offerings (
    schedule_id     INT NOT NULL REFERENCES app_data.saved_schedules(id) ON DELETE CASCADE,
    offering_id     INT NOT NULL REFERENCES raw_data.course_offerings(id) ON DELETE CASCADE,
    PRIMARY KEY (schedule_id, offering_id)
);

-- Bookmarked courses, independent of any specific schedule
CREATE TABLE app_data.saved_courses (
    user_id         UUID NOT NULL REFERENCES app_data.profiles(id) ON DELETE CASCADE,
    course_id       INT NOT NULL REFERENCES raw_data.courses(id) ON DELETE CASCADE,
    created_at      TIMESTAMPTZ DEFAULT now(),
    PRIMARY KEY (user_id, course_id)
);

-- ------------------------------------------------------------
-- Vector similarity indexes (for the recommendation engine)
-- Run these AFTER you've loaded a meaningful amount of data —
-- ivfflat needs existing rows to build good clusters.
-- ------------------------------------------------------------
-- CREATE INDEX ON raw_data.professors USING ivfflat (embedding vector_cosine_ops);
-- CREATE INDEX ON raw_data.courses USING ivfflat (embedding vector_cosine_ops);