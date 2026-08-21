-- ============================================================
-- CSULB Planner — Database Schema (Fixed Idempotency)
-- ============================================================

CREATE EXTENSION IF NOT EXISTS vector;

CREATE SCHEMA IF NOT EXISTS raw_data;
CREATE SCHEMA IF NOT EXISTS app_data;

-- ------------------------------------------------------------
-- raw_data
-- ------------------------------------------------------------

CREATE TABLE IF NOT EXISTS raw_data.schools (
    id              SERIAL PRIMARY KEY,
    name            TEXT NOT NULL,
    rmp_school_id   TEXT UNIQUE
);

CREATE TABLE IF NOT EXISTS raw_data.professors (
    id                      SERIAL PRIMARY KEY,
    school_id               INT NOT NULL REFERENCES raw_data.schools(id),
    rmp_professor_id        TEXT UNIQUE,
    first_name              TEXT NOT NULL,
    last_name               TEXT NOT NULL,
    department              TEXT,
    avg_rating              NUMERIC(3,2),
    avg_difficulty          NUMERIC(3,2),
    would_take_again_pct    NUMERIC(5,2),
    num_ratings             INT DEFAULT 0,
    embedding               VECTOR(384),
    updated_at              TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_professors_department ON raw_data.professors(department);

CREATE TABLE IF NOT EXISTS raw_data.professor_tags (
    id              SERIAL PRIMARY KEY,
    professor_id    INT NOT NULL REFERENCES raw_data.professors(id) ON DELETE CASCADE,
    tag_name        TEXT NOT NULL,
    tag_count       INT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_professor_tags_professor ON raw_data.professor_tags(professor_id);

CREATE TABLE IF NOT EXISTS raw_data.courses (
    id              SERIAL PRIMARY KEY,
    course_code     TEXT NOT NULL UNIQUE,
    title           TEXT NOT NULL,
    description     TEXT,
    department      TEXT,
    credits         NUMERIC(3,1),
    embedding       VECTOR(384)
);
CREATE INDEX IF NOT EXISTS idx_courses_department ON raw_data.courses(department);

CREATE TABLE IF NOT EXISTS raw_data.prerequisites (
    course_id               INT NOT NULL REFERENCES raw_data.courses(id) ON DELETE CASCADE,
    prerequisite_course_id  INT NOT NULL REFERENCES raw_data.courses(id) ON DELETE CASCADE,
    PRIMARY KEY (course_id, prerequisite_course_id),
    CHECK (course_id <> prerequisite_course_id)
);

CREATE TABLE IF NOT EXISTS raw_data.course_offerings (
    id              SERIAL PRIMARY KEY,
    course_id       INT NOT NULL REFERENCES raw_data.courses(id) ON DELETE CASCADE,
    professor_id    INT REFERENCES raw_data.professors(id),
    term            TEXT NOT NULL,
    days            TEXT,
    start_time      TIME,
    end_time        TIME,
    location        TEXT
);
CREATE INDEX IF NOT EXISTS idx_offerings_course ON raw_data.course_offerings(course_id);
CREATE INDEX IF NOT EXISTS idx_offerings_term ON raw_data.course_offerings(term);

CREATE TABLE IF NOT EXISTS raw_data.reviews (
    id              SERIAL PRIMARY KEY,
    professor_id    INT NOT NULL REFERENCES raw_data.professors(id) ON DELETE CASCADE,
    course_id       INT REFERENCES raw_data.courses(id),
    source          TEXT NOT NULL CHECK (source IN ('rmp', 'reddit', 'manual')),
    rating_text     TEXT,
    sentiment_score NUMERIC(4,3),
    created_at      TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_reviews_professor ON raw_data.reviews(professor_id);

-- ------------------------------------------------------------
-- app_data
-- ------------------------------------------------------------

CREATE TABLE IF NOT EXISTS app_data.profiles (
    id              UUID PRIMARY KEY,
    major           TEXT,
    class_standing  TEXT,
    quiz_vector     VECTOR(384),
    created_at      TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS app_data.quiz_responses (
    id              SERIAL PRIMARY KEY,
    user_id         UUID NOT NULL REFERENCES app_data.profiles(id) ON DELETE CASCADE,
    question_id     TEXT NOT NULL,
    answer_value    TEXT NOT NULL,
    created_at      TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_quiz_responses_user ON app_data.quiz_responses(user_id);

CREATE TABLE IF NOT EXISTS app_data.saved_schedules (
    id              SERIAL PRIMARY KEY,
    user_id         UUID NOT NULL REFERENCES app_data.profiles(id) ON DELETE CASCADE,
    term            TEXT NOT NULL,
    name            TEXT NOT NULL DEFAULT 'My Schedule',
    created_at      TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_saved_schedules_user ON app_data.saved_schedules(user_id);

CREATE TABLE IF NOT EXISTS app_data.schedule_offerings (
    schedule_id     INT NOT NULL REFERENCES app_data.saved_schedules(id) ON DELETE CASCADE,
    offering_id     INT NOT NULL REFERENCES raw_data.course_offerings(id) ON DELETE CASCADE,
    PRIMARY KEY (schedule_id, offering_id)
);

CREATE TABLE IF NOT EXISTS app_data.saved_courses (
    user_id         UUID NOT NULL REFERENCES app_data.profiles(id) ON DELETE CASCADE,
    course_id       INT NOT NULL REFERENCES raw_data.courses(id) ON DELETE CASCADE,
    created_at      TIMESTAMPTZ DEFAULT now(),
    PRIMARY KEY (user_id, course_id)
);
