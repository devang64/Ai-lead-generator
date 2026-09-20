"""
Google Sheets Upload Module for Lead Generator V2.
Uploads pipeline run leads to a Google Spreadsheet as a new timestamped worksheet tab.
Requires: gspread>=5.12.0, google-auth>=2.23.0
Requires: GOOGLE_SHEETS_SPREADSHEET_ID and GOOGLE_SERVICE_ACCOUNT_JSON set in .env
"""

import logging
import os
from datetime import datetime
from typing import List, Optional

from lead_generator.storage import CSV_FIELDNAMES
from lead_generator.models import Lead

logger = logging.getLogger("lead_generator.sheets")


def _make_worksheet_name(area: str, timestamp: Optional[str] = None) -> str:
    """Generates a worksheet tab name: 'YYYY-MM-DD HH:MM | Area'."""
    ts = timestamp or datetime.now().strftime("%Y-%m-%d %H:%M")
    safe_area = area[:40]  # Google Sheets tab name max ~100 chars, keep it clean
    return f"{ts} | {safe_area}"


def upload_leads_to_google_sheets(
    leads: List[Lead],
    spreadsheet_id: str,
    service_account_json: str,
    area: str,
    run_timestamp: Optional[str] = None,
    also_update_master: bool = True,
) -> Optional[str]:
    """
    Uploads leads to a Google Spreadsheet.

    Creates a new worksheet tab named '{timestamp} | {area}' for this run.
    Optionally updates a 'Master Leads' sheet with all leads (appends new rows).

    Args:
        leads:                 List of Lead objects from the pipeline run.
        spreadsheet_id:        Google Sheets spreadsheet ID (from URL).
        service_account_json:  Path to Google Service Account JSON key file.
        area:                  The search area string (used in tab name).
        run_timestamp:         Optional ISO timestamp string; defaults to now.
        also_update_master:    If True, also append/update the 'Master Leads' sheet.

    Returns:
        URL of the Google Sheet if successful, None on failure.
    """
    # Validate inputs
    if not spreadsheet_id:
        logger.warning("[SHEETS] GOOGLE_SHEETS_SPREADSHEET_ID is not set. Skipping upload.")
        return None

    if not service_account_json or not os.path.exists(service_account_json):
        logger.error(
            f"[SHEETS] Service account JSON not found at '{service_account_json}'. "
            "Skipping Google Sheets upload."
        )
        return None

    if not leads:
        logger.warning("[SHEETS] No leads to upload. Skipping.")
        return None

    # Import optional dependencies
    try:
        import gspread
        from google.oauth2.service_account import Credentials
    except ImportError:
        logger.error(
            "[SHEETS] Missing dependencies. Run: pip install gspread>=5.12.0 google-auth>=2.23.0"
        )
        return None

    scopes = [
        "https://www.googleapis.com/auth/spreadsheets",
        "https://www.googleapis.com/auth/drive",
    ]

    try:
        creds = Credentials.from_service_account_file(service_account_json, scopes=scopes)
        client = gspread.authorize(creds)
        spreadsheet = client.open_by_key(spreadsheet_id)
    except Exception as e:
        logger.error(f"[SHEETS] Failed to connect to Google Sheets: {e}")
        return None

    sheet_url = f"https://docs.google.com/spreadsheets/d/{spreadsheet_id}"

    # --- Build data rows ---
    header_row = list(CSV_FIELDNAMES)
    data_rows = []
    for lead in leads:
        row_dict = lead.to_dict()
        data_rows.append([str(row_dict.get(col, "")) for col in CSV_FIELDNAMES])

    all_rows = [header_row] + data_rows

    # --- 1. Create/overwrite timestamped run worksheet ---
    ws_name = _make_worksheet_name(area, run_timestamp)
    try:
        try:
            run_ws = spreadsheet.add_worksheet(
                title=ws_name,
                rows=max(len(all_rows) + 10, 50),
                cols=len(CSV_FIELDNAMES),
            )
            logger.info(f"[SHEETS] Created new worksheet tab: '{ws_name}'")
        except gspread.exceptions.APIError:
            # Tab already exists — clear and reuse
            run_ws = spreadsheet.worksheet(ws_name)
            run_ws.clear()
            logger.info(f"[SHEETS] Cleared existing worksheet tab: '{ws_name}'")

        run_ws.update(all_rows, value_input_option="RAW")
        # Bold the header row
        run_ws.format("1:1", {"textFormat": {"bold": True}})
        logger.info(
            f"[SHEETS] ✓ Uploaded {len(leads)} leads to tab '{ws_name}' → {sheet_url}"
        )
    except Exception as e:
        logger.error(f"[SHEETS] Failed to write run worksheet '{ws_name}': {e}")
        return None

    # --- 2. Update Master Leads worksheet (append new, update existing by Place ID) ---
    if also_update_master:
        try:
            _upsert_master_sheet(spreadsheet, leads, header_row)
        except Exception as e:
            logger.warning(f"[SHEETS] Master sheet update failed (non-fatal): {e}")

    return f"{sheet_url}/edit"


def _upsert_master_sheet(spreadsheet, leads: List[Lead], header_row: list):
    """
    Upserts leads into a 'Master Leads' worksheet (creates it if absent).
    Matches by Place ID — updates existing rows, appends new ones.
    Keeps Master sheet sorted by Lead Score descending.
    """
    import gspread

    MASTER_TAB = "Master Leads"

    # Get or create master sheet
    try:
        master_ws = spreadsheet.worksheet(MASTER_TAB)
    except gspread.exceptions.WorksheetNotFound:
        master_ws = spreadsheet.add_worksheet(
            title=MASTER_TAB, rows=500, cols=len(CSV_FIELDNAMES)
        )
        master_ws.update([header_row], value_input_option="RAW")
        master_ws.format("1:1", {"textFormat": {"bold": True}})
        logger.info(f"[SHEETS] Created '{MASTER_TAB}' worksheet.")

    # Load existing master data
    existing_data = master_ws.get_all_records(head=1)

    # Build existing map: place_id → row_index (1-based, accounting for header)
    existing_map = {}  # place_id → dict row
    for row in existing_data:
        pid = str(row.get("Place ID", "")).strip()
        if pid and pid != "N/A":
            existing_map[pid] = row

    # Merge incoming leads
    for lead in leads:
        lead_dict = lead.to_dict()
        pid = str(lead_dict.get("Place ID", "")).strip()
        if pid and pid != "N/A":
            existing_map[pid] = lead_dict
        else:
            # No Place ID — use name+address key
            key = f"{lead.business.name}|{lead.business.address}"
            existing_map[key] = lead_dict

    # Sort all rows by Lead Score descending
    all_merged = list(existing_map.values())
    all_merged.sort(key=lambda r: float(r.get("Lead Score", 0)), reverse=True)

    # Rebuild sheet
    data_rows = [[str(r.get(col, "")) for col in CSV_FIELDNAMES] for r in all_merged]
    master_ws.clear()
    master_ws.update([header_row] + data_rows, value_input_option="RAW")
    master_ws.format("1:1", {"textFormat": {"bold": True}})
    logger.info(f"[SHEETS] ✓ Master Leads sheet updated: {len(all_merged)} total leads.")
