-- Incremental auth + RLS changes for an existing TemporaryScheduler database.
-- Safe to re-run. Full schema (new installs) lives in SQLSchema.sql.

ALTER TABLE app_data.profiles
    ADD COLUMN IF NOT EXISTS email TEXT;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'profiles_id_fkey'
          AND conrelid = 'app_data.profiles'::regclass
    ) THEN
        ALTER TABLE app_data.profiles
            ADD CONSTRAINT profiles_id_fkey
            FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE;
    END IF;
END;
$$;

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
