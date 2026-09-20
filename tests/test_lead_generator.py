"""
Automated Unit Test Suite for Lead Generator V2 (Quality-First Sales Intelligence System).
Tests scoring math, deduplication, hard filters, competitor gap calculation,
contactability score, data confidence, and CSV upsert logic.
"""

import os
import tempfile
import unittest
from datetime import datetime

from lead_generator.models import Business, CompetitorMetrics
from lead_generator.filtering import deduplicate_businesses, apply_hard_filters
from lead_generator.competitors import analyze_competitors
from lead_generator.scoring import compute_lead_score, calculate_contact_score, calculate_data_confidence
from lead_generator.ai_analyzer import generate_fallback_analysis
from lead_generator.storage import upsert_leads_to_csv, load_existing_leads_csv
from lead_generator.utils import normalize_text, normalize_phone

class TestLeadGeneratorV2(unittest.TestCase):

    def setUp(self):
        self.sample_business_1 = Business(
            place_id="ChIJ_test111",
            name="Cut & Curl Salon",
            address="Pal Road, Adajan, Surat",
            area="Pal Road, Adajan, Surat",
            city="Surat",
            category="Salon",
            rating=3.7,
            review_count=14,
            phone="+91 98250 99881",
            email=None,
            website=None,
            data_source="Test Data",
        )
        self.sample_business_2 = Business(
            place_id="ChIJ_test222",
            name="The Beans Cafe",
            address="Anand Mahal Road, Adajan, Surat",
            area="Anand Mahal Road, Adajan, Surat",
            city="Surat",
            category="Cafe",
            rating=4.1,
            review_count=28,
            phone="+91 98795 12345",
            email="beans@example.com",
            website="https://beanscafe.in",
            data_source="Test Data",
        )

    def test_text_normalization(self):
        """Test string normalization for deduplication."""
        self.assertEqual(normalize_text("Cut & Curl Salon!"), "cut curl salon")
        self.assertEqual(normalize_text("  The Beans   Cafe  "), "the beans cafe")

    def test_phone_normalization(self):
        """Test phone number formatting."""
        self.assertEqual(normalize_phone("9825099881"), "+91 98250 99881")
        self.assertEqual(normalize_phone("N/A"), "N/A")

    def test_deduplication(self):
        """Test deduplication by Place ID and normalized key."""
        b1 = self.sample_business_1
        b1_dup = Business(
            place_id="ChIJ_test111",  # Same Place ID
            name="Cut & Curl Salon",
            address="Pal Road, Adajan, Surat",
            area="Pal Road, Adajan, Surat",
            city="Surat",
            category="Salon",
            rating=3.7,
            review_count=14,
        )
        unique_list, dup_count = deduplicate_businesses([b1, b1_dup, self.sample_business_2])
        self.assertEqual(len(unique_list), 2)
        self.assertEqual(dup_count, 1)

    def test_hard_filtering(self):
        """Test python-based hard validation filters."""
        high_review_b = Business(
            place_id="ChIJ_test333",
            name="High Review Spot",
            address="Adajan",
            area="Adajan",
            city="Surat",
            category="Restaurant",
            rating=4.0,
            review_count=500,  # Exceeds max 80 limit
        )
        low_rating_b = Business(
            place_id="ChIJ_test444",
            name="Low Rating Spot",
            address="Adajan",
            area="Adajan",
            city="Surat",
            category="Salon",
            rating=2.8,  # Below min 3.5 limit
            review_count=20,
        )
        filtered, rejected = apply_hard_filters(
            [self.sample_business_1, self.sample_business_2, high_review_b, low_rating_b],
            min_rating=3.5,
            max_rating=4.3,
            min_reviews=5,
            max_reviews=80,
        )
        self.assertEqual(len(filtered), 2)
        self.assertEqual(rejected, 2)

    def test_competitor_analysis_math(self):
        """Test programmatic competitor gap calculations."""
        comp = analyze_competitors(self.sample_business_1)
        self.assertGreater(comp.rating_gap, 0)
        self.assertGreater(comp.review_gap, 0)
        self.assertIsNotNone(comp.top_competitor_name)

    def test_scoring_math_and_grading(self):
        """Test 100-point transparent lead scoring and letter grade assignment."""
        comp = analyze_competitors(self.sample_business_1)
        score = compute_lead_score(self.sample_business_1, comp)
        self.assertGreaterEqual(score.total_score, 0.0)
        self.assertLessEqual(score.total_score, 100.0)
        self.assertIn(score.grade, ["A+", "A", "B", "C", "D"])

    def test_contactability_score(self):
        """Test contactability score calculation."""
        score_1 = calculate_contact_score(self.sample_business_1)  # Phone + Address + PlaceID
        score_2 = calculate_contact_score(self.sample_business_2)  # Phone + Website + Email + Address + PlaceID
        self.assertGreater(score_2, score_1)

    def test_data_confidence_score(self):
        """Test data confidence levels."""
        comp = analyze_competitors(self.sample_business_1)
        conf = calculate_data_confidence(self.sample_business_1, comp)
        self.assertEqual(conf, "HIGH")

    def test_fallback_ai_analysis(self):
        """Test rule-based deterministic sales intelligence fallback."""
        comp = analyze_competitors(self.sample_business_1)
        ai = generate_fallback_analysis(self.sample_business_1, comp)
        self.assertIsNotNone(ai.primary_pain_point)
        self.assertIsNotNone(ai.recommended_sales_angle)
        self.assertIsNotNone(ai.personalized_opening)

    def test_csv_upsert_preserves_history(self):
        """Test CSV upsert logic preserves existing leads and 'First Seen' timestamps."""
        with tempfile.TemporaryDirectory() as tmpdir:
            csv_file = os.path.join(tmpdir, "test_leads.csv")
            
            # Step 1: Create initial lead entry
            comp_1 = analyze_competitors(self.sample_business_1)
            score_1 = compute_lead_score(self.sample_business_1, comp_1)
            ai_1 = generate_fallback_analysis(self.sample_business_1, comp_1)

            from lead_generator.models import Lead
            lead1 = Lead(
                business=self.sample_business_1,
                competitors=comp_1,
                score=score_1,
                contact_score=80.0,
                data_confidence="HIGH",
                ai_analysis=ai_1,
                first_seen="2026-01-01T00:00:00Z",
                last_checked="2026-01-01T00:00:00Z",
            )

            ins1, upd1, path = upsert_leads_to_csv([lead1], csv_path=csv_file)
            self.assertEqual(ins1, 1)

            # Step 2: Upsert same lead with updated review count
            self.sample_business_1.review_count = 16
            lead1_updated = Lead(
                business=self.sample_business_1,
                competitors=comp_1,
                score=score_1,
                contact_score=80.0,
                data_confidence="HIGH",
                ai_analysis=ai_1,
                first_seen="2026-09-12T12:00:00Z",  # Should be preserved as 2026-01-01T00:00:00Z
                last_checked="2026-09-12T12:00:00Z",
            )

            ins2, upd2, path = upsert_leads_to_csv([lead1_updated], csv_path=csv_file)
            self.assertEqual(upd2, 1)

            # Check preserved First Seen timestamp
            loaded = load_existing_leads_csv(csv_file)
            self.assertIn("ChIJ_test111", loaded)
            self.assertEqual(loaded["ChIJ_test111"]["First Seen"], "2026-01-01T00:00:00Z")

if __name__ == "__main__":
    unittest.main()
