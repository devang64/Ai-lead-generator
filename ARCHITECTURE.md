# Architecture Document
## AI Lead Generator — System Design & Module Reference

**Version:** 2.0  
**Last Updated:** September 2026

---

## 1. System Overview

The AI Lead Generator is a **single-process, multi-stage CLI pipeline** written in pure Python. It has no server, no database daemon, and no external framework. All state is persisted to flat files (CSV/JSON/Excel).

```
CLI Input (--area, --categories, --limit, ...)
         │
         ▼
┌─────────────────────────────────────────────────────────────┐
│                    Pipeline Orchestrator                      │
│                       (cli.py)                               │
│                                                              │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌───────────┐   │
│  │ Discovery│→ │  Filter  │→ │Competitor│→ │  Scoring  │   │
│  │          │  │  + Dedup │  │ Analysis │  │           │   │
│  └──────────┘  └──────────┘  └──────────┘  └───────────┘   │
│                                                    │         │
│                              ┌─────────────────────┘         │
│                              ▼                               │
│                    ┌──────────────────┐                      │
│                    │  Gemini AI Sales │                      │
│                    │  Intelligence    │                      │
│                    └──────────────────┘                      │
│                              │                               │
│                              ▼                               │
│                    ┌──────────────────┐                      │
│                    │ Storage & Export │                      │
│                    │ (CSV / JSON / XL)│                      │
│                    └──────────────────┘                      │
└─────────────────────────────────────────────────────────────┘
```

---

## 2. Directory Structure

```
Ai-lead-generator/
├── main.py                         # Entry point — delegates to cli.main()
├── requirements.txt                # Python dependencies (openpyxl)
├── .env.example                    # Environment variable template
├── .env                            # (git-ignored) Actual secrets
├── leads.csv                       # (git-ignored) Persistent lead database
│
├── lead_generator/                 # Core package
│   ├── __init__.py
│   ├── config.py                   # All config, env vars, scoring weights
│   ├── models.py                   # Dataclasses: Business, Lead, LeadScore, etc.
│   ├── cli.py                      # Argument parsing + pipeline orchestration
│   ├── discovery.py                # Multi-category place discovery
│   ├── filtering.py                # Deduplication + hard validation filters
│   ├── competitors.py              # Competitor gap analysis
│   ├── scoring.py                  # 100-point lead scoring engine
│   ├── ai_analyzer.py              # Gemini AI sales intelligence synthesis
│   ├── storage.py                  # CSV/JSON/Excel UPSERT engine
│   ├── utils.py                    # Logging, text normalization helpers
│   │
│   └── providers/                  # Data provider abstraction layer
│       ├── __init__.py             # Exports all providers
│       ├── base.py                 # BusinessDataProvider ABC
│       ├── gemini_places.py        # Gemini AI dynamic place discovery
│       └── verified_local.py       # Curated local business database
│
└── tests/
    └── test_lead_generator.py      # Unit tests for all core modules
```

---

## 3. Module Reference

### 3.1 `config.py` — Configuration Hub

Single source of truth for all configurable values. Loaded at import time.

| Symbol | Type | Description |
|--------|------|-------------|
| `GEMINI_API_KEY` | `str` | Loaded from `GEMINI_API_KEY` env var |
| `GEMINI_CANDIDATE_MODELS` | `list[str]` | Ordered list of Gemini models to try |
| `DEFAULT_AREA` | `str` | `"Adajan Surat"` |
| `DEFAULT_CATEGORIES` | `list[str]` | `["Salon", "Restaurant", "Cafe"]` |
| `DEFAULT_MIN_RATING` | `float` | `3.5` |
| `DEFAULT_MAX_RATING` | `float` | `4.3` |
| `DEFAULT_MIN_REVIEWS` | `int` | `5` |
| `DEFAULT_MAX_REVIEWS` | `int` | `80` |
| `SCORING_WEIGHTS` | `dict` | 6-dimension weight map (sums to 100) |
| `IDEAL_REVIEWFLOW_CATEGORIES` | `list[str]` | High-footfall category names |
| `CONTACT_POINTS` | `dict` | Point values per contact channel |
| `CACHE_DIR` | `str` | `.cache_lead_gen` |
| `CACHE_TTL_HOURS` | `int` | `24` |

