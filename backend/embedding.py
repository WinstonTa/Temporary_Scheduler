from sentence_transformers import SentenceTransformer
from functools import lru_cache

# Matches the model used in the scraping team's gen_embedding.py —
# MUST stay in sync with them. Two different models produce vectors in
# different semantic spaces; comparing across models with cosine
# similarity silently produces meaningless results, no error thrown.
# If this ever changes, update it in both places, and update the
# `vector(384)` columns in schema.sql to match the new dimension.
MODEL_NAME = "all-MiniLM-L6-v2"


@lru_cache(maxsize=1)
def get_model() -> SentenceTransformer:
    # Cached so the model loads once per process, not once per request —
    # loading it fresh each call would add multi-second latency per job.
    return SentenceTransformer(MODEL_NAME)


def embed_text(text: str) -> list[float]:
    """
    Returns a normalized embedding vector for a single string.
    normalize_embeddings=True makes cosine similarity and dot product
    equivalent, which keeps pgvector's `<=>` (cosine distance) well-behaved.
    """
    model = get_model()
    vector = model.encode(text, normalize_embeddings=True)
    return vector.tolist()