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
    credits_min     NUMERIC(3,1),
    credits_max     NUMERIC(3,1),
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
    location        TEXT,
    class_number    TEXT,
    section_number  TEXT,
    section_type    TEXT
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
    id              UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email           TEXT,
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
    created_at      TIMESTAMPTZ DEFAULT now(),
    UNIQUE (user_id, question_id)
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

-- ------------------------------------------------------------
-- Auth: create an app_data.profiles row when a user signs up
-- ------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
    INSERT INTO app_data.profiles (id, email)
    VALUES (NEW.id, NEW.email);
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_new_user();

REVOKE ALL ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;

-- ------------------------------------------------------------
-- Grants (Data API + RLS)
-- ------------------------------------------------------------

GRANT USAGE ON SCHEMA app_data TO anon, authenticated, service_role;
GRANT USAGE ON SCHEMA raw_data TO anon, authenticated, service_role;

REVOKE ALL ON ALL TABLES IN SCHEMA app_data FROM anon, authenticated;
REVOKE ALL ON ALL TABLES IN SCHEMA raw_data FROM anon, authenticated;

GRANT SELECT, UPDATE ON TABLE app_data.profiles TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE app_data.quiz_responses TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE app_data.saved_schedules TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE app_data.schedule_offerings TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE app_data.saved_courses TO authenticated;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA app_data TO authenticated;

GRANT SELECT ON ALL TABLES IN SCHEMA raw_data TO authenticated;

GRANT ALL ON ALL TABLES IN SCHEMA app_data TO service_role;
GRANT ALL ON ALL TABLES IN SCHEMA raw_data TO service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA app_data TO service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA raw_data TO service_role;

-- ------------------------------------------------------------
-- Row Level Security
-- ------------------------------------------------------------

ALTER TABLE app_data.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE app_data.quiz_responses ENABLE ROW LEVEL SECURITY;
ALTER TABLE app_data.saved_schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE app_data.schedule_offerings ENABLE ROW LEVEL SECURITY;
ALTER TABLE app_data.saved_courses ENABLE ROW LEVEL SECURITY;

ALTER TABLE raw_data.schools ENABLE ROW LEVEL SECURITY;
ALTER TABLE raw_data.professors ENABLE ROW LEVEL SECURITY;
ALTER TABLE raw_data.professor_tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE raw_data.courses ENABLE ROW LEVEL SECURITY;
ALTER TABLE raw_data.prerequisites ENABLE ROW LEVEL SECURITY;
ALTER TABLE raw_data.course_offerings ENABLE ROW LEVEL SECURITY;
ALTER TABLE raw_data.reviews ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS profiles_select_own ON app_data.profiles;
CREATE POLICY profiles_select_own ON app_data.profiles
    FOR SELECT TO authenticated
    USING (id = (SELECT auth.uid()));

DROP POLICY IF EXISTS profiles_update_own ON app_data.profiles;
CREATE POLICY profiles_update_own ON app_data.profiles
    FOR UPDATE TO authenticated
    USING (id = (SELECT auth.uid()))
    WITH CHECK (id = (SELECT auth.uid()));

