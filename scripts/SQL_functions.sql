CREATE OR REPLACE FUNCTION raw_data.match_offerings(
    query_embeddings VECTOR(384),
    filter_term TEXT DEFAULT NULL,
    course_weight FLOAT DEFAULT 0.6,
    match_count INT DEFAULT 10
)

RETURNS TABLE (
    offering_id INT,
    course_code TEXT,
    course_title TEXT,
    professor_first_name TEXT,
    professor_last_name TEXT,
    term TEXT,
    days TEXT,
    start_time TIME,
    end_time TIME,
    similarity FLOAT
)

LANGUAGE sql STABLE
AS $$
    SELECT 
        co.id AS offering_id, -- course offerings ID
        c.course_code,
        c.title AS course_title,
        p.first_name AS professor_first_name,
        p.last_name AS professor_last_name,
        co.term,
        co.days,
        co.start_time,
        co.end_time,
        --Blended similarity with professor and course content-match
        --If no professor, then falls back to course
        --Similarity formula itself, takes weighted average of two similarity scores, 
        --<=> gives distance ,0 = identical, higher = more different, so 1- distance means 1=perfect match, 0 = worse match
        (
            course_weight * (1 - (c.embedding <=> query_embedding)) -- cousrse embeddings 
            + (1 - course_weight) * COALESCE(1- (p.embedding <=> query_embedding),0) --professor embeddings
        ) AS similarity
    --Building the table of courses offered
    FROM raw_data.course_offerings co 
    JOIN raw_data.courses c ON c.id = co.course_id
    LEFT JOIN raw_data.professors p ON p.id = co.professor_id --if offering has no assigned prof, it returns as NULL
    WHERE c.embedding IS NOT NULL --skips all courses with no embeddings 
        AND (filter_term IS NULL OR co.term = filter_term) --term option, if pass, eliminates any courses that are not in that term
    ORDER by similarity DESC --sorts by highest reccomended score
    LIMIT match_count;
$$;
