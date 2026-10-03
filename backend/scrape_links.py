"""
scrape_links.py — Bright Data Web Unlocker Integration

This script parses corpus_manifest.csv to find all "link-only" documents.
It uses the Bright Data Web Unlocker proxy to bypass anti-bot protections
on municipal/state government sites, extracts the plain text using BeautifulSoup,
and saves the output to Guidlines_and_Corpus/corpus/text/ so that extract.py
can process them automatically.
"""

import os
import time
import requests
import pandas as pd
from pathlib import Path
from bs4 import BeautifulSoup
from dotenv import load_dotenv

# Load Bright Data credentials from .env
load_dotenv(dotenv_path=Path(__file__).parent / ".env")

HOST = os.getenv("BRIGHT_DATA_HOST", "brd.superproxy.io")
PORT = os.getenv("BRIGHT_DATA_PORT", "22225")
USERNAME = os.getenv("BRIGHT_DATA_USERNAME", "")
PASSWORD = os.getenv("BRIGHT_DATA_PASSWORD", "")

# ── Paths ───────────────────────────────────────────────────────────────────
ROOT = Path(__file__).parent.parent
CORPUS_DIR = ROOT / "Guidlines_and_Corpus" / "corpus"
TEXT_DIR = CORPUS_DIR / "text"
MANIFEST_PATH = CORPUS_DIR / "corpus_manifest.csv"

def get_brightdata_proxies() -> dict | None:
    """Return requests proxies dict if Bright Data is configured."""
    if not USERNAME or not PASSWORD:
        print("⚠️ Bright Data credentials missing in .env. Attempting direct requests...")
        return None
        
    proxy_url = f"http://{USERNAME}:{PASSWORD}@{HOST}:{PORT}"
    return {
        "http": proxy_url,
        "https": proxy_url,
    }

def fetch_and_clean(url: str, proxies: dict | None) -> str | None:
    """Fetch URL via Web Unlocker and clean HTML to plain text."""
    headers = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
    }
    
    try:
        # We disable SSL verify because the proxy intercepts the traffic
        response = requests.get(url, headers=headers, proxies=proxies, verify=False, timeout=30)
        response.raise_for_status()
        
        # Parse HTML and extract plain text
        soup = BeautifulSoup(response.text, "html.parser")
        
        # Remove scripts and styles
        for element in soup(["script", "style", "nav", "footer", "header"]):
            element.decompose()
            
        text = soup.get_text(separator="\n", strip=True)
        return text
    except Exception as e:
        print(f"  ❌ Error fetching {url}: {e}")
        return None

def main():
    TEXT_DIR.mkdir(parents=True, exist_ok=True)
    proxies = get_brightdata_proxies()
    
    df = pd.read_csv(MANIFEST_PATH)
    
    # Filter for link-only documents
    link_only_docs = df[df["status"].str.lower() == "link-only"]
    print(f"Found {len(link_only_docs)} 'link-only' documents to scrape.")
    
    success_count = 0
    
    for idx, row in link_only_docs.iterrows():
        doc_id = str(row["doc_id"]).strip()
        url = str(row["url"]).strip()
        jurisdiction = str(row["jurisdictions"]).strip()
        
        print(f"\nScraping {doc_id} ({jurisdiction})...")
        print(f"URL: {url}")
        
        text = fetch_and_clean(url, proxies)
        
        if text and len(text) > 100:
            # Save the text
            save_path = TEXT_DIR / f"{doc_id}.txt"
            
            # Add the required header so ingest.py reads the metadata
            header = f"SOURCE: {url}\nRETRIEVED: 2026-10-01 22:50 UTC\n\n"
            save_path.write_text(header + text, encoding="utf-8")
            
            # Update the CSV dataframe in memory to mark it as captured
            df.at[idx, "status"] = "ok"
            df.at[idx, "capture"] = "yes"
            df.at[idx, "text_file"] = f"text/{doc_id}.txt"
            
            print(f"  ✅ Success! Saved {len(text):,} chars to {save_path.name}")
            success_count += 1
        else:
            print("  ⚠️ Failed or got empty text.")
            
        time.sleep(1) # Be polite
        
    if success_count > 0:
        # Save the updated manifest so ingest.py knows about the new files
        df.to_csv(MANIFEST_PATH, index=False)
        print(f"\n🎉 Successfully scraped {success_count} documents!")
        print("Manifest updated. You can now re-run `python backend/extract.py` to process the new laws.")
    else:
        print("\n❌ No new documents scraped.")

if __name__ == "__main__":
    # Suppress InsecureRequestWarning from verify=False
    import urllib3
    urllib3.disable_warnings(urllib3.exceptions.InsecureRequestWarning)
    main()
