import json

# These 15 doc_ids were scraped by us and are NOT in the official distributed corpus.
# Per the organizer update: scraped texts do NOT count toward the citation metric.
SCRAPED_DOC_IDS = {
    'D015', 'D017', 'D028', 'D037', 'D044',
    'D054', 'D055', 'D059', 'D060', 'D074',
    'D075', 'D077', 'D086', 'D087'
}

with open('backend/rules.json', 'r', encoding='utf-8') as f:
    rules = json.load(f)

print(f"Total rules before filter: {len(rules)}")

original_rules = [r for r in rules if r.get('source_doc_id') not in SCRAPED_DOC_IDS]
scraped_rules  = [r for r in rules if r.get('source_doc_id') in SCRAPED_DOC_IDS]

print(f"From original corpus (citable): {len(original_rules)}")
print(f"From scraped docs (excluded):   {len(scraped_rules)}")

scraped_ids_found = set(r.get('source_doc_id') for r in scraped_rules)
print(f"Scraped doc_ids found: {scraped_ids_found}")

# Re-assign sequential IDs
for i, rule in enumerate(original_rules, start=1):
    rule['team_rule_id'] = f"r-{i:04d}"

with open('backend/rules.json', 'w', encoding='utf-8') as f:
    json.dump(original_rules, f, indent=2, ensure_ascii=False)

print(f"\nrules.json cleaned and saved with {len(original_rules)} citable rules.")
