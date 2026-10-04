"""
main.py — FastAPI Backend + Innovations
Serves the pre-computed JSON lookups and powers the live AI innovations.
"""

import json
from pathlib import Path
from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from pydantic import BaseModel

from groq_client import chat_complete
from extract import _parse_llm_output, _validate_rules, SYSTEM_PROMPT as EXTRACT_PROMPT
from compile_logic import compile_rule_logic
from rules_engine import load_data, evaluate_address

app = FastAPI(title="Rental Housing Law Navigator API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
    "http://localhost:5173",                    # local dev
    "https://navaiusa.netlify.app"
    ],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

ROOT = Path(__file__).parent
LOOKUPS_PATH = ROOT / "lookups.json"
RULES_PATH = ROOT / "rules.json"

# --- Startup Cache ---
_lookups_cache = {}
_addresses_list = []
_global_rules = []
_global_addresses_raw = {}

@app.on_event("startup")
def load_cache():
    global _lookups_cache, _addresses_list, _global_rules, _global_addresses_raw
    try:
        _global_rules, _global_addresses_raw = load_data()
        for addr_id, addr_data in _global_addresses_raw.items():
            _addresses_list.append({
                "address_id": addr_id,
                "street_address": addr_data.get("street_address", ""),
                "state": addr_data.get("jurisdiction_state", "")
            })
        print(f"Loaded {len(_addresses_list)} addresses into memory.")
    except Exception as e:
        print("Warning: could not load raw rules/addresses:", e)

# --- Models ---
class TranslateRequest(BaseModel):
    text: str

class IngestRequest(BaseModel):
    url: str
    jurisdiction: str
    text_content: str  # For demo purposes, we pass the scraped text from the frontend or mock it


# --- Standard Endpoints ---
@app.get("/")
def get_serverislive():
    """Returns a list of all 500 addresses for the frontend dropdown."""
    return "server is live"

@app.get("/api/addresses")
def get_addresses():
    """Returns a list of all 500 addresses for the frontend dropdown."""
    if not _addresses_list:
        raise HTTPException(status_code=503, detail="Cache not loaded yet")
    return _addresses_list

@app.get("/api/lookup/{address_id}")
def get_lookup(address_id: str, as_of: str = None, year_built: int = None, units: int = None):
    """Returns the full rule evaluation for a specific address. Supports dynamic query overrides."""
    if address_id not in _global_addresses_raw:
        raise HTTPException(status_code=404, detail="Address not found")
        
    # Otherwise, run dynamic evaluation
    addr_data = dict(_global_addresses_raw[address_id]) # copy
    if year_built is not None:
        addr_data["year_built"] = year_built
    if units is not None:
        addr_data["units"] = units
        
    query_date = as_of if as_of else "2026-10-01"
    query_year = int(query_date.split("-")[0])
    
    result = evaluate_address(address_id, addr_data, _global_rules, query_year)
    result["as_of_date"] = query_date
    return result

@app.get("/api/changes")
def get_changes():
    """Returns the simulated change tracking results (T1-T6)."""
    CHANGES_PATH = ROOT / "changes.json"
    if not CHANGES_PATH.exists():
        return []
    
    with open(CHANGES_PATH, "r", encoding="utf-8") as f:
        changes = json.load(f)
        
    # Format for the frontend UI
    formatted_changes = []
    for test_id, data in changes.items():
        count = len(data.get("affected_address_ids", data.get("affected_addresses", [])))
        formatted_changes.append({
            "id": test_id,
            "title": data.get("name", test_id),
            "status": "pending" if "pending" in str(data.get("notes", [])).lower() else "enacted",
            "date": "2026-07-01" if "FAIR Act" in data.get("name", "") else "Varies",
            "jurisdiction": "Multi-city" if count > 10 else "Local",
            "desc": f"Simulated test case. Affected addresses: {count}. Notes: {', '.join(data.get('notes', []))}"
        })
        
    return formatted_changes


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
    evaluates it against all 500 properties, appends it to rules.json, 
    and generates the T6 record in changes.json so the dashboard updates live!
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
        f"SOURCE URL: {mock_doc['url']}\n"
        f"JURISDICTION: {mock_doc['jurisdiction']}\n"
        f"RETRIEVED: {mock_doc['retrieval_date']}\n"
        f"DOC ID: {mock_doc['doc_id']}\n\n"
        f"--- LEGAL TEXT EXCERPT ---\n"
        f"{req.text_content}\n"
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
        
        # 3. Compile the math logic and append to global rules
        for rule in valid_rules:
            rule["team_rule_id"] = f"live-{hash(rule['title']) % 10000}"
            compile_rule_logic(rule)
            _global_rules.append(rule)
            
        # 4. Save to rules.json permanently
        if RULES_PATH.exists():
            with open(RULES_PATH, "r", encoding="utf-8") as f:
                existing_rules = json.load(f)
            existing_rules.extend(valid_rules)
            with open(RULES_PATH, "w", encoding="utf-8") as f:
                json.dump(existing_rules, f, indent=2, ensure_ascii=False)
                
        # 5. Evaluate the new rule against all 500 addresses (T6 logic)
        from rules_engine import evaluate_coverage
        affected = []
        for aid, addr in _global_addresses_raw.items():
            for rule in valid_rules:
                if str(rule.get("jurisdiction", "")) in [addr.get("jurisdiction_state"), addr.get("jurisdiction_city")]:
                    eval_result = evaluate_coverage(rule, addr, 2026)
                    if eval_result["status"] in ["applies", "not_yet_effective"]:
                        affected.append(aid)
                        break
                        
        # 6. Append to changes.json as T6
        if CHANGES_PATH.exists():
            with open(CHANGES_PATH, "r", encoding="utf-8") as f:
                changes = json.load(f)
            
            changes["T6"] = {
                "name": f"Live Ingest: {valid_rules[0]['title']}" if valid_rules else "Live Ingest",
                "affected_addresses": affected,
                "notes": ["Fictional T6 ordinance ingested live during demo."]
            }
            
            with open(CHANGES_PATH, "w", encoding="utf-8") as f:
                json.dump(changes, f, indent=2, ensure_ascii=False)
            
        return {"status": "success", "extracted_rules": valid_rules, "t6_affected": len(affected)}
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ── Serve React frontend in production ──────────────────────────────────────
# When deployed, FastAPI serves the Vite build output from ../frontend/dist
FRONTEND_DIST = ROOT.parent / "frontend" / "dist"
if FRONTEND_DIST.exists():
    # Serve static assets (JS, CSS, images)
    app.mount("/assets", StaticFiles(directory=FRONTEND_DIST / "assets"), name="assets")
    # Serve states-10m.json for the map
    _states_json = FRONTEND_DIST / "states-10m.json"
    
    @app.get("/states-10m.json")
    def serve_states_json():
        if _states_json.exists():
            return FileResponse(_states_json)
        raise HTTPException(status_code=404, detail="Map data not found")

    # Catch-all: serve index.html for any unmatched route (SPA routing)
    @app.get("/{full_path:path}")
    def serve_spa(full_path: str):
        index = FRONTEND_DIST / "index.html"
        if index.exists():
            return FileResponse(index)
        raise HTTPException(status_code=404, detail="Frontend not built")


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
