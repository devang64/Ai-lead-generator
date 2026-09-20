"""
Configuration, environment variables, default settings, and scoring weights for Lead Generator V2.
"""

import os
from typing import Dict

# Helper to automatically load .env if present
def _load_env_file():
    env_path = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), ".env")
    if os.path.exists(env_path):
        try:
            with open(env_path, "r", encoding="utf-8") as f:
                for line in f:
                    line = line.strip()
                    if line and not line.startswith("#") and "=" in line:
                        k, v = line.split("=", 1)
                        k = k.strip()
                        v = v.strip().strip("'").strip('"')
                        if k and not os.getenv(k):
                            os.environ[k] = v
        except Exception:
            pass

_load_env_file()

# Environment Variables
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY", "")

# Google Sheets Integration
GOOGLE_SHEETS_SPREADSHEET_ID = os.getenv("GOOGLE_SHEETS_SPREADSHEET_ID", "")
GOOGLE_SERVICE_ACCOUNT_JSON = os.getenv("GOOGLE_SERVICE_ACCOUNT_JSON", "service_account.json")

# Run file output directory (timestamped per-run CSVs)
RUNS_DIR = os.getenv("RUNS_DIR", "runs")

# Gemini Model Settings
GEMINI_CANDIDATE_MODELS = [
    "gemini-3.6-flash",
    "gemini-2.5-flash",
    "gemini-3.5-flash",
    "gemini-flash-latest"
]

# Defaults for Discovery & Filtering
DEFAULT_AREA = "Adajan Surat"
DEFAULT_CATEGORIES = ["Salon", "Restaurant", "Cafe"]
DEFAULT_MIN_RATING = 3.5
DEFAULT_MAX_RATING = 4.3
DEFAULT_MIN_REVIEWS = 5
DEFAULT_MAX_REVIEWS = 80
DEFAULT_CANDIDATE_LIMIT = 50
DEFAULT_FINAL_LIMIT = 15
DEFAULT_CSV_PATH = "leads.csv"

# 100-Point Scoring Weights Configuration
SCORING_WEIGHTS: Dict[str, float] = {
    "review_opportunity": 25.0,  # Rating room for growth & low review count
    "competitive_gap": 20.0,     # Rating/review gap vs nearby competitors
    "business_activity": 15.0,   # Active presence, website, photos, listing quality
    "reputation_signals": 15.0,  # Negative review vulnerability, sub-4.0 trust rating
    "reviewflow_fit": 15.0,      # High footfall category (salon, restaurant, cafe, spa)
    "contactability": 10.0,      # Phone, website, email availability
}

# Ideal Categories (High footfall, direct customer interaction)
IDEAL_REVIEWFLOW_CATEGORIES = [
    "salon", "hair salon", "unisex salon", "beauty parlour", "spa",
    "restaurant", "cafe", "bistro", "dining", "thali", "diner",
    "dental clinic", "gym", "hotel", "spa & wellness"
]

# Contactability Scoring Points (Out of 100)
CONTACT_POINTS = {
    "phone": 30,
    "website": 20,
    "email": 15,
    "social": 20,
    "address": 15,
}

# Cache Configuration
CACHE_DIR = ".cache_lead_gen"
CACHE_TTL_HOURS = 24
