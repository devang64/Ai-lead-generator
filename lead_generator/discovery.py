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
    limit_per_category: int = 50
) -> List[Business]:
    """
    Discovers candidate businesses across multiple categories using the provided BusinessDataProvider.
    """
    all_candidates: List[Business] = []

    for cat in categories:
        logger.info(f"[DISCOVERY] Searching for '{cat}' in '{area}' via {provider.name()}...")
        results = provider.search_places(area=area, category=cat, limit=limit_per_category)
        logger.info(f"[DISCOVERY] Found {len(results)} raw '{cat}' candidates.")
        all_candidates.extend(results)

    return all_candidates
