"""Run scrape -> JSON -> markdown for one professor URL."""

from __future__ import annotations

import json
import re
from dataclasses import dataclass
from pathlib import Path

from rmp.analyze import analyze_professor, llm_configured
from rmp.scrape import scrape_professor
from rmp.urls import parse_professor_url

ROOT = Path(__file__).resolve().parent.parent
OUTPUT_DIR = ROOT / "output"


@dataclass(frozen=True)
class PipelineResult:
    professor_name: str
    json_path: Path
    markdown_path: Path
    used_llm: bool
    review_count: int


def run_pipeline(url: str, *, skip_llm: bool = False) -> PipelineResult:
    parsed = parse_professor_url(url)
    payload = scrape_professor(parsed)
    professor = payload["professor"]
    stem = _output_stem(professor.get("full_name") or "professor", professor.get("legacy_id"))

    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    json_path = OUTPUT_DIR / f"{stem}.json"
    markdown_path = OUTPUT_DIR / f"{stem}.md"

    json_path.write_text(
        json.dumps(payload, ensure_ascii=False, indent=2),
        encoding="utf-8",
    )

    used_llm = llm_configured(skip_llm)
    markdown = analyze_professor(payload, skip_llm=skip_llm)
    markdown_path.write_text(markdown, encoding="utf-8")

    return PipelineResult(
        professor_name=professor.get("full_name") or stem,
        json_path=json_path,
        markdown_path=markdown_path,
        used_llm=used_llm,
        review_count=(payload.get("summary") or {}).get("review_count_collected") or 0,
    )


def _output_stem(name: str, legacy_id: int | None) -> str:
    slug = re.sub(r"[^a-zA-Z0-9]+", "_", name).strip("_").lower() or "professor"
    suffix = str(legacy_id) if legacy_id is not None else "unknown"
    return f"{slug}_{suffix}"
