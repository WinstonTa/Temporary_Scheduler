-- Incremental quiz-submit changes for an existing TemporaryScheduler database.
-- Safe to re-run. Full schema (new installs) lives in SQLSchema.sql.

CREATE UNIQUE INDEX IF NOT EXISTS quiz_responses_user_question_uidx
    ON app_data.quiz_responses (user_id, question_id);

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'quiz_responses_user_question_key'
          AND conrelid = 'app_data.quiz_responses'::regclass
    ) THEN
        ALTER TABLE app_data.quiz_responses
            ADD CONSTRAINT quiz_responses_user_question_key
            UNIQUE USING INDEX quiz_responses_user_question_uidx;
    END IF;
END;
$$;

-- Unused wide table from an earlier draft. Canonical store is app_data.quiz_responses.
DROP TABLE IF EXISTS public.quiz_responses;
