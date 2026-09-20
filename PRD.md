# Product Requirements Document (PRD)
## AI Lead Generator — Quality-First Sales Intelligence System

**Version:** 2.0  
**Product:** AI Lead Generator for ReviewFlow  
**Owner:** Devang  
**Last Updated:** September 2026  

---

## 1. Overview

### 1.1 Problem Statement

ReviewFlow is a QR-based Google Review Management SaaS targeting local businesses. The core sales challenge is identifying the **right** businesses to pitch — those that have:

- A real gap between their current Google rating/reviews and the market leader
- High enough customer footfall to benefit from review automation
- Low enough existing reviews to represent a growth opportunity (not already saturated)
- Real, reachable contact details

Manual prospecting is slow, biased, and inconsistent. Buying lead lists is expensive and unreliable. Scraping tools often return fabricated or stale data.

### 1.2 Solution

A **production-grade Python CLI tool** that:
1. Discovers **real local businesses** from verified data providers
2. Runs them through a **multi-stage pipeline** — filtering, deduplication, competitor analysis, and transparent 100-point scoring
3. Uses **Gemini AI** to generate contextual sales intelligence (pain points, outreach pitches) with strict **Fact vs. Inference** separation
4. Stores enriched leads in a persistent **CSV/JSON/Excel database** with UPSERT semantics

### 1.3 Primary Users

| User | Role | Goal |
|------|------|------|
| Sales Rep | Consumer of output | Get prioritized lead list with personalized pitches |
| Founder / BD | CLI operator | Run pipeline on a new city/area each day |
| Developer | Contributor | Extend providers, categories, or scoring logic |

---

## 2. Product Goals

| # | Goal | Metric |
|---|------|--------|
| G1 | Zero fabricated business data | 100% of business facts sourced from real providers |
| G2 | Actionable lead scoring | Transparent 100-pt score with 5-dimension breakdown |
| G3 | Personalized outreach | AI-generated pitch per business, grounded in real data |
| G4 | Fresh, non-repetitive leads | UPSERT storage preserves history; new runs add genuinely new businesses |
| G5 | Operator efficiency | Single CLI command produces a fully ranked, actionable lead sheet |

---

## 3. Target Market & Ideal Lead Profile

### 3.1 Geographic Focus
- **Primary:** Tier-2 / Tier-3 Indian cities (Surat, Ahmedabad, Vadodara, Pune, etc.)
- **Area granularity:** Locality level (e.g., "Adajan Surat", "Pal Surat")

### 3.2 Ideal Lead Business Profile

| Attribute | Ideal Range | Rationale |
|-----------|-------------|-----------|
| Google Rating | 3.5★ – 4.3★ | Low enough to have growth room, not so bad they are hopeless |
| Review Count | 5 – 80 | Low volume = high opportunity for ReviewFlow's QR funnel |
| Category | Salon, Restaurant, Cafe, Spa, Gym, Dental | High footfall = daily customers who can leave reviews |
| Has Phone | Yes | Required for sales outreach |
| Competitor Gap | > 0.3★ or > 50 reviews | Proof that market leaders are outperforming them |

### 3.3 Lead Grading

| Grade | Score Range | Priority |
|-------|-------------|----------|
| A+    | 90–100      | Highest — immediate outreach |
| A     | 80–89       | High priority |
| B     | 70–79       | Medium priority |
| C     | 60–69       | Low priority |
| D     | < 60        | Deprioritize |

---

## 4. Features

### 4.1 Core Pipeline (In Order)

| Stage | Module | Description |
|-------|--------|-------------|
| 1. Discovery | `discovery.py` | Fetch businesses by area + category from data provider |
| 2. Deduplication | `filtering.py` | Remove duplicates using Google Place ID as primary key |
| 3. Hard Filtering | `filtering.py` | Apply configurable rating/review min-max boundaries |
| 4. Competitor Analysis | `competitors.py` | Compute rating gap and review gap vs. area competitors |
| 5. Lead Scoring | `scoring.py` | 100-point explainable score across 6 dimensions |
| 6. AI Sales Intelligence | `ai_analyzer.py` | Gemini-generated pain points, pitches, and personalized opening |
| 7. Storage & Export | `storage.py` | UPSERT to CSV, export to Excel and JSON |

### 4.2 Data Providers

| Provider | When Used | Description |
|----------|-----------|-------------|
| `GeminiPlacesDataProvider` | `GEMINI_API_KEY` is set | AI-powered dynamic place discovery from live Google data |
| `VerifiedLocalDataProvider` | Fallback / no API key | Curated local business dataset for Surat localities |

Both providers implement the `BusinessDataProvider` abstract interface.

### 4.3 Scoring Dimensions

| Dimension | Max Points | Key Signals |
|-----------|-----------|-------------|
| Review Opportunity | 25 | Rating room below 4.5★; low review count |
| Competitive Gap | 20 | Rating & review gap vs. top competitor |
| Business Activity | 15 | Has website, phone, positive review velocity |
| Reputation Signals | 15 | Sub-4.0 rating = critical trust issue |
| ReviewFlow Fit | 15 | High-footfall category match |
| Contactability | 10 | Phone, website, email, address availability |

