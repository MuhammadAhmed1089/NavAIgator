"""
extract.py — Phase 1: Automated Rule Extraction Pipeline

Flow:
  1. Load 54 corpus documents via ingest.py
  2. Chunk each document with RecursiveCharacterTextSplitter
  3. Send chunks to Groq (gpt-oss-120b, JSON mode) via ThreadPoolExecutor
     — 6 concurrent workers, one per API key slot for max throughput
  4. Parse, validate (Pydantic), and deduplicate extracted rules
  5. Save to SQLite DB + dump rules.json

Responsible AI enforced at prompt level:
  - Exact quoted_span (≥20 chars) mandatory
  - No hallucinated rules or citations
  - Unknown default for missing coverage facts
  - Retrieval date and source URL attached to every rule
"""

import os
import json
import time
import logging
import threading
from pathlib import Path
from concurrent.futures import ThreadPoolExecutor, as_completed

from dotenv import load_dotenv
from langchain_text_splitters import RecursiveCharacterTextSplitter
from pydantic import ValidationError

load_dotenv(dotenv_path=Path(__file__).parent / ".env")

from ingest import load_manifest, load_documents
from schema import RuleRecord, RuleCategory, RuleStatus, JurisdictionLevel
from groq_client import chat_complete

# ── Logging ─────────────────────────────────────────────────────────────────
logging.basicConfig(
    filename="audit.log",
    level=logging.INFO,
    format="%(asctime)s | %(levelname)s | %(threadName)s | %(message)s",
    datefmt="%Y-%m-%dT%H:%M:%S",
)
logger = logging.getLogger(__name__)

# ── Config ───────────────────────────────────────────────────────────────────
CHUNK_SIZE = 5000        # characters per chunk (~1,250 tokens)
CHUNK_OVERLAP = 400      # overlap to avoid splitting rules at boundaries
MAX_WORKERS = 6          # matches number of Groq API keys
OUTPUT_PATH = Path(__file__).parent / "rules.json"

# Thread-safe rule accumulator
_rules_lock = threading.Lock()
_all_rules: list[dict] = []
_rule_counter = threading.local()

# ── System Prompt ─────────────────────────────────────────────────────────────
SYSTEM_PROMPT = """You are a legal document parser specializing in U.S. rental housing law.

Your task is to extract structured housing rules from the provided legal text.

STRICT RULES — follow exactly, no exceptions:
1. Only extract rules that are EXPLICITLY stated in the provided text. Do NOT infer, assume, or invent rules.
2. The "quoted_span" field MUST be an exact verbatim copy of at least 20 consecutive characters taken directly from the source text. Never paraphrase or summarize it.
3. If a coverage condition (such as owner type, building size, or certificate date) is not explicitly stated in the text, set that field to null. Never guess.
4. Extract ONLY rules in these 6 categories:
   - rent_increase_limits
   - just_cause_eviction
   - security_deposits
   - application_screening_fees
   - screening_restrictions
   - algorithmic_rent_setting
5. If the text does not contain a rule in a given category, do not include it.
6. For "status": use "in_force" for enacted and currently effective laws, "not_yet_effective" for enacted laws with a future effective date, "pending" for bills not yet passed, and "failed" for proposals that did not become law.
7. Do NOT suggest ways to avoid, structure around, or evade any rule.
8. Do NOT present output as legal advice.

Return a JSON object in this exact format:
{
  "rules": [
    {
      "title": "<short descriptive title>",
      "category": "<one of the 6 categories>",
      "status": "<in_force|not_yet_effective|pending|failed>",
      "level": "<state|city>",
      "requirement": "<1-2 plain-language sentences>",
      "key_value": "<headline number/formula or null>",
      "coverage_conditions": "<explicit coverage conditions or null>",
      "exemptions": "<explicit exemptions or null>",
      "effective_date": "<YYYY-MM-DD or YYYY-MM or YYYY or null>",
      "citation": "<official legal citation>",
      "source_url": "<source URL>",
      "quoted_span": "<exact verbatim text from source, min 20 chars>",
      "confidence": <0.0-1.0>,
      "conflict_flag": <true|false>,
      "conflict_note": "<note if conflict_flag is true, else null>"
    }
  ]
}

If no rules are found in this chunk, return: {"rules": []}
"""