**Auto `.env` loading:** `_load_env_file()` reads `.env` at the project root without requiring `python-dotenv`.

---

### 3.2 `models.py` — Data Models

All domain objects are `@dataclass` instances. No ORM, no schema migrations.

```
Business
  ├── place_id (str)          ← Primary unique key (Google Place ID)
  ├── name, address, area, city, category
  ├── rating (float), review_count (int)
  ├── phone, email, website (Optional[str])
  ├── reviews_last_30/90/180_days (Optional[int])
  ├── review_velocity (Optional[float])
  ├── reviews_sample (List[str])
  └── data_source (str)

CompetitorMetrics
  ├── competitor_count, strong_competitors_count (int)
  ├── average_rating, average_reviews (float)
  ├── top_competitor_name, top_competitor_rating, top_competitor_reviews
  ├── rating_gap (float), review_gap (int)
  └── data_source (str)

LeadScore
  ├── review_opportunity_score   (max 25)
  ├── competitive_gap_score      (max 20)
  ├── business_activity_score    (max 15)
  ├── reputation_signals_score   (max 15)
  ├── reviewflow_fit_score       (max 15)
  ├── contactability_score       (max 10)
  ├── total_score (float, 0–100)
  └── grade (A+/A/B/C/D)

ReviewAnalysis
  ├── primary_pain_point (str)
  ├── pain_point_evidence (List[str])
  ├── positive_themes, negative_themes (List[str])
  ├── reviewflow_fit_reason (str)
  ├── recommended_sales_angle (str)
  ├── personalized_opening (str)
  ├── ai_confidence (HIGH/MEDIUM/LOW)
  └── ai_analysis_source (str)

Lead                            ← Top-level output object
  ├── business: Business
  ├── competitors: CompetitorMetrics
  ├── score: LeadScore
  ├── contact_score (float)
  ├── data_confidence (HIGH/MEDIUM/LOW)
  ├── ai_analysis: Optional[ReviewAnalysis]
  ├── first_seen, last_checked (ISO 8601 UTC)
  ├── search_area, search_query (str)
  └── to_dict() → flat 38-column dict for CSV
```

---

### 3.3 `providers/` — Data Provider Layer

**Abstract interface** (`base.py`):

```python
class BusinessDataProvider(ABC):
    def name(self) -> str: ...
    def search_places(self, area, category, limit) -> List[Business]: ...
    def get_place_details(self, place_id) -> Optional[Business]: ...
```

**Provider selection logic** (in `cli.py`):
```
GEMINI_API_KEY set?
  ├── YES → GeminiPlacesDataProvider
  │         (Returns 0 results?)
  │              └── Fallback → VerifiedLocalDataProvider
  └── NO  → VerifiedLocalDataProvider
```

| Provider | Data Source | Network Required |
|----------|-------------|-----------------|
| `GeminiPlacesDataProvider` | Gemini AI generative model (via REST API) | Yes |
| `VerifiedLocalDataProvider` | Hardcoded curated dataset in `verified_local.py` | No |

---

### 3.4 `discovery.py` — Business Discovery

Iterates over each requested category, calls `provider.search_places()`, and aggregates results.

```python
def discover_candidate_businesses(
    provider: BusinessDataProvider,
    area: str,
    categories: List[str],
    limit_per_category: int
) -> List[Business]
```

Result: flat list of `Business` objects (may contain duplicates across categories).

---

### 3.5 `filtering.py` — Deduplication & Hard Filters

**Stage 1 — Deduplication:**
- Primary key: `place_id`
- Secondary key: `normalize(name) + "|" + normalize(address)`
- Returns `(unique_list, duplicate_count)`

