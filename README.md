# Lead Generator V2 — Quality-First Sales Intelligence System

A production-grade Python CLI tool and sales intelligence engine for **Ratingbuddy** (Google Review Management SaaS).

Discovers real local businesses, performs programmatic competitor gap analysis, calculates a transparent 100-point lead score, and uses Gemini AI to synthesize sales angles and personalized outreach pitches with strict **Fact vs. Inference** separation.

---

## Features

- **Zero AI Data Fabrication:** Business data (names, ratings, review counts, addresses, phone numbers, geocodes, Place IDs) are sourced strictly from real place providers (`GooglePlacesDataProvider` or `VerifiedLocalDataProvider`).
- **Multi-Stage Pipeline:**
  1. Discovery
  2. Deduplication (Google Place ID primary key)
  3. Hard Python Validation Filtering
  4. Competitor Discovery & Gap Math
  5. 100-Point Transparent Scoring & Grading (A+, A, B, C, D)
  6. Gemini AI Sales Intelligence Synthesis
  7. Historical Upsert CSV/JSON Storage
- **Security & Hygiene:** No hardcoded API keys. Environment variable driven (`GEMINI_API_KEY`, `GOOGLE_PLACES_API_KEY`).
- **Preserves History:** CSV storage uses UPSERT mode to preserve original `First Seen` timestamps.
- **Automated Tests:** Includes full unit test suite covering scoring math, filtering, deduplication, and storage upserting.

---

## Project Structure

```
Ai-lead-generator/
├── main.py                            # Primary CLI entrypoint
├── .env.example                       # Environment variables template
├── leads.csv                          # Upserted CSV database (30-field schema)
├── lead_generator/                    # Core Modular Package
│   ├── __init__.py
│   ├── config.py                      # Configuration & scoring weights
│   ├── models.py                      # Structured dataclasses
│   ├── providers/                     # Real place data providers
│   │   ├── base.py
│   │   ├── google_places.py
│   │   └── verified_local.py
│   ├── discovery.py                   # Multi-category place discovery
│   ├── filtering.py                   # Hard validation & Place ID dedup
│   ├── competitors.py                 # Competitor gap calculations
│   ├── scoring.py                     # 100-pt lead scoring & grading
│   ├── ai_analyzer.py                 # Gemini AI sales intelligence
│   ├── storage.py                     # CSV/JSON upsert engine
│   └── utils.py                       # Normalization & logging helpers
├── scripts/
│   └── lead-generator.py              # CLI helper script
└── tests/
    └── test_lead_generator.py         # Automated unit test suite
```

---

## Setup & Usage

### 1. Setup Environment
Copy `.env.example` to `.env` and set your `GEMINI_API_KEY`:

```bash
cp .env.example .env
export GEMINI_API_KEY="your-gemini-api-key"
```

### 2. Run the Tool
```bash
# Run via main.py
python3 main.py --area "Adajan Surat" --categories Salon Restaurant Cafe --limit 20

# Run via scripts/lead-generator.py
python3 scripts/lead-generator.py --area "Pal Surat" --categories Salon Spa --min-rating 3.5 --max-rating 4.2
```

### 3. Run Unit Tests
```bash
python3 -m unittest discover -s tests -p "test_*.py"
```

---

## CSV Schema (30 Columns)

`Business Name`, `Place ID`, `Category`, `Address`, `Area`, `City`, `Rating`, `Review Count`, `Reviews Last 30 Days`, `Reviews Last 90 Days`, `Reviews Last 180 Days`, `Review Velocity`, `Competitor Count`, `Strong Competitors Count`, `Competitor Average Rating`, `Competitor Average Reviews`, `Top Competitor`, `Top Competitor Rating`, `Top Competitor Reviews`, `Rating Gap`, `Review Gap`, `Phone`, `Email`, `Website`, `Lead Score`, `Lead Grade`, `Contact Score`, `Data Confidence`, `Primary Pain Point`, `Pain Point Evidence`, `Ratingbuddy Fit Reason`, `Recommended Sales Angle`, `Personalized Opening`, `First Seen`, `Last Checked`, `Source`, `Search Area`, `Search Query`.