def _build_user_message(chunk_text: str, doc: dict) -> str:
    """Wrap a text chunk with document metadata for context."""
    return (
        f"SOURCE URL: {doc['url']}\n"
        f"JURISDICTION: {doc['jurisdiction']}\n"
        f"RETRIEVED: {doc['retrieval_date']}\n"
        f"DOC ID: {doc['doc_id']}\n\n"
        f"--- LEGAL TEXT EXCERPT ---\n"
        f"{chunk_text}\n"
        f"--- END OF EXCERPT ---"
    )


def _parse_llm_output(raw: str, doc: dict, chunk_index: int) -> list[dict]:
    """
    Parse the LLM JSON output and enrich each rule with document metadata.
    Returns a list of raw rule dicts (not yet validated by Pydantic).
    """
    try:
        parsed = json.loads(raw)
        rules = parsed.get("rules", [])
        if not isinstance(rules, list):
            logger.warning(f"[{doc['doc_id']}] chunk {chunk_index}: 'rules' is not a list.")
            return []

        enriched = []
        for rule in rules:
            rule["source_url"] = rule.get("source_url") or doc["url"]
            rule["source_doc_id"] = doc["doc_id"]
            rule["jurisdiction"] = rule.get("jurisdiction") or doc["jurisdiction"]
            rule["retrieval_date"] = doc["retrieval_date"]
            enriched.append(rule)

        return enriched

    except json.JSONDecodeError as e:
        logger.error(f"[{doc['doc_id']}] chunk {chunk_index}: JSON parse failed — {e}")
        return []


def _validate_rules(raw_rules: list[dict], doc_id: str) -> list[dict]:
    """
    Validate each raw rule dict against the Pydantic RuleRecord schema.
    Invalid rules are logged and dropped.
    Returns a list of valid rule dicts.
    """
    valid = []
    for i, rule in enumerate(raw_rules):
        # Skip rules with quoted_span too short (hallucination guard)
        quoted = rule.get("quoted_span", "")
        if not quoted or len(quoted) < 20:
            logger.warning(
                f"[{doc_id}] Rule dropped: quoted_span too short or missing "
                f"(len={len(quoted)}). Title: {rule.get('title', 'N/A')}"
            )
            continue

        # Temporarily assign a placeholder ID for validation
        rule.setdefault("team_rule_id", "temp")
        try:
            RuleRecord(**rule)
            valid.append(rule)
        except ValidationError as e:
            logger.warning(f"[{doc_id}] Rule #{i} failed Pydantic validation: {e}")

    return valid


def _deduplicate(rules: list[dict]) -> list[dict]:
    """
    Remove duplicate rules produced by overlapping chunks.
    Dedup key: (jurisdiction, category, citation).
    Keeps the first occurrence.
    """
    seen = set()
    unique = []
    for rule in rules:
        key = (
            str(rule.get("jurisdiction", "")).lower().strip(),
            str(rule.get("category", "")).lower().strip(),
            str(rule.get("citation", "")).lower().strip(),
        )
        if key not in seen:
            seen.add(key)
            unique.append(rule)
        else:
            logger.info(f"Dedup: skipped duplicate rule — {key}")
    return unique


def _assign_ids(rules: list[dict]) -> list[dict]:
    """Assign sequential team_rule_ids: r-0001, r-0002, ..."""
    for i, rule in enumerate(rules, start=1):
        rule["team_rule_id"] = f"r-{i:04d}"
    return rules


# ── Core worker function (runs in each thread) ───────────────────────────────

