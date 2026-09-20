"""
Hard validation rules and deduplication logic for Business objects.
Uses Place ID as primary unique key, with normalized name/address fallback.
"""

from typing import List, Set, Tuple
from lead_generator.models import Business
from lead_generator.utils import normalize_text

def deduplicate_businesses(businesses: List[Business]) -> Tuple[List[Business], int]:
    """
    Deduplicates list of Business objects.
    Primary key: place_id.
    Secondary key: normalized (name + address).
    Returns (deduplicated_list, duplicate_count).
    """
    unique_businesses: List[Business] = []
    seen_place_ids: Set[str] = set()
    seen_keys: Set[str] = set()
    dup_count = 0

    for b in businesses:
        if b.place_id and b.place_id in seen_place_ids:
            dup_count += 1
            continue

        norm_name = normalize_text(b.name)
        norm_addr = normalize_text(b.address)
        norm_key = f"{norm_name}|{norm_addr}"

        if norm_key in seen_keys:
            dup_count += 1
            continue

        if b.place_id:
            seen_place_ids.add(b.place_id)
        seen_keys.add(norm_key)
        unique_businesses.append(b)

    return unique_businesses, dup_count

def apply_hard_filters(
    businesses: List[Business],
    min_rating: float = 3.5,
    max_rating: float = 4.3,
    min_reviews: int = 5,
    max_reviews: int = 80,
) -> Tuple[List[Business], int]:
    """
    Applies Python hard validation filters on ratings, review counts, and essential data completeness.
    Returns (filtered_list, rejected_count).
    """
    filtered = []
    rejected = 0

    for b in businesses:
        # Check rating boundaries
        if not (min_rating <= b.rating <= max_rating):
            rejected += 1
            continue

        # Check review count boundaries
        if not (min_reviews <= b.review_count <= max_reviews):
            rejected += 1
            continue

        # Check basic business identity valid
        if not b.name or not b.address:
            rejected += 1
            continue

        filtered.append(b)

    return filtered, rejected
