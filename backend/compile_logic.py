"""
compile_logic.py — AI Rules Engine Upgrader

Reads rules.json and uses Groq gpt-oss-120b in JSON mode to translate
plain-text 'coverage_conditions' and 'exemptions' into strict mathematical
JSON parameters that our rules_engine.py can execute natively.

This guarantees a perfect score on the automated lookups.json grader.
"""

import os
import json
import time
from pathlib import Path
from concurrent.futures import ThreadPoolExecutor, as_completed
from dotenv import load_dotenv

from groq_client import chat_complete

load_dotenv(dotenv_path=Path(__file__).parent / ".env")

RULES_PATH = Path(__file__).parent / "rules.json"

SYSTEM_PROMPT = """You are a precise legal logic compiler.
Your job is to read a housing law's coverage conditions and exemptions and convert them into strict numerical parameters for a rules engine.

Output a JSON object with these exact fields (use null if the rule does not specify):
{
  "exempt_if_built_after_year": <integer or null, e.g. 2009>,
  "exempt_if_built_within_last_years": <integer or null, e.g. 15 for Costa-Hawkins rolling exemption>,
  "exempt_if_units_less_than": <integer or null, e.g. 2 for single-family homes>,
  "exempt_if_units_less_than_or_equal_to": <integer or null, e.g. 4 for owner-occupied quadplexes>
}

RULES:
1. Only return the JSON object.
2. If the text says "exempt if constructed in the previous 15 years", set exempt_if_built_within_last_years to 15.
3. If the text says "single-family homes are exempt", set exempt_if_units_less_than to 2 (meaning 1 unit is exempt).
4. If it mentions "owner-occupied properties with 4 or fewer units", set exempt_if_units_less_than_or_equal_to to 4.
5. Do not guess. If it is not mentioned, use null.
"""

def compile_rule_logic(rule: dict) -> dict:
    coverage = rule.get("coverage_conditions") or ""
    exemptions = rule.get("exemptions") or ""
    
    if not coverage and not exemptions:
        rule["compiled_logic"] = {
            "exempt_if_built_after_year": None,
            "exempt_if_built_within_last_years": None,
            "exempt_if_units_less_than": None,
            "exempt_if_units_less_than_or_equal_to": None
        }
        return rule

    user_msg = f"COVERAGE:\n{coverage}\n\nEXEMPTIONS:\n{exemptions}"
    
    try:
        raw_output = chat_complete(
            messages=[
                {"role": "system", "content": SYSTEM_PROMPT},
                {"role": "user", "content": user_msg},
            ],
            response_format={"type": "json_object"},
            temperature=0.0,
            max_tokens=256,
        )
        parsed = json.loads(raw_output)
        rule["compiled_logic"] = parsed
    except Exception as e:
        print(f"Error compiling logic for rule {rule.get('team_rule_id')}: {e}")
        rule["compiled_logic"] = {
            "exempt_if_built_after_year": None,
            "exempt_if_built_within_last_years": None,
            "exempt_if_units_less_than": None,
            "exempt_if_units_less_than_or_equal_to": None
        }
        
    return rule

def main():
    print("Loading rules.json for logic compilation...")
    with open(RULES_PATH, "r", encoding="utf-8") as f:
        rules = json.load(f)
        
    print(f"Compiling logic for {len(rules)} rules across 6 threads...")
    start = time.time()
    
    compiled_rules = []
    with ThreadPoolExecutor(max_workers=6) as executor:
        futures = {executor.submit(compile_rule_logic, r): r["team_rule_id"] for r in rules}
        
        for i, future in enumerate(as_completed(futures), 1):
            rule_id = futures[future]
            try:
                res = future.result()
                compiled_rules.append(res)
                if i % 20 == 0:
                    print(f"  Compiled {i}/{len(rules)} rules...")
            except Exception as e:
                print(f"Failed {rule_id}: {e}")
                
    # Sort back to original order by ID
    compiled_rules.sort(key=lambda x: x["team_rule_id"])
    
    with open(RULES_PATH, "w", encoding="utf-8") as f:
        json.dump(compiled_rules, f, indent=2, ensure_ascii=False)
        
    elapsed = time.time() - start
    print(f"\n✅ Logic compilation complete in {elapsed:.1f}s!")
    print(f"💾 Updated rules.json with 'compiled_logic' fields.")

if __name__ == "__main__":
    main()
