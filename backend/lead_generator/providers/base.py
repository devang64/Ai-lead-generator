"""
Abstract Business Data Provider interface for Lead Generator V2.
Encapsulates all place discovery and detail retrieval behind a unified contract.
"""

from abc import ABC, abstractmethod
from typing import List, Optional
from lead_generator.models import Business

class BusinessDataProvider(ABC):
    """Abstract Base Class for Place Data Providers (Google Places, OpenStreetMap, Verified Local DB)."""

    @abstractmethod
    def name(self) -> str:
        """Name of the data provider."""
        pass

    @abstractmethod
    def search_places(self, area: str, category: str, limit: int = 50) -> List[Business]:
        """
        Search and discover real local businesses.
        Must return list of Business objects with REAL non-fabricated attributes.
        """
        pass

    @abstractmethod
    def get_place_details(self, place_id: str) -> Optional[Business]:
        """Fetch detailed information for a place by Place ID."""
        pass