DROP POLICY IF EXISTS quiz_responses_select_own ON app_data.quiz_responses;
CREATE POLICY quiz_responses_select_own ON app_data.quiz_responses
    FOR SELECT TO authenticated
    USING (user_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS quiz_responses_insert_own ON app_data.quiz_responses;
CREATE POLICY quiz_responses_insert_own ON app_data.quiz_responses
    FOR INSERT TO authenticated
    WITH CHECK (user_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS quiz_responses_update_own ON app_data.quiz_responses;
CREATE POLICY quiz_responses_update_own ON app_data.quiz_responses
    FOR UPDATE TO authenticated
    USING (user_id = (SELECT auth.uid()))
    WITH CHECK (user_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS quiz_responses_delete_own ON app_data.quiz_responses;
CREATE POLICY quiz_responses_delete_own ON app_data.quiz_responses
    FOR DELETE TO authenticated
    USING (user_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS saved_schedules_select_own ON app_data.saved_schedules;
CREATE POLICY saved_schedules_select_own ON app_data.saved_schedules
    FOR SELECT TO authenticated
    USING (user_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS saved_schedules_insert_own ON app_data.saved_schedules;
CREATE POLICY saved_schedules_insert_own ON app_data.saved_schedules
    FOR INSERT TO authenticated
    WITH CHECK (user_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS saved_schedules_update_own ON app_data.saved_schedules;
CREATE POLICY saved_schedules_update_own ON app_data.saved_schedules
    FOR UPDATE TO authenticated
    USING (user_id = (SELECT auth.uid()))
    WITH CHECK (user_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS saved_schedules_delete_own ON app_data.saved_schedules;
CREATE POLICY saved_schedules_delete_own ON app_data.saved_schedules
    FOR DELETE TO authenticated
    USING (user_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS saved_courses_select_own ON app_data.saved_courses;
CREATE POLICY saved_courses_select_own ON app_data.saved_courses
    FOR SELECT TO authenticated
    USING (user_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS saved_courses_insert_own ON app_data.saved_courses;
CREATE POLICY saved_courses_insert_own ON app_data.saved_courses
    FOR INSERT TO authenticated
    WITH CHECK (user_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS saved_courses_update_own ON app_data.saved_courses;
CREATE POLICY saved_courses_update_own ON app_data.saved_courses
    FOR UPDATE TO authenticated
    USING (user_id = (SELECT auth.uid()))
    WITH CHECK (user_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS saved_courses_delete_own ON app_data.saved_courses;
CREATE POLICY saved_courses_delete_own ON app_data.saved_courses
    FOR DELETE TO authenticated
    USING (user_id = (SELECT auth.uid()));

DROP POLICY IF EXISTS schedule_offerings_select_own ON app_data.schedule_offerings;
CREATE POLICY schedule_offerings_select_own ON app_data.schedule_offerings
    FOR SELECT TO authenticated
    USING (
        EXISTS (
            SELECT 1
            FROM app_data.saved_schedules s
            WHERE s.id = schedule_id
              AND s.user_id = (SELECT auth.uid())
        )
    );

DROP POLICY IF EXISTS schedule_offerings_insert_own ON app_data.schedule_offerings;
CREATE POLICY schedule_offerings_insert_own ON app_data.schedule_offerings
    FOR INSERT TO authenticated
    WITH CHECK (
        EXISTS (
            SELECT 1
            FROM app_data.saved_schedules s
            WHERE s.id = schedule_id
              AND s.user_id = (SELECT auth.uid())
        )
    );

DROP POLICY IF EXISTS schedule_offerings_update_own ON app_data.schedule_offerings;
CREATE POLICY schedule_offerings_update_own ON app_data.schedule_offerings
    FOR UPDATE TO authenticated
    USING (
        EXISTS (
            SELECT 1
            FROM app_data.saved_schedules s
            WHERE s.id = schedule_id
              AND s.user_id = (SELECT auth.uid())
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1
            FROM app_data.saved_schedules s
            WHERE s.id = schedule_id
              AND s.user_id = (SELECT auth.uid())
        )
    );

DROP POLICY IF EXISTS schedule_offerings_delete_own ON app_data.schedule_offerings;
CREATE POLICY schedule_offerings_delete_own ON app_data.schedule_offerings
    FOR DELETE TO authenticated
    USING (
        EXISTS (
            SELECT 1
            FROM app_data.saved_schedules s
            WHERE s.id = schedule_id
              AND s.user_id = (SELECT auth.uid())
        )
    );

DROP POLICY IF EXISTS schools_select_authenticated ON raw_data.schools;
CREATE POLICY schools_select_authenticated ON raw_data.schools
    FOR SELECT TO authenticated
    USING (true);

DROP POLICY IF EXISTS professors_select_authenticated ON raw_data.professors;
CREATE POLICY professors_select_authenticated ON raw_data.professors
    FOR SELECT TO authenticated
    USING (true);

DROP POLICY IF EXISTS professor_tags_select_authenticated ON raw_data.professor_tags;
CREATE POLICY professor_tags_select_authenticated ON raw_data.professor_tags
    FOR SELECT TO authenticated
    USING (true);

DROP POLICY IF EXISTS courses_select_authenticated ON raw_data.courses;
CREATE POLICY courses_select_authenticated ON raw_data.courses
    FOR SELECT TO authenticated
    USING (true);

DROP POLICY IF EXISTS prerequisites_select_authenticated ON raw_data.prerequisites;
CREATE POLICY prerequisites_select_authenticated ON raw_data.prerequisites
    FOR SELECT TO authenticated
    USING (true);

DROP POLICY IF EXISTS course_offerings_select_authenticated ON raw_data.course_offerings;
CREATE POLICY course_offerings_select_authenticated ON raw_data.course_offerings
    FOR SELECT TO authenticated
    USING (true);

DROP POLICY IF EXISTS reviews_select_authenticated ON raw_data.reviews;
CREATE POLICY reviews_select_authenticated ON raw_data.reviews
    FOR SELECT TO authenticated
    USING (true);
