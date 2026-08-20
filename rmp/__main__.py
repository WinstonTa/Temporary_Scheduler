"""CLI: python -m rmp "https://www.ratemyprofessors.com/professor/12345" """

from __future__ import annotations

import argparse
import sys
from pathlib import Path

from dotenv import load_dotenv

ROOT = Path(__file__).resolve().parent.parent
load_dotenv(ROOT / ".env")

from rmp.pipeline import run_pipeline  # noqa: E402
from rmp.urls import InvalidProfessorURL  # noqa: E402


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(
        description="Scrape a RateMyProfessors professor page and write JSON + markdown."
    )
    parser.add_argument("url", help="Exact professor URL from ratemyprofessors.com")
    parser.add_argument(
        "--skip-llm",
        action="store_true",
        help="Write a stats-only markdown file and do not call Gemini.",
    )
    args = parser.parse_args(argv)

    try:
        result = run_pipeline(args.url, skip_llm=args.skip_llm)
    except InvalidProfessorURL as exc:
        print(f"Error: {exc}", file=sys.stderr)
        return 2
    except Exception as exc:
        print(f"Error: {exc}", file=sys.stderr)
        return 1

    print(f"Professor: {result.professor_name}")
    print(f"Reviews collected: {result.review_count}")
    print(f"JSON: {result.json_path}")
    print(f"Markdown: {result.markdown_path}")
    print(f"Gemini used: {result.used_llm}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
