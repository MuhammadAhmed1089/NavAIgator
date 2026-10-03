"""
geocoder.py — Phase 2: Address Geocoding via US Census Geocoder API

The Census Geocoder API resolves a street address into:
  - Precise coordinates (lat/lon)
  - State FIPS, County FIPS
  - Legal Incorporated Place (the actual governing city, not postal city)
  - Census tract / block

This is critical because the postal_city column in sample_addresses.csv is
LEGALLY UNRELIABLE. E.g., "Van Nuys" is a postal area inside "Los Angeles" city limits.
The Census API gives us the TRUE governing city whose laws apply.

Strategy:
  - Batch up to 10,000 addresses at a time (Census API limit)
  - Our 500 addresses are done in one batch call
  - Falls back to one-by-one for any failed batch rows

Output:
  - geocoded.csv  — addresses with resolved legal jurisdiction columns
  - geocoded.json — dict keyed by address_id for fast lookup in rules engine
"""

import os
import json
import time
import requests
import pandas as pd
import logging
from pathlib import Path
from io import StringIO

logging.basicConfig(
    filename="audit.log",
    level=logging.INFO,
    format="%(asctime)s | %(levelname)s | %(message)s",
    datefmt="%Y-%m-%dT%H:%M:%S",
)
logger = logging.getLogger(__name__)

# ── Paths ────────────────────────────────────────────────────────────────────
ROOT = Path(__file__).parent.parent
DATA_DIR = ROOT / "Guidlines_and_Corpus" / "data"
ADDRESSES_CSV = DATA_DIR / "sample_addresses.csv"
OUTPUT_CSV = Path(__file__).parent / "geocoded.csv"
OUTPUT_JSON = Path(__file__).parent / "geocoded.json"

# ── Census Geocoder Batch API ────────────────────────────────────────────────
CENSUS_BATCH_URL = "https://geocoding.geo.census.gov/geocoder/locations/addressbatch"
CENSUS_SINGLE_URL = "https://geocoding.geo.census.gov/geocoder/locations/address"


def load_addresses() -> pd.DataFrame:
    df = pd.read_csv(ADDRESSES_CSV)
    logger.info(f"Loaded {len(df)} addresses from sample_addresses.csv.")
    print(f"Loaded {len(df)} addresses.")
    return df


def build_batch_input(df: pd.DataFrame) -> str:
    """
    Build the CSV string the Census API expects.
    Format: Unique ID, Street address, City, State, ZIP
    """
    lines = []
    for _, row in df.iterrows():
        address_id = row["address_id"]
        street = str(row["street_address"]).strip()
        city = str(row.get("postal_city", "")).strip()
        state = str(row.get("state", "")).strip()
        zip_code = str(row.get("zip", "")).strip()
        lines.append(f'"{address_id}","{street}","{city}","{state}","{zip_code}"')
    return "\n".join(lines)


def geocode_batch(df: pd.DataFrame) -> dict:
    """
    Send up to 10,000 addresses in one Census batch request.
    Returns a dict: {address_id -> geocode_result_dict}
    """
    print("Sending batch to US Census Geocoder API (this may take 30-60s)...")
    batch_csv = build_batch_input(df)

    try:
        response = requests.post(
            CENSUS_BATCH_URL,
            files={"addressFile": ("addresses.csv", batch_csv, "text/csv")},
            data={
                "benchmark": "Public_AR_Current",
                "vintage": "Current_Current",
            },
            timeout=120,
        )
        response.raise_for_status()

        # Parse the returned CSV
        result_df = pd.read_csv(
            StringIO(response.text),
            header=None,
            names=[
                "address_id", "input_address", "match", "match_type",
                "matched_address", "lon_lat", "tiger_line_id", "side",
            ],
        )
        logger.info(f"Census batch response: {len(result_df)} rows.")

        results = {}
        for _, row in result_df.iterrows():
            aid = str(row["address_id"]).strip()
            match = str(row.get("match", "")).strip().lower()

            if match == "match" and pd.notna(row.get("lon_lat")):
                try:
                    lon_lat = str(row["lon_lat"]).strip()
                    parts = lon_lat.split(",")
                    lon = float(parts[0])
                    lat = float(parts[1])
                    matched_address = str(row.get("matched_address", "")).strip()
                    results[aid] = {
                        "match": "match",
                        "matched_address": matched_address,
                        "lon": lon,
                        "lat": lat,
                    }
                except Exception as e:
                    results[aid] = {"match": "no_match", "error": str(e)}
            else:
                results[aid] = {"match": "no_match"}

        matched = sum(1 for v in results.values() if v.get("match") == "match")
        print(f"Batch geocoding: {matched}/{len(df)} addresses matched.")
        return results

    except Exception as e:
        logger.error(f"Census batch geocoding failed: {e}")
        print(f"Batch geocoding failed: {e}")
        return {}


