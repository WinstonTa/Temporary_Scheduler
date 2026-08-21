"""Batch-scrape CSULB CS professors from saved HTML (or a URL list file).

Uses the existing scrape pipeline with --skip-llm semantics and a delay
between professors so the unofficial RMP GraphQL API is not hammered.
"""

from __future__ import annotations

import argparse
import re
import sys
import time
from pathlib import Path

from dotenv import load_dotenv

ROOT = Path(__file__).resolve().parent
DEFAULT_HTML = ROOT / "helper_resources" / "csulb_cs_professors.html"
DEFAULT_URLS_OUT = ROOT / "helper_resources" / "csulb_cs_professor_urls.txt"
OUTPUT_DIR = ROOT / "output"

PROFESSOR_URL_RE = re.compile(
    r"https://www\.ratemyprofessors\.com/professor/(\d+)"
)
OUTPUT_ID_RE = re.compile(r"_(\d+)\.json$", re.IGNORECASE)

load_dotenv(ROOT / ".env")

from rmp.pipeline import run_pipeline  # noqa: E402
from rmp.urls import InvalidProfessorURL, parse_professor_url  # noqa: E402


def extract_urls_from_html(html_path: Path) -> list[str]:
    text = html_path.read_text(encoding="utf-8", errors="replace")
    seen: set[str] = set()
    urls: list[str] = []
    for match in PROFESSOR_URL_RE.finditer(text):
        legacy_id = match.group(1)
        url = f"https://www.ratemyprofessors.com/professor/{legacy_id}"
        if url not in seen:
            seen.add(url)
            urls.append(url)
    return urls


def load_urls_from_file(path: Path) -> list[str]:
    urls: list[str] = []
    seen: set[str] = set()
    for line in path.read_text(encoding="utf-8").splitlines():
        url = line.strip()
        if not url or url.startswith("#"):
            continue
        if url not in seen:
            seen.add(url)
            urls.append(url)
    return urls


def write_urls_file(urls: list[str], path: Path) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text("\n".join(urls) + ("\n" if urls else ""), encoding="utf-8")


def scraped_ids(output_dir: Path) -> set[int]:
    if not output_dir.is_dir():
        return set()
    ids: set[int] = set()
    for path in output_dir.glob("*.json"):
        match = OUTPUT_ID_RE.search(path.name)
        if match:
            ids.add(int(match.group(1)))
    return ids


def legacy_id_from_url(url: str) -> int:
    return parse_professor_url(url).legacy_id


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(
        description=(
            "Batch-scrape RateMyProfessors professor URLs from the CSULB CS "
            "HTML dump (or a URL list), with --skip-llm and a delay between runs."
        )
    )
    parser.add_argument(
        "--delay",
        type=float,
        default=30.0,
        help="Seconds to sleep between scrapes (default: 30).",
    )
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Print the URL list and skip plan only; do not scrape.",
    )
    parser.add_argument(
        "--urls-file",
        type=Path,
        default=None,
        help="Use a prebuilt one-URL-per-line list instead of parsing the HTML.",
    )
    parser.add_argument(
        "--html",
        type=Path,
        default=DEFAULT_HTML,
        help=f"HTML file to parse (default: {DEFAULT_HTML.name}).",
    )
    parser.add_argument(
        "--limit",
        type=int,
        default=None,
        metavar="N",
        help="Process only the first N URLs (after skip filtering for dry-run display).",
    )
    args = parser.parse_args(argv)

    if args.delay < 0:
        print("Error: --delay must be >= 0", file=sys.stderr)
        return 2
    if args.limit is not None and args.limit < 1:
        print("Error: --limit must be >= 1", file=sys.stderr)
        return 2

    try:
        if args.urls_file is not None:
            urls = load_urls_from_file(args.urls_file)
            source = str(args.urls_file)
        else:
            if not args.html.is_file():
                print(f"Error: HTML file not found: {args.html}", file=sys.stderr)
                return 2
            urls = extract_urls_from_html(args.html)
            write_urls_file(urls, DEFAULT_URLS_OUT)
            source = str(args.html)
    except OSError as exc:
        print(f"Error reading URL source: {exc}", file=sys.stderr)
        return 2

    if not urls:
        print("Error: no professor URLs found.", file=sys.stderr)
        return 2

    already = scraped_ids(OUTPUT_DIR)
    print(f"Source: {source}")
    print(f"URLs loaded: {len(urls)}")
    if args.urls_file is None:
        print(f"Wrote URL list: {DEFAULT_URLS_OUT}")
    print(f"Already scraped in output/: {len(already)}")

    pending: list[str] = []
    skipped = 0
    for url in urls:
        try:
            legacy_id = legacy_id_from_url(url)
        except InvalidProfessorURL as exc:
            print(f"  skip invalid URL: {url} ({exc})")
            continue
        if legacy_id in already:
            skipped += 1
            continue
        pending.append(url)

    if args.limit is not None:
        pending = pending[: args.limit]

    print(f"Skipped (already done): {skipped}")
    print(f"Pending this run: {len(pending)}")

    if args.dry_run:
        for i, url in enumerate(pending, start=1):
            print(f"  [{i}/{len(pending)}] would scrape {url}")
        if not pending:
            print("Nothing to do.")
        return 0

    if not pending:
        print("Nothing to do.")
        return 0

    ok = 0
    failed = 0
    for i, url in enumerate(pending, start=1):
        print(f"[{i}/{len(pending)}] Scraping {url} ...")
        try:
            result = run_pipeline(url, skip_llm=True)
            ok += 1
            print(
                f"  OK: {result.professor_name} "
                f"({result.review_count} reviews) -> {result.json_path.name}"
            )
        except Exception as exc:
            failed += 1
            print(f"  FAIL: {exc}", file=sys.stderr)

        if i < len(pending) and args.delay > 0:
            print(f"  Sleeping {args.delay:g}s ...")
            time.sleep(args.delay)

    print(f"Done. ok={ok} failed={failed} skipped_already={skipped}")
    return 1 if failed else 0


if __name__ == "__main__":
    raise SystemExit(main())
