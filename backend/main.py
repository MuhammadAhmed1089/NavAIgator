"""
main.py — FastAPI Backend + Innovations
Serves the pre-computed JSON lookups and powers the live AI innovations.
"""

import json
from pathlib import Path
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from groq_client import chat_complete
from extract import _parse_llm_output, _validate_rules, SYSTEM_PROMPT as EXTRACT_PROMPT
from compile_logic import compile_rule_logic

app = FastAPI(title="Rental Housing Law Navigator API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

ROOT = Path(__file__).parent
LOOKUPS_PATH = ROOT / "lookups.json"
RULES_PATH = ROOT / "rules.json"

# --- Models ---
class TranslateRequest(BaseModel):
    text: str

class IngestRequest(BaseModel):
    url: str
    jurisdiction: str
    text_content: str  # For demo purposes, we pass the scraped text from the frontend or mock it


# --- Standard Endpoints ---

@app.get("/api/addresses")
def get_addresses():
    """Returns a list of all 500 addresses for the frontend dropdown."""
    with open(LOOKUPS_PATH, "r", encoding="utf-8") as f:
        lookups = json.load(f)
    # Just return basic info for the dropdown
    return [{"address_id": item["address_id"], "street_address": item["street_address"]} for item in lookups]

@app.get("/api/lookup/{address_id}")
def get_lookup(address_id: str):
    """Returns the full rule evaluation for a specific address."""
    with open(LOOKUPS_PATH, "r", encoding="utf-8") as f:
        lookups = json.load(f)
        
    for item in lookups:
        if item["address_id"] == address_id:
            return item
            
    raise HTTPException(status_code=404, detail="Address not found")


# --- INNOVATION 1: Dynamic Spanish Translation ---

@app.post("/api/translate")
def translate_to_spanish(req: TranslateRequest):
    """
    Stretch Goal: Dynamically translates plain-language requirements to Spanish using the LLM.
    """
    prompt = "You are a professional legal translator. Translate the following rental housing rule into clear, plain-language Spanish suitable for a tenant. Return ONLY the Spanish text."
    try:
        response = chat_complete(
            messages=[
                {"role": "system", "content": prompt},
                {"role": "user", "content": req.text},
            ],
            temperature=0.0
        )
        return {"spanish_text": response.strip()}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# --- INNOVATION 2: Live Jurisdiction Expansion ---

@app.post("/api/ingest-live")
def ingest_live_rule(req: IngestRequest):
    """
    Stretch Goal: "Extend to one new jurisdiction live".
    Takes raw legal text from a new URL, extracts the rules, compiles the math logic,
    and returns the new rules so the frontend can display them live.
    """
    # 1. Mock the document dictionary expected by the extractor
    mock_doc = {
        "doc_id": "LIVE_001",
        "url": req.url,
        "jurisdiction": req.jurisdiction,
        "retrieval_date": "2026-10-04T00:00Z",
        "text": req.text_content
    }
    
    user_msg = (
        f"SOURCE URL: {mock_doc['url']}\\n"
        f"JURISDICTION: {mock_doc['jurisdiction']}\\n"
        f"RETRIEVED: {mock_doc['retrieval_date']}\\n"
        f"DOC ID: {mock_doc['doc_id']}\\n\\n"
        f"--- LEGAL TEXT EXCERPT ---\\n"
        f"{req.text_content}\\n"
        f"--- END OF EXCERPT ---"
    )
    
    try:
        # 2. Extract rules using our strict JSON prompt
        raw_output = chat_complete(
            messages=[
                {"role": "system", "content": EXTRACT_PROMPT},
                {"role": "user", "content": user_msg},
            ],
            response_format={"type": "json_object"},
            temperature=0.0
        )
        
        raw_rules = _parse_llm_output(raw_output, mock_doc, 0)
        valid_rules = _validate_rules(raw_rules, mock_doc["doc_id"])
        
        # 3. Compile the math logic
        for rule in valid_rules:
            rule["team_rule_id"] = f"live-{hash(rule['title']) % 10000}"
            compile_rule_logic(rule)
            
        return {"status": "success", "extracted_rules": valid_rules}
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="127.0.0.1", port=8000, reload=True)