### 4.4 AI Sales Intelligence Output (per lead)

- `primary_pain_point` — Core reputation challenge
- `pain_point_evidence` — Specific facts (ratings, review counts) supporting the pain point
- `positive_themes` — What the business does well
- `negative_themes` — Review complaints or risks
- `reviewflow_fit_reason` — Why ReviewFlow's QR funnel fits this business
- `recommended_sales_angle` — Strategic pitch direction
- `personalized_opening` — Ready-to-send cold outreach message opening

### 4.5 Output Formats

| Format | Flag | Notes |
|--------|------|-------|
| CSV (primary) | `--csv leads.csv` | 38-column schema, UPSERT mode, default output |
| Excel (.xlsx) | `--excel leads.xlsx` | Human-readable spreadsheet via openpyxl |
| JSON | `--json leads.json` | Structured for downstream integrations |
| CLI Markdown table | Auto | Printed to stdout after every run |

---

## 5. CLI Interface

```bash
python3 main.py \
  --area "Adajan Surat" \
  --categories Salon Restaurant Cafe \
  --limit 50 \
  --final-limit 15 \
  --min-rating 3.5 \
  --max-rating 4.3 \
  --min-reviews 5 \
  --max-reviews 80 \
  --csv leads.csv \
  --excel leads.xlsx \
  --json leads.json \
  --verbose
```

### CLI Arguments

| Argument | Default | Description |
|----------|---------|-------------|
| `--area` | `"Adajan Surat"` | Target locality for discovery |
| `--categories` | `Salon Restaurant Cafe` | Business categories to search |
| `--limit` | `50` | Candidates fetched per category |
| `--final-limit` | `15` | Top N leads to output and save |
| `--min-rating` | `3.5` | Hard lower bound for rating filter |
| `--max-rating` | `4.3` | Hard upper bound for rating filter |
| `--min-reviews` | `5` | Hard lower bound for review count |
| `--max-reviews` | `80` | Hard upper bound for review count |
| `--csv` | `leads.csv` | Output CSV path |
| `--excel` | `None` | Optional Excel export path |
| `--json` | `None` | Optional JSON export path |
| `--verbose` | `False` | Enable DEBUG-level logging |

---

## 6. Data Schema (CSV — 38 Columns)

| Column | Type | Source |
|--------|------|--------|
| Business Name | string | Provider |
| Place ID | string | Provider (primary key) |
| Category | string | CLI input |
| Address | string | Provider |
| Area | string | CLI input |
| City | string | Provider |
| Rating | float | Provider |
| Review Count | int | Provider |
| Reviews Last 30/90/180 Days | int or N/A | Provider |
| Review Velocity | float or N/A | Provider |
| Competitor Count | int | `competitors.py` |
| Strong Competitors Count | int | `competitors.py` |
| Competitor Average Rating | float | `competitors.py` |
| Competitor Average Reviews | float | `competitors.py` |
| Top Competitor | string | `competitors.py` |
| Top Competitor Rating | float | `competitors.py` |
| Top Competitor Reviews | int | `competitors.py` |
| Rating Gap | float | `competitors.py` |
| Review Gap | int | `competitors.py` |
| Phone | string or N/A | Provider |
| Email | string or N/A | Provider |
| Website | string or N/A | Provider |
| Lead Score | float | `scoring.py` |
| Lead Grade | A+/A/B/C/D | `scoring.py` |
| Contact Score | float | `scoring.py` |
| Data Confidence | HIGH/MEDIUM/LOW | `scoring.py` |
| Primary Pain Point | string | Gemini AI |
| Pain Point Evidence | string | Gemini AI |
| ReviewFlow Fit Reason | string | Gemini AI |
| Recommended Sales Angle | string | Gemini AI |
| Personalized Opening | string | Gemini AI |
| First Seen | ISO 8601 UTC | `storage.py` |
| Last Checked | ISO 8601 UTC | `storage.py` |
| Source | string | Provider |
| Search Area | string | CLI input |
| Search Query | string | CLI input |

---

## 7. Non-Functional Requirements

| Requirement | Specification |
|-------------|---------------|
| No hardcoded secrets | All API keys via environment variables only |
| Data integrity | AI cannot invent factual business data; strict Fact vs. Inference |
| Graceful degradation | Falls back to `VerifiedLocalDataProvider` if Gemini Places fails |
| Idempotent storage | Re-running the same area preserves `First Seen` timestamps |
| Offline capable | Runs fully without any API key using local verified data |
| Test coverage | Unit tests for scoring math, filtering, dedup, and storage upsert |

---

## 8. Out of Scope (V2)

- Web UI or dashboard
- Real-time lead monitoring / webhooks
- CRM integrations (HubSpot, Salesforce)
- Automated email sending
- Multi-city concurrent job scheduling
- Review monitoring of existing customers
