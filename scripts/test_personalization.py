"""Run the Phase 2 setup agents against contrasting sample candidates."""

from __future__ import annotations

import json
import sys
from pathlib import Path

from dotenv import load_dotenv

ROOT = Path(__file__).parents[1]
sys.path.insert(0, str(ROOT))

from app.agents.strengths_finder import find_strengths
from app.agents.topic_planner import plan_topics
from app.agents.weaknesses_finder import find_weaknesses
from app.providers.base import get_extraction_model_provider, get_reasoning_model_provider

load_dotenv()

candidates = json.loads(
    (ROOT / "data" / "candidates.json").read_text()
)["candidates"]

for candidate_id in ("CAND-003", "CAND-010"):
    candidate = next(item for item in candidates if item["member"]["id"] == candidate_id)
    strengths = find_strengths(get_extraction_model_provider(), candidate)
    weaknesses = find_weaknesses(get_extraction_model_provider(), candidate)
    topic_queue = plan_topics(get_reasoning_model_provider(), candidate, strengths, weaknesses)
    print(json.dumps({"candidate": candidate_id, "topic_queue": topic_queue}, indent=2))