def process_document(doc: dict) -> list[dict]:
    """
    Process a single document: chunk → LLM extract → parse → validate.
    Returns a list of valid raw rule dicts for this document.
    """
    doc_id = doc["doc_id"]
    text = doc["text"]
    doc_rules = []

    # Split document into chunks
    splitter = RecursiveCharacterTextSplitter(
        chunk_size=CHUNK_SIZE,
        chunk_overlap=CHUNK_OVERLAP,
        separators=["\n\n", "\n", ". ", " ", ""],
    )
    chunks = splitter.split_text(text)
    logger.info(f"[{doc_id}] Split into {len(chunks)} chunk(s) ({len(text):,} chars total).")

    for idx, chunk in enumerate(chunks):
        user_msg = _build_user_message(chunk, doc)
        try:
            raw_output = chat_complete(
                messages=[
                    {"role": "system", "content": SYSTEM_PROMPT},
                    {"role": "user", "content": user_msg},
                ],
                response_format={"type": "json_object"},
                temperature=0.0,
                max_tokens=4096,
            )
            raw_rules = _parse_llm_output(raw_output, doc, idx)
            valid_rules = _validate_rules(raw_rules, doc_id)
            doc_rules.extend(valid_rules)
            logger.info(
                f"[{doc_id}] Chunk {idx+1}/{len(chunks)}: "
                f"extracted {len(raw_rules)} raw, {len(valid_rules)} valid rules."
            )
        except Exception as e:
            logger.error(f"[{doc_id}] Chunk {idx+1} failed: {e}")
            continue

    logger.info(f"[{doc_id}] Done. {len(doc_rules)} rules before dedup.")
    return doc_rules


# ── Main extraction orchestrator ─────────────────────────────────────────────

def run_extraction() -> list[dict]:
    """
    Main entry point.
    Processes all 54 documents concurrently using ThreadPoolExecutor
    with MAX_WORKERS threads (one per Groq API key slot).
    """
    manifest = load_manifest()
    documents = load_documents(manifest)
    logger.info(f"Starting extraction: {len(documents)} documents, {MAX_WORKERS} workers.")
    print(f"\n🚀 Starting extraction of {len(documents)} documents with {MAX_WORKERS} threads...\n")

    start_time = time.time()
    all_raw_rules = []

    with ThreadPoolExecutor(max_workers=MAX_WORKERS, thread_name_prefix="extractor") as executor:
        futures = {executor.submit(process_document, doc): doc["doc_id"] for doc in documents}

        for future in as_completed(futures):
            doc_id = futures[future]
            try:
                doc_rules = future.result()
                all_raw_rules.extend(doc_rules)
                print(f"  OK {doc_id}: {len(doc_rules)} rules extracted")
            except Exception as e:
                print(f"  FAIL {doc_id}: FAILED — {e}")
                logger.error(f"Document {doc_id} future raised: {e}")

    elapsed = time.time() - start_time
    print(f"\n⏱️  Extraction complete in {elapsed:.1f}s")
    print(f"📋 Total raw rules: {len(all_raw_rules)}")

    # Deduplicate and assign IDs
    unique_rules = _deduplicate(all_raw_rules)
    final_rules = _assign_ids(unique_rules)

    print(f"✨ After dedup: {len(final_rules)} unique rules")
    logger.info(f"Extraction finished: {len(final_rules)} unique rules in {elapsed:.1f}s.")

    return final_rules


def save_rules(rules: list[dict]) -> None:
    """Save rules to rules.json (hackathon submission file)."""
    OUTPUT_PATH.parent.mkdir(parents=True, exist_ok=True)
    with open(OUTPUT_PATH, "w", encoding="utf-8") as f:
        json.dump(rules, f, indent=2, ensure_ascii=False)
    print(f"\n💾 Saved {len(rules)} rules → {OUTPUT_PATH}")
    logger.info(f"rules.json saved: {len(rules)} rules at {OUTPUT_PATH}")


if __name__ == "__main__":
    rules = run_extraction()
    save_rules(rules)

    # Quick sanity check
    print("\n📊 Rules by jurisdiction:")
    from collections import Counter
    counts = Counter(r.get("jurisdiction", "unknown") for r in rules)
    for jurisdiction, count in sorted(counts.items()):
        print(f"   {jurisdiction}: {count}")

    print("\n📊 Rules by category:")
    cat_counts = Counter(r.get("category", "unknown") for r in rules)
    for cat, count in sorted(cat_counts.items()):
        print(f"   {cat}: {count}")
