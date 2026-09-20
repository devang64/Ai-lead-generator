# Engineering Rules & Coding Standards
## AI Lead Generator

**Version:** 2.0  
**Last Updated:** September 2026  
**Scope:** All contributors to this repository

---

## 1. Core Principle: Zero Data Fabrication

> **This is the most important rule in this project. No exceptions.**

The purpose of this tool is to generate sales leads grounded in **real, verifiable business data**. Fabricated data destroys trust, wastes sales resources, and could lead to incorrect business decisions.

**Rules:**
- ❌ AI (Gemini) MUST NOT invent business names, ratings, review counts, phone numbers, addresses, or competitor names
- ❌ No placeholder, hardcoded, or mock data may be shipped as if it were real business data
- ✅ AI may ONLY make qualitative inferences (pain points, sales angles) from VERIFIED facts passed to it
- ✅ Every AI prompt MUST include the "STRICT MANDATORY RULES" section enforcing Fact vs. Inference separation
- ✅ All `data_source` fields on `Business` and `CompetitorMetrics` must accurately reflect the real origin of that data

---

## 2. Environment & Secrets

- ❌ Never hardcode API keys, secrets, or credentials in source code
- ❌ Never commit `.env` to git — it is in `.gitignore`
- ✅ All secrets must be loaded via environment variables (`os.getenv()`)
- ✅ `.env.example` must be kept up to date with every new variable added
- ✅ Use `config.py` as the single source for all env var reads — other modules import from `config`

```python
# ✅ Correct
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY", "")

# ❌ Wrong
api_key = "AIza..."
```

---

## 3. Python Standards

### 3.1 Version & Stdlib Preference

- **Target:** Python 3.8+
- **Prefer stdlib over third-party packages.** This tool was intentionally built with zero heavy dependencies.
- HTTP calls use `urllib.request` — do NOT add `requests` as a dependency without a compelling reason
- If you need a new package, add it to `requirements.txt` with a minimum version pin (`>=x.y.z`)

### 3.2 Code Style

- Follow **PEP 8** for all Python code
- Maximum line length: **120 characters**
- Use **type hints** on all function signatures
- Use **f-strings** for string formatting (not `.format()` or `%`)
- Use `Optional[T]` not `T | None` (for Python 3.8 compat)

### 3.3 Dataclasses First

- All domain objects MUST be `@dataclass` — no plain dicts, no namedtuples for core models
- Do not mutate dataclass instances after creation except within their own methods
- All new domain models go in `models.py`

### 3.4 No Global Mutable State

- Module-level variables must be constants (`UPPER_SNAKE_CASE`) or loaded once at import time from env
- Do not use mutable module-level lists or dicts that are modified at runtime

### 3.5 Error Handling

- Use `try/except` around all external calls (API, file I/O, network)
- Log errors with `logger.error()` or `logger.warning()` — do NOT silently swallow exceptions
- Always provide a sensible fallback (e.g., `generate_fallback_analysis()` when Gemini fails)
- Never let a single failed lead analysis crash the entire pipeline — wrap per-lead processing in try/except

```python
# ✅ Correct
try:
    result = call_external_api()
except Exception as e:
    logger.warning(f"API call failed: {e}")
    result = fallback_value

# ❌ Wrong
result = call_external_api()  # unguarded
```

---

## 4. Module Responsibilities (Don't Cross the Lines)

| Module | Owns | Must NOT |
|--------|------|----------|
| `config.py` | All constants, env vars, scoring weights | Import from other lead_generator modules |
| `models.py` | Dataclass definitions, `to_dict()` | Contain business logic or API calls |
| `providers/` | Place data fetching | Perform scoring, filtering, or AI calls |
| `discovery.py` | Multi-category iteration over a provider | Know about filtering, scoring, or storage |
| `filtering.py` | Deduplication and hard validation | Call providers or AI |
| `competitors.py` | Competitor gap math | Call Gemini or external APIs |
| `scoring.py` | 100-point score calculation | Call Gemini, providers, or storage |
| `ai_analyzer.py` | Gemini API calls and prompt engineering | Score leads or write to storage |
| `storage.py` | CSV/JSON/Excel I/O and UPSERT logic | Score, filter, or call AI |
| `cli.py` | Pipeline orchestration, CLI parsing | Contain business logic (delegate to other modules) |

**The dependency graph must remain a DAG (no circular imports).**

---

## 5. Provider Interface Contract

All data providers MUST implement `BusinessDataProvider` (in `providers/base.py`):

