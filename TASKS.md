# Task Tracker
## AI Lead Generator — Backlog, In Progress & Done

**Last Updated:** September 2026  
**Format:** `[x]` done · `[/]` in progress · `[ ]` planned · `[-]` cancelled/deferred

---

## 🚀 V2 — Shipped (Done)

### Core Pipeline
- [x] Abstract `BusinessDataProvider` interface (`providers/base.py`)
- [x] `GeminiPlacesDataProvider` — AI-powered dynamic place discovery
- [x] `VerifiedLocalDataProvider` — Curated offline fallback dataset
- [x] Multi-category business discovery (`discovery.py`)
- [x] Place ID-based deduplication with normalized name/address fallback
- [x] Configurable hard filters — rating range, review count range, name/address completeness
- [x] Real competitor database per category (Salon, Restaurant, Cafe)
- [x] Programmatic competitor gap math — rating gap, review gap, average metrics
- [x] 100-point explainable lead scoring engine — 6 dimensions
- [x] Lead grading — A+, A, B, C, D
- [x] Contactability scoring (0–100) — phone, website, email, address, Place ID
- [x] Data Confidence levels — HIGH, MEDIUM, LOW
- [x] Gemini AI sales intelligence — pain points, sales angles, personalized openings
- [x] Fact vs. Inference strict separation enforced in AI prompt
- [x] Multi-model Gemini fallback chain (try newer → older models)
- [x] Deterministic fallback analysis when Gemini is offline
- [x] UPSERT CSV engine preserving `First Seen` timestamps
- [x] JSON export
- [x] Excel (.xlsx) export via `openpyxl`
- [x] CLI with `argparse` — all parameters configurable
- [x] `--verbose` DEBUG logging flag
- [x] Auto `.env` file loading without `python-dotenv`
- [x] Markdown table CLI output — rankings + detailed intelligence

### Infrastructure
- [x] `models.py` — typed dataclasses for all domain objects
- [x] `config.py` — single source of truth for all constants and weights
- [x] `utils.py` — logger setup, text normalization
- [x] Unit tests — scoring math, filtering, dedup, storage UPSERT
- [x] `.gitignore` — excludes `.env`, `leads.csv`, `__pycache__`
- [x] `README.md` — setup, usage, CSV schema
- [x] `.env.example` — environment variable template
- [x] GitHub repo (`devang64/Ai-lead-generator`) — public, pushed

### Documentation
- [x] `PRD.md` — Product Requirements Document
- [x] `ARCHITECTURE.md` — System design and module reference
- [x] `RULES.md` — Engineering standards and coding rules
- [x] `DESIGN.md` — Design decisions and philosophy
- [x] `TASKS.md` — This file
- [x] `MEMORY.md` — Project context and institutional knowledge

---

## 🔨 In Progress

> Nothing currently in active development.

---

## 📋 Backlog — V3 Planned Features

### High Priority

- [ ] **Google Places API v2 Provider**
  - New `GooglePlacesAPIProvider` implementing `BusinessDataProvider`
  - Uses `GOOGLE_PLACES_API_KEY` env var
  - Real-time place search with rich detail (photos, hours, reviews)
  - `search_places()` → Nearby Search API
  - `get_place_details()` → Place Details API (phone, website, reviews)

- [ ] **Review velocity calculation**
  - Fetch review timestamps from provider where available
  - Calculate reviews per week over 30/90/180 day windows
  - Use in scoring (`business_activity` dimension)
  - Currently: review velocity is optional/None for most businesses

- [ ] **Email discovery**
  - For businesses with a website, attempt to find contact email via website scrape or provider
  - Boost contactability score when email found
  - Add to CSV `Email` column

- [ ] **Multi-area batch run**
  - `--areas "Adajan Surat" "Pal Surat" "VIP Road Surat"` (multiple areas per run)
  - Merge results into one ranked list
  - Deduplicate across areas

### Medium Priority

- [ ] **Spa, Gym, Dental categories**
  - Add competitor database entries for Spa, Gym, Dental Clinic in `verified_local.py`
  - Add to `IDEAL_Ratingbuddy_CATEGORIES` in `config.py`
  - Test filtering and scoring for these categories

- [ ] **Lead status tracking column**
  - Add `Outreach Status` column to CSV (Not Contacted / Contacted / Responded / Closed)
  - Updatable manually by sales rep via simple script
  - Not overwritten on pipeline re-runs

- [ ] **Competitor count from live data**
  - Current competitor data is from a static local database
  - When Google Places API is available, dynamically query nearby businesses in same category
  - Compute competitor metrics from live results

- [ ] **Scoring weight A/B config**
  - Support loading `SCORING_WEIGHTS` from a separate `scoring_config.json`
  - Allow experimenting with weights without code changes
  - Log which weight config was used in the run

- [ ] **Pytest migration**
  - Migrate `tests/` from `unittest` to `pytest`
  - Add `pytest.ini` and `conftest.py`
  - Add fixtures for `Business` and `CompetitorMetrics` test objects
  - Target: 80%+ code coverage

- [ ] **CSV schema versioning**
  - Add `Schema Version` column to CSV header
  - Migration script for adding new columns to existing CSV without data loss

### Low Priority / V4

- [ ] **Web dashboard (read-only)**
  - Simple HTML/JS table reading from `leads.json`
  - Filter by grade, category, area
  - No backend required — pure static site

- [ ] **Slack / WhatsApp bot**
  - Daily summary of new A+ leads posted to a channel
  - Uses existing pipeline + a simple webhook POST

- [ ] **Scheduled cron runner**
  - Shell script wrapping `python3 main.py` for multiple areas
  - Cron expression for daily runs at 7am
  - Output timestamped CSV per run

- [ ] **HubSpot CRM export**
  - `export_leads_to_hubspot()` function in `storage.py`
  - Uses HubSpot Contacts API
  - Maps CSV fields to HubSpot contact properties

- [ ] **WhatsApp outreach template generator**
  - Takes `Personalized Opening` and formats it as WhatsApp Business template
  - Outputs ready-to-send messages per lead

- [ ] **Review monitoring mode**
  - `--mode monitor` flag for tracking rating changes in existing leads
  - Re-fetch ratings for leads already in `leads.csv`
  - Alert if rating drops below threshold or jumps above 4.5★

---

## 🐛 Known Issues & Bugs

| # | Issue | Severity | Status |
|---|-------|----------|--------|
| B1 | `competitors.py` only categorizes Salon, Restaurant, Cafe — all others fall back to generic competitor data | Medium | Open |
| B2 | `review_velocity` is always `None` for `VerifiedLocalDataProvider` — scoring `business_activity` misses this signal | Medium | Open |
| B3 | `GeminiPlacesDataProvider` depends on Gemini to generate business data — may produce inconsistent Place IDs for the same business across runs | High | Open |
| B4 | CSV write is non-atomic — if the process crashes mid-write, partial file can corrupt the database | Medium | Open |
| B5 | `openpyxl` is the only entry in `requirements.txt` — Gemini API stdlib calls work fine, but no version pinning for Python itself | Low | Open |

---

## 💡 Ideas / Exploration

- [ ] Use Gemini's structured output mode (JSON schema enforcement) instead of regex-cleaning raw text
- [ ] Add `--dry-run` flag that runs the full pipeline but skips CSV write
- [ ] Add `--no-ai` flag to skip Gemini API calls entirely (pure Python scoring only, faster)
- [ ] Generate a per-run PDF report of top 10 leads with full intelligence
- [ ] Explore JustDial / IndiaMART as an alternative local data provider for Indian SMBs
- [ ] Add confidence interval to lead score (how reliable is the score given data completeness)
