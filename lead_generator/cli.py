"""
CLI Orchestrator and Pipeline Runner for Lead Generator V2.
Orchestrates multi-stage discovery, filtering, deduplication, competitor analysis,
scoring, Gemini AI sales intelligence, and CSV/Excel storage upsert.
Guarantees fresh, non-repetitive lead discovery on every run.
"""

import argparse
import sys
import logging
from typing import List

from lead_generator.config import (
    DEFAULT_AREA,
    DEFAULT_CATEGORIES,
    DEFAULT_MIN_RATING,
    DEFAULT_MAX_RATING,
    DEFAULT_MIN_REVIEWS,
    DEFAULT_MAX_REVIEWS,
    DEFAULT_CANDIDATE_LIMIT,
    DEFAULT_FINAL_LIMIT,
    DEFAULT_CSV_PATH,
    GEMINI_API_KEY,
    GOOGLE_SHEETS_SPREADSHEET_ID,
    GOOGLE_SERVICE_ACCOUNT_JSON,
    RUNS_DIR,
)
from lead_generator.models import Lead
from lead_generator.providers import VerifiedLocalDataProvider, GeminiPlacesDataProvider, BusinessDataProvider
from lead_generator.discovery import discover_candidate_businesses
from lead_generator.filtering import deduplicate_businesses, apply_hard_filters
from lead_generator.competitors import analyze_competitors
from lead_generator.scoring import compute_lead_score, calculate_contact_score, calculate_data_confidence
from lead_generator.ai_analyzer import analyze_lead_with_gemini
from lead_generator.storage import upsert_leads_to_csv, export_leads_to_json, export_leads_to_excel, save_run_to_csv
from lead_generator.sheets import upload_leads_to_google_sheets
from lead_generator.utils import setup_logger

logger = setup_logger("lead_generator")

def select_data_provider() -> BusinessDataProvider:
    """Selects Gemini AI Dynamic Places Provider if API key is set, else Verified Local Provider."""
    if GEMINI_API_KEY:
        logger.info("[PROVIDER] Using Gemini AI Dynamic Discovery Provider for fresh lead generation.")
        return GeminiPlacesDataProvider(api_key=GEMINI_API_KEY)
    else:
        logger.info("[PROVIDER] GEMINI_API_KEY not set. Using Verified Local Data Provider.")
        return VerifiedLocalDataProvider()

