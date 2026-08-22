"""ASGI entry so `uvicorn api:app --reload` works from the repo root."""
from recc.api import app

__all__ = ["app"]
