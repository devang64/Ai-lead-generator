# Project Memory
## AI Lead Generator — Institutional Knowledge & Context

> This file is a living document. It captures the "why" behind decisions, hard-won lessons,
> gotchas, and context that would otherwise live only in a developer's head.
> Update this file whenever you make a non-obvious decision or discover something important.

**Last Updated:** September 2026

---

## 1. What This Project Is (In One Paragraph)

This is a **sales lead generation CLI tool for ReviewFlow** — a QR-based Google Review Management SaaS. The tool discovers real local businesses in a given area, scores them on how urgently they need a review management tool, and uses Gemini AI to write personalized cold outreach pitches for each. Output is a ranked CSV/Excel/JSON file of ready-to-contact leads. It is designed to be run daily by a founder or sales rep to target a new area or category each time.

---

## 2. The Product Context — ReviewFlow

ReviewFlow is the **customer** of this lead generator. Key facts to remember:

- **What ReviewFlow sells:** A QR code system that businesses place at their checkout/counter. Customers scan it and are guided to leave a Google Review in 2 clicks.
- **Who buys it:** Local SMBs — salons, restaurants, cafes, gyms, dental clinics — any business with daily walk-in footfall
- **Why they buy it:** Their Google rating is hurting their visibility vs. competitors, or they have too few reviews to show up in local search
- **Ideal customer:** Rating 3.5–4.3★, low review count (<80), active business, has competitors outranking them
- **Sales motion:** Cold outreach (WhatsApp/call) to business owner or manager

This context is why the scoring weights, category lists, and filtering thresholds are what they are.

---

## 3. Key Decisions & Why

### 3.1 "No AI for scoring" — the most important architectural choice

**Decision:** The 100-point scoring engine is pure deterministic Python. Gemini AI is ONLY used for qualitative synthesis (pain points, pitches).

**Why:** Early versions experimented with asking Gemini to "score" leads. The scores were inconsistent, unexplainable, and sometimes confidently wrong. A sales rep asking "why is this business an A+" needs a real answer. The current approach gives an exact breakdown:
- "25/25 for Review Opportunity (rating 3.6★, only 18 reviews)"
- "18/20 for Competitive Gap (top competitor has 450 reviews, you have 22)"

This is far more trustworthy and debuggable.

### 3.2 "Verified Local Provider" as a first-class citizen, not just a stub

**Decision:** `VerifiedLocalDataProvider` is a real, fully functional provider with curated Surat business data.

**Why:** The first version required a Gemini API key to run anything. This meant it couldn't be tested offline, demoed without credentials, or used when API quotas were exhausted. The local provider makes the tool fully functional for demos and development with zero API keys.

**Caution:** The local provider data is static. It won't reflect businesses that have opened or closed recently. Use it for testing, not production sales runs.

### 3.3 Place ID as primary dedup key, not business name

**Decision:** `place_id` is the deduplication and UPSERT primary key.

**Why:** Business names are messy. "Sharma's Salon", "Sharma Salon", "Sharma Hair Salon" are the same business but would be treated as three separate entries if we keyed on name. Google Place IDs are stable, globally unique identifiers that solve this cleanly.

**Gotcha:** `GeminiPlacesDataProvider` generates Place IDs using AI — these may not be real Google Place IDs. They could be inconsistent across runs. This is Bug B3 in `TASKS.md`. When Google Places API v2 is added, this becomes a non-issue.

### 3.4 CSV sorted by Lead Score after every write

**Decision:** Every `upsert_leads_to_csv()` call re-sorts all rows by Lead Score descending.

**Why:** When a sales rep opens the CSV, the best leads should be at the top. If we didn't sort, UPSERT inserts would appear at random positions and new leads would get buried.

**Side effect:** The CSV row order changes on every write, which makes `git diff` on the CSV noisy. This is intentional — leads.csv is git-ignored anyway.

### 3.5 No `requests` library — use `urllib.request` only

**Decision:** All HTTP calls use Python stdlib `urllib.request`, not `requests`.

**Why:** Keeping external dependencies minimal was a deliberate choice. `requests` is excellent but adds a dependency that must be pinned, updated, and installed. `urllib.request` is always available. The only current third-party dependency is `openpyxl` for Excel export, and that's optional.

**Consequence:** The Gemini API code is slightly more verbose (manual JSON encoding, manual headers). That's an acceptable trade-off.

### 3.6 Why `GEMINI_CANDIDATE_MODELS` is a list, not a single string

**Decision:** The AI analyzer tries multiple Gemini models in order.

**Why:** Gemini model names change frequently as new versions ship. A model that exists today (`gemini-2.5-flash`) may be deprecated next month. Having a fallback chain means the tool continues working without code changes as long as at least one listed model is active. Put the newest/best model first.

**Remember to update this list** when new Gemini models are released.

---

## 4. Gotchas & Traps

### 4.1 The `.env` file is NOT loaded by `python-dotenv`

We have a custom `_load_env_file()` in `config.py`. It:
- Only reads `.env` from the project root (not `.env.local`, not parent directories)
- Only sets env vars that aren't already set (shell overrides take priority)
- Silently ignores any file errors

If env vars aren't loading, check: (1) is `.env` in the project root? (2) is the key set at the shell level already?

### 4.2 The `leads.csv` schema has 38 columns — adding a new column is a migration

If you add a new column to `CSV_FIELDNAMES` in `storage.py`:
- Existing rows in `leads.csv` will be missing that column
- `csv.DictWriter` will write an empty string for missing fields (not an error)
- But `csv.DictReader` will read them as empty strings, not `None`

**Best practice:** When adding columns, write a one-off migration script that reads the old CSV and rewrites it with the new column populated with a sensible default. See `TASKS.md` for the planned CSV schema versioning feature.

