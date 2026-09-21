"""
Multi-stage place discovery module.
Queries the configured BusinessDataProvider across categories and aggregates raw candidates.
"""

import logging
from typing import List
from lead_generator.models import Business
from lead_generator.providers.base import BusinessDataProvider

logger = logging.getLogger("lead_generator.discovery")

def discover_candidate_businesses(
    provider: BusinessDataProvider,
    area: str,
    categories: List[str],
    limit_per_category: int = 50,
    city: str = "Surat",
    state: str = "Gujarat",
    min_rating: float = 3.5,
    max_rating: float = 4.3,
    min_reviews: int = 5,
    max_reviews: int = 80,
    existing_names_and_place_ids: str = "",
) -> List[Business]:
    """
    Discovers candidate businesses across multiple categories using the provided BusinessDataProvider.
    """
    all_candidates: List[Business] = []

    for cat in categories:
        logger.info(f"[DISCOVERY] Searching for '{cat}' in '{area}, {city}, {state}' via {provider.name()}...")
        try:
            results = provider.search_places(
                area=area,
                category=cat,
                limit=limit_per_category,
                city=city,
                state=state,
                min_rating=min_rating,
                max_rating=max_rating,
                min_reviews=min_reviews,
                max_reviews=max_reviews,
                existing_names_and_place_ids=existing_names_and_place_ids,
            )
        except TypeError:
            results = provider.search_places(area=area, category=cat, limit=limit_per_category)

        logger.info(f"[DISCOVERY] Found {len(results)} raw '{cat}' candidates.")
        all_candidates.extend(results)

    return all_candidates
