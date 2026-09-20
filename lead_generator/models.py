"""
Dataclasses and structured data models for Lead Generator V2.
"""

from dataclasses import dataclass, field
from datetime import datetime, timezone
from typing import Dict, List, Optional, Any

import urllib.parse

def get_utc_iso_now() -> str:
    return datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")

@dataclass
class Business:
    place_id: str
    name: str
    address: str
    area: str
    city: str
    category: str
    rating: float
    review_count: int
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    phone: Optional[str] = None
    email: Optional[str] = None
    website: Optional[str] = None
    reviews_last_30_days: Optional[int] = None
    reviews_last_90_days: Optional[int] = None
    reviews_last_180_days: Optional[int] = None
    review_velocity: Optional[float] = None
    reviews_sample: List[str] = field(default_factory=list)
    metadata: Dict[str, Any] = field(default_factory=dict)
    data_source: str = "Real Business Data Source"
    google_maps_link: Optional[str] = None

    def get_google_maps_link(self) -> str:
        if self.google_maps_link:
            return self.google_maps_link
        if self.place_id and " " not in self.place_id and len(self.place_id) > 20 and not self.place_id.startswith("ChIJ_surat_"):
            return f"https://www.google.com/maps/place/?q=place_id:{self.place_id}"
        elif self.latitude and self.longitude:
            return f"https://www.google.com/maps/search/?api=1&query={self.latitude},{self.longitude}"
        else:
            query = urllib.parse.quote_plus(f"{self.name}, {self.address}")
            return f"https://www.google.com/maps/search/?api=1&query={query}"

@dataclass
class CompetitorMetrics:
    competitor_count: int = 0
    strong_competitors_count: int = 0
    average_rating: float = 0.0
    average_reviews: float = 0.0
    top_competitor_name: str = "N/A"
    top_competitor_rating: float = 0.0
    top_competitor_reviews: int = 0
    rating_gap: float = 0.0
    review_gap: int = 0
    data_source: str = "Real Business Data Source"

@dataclass
class ReviewAnalysis:
    primary_pain_point: str
    pain_point_evidence: List[str]
    positive_themes: List[str]
    negative_themes: List[str]
    reviewflow_fit_reason: str
    recommended_sales_angle: str
    personalized_opening: str
    ai_confidence: str = "MEDIUM"
    ai_analysis_source: str = "Gemini AI Inference"

@dataclass
class LeadScore:
    review_opportunity_score: float
    competitive_gap_score: float
    business_activity_score: float
    reputation_signals_score: float
    reviewflow_fit_score: float
    contactability_score: float
    total_score: float
    grade: str  # A+, A, B, C, D

@dataclass
class Lead:
    business: Business
    competitors: CompetitorMetrics
    score: LeadScore
    contact_score: float
    data_confidence: str  # HIGH, MEDIUM, LOW
    ai_analysis: Optional[ReviewAnalysis] = None
    first_seen: str = field(default_factory=get_utc_iso_now)
    last_checked: str = field(default_factory=get_utc_iso_now)
    search_area: str = "Adajan Surat"
    search_query: str = ""

    def to_dict(self) -> Dict[str, Any]:
        """Convert Lead object into flat dictionary matching 38-field CSV schema."""
        b = self.business
        c = self.competitors
        s = self.score
        ai = self.ai_analysis

        return {
            "Business Name": b.name,
            "Place ID": b.place_id,
            "Category": b.category,
            "Address": b.address,
            "Google Maps Link": b.get_google_maps_link(),
            "Area": b.area,
            "City": b.city,
            "Rating": b.rating,
            "Review Count": b.review_count,
            "Reviews Last 30 Days": b.reviews_last_30_days if b.reviews_last_30_days is not None else "N/A",
            "Reviews Last 90 Days": b.reviews_last_90_days if b.reviews_last_90_days is not None else "N/A",
            "Reviews Last 180 Days": b.reviews_last_180_days if b.reviews_last_180_days is not None else "N/A",
            "Review Velocity": round(b.review_velocity, 2) if b.review_velocity is not None else "N/A",
            "Competitor Count": c.competitor_count,
            "Strong Competitors Count": c.strong_competitors_count,
            "Competitor Average Rating": round(c.average_rating, 2),
            "Competitor Average Reviews": round(c.average_reviews, 1),
            "Top Competitor": c.top_competitor_name,
            "Top Competitor Rating": c.top_competitor_rating,
            "Top Competitor Reviews": c.top_competitor_reviews,
            "Rating Gap": round(c.rating_gap, 2),
            "Review Gap": c.review_gap,
            "Phone": b.phone if b.phone else "N/A",
            "Email": b.email if b.email else "N/A",
            "Website": b.website if b.website else "N/A",
            "Lead Score": round(s.total_score, 1),
            "Lead Grade": s.grade,
            "Contact Score": round(self.contact_score, 1),
            "Data Confidence": self.data_confidence,
            "Primary Pain Point": ai.primary_pain_point if ai else "Needs automated review collection.",
            "Pain Point Evidence": " | ".join(ai.pain_point_evidence) if ai and ai.pain_point_evidence else "N/A",
            "ReviewFlow Fit Reason": ai.reviewflow_fit_reason if ai else "High footfall category benefit.",
            "Recommended Sales Angle": ai.recommended_sales_angle if ai else "Convert happy walk-ins into reviews.",
            "Personalized Opening": ai.personalized_opening if ai else "Hi, we noticed your business on Google...",
            "First Seen": self.first_seen,
            "Last Checked": self.last_checked,
            "Source": b.data_source,
            "Search Area": self.search_area,
            "Search Query": self.search_query,
        }
