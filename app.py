"""Extremely simple proof-of-concept UI for RMP scrape + analysis."""

from __future__ import annotations

from pathlib import Path

from dotenv import load_dotenv
from flask import Flask, render_template, request

ROOT = Path(__file__).resolve().parent
load_dotenv(ROOT / ".env")

from rmp.analyze import llm_configured  # noqa: E402
from rmp.pipeline import run_pipeline  # noqa: E402
from rmp.urls import InvalidProfessorURL  # noqa: E402

app = Flask(__name__)


@app.get("/")
def index():
    return render_template(
        "index.html",
        url="",
        result=None,
        error=None,
        llm_ready=llm_configured(),
    )


@app.post("/")
def scrape():
    url = (request.form.get("url") or "").strip()
    error = None
    result = None
    try:
        result = run_pipeline(url)
    except InvalidProfessorURL as exc:
        error = str(exc)
    except Exception as exc:
        error = str(exc)
    return render_template(
        "index.html",
        url=url,
        result=result,
        error=error,
        llm_ready=llm_configured(),
    )


if __name__ == "__main__":
    app.run(debug=True, port=5000)
