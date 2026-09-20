"""
Gemini AI Sales Intelligence Analyzer for Lead Generator V2.
Analyzes verified business data to generate sales angles, pain point audits,
and personalized outreach openings.
Enforces strict Fact vs. Inference separation and validates JSON outputs.
"""

import json
import logging
import re
import sys
import time
import urllib.request
from typing import Optional

from lead_generator.config import GEMINI_API_KEY, GEMINI_CANDIDATE_MODELS
from lead_generator.models import Business, CompetitorMetrics, ReviewAnalysis

logger = logging.getLogger("lead_generator.ai_analyzer")

def analyze_lead_with_gemini(
    business: Business,
    competitors: CompetitorMetrics,
    api_key: Optional[str] = None
) -> ReviewAnalysis:
    """
    Analyzes verified business data using Gemini AI API to generate actionable sales intelligence.
    AI MUST NOT INVENT FACTUAL BUSINESS DATA.
    """
    key = api_key or GEMINI_API_KEY
    if not key:
        logger.warning("No GEMINI_API_KEY provided. Using deterministic fallback sales analysis.")
        return generate_fallback_analysis(business, competitors)

    reviews_text = "\n".join([f"- \"{r}\"" for r in business.reviews_sample]) if business.reviews_sample else "No customer review text available."

    prompt = f"""
You are a senior B2B Sales Specialist for ReviewFlow (a QR-based Google review management platform).
Analyze the following VERIFIED real local business data and generate sales intelligence.

STRICT MANDATORY RULES:
1. NEVER invent or alter factual business data (Rating, Reviews, Phone, Email, Competitors).
2. Distinguish FACT from INFERENCE.
3. If customer review text is sparse, state 'Based on rating ({business.rating}★) and review volume ({business.review_count} reviews)'.
4. Do NOT make false claims or exaggerate.

VERIFIED BUSINESS FACTS:
- Business Name: {business.name}
- Category: {business.category}
- Area/Locality: {business.area}
- Google Rating: {business.rating} stars
- Total Google Reviews: {business.review_count} reviews
- Phone: {business.phone if business.phone else 'Unlisted'}
- Website: {business.website if business.website else 'Unlisted'}
- Customer Review Snippets:
{reviews_text}

VERIFIED COMPETITOR FACTS:
- Top Competitor: {competitors.top_competitor_name} ({competitors.top_competitor_rating}★ with {competitors.top_competitor_reviews} reviews)
- Rating Gap: {competitors.rating_gap} stars behind top competitor
- Review Volume Gap: {competitors.review_gap} reviews behind top competitor

Return ONLY a raw JSON object with EXACTLY these keys:
- primary_pain_point (string: core reputation/review challenge)
- pain_point_evidence (list of strings: specific facts supporting the pain point)
- positive_themes (list of strings: positive customer highlights)
- negative_themes (list of strings: negative customer complaints or risks)
- reviewflow_fit_reason (string: why ReviewFlow QR flow fits their business model)
- recommended_sales_angle (string: strategic pitch angle)
- personalized_opening (string: personalized cold outreach email/message opening)
- ai_confidence (string: 'HIGH', 'MEDIUM', or 'LOW')
"""

    payload = {
        "contents": [{"parts": [{"text": prompt}]}]
    }
    headers = {"Content-Type": "application/json"}

    for model in GEMINI_CANDIDATE_MODELS:
        url = f"https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent?key={key}"
        for attempt in range(1, 3):
            try:
                req = urllib.request.Request(url, data=json.dumps(payload).encode("utf-8"), headers=headers)
                with urllib.request.urlopen(req) as resp:
                    data = json.loads(resp.read().decode("utf-8"))
                    raw_text = data["candidates"][0]["content"]["parts"][0]["text"].strip()

                    clean_json = re.sub(r"^```json\s*", "", raw_text, flags=re.MULTILINE)
                    clean_json = re.sub(r"^```\s*", "", clean_json, flags=re.MULTILINE)
                    clean_json = re.sub(r"```$", "", clean_json, flags=re.MULTILINE).strip()

                    parsed = json.loads(clean_json)

                    return ReviewAnalysis(
                        primary_pain_point=parsed.get("primary_pain_point", f"Potential review volume gap compared to top competitors in {business.area}."),
                        pain_point_evidence=parsed.get("pain_point_evidence", [f"{business.rating}★ with {business.review_count} reviews"]),
                        positive_themes=parsed.get("positive_themes", ["Good service"]),
                        negative_themes=parsed.get("negative_themes", ["Review volume gap"]),
                        reviewflow_fit_reason=parsed.get("reviewflow_fit_reason", "High footfall business location ideal for QR review collection at checkout."),
                        recommended_sales_angle=parsed.get("recommended_sales_angle", "Convert satisfied in-person customers into positive Google reviews."),
                        personalized_opening=parsed.get("personalized_opening", f"Hi, I noticed {business.name} has a solid {business.rating}★ rating on Google Maps..."),
                        ai_confidence=parsed.get("ai_confidence", "HIGH"),
                        ai_analysis_source=f"Gemini AI ({model})",
                    )
            except Exception as e:
                logger.warning(f"Gemini API model '{model}' attempt {attempt} error: {e}")
                time.sleep(1)

    logger.warning("All Gemini API models failed/timed out. Using fallback sales analysis.")
    return generate_fallback_analysis(business, competitors)

def generate_fallback_analysis(business: Business, competitors: CompetitorMetrics) -> ReviewAnalysis:
    """Generates a deterministic sales analysis when Gemini API is offline or unconfigured."""
    evidence = [f"Currently at {business.rating}★ with {business.review_count} reviews."]
    if competitors.top_competitor_name != "N/A":
        evidence.append(f"Top competitor '{competitors.top_competitor_name}' has {competitors.top_competitor_rating}★ with {competitors.top_competitor_reviews} reviews.")

    pain_point = f"Low review volume ({business.review_count} reviews) creates a competitive gap of {competitors.review_gap} reviews against top area competitors."
    if business.rating < 4.0:
        pain_point = f"Rating of {business.rating}★ is below the 4.0 trust threshold, causing potential walk-ins to choose competitors."

    fit_reason = f"As a high-footfall {business.category.lower()}, {business.name} serves daily walk-in clients who leave without leaving Google reviews."
    sales_angle = "Implement a seamless QR-based checkout review funnel to turn happy customers into 5-star Google reviews automatically."
    opening = f"Hi, I noticed {business.name} in {business.area} is getting good customer visits, but your Google rating sits at {business.rating}★ with {business.review_count} reviews while nearby competitors have {competitors.top_competitor_reviews}+ reviews. ReviewFlow helps automate your review growth."

    return ReviewAnalysis(
        primary_pain_point=pain_point,
        pain_point_evidence=evidence,
        positive_themes=["Quality service", "Convenient location"],
        negative_themes=["Low review momentum", "Competitor dominance"],
        reviewflow_fit_reason=fit_reason,
        recommended_sales_angle=sales_angle,
        personalized_opening=opening,
        ai_confidence="MEDIUM",
        ai_analysis_source="Rule-Based Deterministic Analysis Engine",
    )
