import os
import json
from google import genai

_client: genai.Client | None = None


def get_gemini_client() -> genai.Client:
    global _client
    if _client is None:
        # Explicit api_key= avoids accidentally routing through Vertex AI,
        # which requires OAuth2 and will reject a plain AI Studio key.
        _client = genai.Client(api_key=os.environ["GEMINI_API_KEY"])
    return _client


SYNTHESIS_SYSTEM_PROMPT = """You are creating a student interest profile for a \
course-recommendation system. You will be given a student's quiz answers \
(a mix of multiple choice and free response).

Write a 3-5 sentence paragraph describing this student's academic interests, \
preferred learning style, and likely career direction. Write it the way you'd \
describe a COURSE to a student — focus on topics, skills, and domains, not \
personality traits. This paragraph will be embedded and compared against \
embedded course descriptions, so use concrete technical/domain vocabulary \
(e.g. "distributed systems", "adversarial security", "applied statistics") \
rather than vague traits (e.g. "hard worker", "curious person").

Do not repeat the quiz questions verbatim. Do not include a preamble — \
respond with only the paragraph."""


def format_answers_for_prompt(answers: dict) -> str:
    lines = []
    for qid, answer in answers.items():
        value = answer["value"] if isinstance(answer, dict) else answer.value
        lines.append(f"- {value}")
    return "\n".join(lines)


async def synthesize_profile(answers: dict) -> str:
    """
    Takes the raw answers dict (as stored in quiz_responses.answers)
    and returns a synthesized interest-profile paragraph.
    """
    client = get_gemini_client()
    formatted = format_answers_for_prompt(answers)

    response = client.models.generate_content(
        model="gemini-2.5-flash",  # fast/cheap; use gemini-2.5-pro if quality matters more than latency
        contents=f"Student's quiz answers:\n{formatted}",
        config={
            "system_instruction": SYNTHESIS_SYSTEM_PROMPT,
            "temperature": 0.4,  # low-ish: consistent register, but not robotic repetition
            "max_output_tokens": 300,
        },
    )

    profile_text = response.text.strip()
    if not profile_text:
        raise ValueError("Gemini returned an empty synthesis response")

    return profile_text