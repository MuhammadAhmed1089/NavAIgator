import json
from ingest import load_manifest, load_documents
from extract import process_document, _deduplicate, _assign_ids

print("Running live test on 2 documents...")
manifest = load_manifest()
documents = load_documents(manifest)[:2]  # Just take the first 2 documents

all_raw_rules = []
for doc in documents:
    print(f"Processing {doc['doc_id']}...")
    doc_rules = process_document(doc)
    all_raw_rules.extend(doc_rules)
    print(f"  Extracted {len(doc_rules)} valid rules from {doc['doc_id']}.")

unique_rules = _deduplicate(all_raw_rules)
final_rules = _assign_ids(unique_rules)

print(f"\nFinished test! Found {len(final_rules)} unique rules.")
print(json.dumps(final_rules, indent=2))
