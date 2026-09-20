# Design Document
## AI Lead Generator — Design Decisions, Philosophy & UX

**Version:** 2.0  
**Last Updated:** September 2026

---

## 1. Design Philosophy

### 1.1 Principles

| Principle | What It Means Here |
|-----------|--------------------|
| **Truth over volume** | 15 high-quality, verified leads beat 200 fabricated ones. Filter aggressively. |
| **Explainability over black-box** | Every lead score has a visible breakdown. No magic numbers. |
| **Offline-first resilience** | The tool works with zero API keys via curated local data. |
| **Flat files over databases** | CSV is universally readable. No setup friction. No migrations. |
| **Separation of concerns** | Each module does one thing. AI synthesizes. Python scores. Providers fetch. |

### 1.2 The "Sweet Spot" Targeting Strategy

The rating range `3.5★ – 4.3★` was deliberately designed as the **ReviewFlow opportunity window**:

```
0★ ────────── 3.5★ ────────────── 4.3★ ────── 4.5★ ─── 5.0★
              │                    │
   Too low    │   IDEAL ZONE       │   Too established
   (hopeless) │   (high urgency,   │   (less urgency,
              │   growth possible) │   less room)
```

- Below 3.5★: businesses are struggling deeply — ReviewFlow alone won't fix them
- Above 4.3★: businesses are already performing well — low urgency for them to buy
- 5–80 reviews: low volume means maximum impact from a QR review funnel

---

## 2. Data Pipeline Design

### 2.1 Why a Linear Pipeline (not parallel/async)?

**Decision:** Single-threaded, sequential processing  
**Rationale:**
- The bottleneck is Gemini AI API calls (rate-limited, sequential by design)
- Async complexity would add maintenance burden without meaningful throughput gain for typical batch sizes of 15–50 leads
- Errors in individual leads should be isolated, not cascade

### 2.2 Why Google Place ID as Primary Key?

**Decision:** `place_id` is the deduplication and UPSERT primary key  
**Rationale:**
- Google Place IDs are globally unique and stable for the lifetime of a business listing
- Business names and addresses can be formatted inconsistently across API calls
- Fallback to `normalize(name)|normalize(address)` handles cases where place_id is unavailable

### 2.3 Why Both Deduplication AND Hard Filters as Separate Stages?

**Decision:** Two separate passes — dedup first, then filter  
**Rationale:**
- Deduplication must happen before filtering so we don't skip a valid business because its duplicate appeared first and got filtered out
- Keeps logic clean — dedup is about identity, filtering is about quality

### 2.4 Why No AI for Scoring?

**Decision:** The 100-point scoring engine is pure deterministic Python  
**Rationale:**
- AI-scored leads cannot be explained, debugged, or trusted by a sales rep
- A sales rep asking "why does this lead score 87?" should get a clear breakdown
- Reproducibility: same input always produces same score
- Speed: no API call needed for scoring

### 2.5 Provider Abstraction Design

**Decision:** Abstract `BusinessDataProvider` interface with concrete implementations  
**Rationale:**
- Separates "where data comes from" from "what we do with data"
- Makes it trivial to add Google Places API v2, Yelp, JustDial, or any future provider
- Enables offline mode via `VerifiedLocalDataProvider` with no code changes to the pipeline

---

## 3. Scoring Design

### 3.1 Dimension Weights Rationale

| Dimension | Weight | Design Reasoning |
|-----------|--------|-----------------|
| Review Opportunity | 25 | Highest weight — the core problem ReviewFlow solves |
| Competitive Gap | 20 | Urgency driver — businesses feel pain when competitors outrank them |
| Business Activity | 15 | Active businesses are better sales prospects (they care about growth) |
| Reputation Signals | 15 | Sub-4.0 is a trust crisis — creates genuine sales urgency |
| ReviewFlow Fit | 15 | Category fit determines whether QR-at-checkout even makes sense |
| Contactability | 10 | Lowest weight — we can find many contacts, but contact quality matters less than fit |

**Total = 100.** Weights are configurable via `config.SCORING_WEIGHTS`.

### 3.2 Grade Threshold Design

```
A+ ≥ 90   →  Immediate outreach. Perfect fit. Multiple urgency signals.
A  ≥ 80   →  High priority. Strong fit with 1-2 minor gaps.
B  ≥ 70   →  Medium. Good fit but lower urgency or contactability.
C  ≥ 60   →  Low priority. Borderline match or weak competitive gap.
D  < 60   →  Deprioritize. Kept for reference, not for outreach.
```

### 3.3 Contact Score Design (0–100, separate from Lead Score)

Contact Score is a **separate signal** because high lead score + low contactability = wasted effort.

| Channel | Points | Reasoning |
|---------|--------|-----------|
| Phone | 30 | Primary outreach channel for SMB sales |
| Social/Place ID | 20 | Proxy for online presence (Google Maps listing) |
| Website | 20 | Signals digitally aware business |
| Email | 15 | Secondary outreach channel |
| Address | 15 | Confirms physical business existence |

---

## 4. AI Prompt Design

### 4.1 Prompt Structure

The Gemini prompt is architected in three sections:

```
1. ROLE          → "You are a senior B2B Sales Specialist for ReviewFlow..."
2. STRICT RULES  → Fact vs. Inference separation, no data invention
3. VERIFIED FACTS → Real business data passed as structured context
4. OUTPUT FORMAT → JSON schema with exact key names
```

### 4.2 Why Structured JSON Output?