### 4.3 `competitors.py` only handles Salon, Restaurant, Cafe

```python
category_key = "Salon"  # default
if "cafe" in business.category.lower(): category_key = "Cafe"
elif "restaurant" in ...: category_key = "Restaurant"
```

Everything else falls back to `"Salon"` competitor data — which gives wrong competitive gap numbers. This is Bug B1. When adding Spa, Gym, Dental (planned in `TASKS.md`), add both the competitor database entries in `verified_local.py` AND the category mapping in `competitors.py`.

### 4.4 Hard filter thresholds are very tight by design

Default: `3.5–4.3★`, `5–80 reviews`. These will reject most businesses. That's intentional. The pipeline is designed to be selective. If you're getting 0 leads after filtering, don't widen the filter — consider using a larger `--limit` to fetch more candidates, or targeting a different area/category with more businesses in the sweet spot.

### 4.5 Gemini AI analysis is per-lead — it gets slow at scale

With 15 leads and 2 API attempts per lead (in the worst case), that's up to 30 API calls with 1-second sleep between retries. For large runs (50+ leads), the AI synthesis stage is the bottleneck. Plan for 2-5 minutes per run at large scales.

**Future optimization:** Batch multiple lead analyses into one Gemini call (multi-lead prompt) to reduce API round trips.

### 4.6 `openpyxl` is optional — Excel export silently falls back to CSV

If `openpyxl` is not installed, `export_leads_to_excel()` logs an info message and returns the CSV path instead. This is intentional graceful degradation. Don't be alarmed if the `.xlsx` file isn't created — check that `pip install openpyxl>=3.1.0` was run.

### 4.7 The CSV write is non-atomic (Bug B4)

`upsert_leads_to_csv()` reads the existing CSV, builds an updated in-memory dict, then writes the entire file. If the process crashes between the open-for-write and file close, the CSV will be empty or partial.

**Workaround (manual):** Always keep a backup: `cp leads.csv leads.backup.csv` before large runs. The planned fix is write-to-temp + atomic rename.

---

## 5. Environment Setup Checklist

For a new developer or environment:

```bash
# 1. Clone
git clone https://github.com/devang64/Ai-lead-generator.git
cd Ai-lead-generator

# 2. Python version (3.8+)
python3 --version

# 3. Install dependencies
pip install openpyxl>=3.1.0

# 4. Set up secrets
cp .env.example .env
# Edit .env: add GEMINI_API_KEY

# 5. Test without API key (uses local data)
python3 main.py --area "Adajan Surat" --categories Salon --limit 10 --final-limit 5

# 6. Run unit tests
python3 -m unittest discover -s tests -p "test_*.py"
```

---

## 6. Gemini API Notes

- **Endpoint:** `https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent?key={key}`
- **Auth:** API key as query parameter (not Bearer token)
- **Rate limits:** Free tier has strict QPM limits — add delays between calls if hitting 429s
- **Model availability:** Check https://ai.google.dev/models for current model names. Update `GEMINI_CANDIDATE_MODELS` in `config.py` when models are deprecated
- **Response structure:** `data["candidates"][0]["content"]["parts"][0]["text"]`
- **JSON fences:** Gemini often wraps JSON in ` ```json ... ``` ` — the `re.sub()` in `ai_analyzer.py` strips these

---

## 7. Data Quality Notes

### About `VerifiedLocalDataProvider`
- Data covers localities in Surat: Adajan, Pal, VIP Road, Althan, Vesu, Katargam, Varachha
- Businesses are real places in Surat as of 2026
- Phone numbers, ratings, review counts are approximate — treat as demo data, not production-verified
- `reviews_last_30/90/180_days` are estimated from review velocity, not pulled from live API

### About `GeminiPlacesDataProvider`
- Asks Gemini to return real business names for the given area and category
- Gemini may occasionally return slightly wrong Place IDs or made-up business names
- Always cross-reference A+ leads on Google Maps before outreach
- The prompt enforces real data, but LLMs are not perfect — treat as high-confidence, not ground truth

---

## 8. Future Developer Onboarding Notes

If you're new to this project, read these files in order:

1. `README.md` — Quick start and CSV schema
2. `PRD.md` — What problem this solves and why
3. `ARCHITECTURE.md` — How all the modules connect
4. `DESIGN.md` — Why specific design choices were made
5. `RULES.md` — Coding standards before writing any code
6. `MEMORY.md` — This file, for gotchas and institutional knowledge
7. `TASKS.md` — What's planned next

Then read the code in this order:
- `models.py` → `config.py` → `providers/base.py` → `providers/verified_local.py`
- `discovery.py` → `filtering.py` → `competitors.py` → `scoring.py`
- `ai_analyzer.py` → `storage.py` → `cli.py` → `main.py`

---

## 9. Change Log (High-Level)

| Date | Change | Author |
|------|--------|--------|
| Sep 2026 | V2 launched: full pipeline, Gemini AI integration, UPSERT CSV | Devang |
| Sep 2026 | GitHub repo created, all docs added | Devang |
| Sep 2026 | `.gitignore` updated to exclude `__pycache__` and `leads.csv` | Devang |

---

## 10. Open Questions

- Should `leads.csv` ever be committed to git for sharing leads between team members, or should it stay git-ignored and shared via Google Drive / Notion?
- Should `GeminiPlacesDataProvider` output be validated against a known list of real Place IDs before entering the pipeline?
- What's the right `--max-reviews` threshold for cities larger than Surat where businesses naturally have more reviews?
- Should the scoring weights differ by category? (e.g., Restaurants might weight competitive gap higher than Salons)