**Stage 2 — Hard Validation Filters:**
- `min_rating ≤ rating ≤ max_rating`
- `min_reviews ≤ review_count ≤ max_reviews`
- `name` and `address` must be non-empty
- Returns `(filtered_list, rejected_count)`

---

### 3.6 `competitors.py` — Competitor Analysis

Uses `REAL_COMPETITOR_DATABASE` (from `verified_local.py`) keyed by category (`Salon`, `Restaurant`, `Cafe`).

**Computed metrics per business:**
- `rating_gap = top_competitor.rating - business.rating`
- `review_gap = top_competitor.review_count - business.review_count`
- `average_rating`, `average_reviews` across all area competitors
- `strong_competitors_count`: competitors with ≥ 4.5★ and ≥ 200 reviews

---

### 3.7 `scoring.py` — 100-Point Scoring Engine

Pure Python. No ML. Fully deterministic and explainable.

```
Score = Σ(dimension_scores), capped at 100

1. Review Opportunity (max 25):
   rating_room = (4.5 - rating) × 10, capped at 12
   review_opp  = 13 if reviews < 30, else 9 if ≤ 80, else 5

2. Competitive Gap (max 20):
   gap_rating_pts = rating_gap × 15, capped at 12
   gap_review_pts = review_gap / 50, capped at 8

3. Business Activity (max 15):
   +5 for website, +5 for phone, +5 for positive review velocity
   (or +3 if review_count ≥ 15)

4. Reputation Signals (max 15):
   rating < 4.0  → 15 pts (critical urgency)
   4.0–4.2       → 10 pts
   > 4.2         → 5 pts

5. ReviewFlow Fit (max 15):
   Category in IDEAL_REVIEWFLOW_CATEGORIES → 15 pts, else 8 pts

6. Contactability (max 10):
   contact_score / 10 (derived from phone/website/email/address presence)
```

**Grading:** A+ ≥ 90, A ≥ 80, B ≥ 70, C ≥ 60, D < 60

---

### 3.8 `ai_analyzer.py` — Gemini AI Sales Intelligence

**Flow:**
1. Builds a structured prompt with VERIFIED business facts (no AI hallucination permitted)
2. Tries each model in `GEMINI_CANDIDATE_MODELS` in order, with 2 retries each
3. Strips markdown code fences from response, parses JSON
4. Falls back to `generate_fallback_analysis()` if all models fail

**Fact vs. Inference Rule (enforced in prompt):**
- AI may NOT invent ratings, review counts, phone numbers, or competitor data
- AI may ONLY infer qualitative insights from the factual data provided

**API call pattern:**
```
POST https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent?key={key}
Content-Type: application/json
Body: { "contents": [{ "parts": [{ "text": prompt }] }] }
```

Uses only stdlib `urllib.request` — no `requests` dependency.

---

### 3.9 `storage.py` — UPSERT Persistence Engine

**Key design:** CSV is the primary database. UPSERT ensures:
- Re-running the pipeline for the same business **updates** `Last Checked` but preserves `First Seen`
- New businesses are **inserted** with a fresh `First Seen` timestamp

**UPSERT key resolution:**
```
place_id (if non-empty and non-N/A)
  └── else: normalize(name) + "|" + normalize(address)
```

**Export functions:**
| Function | Output |
|----------|--------|
| `upsert_leads_to_csv()` | CSV sorted by Lead Score descending |
| `export_leads_to_json()` | JSON array of flat lead dicts |
| `export_leads_to_excel()` | Excel workbook via `openpyxl` (graceful skip if not installed) |

---

### 3.10 `utils.py` — Helpers

| Function | Description |
|----------|-------------|
| `setup_logger(name)` | Creates a named logger with stream handler |
| `normalize_text(text)` | Lowercases, strips punctuation/whitespace for dedup key generation |

---

## 4. Data Flow Diagram

