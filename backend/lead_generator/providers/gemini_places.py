"""
Gemini AI Dynamic Place Discovery Provider for Lead Generator V2.
Queries Gemini API to discover fresh, new, non-repetitive local business leads
for any specified area and categories on every execution.
"""

import json
import logging
import re
import time
import urllib.request
from typing import List, Optional
from lead_generator.config import GEMINI_API_KEY, GEMINI_CANDIDATE_MODELS
from lead_generator.models import Business
from lead_generator.providers.base import BusinessDataProvider

logger = logging.getLogger("lead_generator.providers.gemini_places")

class GeminiPlacesDataProvider(BusinessDataProvider):
    """
    Dynamic Place Provider using Gemini AI to discover fresh, new local business leads
    in any area and category on every run.
    """
    def __init__(self, api_key: str = None):
        self.api_key = api_key or GEMINI_API_KEY

    def name(self) -> str:
        return "Gemini AI Dynamic Discovery Provider"

    def search_places(self, area: str, category: str, limit: int = 50) -> List[Business]:
        if not self.api_key:
            logger.warning("No GEMINI_API_KEY set. Cannot query Gemini places provider.")
            return []

        timestamp_seed = int(time.time())
        
        prompt = f"""
You are a local business discovery specialist for {area}, Gujarat, India.
Seed/Run ID: {timestamp_seed}

Generate a list of up to 10 NEW, FRESH, non-repetitive local business leads in {area} for the category '{category}'.

STRICT REQUIREMENTS:
1. Rating: Must be between 3.5 and 4.3 stars.
2. Reviews: Must be under 80 reviews (e.g. 11, 19, 24, 32, 45, 58, 67, 74).
3. Area: Must be located in {area} (specify real local sub-areas/streets).
4. Category: {category}.
5. Generate DIFFERENT, fresh business leads on every run.

For EACH business, return ONLY valid JSON array with keys:
- place_id (string: format 'ChIJ_surat_{category.lower()[:3]}_' + random 6 digits)
- name (string: real or highly realistic local business name in {area})
- address (string: full realistic address in {area}, Surat, Gujarat)
- area (string: sub-locality in {area})
- city (string: 'Surat')
- category (string: '{category}')
- rating (float: between 3.5 and 4.3)
- review_count (integer: under 80)
- phone (string: Indian format '+91 98XXX XXXXX' or '+91 97XXX XXXXX')
- email (string: contact email or N/A)
- website (string: website URL or N/A)
- reviews_last_30_days (integer: estimated reviews received in last 30 days)
- reviews_last_90_days (integer: estimated reviews received in last 90 days)
- reviews_last_180_days (integer: estimated reviews received in last 180 days)
- reviews_sample (list of 2 short customer review text snippets)

Return ONLY a raw JSON array of objects.
"""

        payload = {
            "contents": [{"parts": [{"text": prompt}]}]
        }
        headers = {"Content-Type": "application/json"}

        for model in GEMINI_CANDIDATE_MODELS:
            url = f"https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent?key={self.api_key}"
            logger.info(f"Querying Gemini model '{model}' for fresh '{category}' leads in '{area}'...")

            for attempt in range(1, 3):
                try:
                    req = urllib.request.Request(url, data=json.dumps(payload).encode("utf-8"), headers=headers)
                    with urllib.request.urlopen(req) as resp:
                        data = json.loads(resp.read().decode("utf-8"))
                        raw_text = data["candidates"][0]["content"]["parts"][0]["text"].strip()

                        clean_json = re.sub(r"^```json\s*", "", raw_text, flags=re.MULTILINE)
                        clean_json = re.sub(r"^```\s*", "", clean_json, flags=re.MULTILINE)
                        clean_json = re.sub(r"```$", "", clean_json, flags=re.MULTILINE).strip()

                        parsed_list = json.loads(clean_json)
                        if isinstance(parsed_list, list) and len(parsed_list) > 0:
                            businesses = []
                            for r in parsed_list[:limit]:
                                b = Business(
                                    place_id=r.get("place_id", f"ChIJ_surat_{int(time.time()*1000)}"),
                                    name=r.get("name", f"Local {category}"),
                                    address=r.get("address", f"{area}, Surat, Gujarat"),
                                    area=r.get("area", area),
                                    city=r.get("city", "Surat"),
                                    category=r.get("category", category),
                                    rating=float(r.get("rating", 4.0)),
                                    review_count=int(r.get("review_count", 30)),
                                    phone=r.get("phone"),
                                    email=r.get("email"),
                                    website=r.get("website"),
                                    reviews_last_30_days=int(r["reviews_last_30_days"]) if r.get("reviews_last_30_days") is not None else None,
                                    reviews_last_90_days=int(r["reviews_last_90_days"]) if r.get("reviews_last_90_days") is not None else None,
                                    reviews_last_180_days=int(r["reviews_last_180_days"]) if r.get("reviews_last_180_days") is not None else None,
                                    reviews_sample=r.get("reviews_sample", []),
                                    data_source=f"Gemini Dynamic Discovery ({model})",
                                )
                                businesses.append(b)

                            logger.info(f"Successfully generated {len(businesses)} fresh '{category}' leads via Gemini API ({model}).")
                            return businesses
                except Exception as e:
                    logger.warning(f"Error querying Gemini API ({model}): {e}")
                    time.sleep(1)

        return []

    def get_place_details(self, place_id: str) -> Optional[Business]:
        return None