def run_pipeline(
    area: str = DEFAULT_AREA,
    categories: List[str] = None,
    limit: int = DEFAULT_CANDIDATE_LIMIT,
    final_limit: int = DEFAULT_FINAL_LIMIT,
    min_rating: float = DEFAULT_MIN_RATING,
    max_rating: float = DEFAULT_MAX_RATING,
    min_reviews: int = DEFAULT_MIN_REVIEWS,
    max_reviews: int = DEFAULT_MAX_REVIEWS,
    csv_path: str = DEFAULT_CSV_PATH,
    excel_path: str = None,
    json_path: str = None,
    runs_dir: str = RUNS_DIR,
    upload_sheets: bool = False,
    sheets_spreadsheet_id: str = GOOGLE_SHEETS_SPREADSHEET_ID,
    sheets_service_account: str = GOOGLE_SERVICE_ACCOUNT_JSON,
) -> List[Lead]:
    """Runs the full V2 Lead Generation & Sales Intelligence pipeline."""
    if categories is None:
        categories = DEFAULT_CATEGORIES

    logger.info("================================================================================")
    logger.info(f"STARTING AI LEAD GENERATOR — FRESH SALES INTELLIGENCE PIPELINE")
    logger.info(f"Area: '{area}' | Categories: {categories} | Target Filter: {min_rating}-{max_rating}★, {min_reviews}-{max_reviews} reviews")
    logger.info("================================================================================")

    # 1. Real / Fresh Business Discovery
    provider: BusinessDataProvider = select_data_provider()
    raw_candidates = discover_candidate_businesses(provider, area=area, categories=categories, limit_per_category=limit)
    logger.info(f"[DISCOVERY] Total raw businesses discovered: {len(raw_candidates)}")

    # Fallback if Gemini dynamic provider returns empty
    if not raw_candidates and isinstance(provider, GeminiPlacesDataProvider):
        logger.warning("[!] Gemini places provider returned 0 results. Falling back to Verified Local Provider.")
        fallback_provider = VerifiedLocalDataProvider()
        raw_candidates = discover_candidate_businesses(fallback_provider, area=area, categories=categories, limit_per_category=limit)

    # 2. Deduplication
    unique_candidates, dup_count = deduplicate_businesses(raw_candidates)
    logger.info(f"[DEDUP] Removed {dup_count} duplicate entries. Unique candidates: {len(unique_candidates)}")

    # 3. Hard Validation Filters
    valid_candidates, rejected_count = apply_hard_filters(
        unique_candidates,
        min_rating=min_rating,
        max_rating=max_rating,
        min_reviews=min_reviews,
        max_reviews=max_reviews,
    )
    logger.info(f"[FILTER] {len(valid_candidates)} candidates passed hard validation filters ({rejected_count} filtered out).")

    if not valid_candidates:
        logger.warning("[!] No businesses passed hard validation filters. Exiting.")
        return []

    # 4. Competitor Analysis, Scoring, & Gemini AI Sales Intelligence
    processed_leads: List[Lead] = []
    logger.info(f"[ANALYSIS] Processing competitor analysis, 100-pt lead scoring, & Gemini AI analysis...")

    for i, b in enumerate(valid_candidates, 1):
        logger.info(f" -> [{i}/{len(valid_candidates)}] Analyzing '{b.name}' ({b.category}, {b.rating}★, {b.review_count} reviews)...")

        comp_metrics = analyze_competitors(b)
        score_details = compute_lead_score(b, comp_metrics)
        contact_score = calculate_contact_score(b)
        data_conf = calculate_data_confidence(b, comp_metrics)

        ai_analysis = analyze_lead_with_gemini(b, comp_metrics, api_key=GEMINI_API_KEY)

        lead = Lead(
            business=b,
            competitors=comp_metrics,
            score=score_details,
            contact_score=contact_score,
            data_confidence=data_conf,
            ai_analysis=ai_analysis,
            search_area=area,
            search_query=f"{','.join(categories)} in {area}",
        )
        processed_leads.append(lead)

    # 5. Rank Leads by Total Lead Score Descending
    processed_leads.sort(key=lambda x: x.score.total_score, reverse=True)
    final_leads = processed_leads[:final_limit]

    logger.info(f"[SCORING] Successfully ranked {len(final_leads)} sales-ready leads (Top Grade A+/A priority).")

    # 6. Upsert to CSV & Excel Storage
    inserted, updated, saved_csv = upsert_leads_to_csv(final_leads, csv_path=csv_path)
    logger.info(f"[STORAGE] Updated CSV '{saved_csv}': {inserted} new lead(s) inserted, {updated} existing lead(s) updated.")

    # 6a. Save timestamped run file (one file per pipeline execution)
    run_timestamp = None
    if runs_dir:
        run_file = save_run_to_csv(final_leads, area=area, runs_dir=runs_dir)
        # Extract timestamp from filename for consistent sheet tab naming
        import re as _re
        ts_match = _re.search(r"leads_(\d{4}-\d{2}-\d{2}_\d{2}-\d{2}-\d{2})", run_file)
        if ts_match:
            run_timestamp = ts_match.group(1).replace("_", " ").replace("-", "-", 2).rsplit("-", 1)
            # Format: "2026-09-20 16:30"
            run_timestamp = ts_match.group(1)[:10] + " " + ts_match.group(1)[11:13] + ":" + ts_match.group(1)[14:16]
        logger.info(f"[RUN FILE] Timestamped run saved → '{run_file}'")

    if excel_path:
        saved_excel = export_leads_to_excel(csv_path=csv_path, excel_path=excel_path)
        logger.info(f"[STORAGE] Exported Excel workbook to '{saved_excel}'.")

    if json_path:
        saved_json = export_leads_to_json(final_leads, json_path=json_path)
        logger.info(f"[STORAGE] Exported JSON format to '{saved_json}'.")

    # 6b. Upload to Google Sheets
    if upload_sheets or sheets_spreadsheet_id:
        logger.info("[SHEETS] Uploading leads to Google Sheets...")
        sheet_url = upload_leads_to_google_sheets(
            leads=final_leads,
            spreadsheet_id=sheets_spreadsheet_id,
            service_account_json=sheets_service_account,
            area=area,
            run_timestamp=run_timestamp,
            also_update_master=True,
        )
        if sheet_url:
            logger.info(f"[SHEETS] ✓ Google Sheet updated → {sheet_url}")
        else:
            logger.warning("[SHEETS] Google Sheets upload did not complete. Check logs above.")

    # 7. Print Final Markdown Output Summary
    print_cli_summary(final_leads)

    return final_leads