```python
class BusinessDataProvider(ABC):
    def name(self) -> str: ...
    def search_places(self, area: str, category: str, limit: int) -> List[Business]: ...
    def get_place_details(self, place_id: str) -> Optional[Business]: ...
```

**Provider rules:**
- `search_places()` MUST return `List[Business]` with real, non-fabricated data
- `Business.place_id` MUST be a stable, globally unique identifier (Google Place ID preferred)
- `Business.data_source` MUST clearly identify the origin of the data
- Providers MUST handle their own exceptions and return an empty list on failure (not raise)

---

## 6. Scoring Rules

- The scoring engine (`scoring.py`) MUST remain **pure Python with no ML or AI dependencies**
- Score results MUST be **fully deterministic** for the same inputs
- Score weights MUST sum to exactly 100 — verify this when modifying `SCORING_WEIGHTS`
- All individual dimension scores are **capped at their respective `SCORING_WEIGHTS` max**
- Total score is **capped at 100.0**
- Never bypass the `min()` caps — they prevent inflated scores

```python
# ✅ Correct — always cap
opp_score = min(SCORING_WEIGHTS["review_opportunity"], rating_opp + review_opp)

# ❌ Wrong — uncapped
opp_score = rating_opp + review_opp
```

---

## 7. Storage & Data Integrity

- The CSV is the **primary database** — treat it with database-level care
- **Always UPSERT** — never blindly overwrite or truncate the CSV without reading existing records first
- `First Seen` timestamp MUST be preserved across updates — it's the historical anchor
- `Last Checked` MUST be updated on every pipeline run for existing records
- The UPSERT key priority: `place_id` > `normalize(name) + "|" + normalize(address)`
- Rows in CSV MUST be sorted by `Lead Score` descending after every write

---

## 8. Logging Standards

- Use `setup_logger("lead_generator")` from `utils.py` — do NOT create ad-hoc loggers
- Child module loggers: `logging.getLogger("lead_generator.module_name")`
- Use the correct log level:
  - `logger.info()` — Normal pipeline progress
  - `logger.warning()` — Recoverable issues (API failures, fallbacks triggered)
  - `logger.error()` — Data loss risks, file I/O failures
  - `logger.debug()` — Verbose diagnostic details (gated by `--verbose` flag)
- Never use `print()` inside library modules — only in `cli.print_cli_summary()`

---

## 9. Testing Requirements

- Every new module or function added to `lead_generator/` MUST have corresponding unit tests in `tests/`
- Tests MUST NOT make real network calls — mock or stub all external dependencies
- Tests MUST NOT require `GEMINI_API_KEY` to be set to pass
- Use `unittest` (stdlib) — do NOT add `pytest` unless explicitly decided
- Run tests before every commit:

```bash
python3 -m unittest discover -s tests -p "test_*.py"
```

- All tests must pass with exit code 0 before merging to main

---

## 10. Git Workflow

### Branch Naming
```
feature/short-description       # New features
fix/short-description           # Bug fixes
chore/short-description         # Non-functional changes (docs, deps, config)
```

### Commit Message Format
```
<type>: <short description>

type = feat | fix | chore | docs | refactor | test
```

Examples:
```
feat: add OpenStreetMap data provider
fix: preserve First Seen on UPSERT when place_id is empty
chore: add Python pycache to .gitignore
docs: add ARCHITECTURE.md
```

### What MUST be in `.gitignore`
- `.env` — secrets
- `leads.csv` — generated output data
- `__pycache__/` — Python bytecode
- `*.pyc`, `*.pyo` — compiled Python files
- `.cache_lead_gen/` — local API response cache

---

## 11. Adding a New Feature — Checklist

Before submitting any change:

- [ ] Does it add or modify a data provider? → Verify `BusinessDataProvider` interface is fully implemented
- [ ] Does it touch scoring? → Verify weights still sum to 100, scores are capped, tests updated
- [ ] Does it touch AI prompts? → Verify Fact vs. Inference separation rule is preserved
- [ ] Does it touch storage? → Verify UPSERT semantics, `First Seen` preservation
- [ ] Any new env variables? → Added to `.env.example` and `config.py`
- [ ] Any new dependencies? → Added to `requirements.txt` with version pin
- [ ] Unit tests written and passing?
- [ ] No hardcoded secrets or real business data?
- [ ] No circular imports?

---

## 12. What This Project Is NOT

- ❌ Not a web scraper — do not add scraping logic
- ❌ Not a spam tool — personalized openings are for human-reviewed outreach only
- ❌ Not a CRM — lead storage is file-based CSV, not a relational database
- ❌ Not a real-time system — designed for batch runs, not continuous monitoring
