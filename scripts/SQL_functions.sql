CREATE OR REPLACE FUNCTION raw_data.match_offerings(
    query_embedding VECTOR(384),
    filter_term TEXT DEFAULT NULL,
    course_weight FLOAT DEFAULT 0.6,
    match_count INT DEFAULT 10
)

RETURNS TABLE (
    offering_id INT,
    course_code TEXT,
    course_title TEXT,
    department TEXT,
    credits_min NUMERIC,
    credits_max NUMERIC,
    professor_first_name TEXT,
    professor_last_name TEXT,
    avg_difficulty NUMERIC,
    term TEXT,
    days TEXT,
    start_time TIME,
    end_time TIME,
    similarity FLOAT
)

LANGUAGE sql STABLE
AS $$
    SELECT
        co.id AS offering_id,
        c.course_code,
        c.title AS course_title,
        c.department,
        c.credits_min,
        c.credits_max,
        p.first_name AS professor_first_name,
        p.last_name AS professor_last_name,
        p.avg_difficulty,
        co.term,
        co.days,
        co.start_time,
        co.end_time,
        (
            course_weight * (1 - (c.embedding <=> query_embedding))
            + (1 - course_weight) * COALESCE(1 - (p.embedding <=> query_embedding), 0)
        ) AS similarity
    FROM raw_data.course_offerings co
    JOIN raw_data.courses c ON c.id = co.course_id
    LEFT JOIN raw_data.professors p ON p.id = co.professor_id
    WHERE c.embedding IS NOT NULL
        AND (filter_term IS NULL OR co.term = filter_term)
    ORDER BY similarity DESC
    LIMIT match_count;
$$;

-- PostgREST exposes public by default; the recs API calls this wrapper.
CREATE OR REPLACE FUNCTION public.match_offerings(
    query_embedding VECTOR(384),
    filter_term TEXT DEFAULT NULL,
    course_weight FLOAT DEFAULT 0.6,
    match_count INT DEFAULT 10
)
RETURNS TABLE (
    offering_id INT,
    course_code TEXT,
    course_title TEXT,
    department TEXT,
    credits_min NUMERIC,
    credits_max NUMERIC,
    professor_first_name TEXT,
    professor_last_name TEXT,
    avg_difficulty NUMERIC,
    term TEXT,
    days TEXT,
    start_time TIME,
    end_time TIME,
    similarity FLOAT
)
LANGUAGE sql
STABLE
SECURITY INVOKER
AS $$
    SELECT * FROM raw_data.match_offerings($1, $2, $3, $4);
$$;

GRANT EXECUTE ON FUNCTION public.match_offerings(vector, text, double precision, integer) TO service_role, authenticated, anon;