**Decision:** Gemini returns raw JSON, stripped of markdown fences  
**Rationale:**
- Structured output is programmatically reliable vs. free-form text parsing
- Explicit JSON schema prevents Gemini from adding narrative wrapping
- `re.sub()` strips any accidental markdown code fences before `json.loads()`

### 4.3 Why Multiple Model Fallbacks?

```python
GEMINI_CANDIDATE_MODELS = [
    "gemini-3.6-flash",
    "gemini-2.5-flash",
    "gemini-3.5-flash",
    "gemini-flash-latest"
]
```

**Rationale:**
- Gemini model names change as new versions ship
- Trying newer models first means automatic upgrade to better quality
- Fallback chain prevents pipeline failure when a specific model is unavailable
- 2 retries per model with 1s delay handles transient API errors

### 4.4 Why Deterministic Fallback Analysis?

**Decision:** `generate_fallback_analysis()` provides a rule-based pitch when Gemini is offline  
**Rationale:**
- Sales reps need output even when API is unavailable
- Deterministic fallback is still grounded in real data (rating, review count, competitor gap)
- Clearly labeled as `"Rule-Based Deterministic Analysis Engine"` so reps know it's not AI-synthesized

---

## 5. Storage Design

### 5.1 Why CSV as Primary Database?

**Decision:** CSV is the primary and default output format  
**Rationale:**
- Any team member can open it in Excel, Google Sheets, or Notion
- Zero infrastructure — no database server, no schema migrations
- Sales reps don't use SQL; they use spreadsheets
- CSV → Excel export is a one-function conversion via `openpyxl`

### 5.2 UPSERT Semantics Design

```
Run 1: Discover "Sharma Salon" → Insert → First Seen = 2026-09-01T10:00Z
Run 2: Discover "Sharma Salon" → Update → First Seen preserved = 2026-09-01T10:00Z
                                           Last Checked = 2026-09-20T08:00Z
```

**Design decision:** `First Seen` is immutable after first insert. It acts as a historical anchor showing when a lead was first discovered — critical for tracking pipeline freshness.

### 5.3 Why Sort CSV by Lead Score Descending?

**Decision:** Every write sorts rows by `Lead Score` descending  
**Rationale:**
- When a sales rep opens the CSV in Excel, best leads are at the top with zero effort
- Consistent sort order makes diffs and visual reviews easier

---

## 6. CLI Output Design

### 6.1 Two-Section Output Structure

The CLI prints two sections after every run:

**Section 1 — Rankings Table (all leads):**
```
| Rank | Business Name | Category | Rating | Reviews | Lead Score | Grade | Contact Score | Confidence |
```
Quick scannable view for the full ranked list.

**Section 2 — Detailed Intelligence (top 10):**
```
### 1. Sharma Salon (Salon — Adajan)
- Place ID: `abc123` | Data Source: Gemini AI Dynamic Discovery
- Metrics: 3.8★ rating | 22 reviews | Contact: +91-98765-43210
- Lead Grade: A+ (Score: 91.5/100) | Contactability: 80/100
- Competitive Gap: 0.9★ rating gap & 478 review gap vs top competitor
- Primary Pain Point: ...
- Personalized Opening: "Hi, I noticed..."
```

Actionable, copy-paste-ready per-lead sales intelligence.

### 6.2 Why Markdown Table Format for CLI Output?

**Decision:** Stdout output uses Markdown table syntax  
**Rationale:**
- Can be copy-pasted directly into Notion, GitHub Issues, or Slack
- Renders beautifully in any Markdown viewer
- No color/ANSI dependencies — works in all terminals and CI environments

---

## 7. Configuration Design

### 7.1 Why Config as a Module, Not a YAML/TOML File?

**Decision:** `config.py` is a Python module, not a config file  
**Rationale:**
- No additional parser dependency
- Type safety — Python types, not string parsing
- All configs are importable constants with IDE autocompletion
- Simpler for solo/small team use — no "where's the config file" confusion

### 7.2 Auto `.env` Loading

**Decision:** `_load_env_file()` in `config.py` reads `.env` without `python-dotenv`  
**Rationale:**
- Avoids a runtime dependency
- Simple enough to implement in 15 lines of stdlib code
- Only sets env vars that aren't already set — respects shell-level env overrides

---

## 8. Error Handling Design

### 8.1 Failure Modes & Responses

| Failure | Response |
|---------|----------|
| Gemini Places returns 0 results | Auto-fallback to `VerifiedLocalDataProvider` |
| All Gemini AI models fail | Use `generate_fallback_analysis()` (rule-based) |
| No candidates pass hard filters | Log warning, return empty list gracefully |
| CSV file write error | Log error, do not crash pipeline |
| Excel export fails (openpyxl missing) | Log info, return CSV path instead |

### 8.2 Design Decision: Never Crash the Pipeline for One Lead

Individual lead analysis errors (AI API call, competitor lookup) are caught per-lead. One bad business record does not abort the entire run. The pipeline always produces output for successfully processed leads.

---

## 9. Future Design Considerations (V3+)

| Feature | Design Notes |
|---------|--------------|
| **Google Places API v2** | New provider implementing `BusinessDataProvider`, selected by `GOOGLE_PLACES_API_KEY` env var |
| **Web dashboard** | Reads from `leads.csv`/`leads.json` — no pipeline changes needed |
| **Multi-city batch** | Parallel `run_pipeline()` calls with per-area CSV files |
| **CRM export** | New `export_leads_to_hubspot()` in `storage.py` |
| **Scheduled runs** | Cron job calling `python3 main.py` — no architectural change needed |
| **Review monitoring** | New pipeline stage after storage — tracks rating changes over time |