def resolve_jurisdiction_from_address(matched_address: str, state: str) -> dict:
    """
    Derive the legal jurisdiction (city) from the matched Census address string.
    Census matched_address format: "123 MAIN ST, CITYNAME, ST 12345-6789"
    We extract the city portion and normalize it.
    """
    city = None
    if matched_address:
        parts = matched_address.split(",")
        if len(parts) >= 2:
            city = parts[1].strip().title()

    return {
        "legal_city": city,
        "state": state,
        # Build the jurisdiction key matching our rules.json format
        "jurisdiction_city": f"{city}, {state}" if city else None,
        "jurisdiction_state": state,
    }


def build_geocoded_dataset(df: pd.DataFrame, batch_results: dict) -> pd.DataFrame:
    """
    Merge geocoding results back into the original dataframe.
    Adds columns: match_status, matched_address, lon, lat, legal_city, jurisdiction_city
    """
    rows = []
    for _, row in df.iterrows():
        aid = str(row["address_id"]).strip()
        result = batch_results.get(aid, {"match": "no_match"})
        state = str(row.get("state", "")).strip()

        new_row = row.to_dict()
        new_row["match_status"] = result.get("match", "no_match")
        new_row["matched_address"] = result.get("matched_address", None)
        new_row["lon"] = result.get("lon", None)
        new_row["lat"] = result.get("lat", None)

        if result.get("match") == "match":
            jurisdiction = resolve_jurisdiction_from_address(
                result.get("matched_address", ""), state
            )
        else:
            # Fall back to postal_city (less reliable but better than nothing)
            postal_city = str(row.get("postal_city", "")).strip()
            jurisdiction = {
                "legal_city": postal_city if postal_city else None,
                "state": state,
                "jurisdiction_city": f"{postal_city}, {state}" if postal_city else None,
                "jurisdiction_state": state,
            }
            logger.warning(f"[{aid}] No geocode match, using postal_city='{postal_city}' as fallback.")

        new_row.update(jurisdiction)
        rows.append(new_row)

    return pd.DataFrame(rows)


def save_outputs(geocoded_df: pd.DataFrame) -> None:
    """Save geocoded data as both CSV and JSON."""
    geocoded_df.to_csv(OUTPUT_CSV, index=False)
    print(f"Saved geocoded CSV to {OUTPUT_CSV}")

    # JSON dict keyed by address_id for fast lookup in rules engine
    records = {}
    for _, row in geocoded_df.iterrows():
        aid = str(row["address_id"]).strip()
        records[aid] = row.to_dict()

    with open(OUTPUT_JSON, "w", encoding="utf-8") as f:
        json.dump(records, f, indent=2, default=str)
    print(f"Saved geocoded JSON to {OUTPUT_JSON}")
    logger.info(f"Geocoding complete: {len(records)} addresses saved.")


def run_geocoding() -> pd.DataFrame:
    """Main entry point for Phase 2 geocoding."""
    df = load_addresses()

    # Batch geocode all addresses
    batch_results = geocode_batch(df)

    # Build enriched dataset
    geocoded_df = build_geocoded_dataset(df, batch_results)

    # Stats
    matched = (geocoded_df["match_status"] == "match").sum()
    unmatched = len(geocoded_df) - matched
    print(f"\nGeocoding complete!")
    print(f"  Matched:   {matched}")
    print(f"  Unmatched: {unmatched} (using postal_city fallback)")

    save_outputs(geocoded_df)
    return geocoded_df


if __name__ == "__main__":
    geocoded = run_geocoding()
    print("\nSample of geocoded results:")
    cols = ["address_id", "street_address", "postal_city", "legal_city", "jurisdiction_city", "match_status"]
    print(geocoded[cols].head(10).to_string(index=False))