```
                        ┌──────────┐
                        │  .env    │
                        │ (secrets)│
                        └────┬─────┘
                             │ GEMINI_API_KEY
                             ▼
┌──────────────┐     ┌───────────────────┐
│  CLI args    │────▶│   cli.run_pipeline │
│ --area       │     └───────┬───────────┘
│ --categories │             │
│ --limit etc. │             ▼
└──────────────┘     ┌───────────────────┐
                     │ select_data_       │
                     │ provider()         │
                     └───────┬───────────┘
                             │
              ┌──────────────┴──────────────┐
              │                              │
              ▼                              ▼
   ┌────────────────────┐       ┌────────────────────────┐
   │GeminiPlacesProvider│       │ VerifiedLocalProvider  │
   │(live Gemini REST)  │       │(hardcoded curated data)│
   └────────┬───────────┘       └──────────┬─────────────┘
            │                              │
            └──────────┬───────────────────┘
                       ▼
              ┌─────────────────┐
              │  List[Business] │  (raw, may have dupes)
              └────────┬────────┘
                       ▼
              ┌─────────────────┐
              │  deduplicate()  │  → removes by place_id / name+addr
              └────────┬────────┘
                       ▼
              ┌─────────────────┐
              │ apply_hard_     │  → rating, review count, name/addr check
              │ filters()       │
              └────────┬────────┘
                       ▼
              ┌─────────────────┐
              │ For each        │
              │ Business:       │
              │  analyze_       │
              │  competitors()  │
              │  compute_lead_  │
              │  score()        │
              │  analyze_lead_  │
              │  with_gemini()  │
              └────────┬────────┘
                       ▼
              ┌─────────────────┐
              │  List[Lead]     │  (sorted by score desc)
              │  (top N)        │
              └────────┬────────┘
                       ▼
              ┌─────────────────┐
              │ upsert_leads_   │
              │ to_csv()        │
              │ export_to_xlsx()│
              │ export_to_json()│
              └─────────────────┘
```

---

## 5. Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `GEMINI_API_KEY` | Optional | Enables Gemini Places dynamic discovery + AI analysis |
| `GOOGLE_PLACES_API_KEY` | Not currently used | Reserved for future Google Places API integration |

Loaded automatically from `.env` at project root via `config._load_env_file()`.

---

## 6. Dependencies

| Package | Version | Usage |
|---------|---------|-------|
| `openpyxl` | ≥ 3.1.0 | Excel export (gracefully skipped if absent) |
| Python stdlib | 3.8+ | `urllib`, `json`, `csv`, `dataclasses`, `abc`, `argparse`, `logging` |

**No external HTTP client library** (e.g., `requests`) required. All API calls use `urllib.request`.

---

## 7. Extension Points

### Adding a New Data Provider
1. Create `lead_generator/providers/my_provider.py`
2. Subclass `BusinessDataProvider` and implement `name()`, `search_places()`, `get_place_details()`
3. Export from `lead_generator/providers/__init__.py`
4. Add selection logic in `cli.select_data_provider()`

### Adding a New Business Category
1. Add category string to `IDEAL_REVIEWFLOW_CATEGORIES` in `config.py` (for fit scoring)
2. Add competitor data for the category in `verified_local.REAL_COMPETITOR_DATABASE`
3. Add category name mapping in `competitors.analyze_competitors()` if needed

### Modifying Scoring Weights
Edit `SCORING_WEIGHTS` dict in `config.py`. All weight constants are consumed directly by `scoring.py`.

### Exporting to a New Format
Implement a new `export_leads_to_*()` function in `storage.py` following the same pattern as `export_leads_to_json()`.

---

## 8. Testing Strategy

All tests live in `tests/test_lead_generator.py`. Run with:

```bash
python3 -m unittest discover -s tests -p "test_*.py"
```

| Test Area | What's Tested |
|-----------|--------------|
| Scoring math | Exact score values for known inputs |
| Filtering | Rating/review boundary enforcement, name/address check |
| Deduplication | Place ID dedup, normalized name+addr dedup |
| Storage UPSERT | `First Seen` preservation, insert vs. update counts |
| Grade assignment | A+/A/B/C/D boundary correctness |
