"""
ingest.py — Corpus ingestion pipeline.
Reads corpus_manifest.csv and loads the corresponding text files from corpus/text/.
Returns a list of document dicts ready for LLM processing.
"""

import os
import logging
import pandas as pd
from pathlib import Path

# ── Logging setup (Responsible AI: auditable log) ──────────────────────────
logging.basicConfig(
    filename="audit.log",
    level=logging.INFO,
    format="%(asctime)s | %(levelname)s | %(message)s",
    datefmt="%Y-%m-%dT%H:%M:%S",
)
logger = logging.getLogger(__name__)

# ── Paths ───────────────────────────────────────────────────────────────────
ROOT = Path(__file__).parent.parent
CORPUS_DIR = ROOT / "Guidlines_and_Corpus" / "corpus"
TEXT_DIR = CORPUS_DIR / "text"
MANIFEST_PATH = CORPUS_DIR / "corpus_manifest.csv"


def load_manifest() -> pd.DataFrame:
    """Load the corpus manifest CSV."""
    df = pd.read_csv(MANIFEST_PATH)
    logger.info(f"Loaded corpus manifest: {len(df)} documents.")
    return df


# Per organizer update: scraped texts do NOT count toward the citation metric.
# Only rules backed by these official distributed corpus docs are submittable.
SCRAPED_DOC_IDS = {
    'D015', 'D017', 'D028', 'D037', 'D044',
    'D054', 'D055', 'D059', 'D060', 'D074',
    'D075', 'D077', 'D086', 'D087'
}


def load_documents(manifest: pd.DataFrame) -> list[dict]:
    """
    For each row in the manifest that has a local text file,
    load the file content and return a list of document dicts.

    Actual CSV columns: doc_id, jurisdictions, url, source_type,
                        capture, retrieved_at, sha256, text_file, status

    Each returned dict has:
        doc_id, jurisdiction, url, retrieval_date, text, file_path
    """
    documents = []
    skipped = 0

    for _, row in manifest.iterrows():
        doc_id = str(row.get("doc_id", "")).strip()
        jurisdiction = str(row.get("jurisdictions", "")).strip()
        url = str(row.get("url", "")).strip()
        capture = str(row.get("capture", "")).strip().lower()
        retrieval_date = str(row.get("retrieved_at", "")).strip()
        text_file_rel = str(row.get("text_file", "")).strip()
        status = str(row.get("status", "")).strip().lower()

        # Skip link-only and non-captured documents
        if status in ("link-only",) or capture != "yes" or not text_file_rel or text_file_rel == "nan":
            skipped += 1
            logger.info(f"Skipping {doc_id} (status='{status}', capture='{capture}'): no local text.")
            continue

        # Skip scraped docs — not citable per organizer update
        if doc_id in SCRAPED_DOC_IDS:
            skipped += 1
            logger.info(f"Skipping {doc_id}: scraped (non-citable per organizer rules).")
            continue

        # Use the text_file column directly — it gives the relative path from corpus dir
        text_path = CORPUS_DIR / text_file_rel

        if not text_path.exists():
            skipped += 1
            logger.warning(f"Text file not found for doc_id='{doc_id}' at {text_path}. Skipping.")
            continue

        try:
            text = text_path.read_text(encoding="utf-8", errors="replace")
            documents.append({
                "doc_id": doc_id,
                "jurisdiction": jurisdiction,
                "url": url,
                "retrieval_date": retrieval_date,
                "text": text,
                "file_path": str(text_path),
            })
            logger.info(f"Loaded doc_id='{doc_id}' ({len(text):,} chars) — {jurisdiction}.")
        except Exception as e:
            skipped += 1
            logger.error(f"Failed to read {text_path}: {e}")

    logger.info(f"Ingestion complete. Loaded={len(documents)}, Skipped={skipped}.")
    return documents


if __name__ == "__main__":
    manifest = load_manifest()
    print(manifest.columns.tolist())
    print(manifest.head())
    docs = load_documents(manifest)
    print(f"\nLoaded {len(docs)} documents.")
    if docs:
        print(f"First doc: {docs[0]['doc_id']} — {docs[0]['jurisdiction']}")
        print(f"Text preview: {docs[0]['text'][:300]}")
