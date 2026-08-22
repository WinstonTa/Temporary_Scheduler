"""Temporary Scheduler: auth pages plus the RMP scrape PoC."""

from __future__ import annotations

import os
from pathlib import Path

from dotenv import load_dotenv
from flask import Flask, render_template, request

ROOT = Path(__file__).resolve().parent
load_dotenv(ROOT / ".env")

app = Flask(__name__)


@app.context_processor
def inject_supabase():
    return {
        "supabase_url": os.getenv("SUPABASE_URL", ""),
        "supabase_publishable_key": os.getenv("SUPABASE_PUBLISHABLE_KEY", ""),
    }


@app.get("/")
def landing():
    return render_template("landing.html", page="landing")


@app.get("/signup")
def signup():
    return render_template("signup.html", page="signup")


@app.get("/login")
def login():
    return render_template("login.html", page="login")


@app.get("/check-email")
def check_email():
    return render_template("check_email.html", page="check-email")


@app.get("/home")
def home():
    return render_template("home.html", page="home")


@app.get("/rmp")
def rmp_index():
    from rmp.analyze import llm_configured

    return render_template(
        "index.html",
        url="",
        result=None,
        error=None,
        llm_ready=llm_configured(),
    )


@app.post("/rmp")
def rmp_scrape():
    from rmp.analyze import llm_configured
    from rmp.pipeline import run_pipeline
    from rmp.urls import InvalidProfessorURL

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
