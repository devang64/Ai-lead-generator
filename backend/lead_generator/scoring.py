"""
Transparent scoring engine, lead grading, contactability scoring, and data confidence evaluation for Lead Generator V2.
Calculates 100-point explainable lead score in pure Python.
"""

from lead_generator.config import IDEAL_Ratingbuddy_CATEGORIES, SCORING_WEIGHTS, CONTACT_POINTS
from lead_generator.models import Business, CompetitorMetrics, LeadScore

def calculate_contact_score(business: Business) -> float:
    """Calculates Contactability Score (0-100) based on verified available communication channels."""
    score = 0.0
    if business.phone and business.phone != "N/A":
        score += CONTACT_POINTS["phone"]
    if business.website and business.website != "N/A":
        score += CONTACT_POINTS["website"]
    if business.email and business.email != "N/A":
        score += CONTACT_POINTS["email"]
    if business.address and business.address != "N/A":
        score += CONTACT_POINTS["address"]
    if business.place_id:
        score += CONTACT_POINTS["social"]

    return min(100.0, score)

def calculate_data_confidence(business: Business, competitors: CompetitorMetrics) -> str:
    """Determines Data Confidence level (HIGH, MEDIUM, LOW) based on verified data completeness."""
    if business.place_id and business.rating > 0 and business.review_count > 0 and business.phone and competitors.top_competitor_name != "N/A":
        return "HIGH"
    elif business.place_id and business.rating > 0 and business.review_count > 0:
        return "MEDIUM"
    else:
        return "LOW"

def compute_lead_score(business: Business, competitors: CompetitorMetrics) -> LeadScore:
    """
    Computes a 100-point transparent, explainable lead score.
    Returns LeadScore dataclass with breakdown and grade.
    """
    # 1. Review Opportunity (Max 25 pts)
    # Rating room for growth
    rating_room = max(0.0, (4.5 - business.rating)) * 10.0  # e.g., 3.5 -> 10 pts, 4.0 -> 5 pts
    rating_opp = min(12.0, rating_room)

    # Low review volume opportunity
    if business.review_count < 30:
        review_opp = 13.0
    elif business.review_count <= 80:
        review_opp = 9.0
    else:
        review_opp = 5.0

    opp_score = min(SCORING_WEIGHTS["review_opportunity"], rating_opp + review_opp)

    # 2. Competitive Gap (Max 20 pts)
    gap_rating_pts = min(12.0, competitors.rating_gap * 15.0)
    gap_review_pts = min(8.0, competitors.review_gap / 50.0)
    comp_score = min(SCORING_WEIGHTS["competitive_gap"], gap_rating_pts + gap_review_pts)

    # 3. Business Activity (Max 15 pts)
    act_pts = 0.0
    if business.website and business.website != "N/A":
        act_pts += 5.0
    if business.phone and business.phone != "N/A":
        act_pts += 5.0
    if business.review_velocity and business.review_velocity > 0:
        act_pts += 5.0
    elif business.review_count >= 15:
        act_pts += 3.0
    act_score = min(SCORING_WEIGHTS["business_activity"], act_pts)

    # 4. Reputation Signals (Max 15 pts)
    if business.rating < 4.0:
        rep_pts = 15.0  # Critical trust issue - highest urgency for Ratingbuddy
    elif 4.0 <= business.rating <= 4.2:
        rep_pts = 10.0
    else:
        rep_pts = 5.0
    rep_score = min(SCORING_WEIGHTS["reputation_signals"], rep_pts)

    # 5. Ratingbuddy Fit (Max 15 pts)
    cat_lower = business.category.lower()
    if any(ideal in cat_lower for ideal in IDEAL_Ratingbuddy_CATEGORIES):
        fit_score = 15.0
    else:
        fit_score = 8.0

    # 6. Contactability (Max 10 pts)
    contact_val = calculate_contact_score(business)
    contact_pts = min(SCORING_WEIGHTS["contactability"], contact_val / 10.0)

    # Total Lead Score (0 - 100)
    total_score = min(100.0, opp_score + comp_score + act_score + rep_score + fit_score + contact_pts)

    # Grade Assignment
    if total_score >= 90.0:
        grade = "A+"
    elif total_score >= 80.0:
        grade = "A"
    elif total_score >= 70.0:
        grade = "B"
    elif total_score >= 60.0:
        grade = "C"
    else:
        grade = "D"

    return LeadScore(
        review_opportunity_score=round(opp_score, 1),
        competitive_gap_score=round(comp_score, 1),
        business_activity_score=round(act_score, 1),
        reputation_signals_score=round(rep_score, 1),
        Ratingbuddy_fit_score=round(fit_score, 1),
        contactability_score=round(contact_pts, 1),
        total_score=round(total_score, 1),
        grade=grade,
    )
