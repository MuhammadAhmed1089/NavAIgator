# Master Implementation Plan: Rental Housing Law Navigator

**Project:** 7th Global AI Hackathon (RealPage × Hack-Nation)
**Core Objective:** Build an AI system that determines which rental housing laws apply to a specific apartment address today, and how pending changes affect it.
**Timeframe:** 24 Hours

---

## 1. Technical Stack

| Component | Technology | Rationale |
| :--- | :--- | :--- |
| **Backend API** | Python 3 + FastAPI | Rapid development; native async support for API calls. |
| **LLM Engine** | Groq (`llama3-70b-8192`) | Blazing fast inference; excellent JSON mode for strict schema adherence. |
| **Data Processing** | Pandas + Langchain | Langchain for semantic chunking of long legal texts; Pandas for tabular address mapping. |
| **Database (Dev)** | SQLite (via SQLAlchemy) | Zero-setup local database for rapid 24-hour iteration. |
| **Database (Prod)**| PostgreSQL | Stable deployment environment; seamlessly switchable via SQLAlchemy ORM. |
| **Frontend** | React + Vite + Tailwind CSS | Lightning-fast HMR; premium aesthetic UI to maximize "Plain language & Usability" points. |
| **Geocoding** | US Census Geocoder API | Required to legally resolve State, County, and City from postal addresses. |
| **Web Scraping** | Bright Data (Targeted) | Used *only* for resolving `links_only.csv` and missing parcel data (San Diego/Berkeley). |

---

## 2. Responsible AI Guardrails (10 Points)

To satisfy the strict "Responsible AI by Design" rubric:
1.  **Strict Citations:** The LLM prompt will mandate exact string extraction (`quoted_span` > 20 characters) directly from the text, and append the source's retrieval date.
2.  **The "Unknown" Default:** If building facts (like owner type) are missing, the Rules Engine will default to `unknown`, never guessing.
3.  **Audit Logs:** Implement a Python logging pipeline (`audit.log`) tracking every LLM request, chunk processed, and rule generated.
4.  **Date Transparency:** The system must visibly output an "as of" date on every answer, separating enacted from pending law.
5.  **UI Disclaimer:** The React frontend will permanently display: *"This is a reference tool, not legal advice or compliance certification."*

---

## 3. Module Execution Plan

### Phase 0: Internal Testing Sandbox (Hour 1)
*Context: Organizers have withheld `score.py` and the Dev Answer Key.*
*   Manually review the law for 3 diverse sample properties.
*   Create an `internal_dev_key.json`.
*   Write an `internal_test.py` script to automatically compare our pipeline's output to our hand-crafted key, ensuring we are on track before generating the final 500-address output.

### Phase 1: Module A - Rule Extraction Pipeline (Hours 1-6)
*   **Ingestion:** Script parses `corpus_manifest.csv` and loads documents from `corpus/text/`.
*   **Missing Links:** Use Bright Data proxies to fetch texts from `corpus/links_only.csv`.
*   **Chunking:** Pass large texts through Langchain's semantic chunker.
*   **Extraction:** Prompt Groq to extract the 6 target categories (Rent limits, Eviction, Deposits, etc.) strictly matching `rule_record.schema.json`. Ensure extraction captures all edge case fields like penalties, effective dates, and status (enacted/pending).
*   **Output:** Aggregate into a SQLite database table, then dump to `rules.json`.

### Phase 2: Module B - Address Lookup & Rules Engine (Hours 6-11)
*   **Geocoding:** Batch query the Census Geocoder API for all 500 addresses in `data/sample_addresses.csv` to establish true jurisdiction stacks (State > County > City).
*   **Enrichment:** Use Bright Data to query county assessor sites to fill missing `year_built` and `units` data for Berkeley and San Diego addresses to maximize coverage points.
*   **Rules Engine:** Evaluate the extracted rules against the physical building facts.
    *   Flag `superseded` if a local rule overrides a state rule.
    *   Flag `unknown` if data is insufficient.
*   **Output:** Dump to `lookups.json`.

### Phase 3: Module C - Change Tracking Simulator (Hours 11-16)
*   **Simulation:** Load `dev/change_tests.json` (Tests T1–T5).
*   **Execution:** Dynamically alter the query dates (e.g., jump to 2027) or rule statuses (pending -> enacted) inside the Rules Engine.
*   **Delta Calculation:** Compare the baseline output to the simulated output to isolate affected addresses.
*   **Output:** Dump affected addresses and conflict flags to `changes.json`.

### Phase 4: API & Frontend Development (Hours 16-22)
*   **Backend:** Expose the Rules Engine via FastAPI endpoints (`/api/lookup`, `/api/simulate`).
*   **Frontend:** Scaffold the React/Vite dashboard.
    *   Implement an address search bar.
    *   Display beautiful cards for each rule category with plain-language explanations.
    *   Implement UI toggles for language translations (English/Spanish).
    *   Visually surface confidence scores, exact citations, and conflict flags.
    *   **Audit View (Stretch Goal):** Implement a dedicated UI modal showing the LLM reasoning boundary, `quoted_span`, `retrieval_date`, and `as_of` date for every single answer to guarantee traceability.
    *   **Live Extension (Stretch Goal):** Ensure the architecture allows extending to one new jurisdiction live during the demo event.

### Phase 5: Deployment & Polish (Hours 22-24)
*   Migrate the `.env` database connection from SQLite to a cloud PostgreSQL instance (e.g., Supabase, Neon).
*   Deploy FastAPI backend (e.g., Render, Heroku).
*   Deploy React frontend (e.g., Vercel, Netlify).
*   **Deliverables:** Record the mandatory team, demo, and technical videos (demonstrating our internal testing score equivalent). Draft the required **one-page method note** detailing our extraction pipeline and Responsible AI guardrails. Push all code to the GitHub repository with a README, and prepare the live demo link.