def print_cli_summary(leads: List[Lead]):
    """Prints clean, formatted Markdown output summary to CLI."""
    print("\n" + "="*80)
    print("TOP SALES-READY LEADS (RANKED BY LEAD SCORE)")
    print("="*80 + "\n")

    print("| Rank | Business Name | Category | Rating | Reviews | Lead Score | Grade | Contact Score | Confidence |")
    print("| --- | --- | --- | --- | --- | --- | --- | --- | --- |")
    for rank, l in enumerate(leads, 1):
        b = l.business
        s = l.score
        print(f"| {rank} | {b.name} | {b.category} | {b.rating}★ | {b.review_count} | **{s.total_score}** | **{s.grade}** | {l.contact_score}/100 | {l.data_confidence} |")

    print("\n" + "="*80)
    print("DETAILED SALES INTELLIGENCE & OUTREACH PITCHES (TOP 10 LEADS)")
    print("="*80 + "\n")

    for rank, l in enumerate(leads[:10], 1):
        b = l.business
        c = l.competitors
        s = l.score
        ai = l.ai_analysis

        print(f"### {rank}. {b.name} ({b.category} — {b.area})")
        print(f"- **Place ID:** `{b.place_id}` | **Data Source:** {b.data_source}")
        print(f"- **Metrics:** {b.rating}★ rating | {b.review_count} reviews | Contact: {b.phone or 'N/A'}")
        print(f"- **Lead Grade:** **{s.grade}** (Score: {s.total_score}/100) | **Contactability:** {l.contact_score}/100")
        print(f"- **Competitive Gap:** {c.rating_gap}★ rating gap & {c.review_gap} review gap vs top competitor `{c.top_competitor_name}` ({c.top_competitor_rating}★ / {c.top_competitor_reviews} reviews)")
        if ai:
            print(f"- **Primary Pain Point:** {ai.primary_pain_point}")
            print(f"- **Evidence:** {' | '.join(ai.pain_point_evidence)}")
            print(f"- **ReviewFlow Fit:** {ai.reviewflow_fit_reason}")
            print(f"- **Recommended Sales Angle:** {ai.recommended_sales_angle}")
            print(f"- **Personalized Opening:** \"{ai.personalized_opening}\"")
        print("-" * 80)

def main():
    parser = argparse.ArgumentParser(description="AI Lead Generator — Fresh Sales Intelligence System")
    parser.add_argument("--area", default=DEFAULT_AREA, help="Target search area (e.g. 'Adajan Surat')")
    parser.add_argument("--categories", nargs="+", default=DEFAULT_CATEGORIES, help="Business categories")
    parser.add_argument("--limit", type=int, default=DEFAULT_CANDIDATE_LIMIT, help="Candidate discovery limit per category")
    parser.add_argument("--final-limit", type=int, default=DEFAULT_FINAL_LIMIT, help="Final top leads to present")
    parser.add_argument("--min-rating", type=float, default=DEFAULT_MIN_RATING)
    parser.add_argument("--max-rating", type=float, default=DEFAULT_MAX_RATING)
    parser.add_argument("--min-reviews", type=int, default=DEFAULT_MIN_REVIEWS)
    parser.add_argument("--max-reviews", type=int, default=DEFAULT_MAX_REVIEWS)
    parser.add_argument("--csv", default=DEFAULT_CSV_PATH, help="Master CSV path (UPSERT)")
    parser.add_argument("--excel", default=None, help="Optional output Excel (.xlsx) path")
    parser.add_argument("--json", default=None, help="Optional output JSON path")
    parser.add_argument("--runs-dir", default=RUNS_DIR, help="Directory to save timestamped per-run CSV files (default: runs/)")
    parser.add_argument("--no-run-file", action="store_true", help="Disable timestamped run file saving")
    parser.add_argument("--upload-sheets", action="store_true", help="Upload leads to Google Sheets after run")
    parser.add_argument("--sheets-id", default=GOOGLE_SHEETS_SPREADSHEET_ID, help="Google Sheets spreadsheet ID")
    parser.add_argument("--sheets-sa", default=GOOGLE_SERVICE_ACCOUNT_JSON, help="Path to Google Service Account JSON key file")
    parser.add_argument("--verbose", action="store_true", help="Enable verbose debug logging")

    args = parser.parse_args()

    if args.verbose:
        logger.setLevel(logging.DEBUG)

    run_pipeline(
        area=args.area,
        categories=args.categories,
        limit=args.limit,
        final_limit=args.final_limit,
        min_rating=args.min_rating,
        max_rating=args.max_rating,
        min_reviews=args.min_reviews,
        max_reviews=args.max_reviews,
        csv_path=args.csv,
        excel_path=args.excel,
        json_path=args.json,
        runs_dir=None if args.no_run_file else args.runs_dir,
        upload_sheets=args.upload_sheets,
        sheets_spreadsheet_id=args.sheets_id,
        sheets_service_account=args.sheets_sa,
    )

if __name__ == "__main__":
    main()
