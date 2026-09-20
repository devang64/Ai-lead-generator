"""
Storage and Upsert Engine for Lead Generator V2.
Preserves historical lead data, performs upsert operations by Place ID / normalized key,
and exports full 30-field schema to CSV, Excel (.xlsx), and JSON formats.
"""

import csv
import json
import os
import logging
from datetime import datetime, timezone
from typing import List, Dict, Tuple, Any

from lead_generator.models import Lead
from lead_generator.utils import normalize_text

logger = logging.getLogger("lead_generator.storage")

CSV_FIELDNAMES = [
    "Business Name",
    "Place ID",
    "Category",
    "Address",
    "Area",
    "City",
    "Rating",
    "Review Count",
    "Reviews Last 30 Days",
    "Reviews Last 90 Days",
    "Reviews Last 180 Days",
    "Review Velocity",
    "Competitor Count",
    "Strong Competitors Count",
    "Competitor Average Rating",
    "Competitor Average Reviews",
    "Top Competitor",
    "Top Competitor Rating",
    "Top Competitor Reviews",
    "Rating Gap",
    "Review Gap",
    "Phone",
    "Email",
    "Website",
    "Lead Score",
    "Lead Grade",
    "Contact Score",
    "Data Confidence",
    "Primary Pain Point",
    "Pain Point Evidence",
    "ReviewFlow Fit Reason",
    "Recommended Sales Angle",
    "Personalized Opening",
    "First Seen",
    "Last Checked",
    "Source",
    "Search Area",
    "Search Query",
]

def get_utc_now_iso() -> str:
    """Returns ISO 8601 formatted UTC timestamp."""
    return datetime.now(timezone.utc).isoformat().replace("+00:00", "Z")

def load_existing_leads_csv(csv_path: str) -> Dict[str, Dict[str, Any]]:
    """Loads existing CSV leads keyed by Place ID or normalized name."""
    existing_map: Dict[str, Dict[str, Any]] = {}
    if not os.path.exists(csv_path):
        return existing_map

    try:
        with open(csv_path, mode="r", encoding="utf-8") as f:
            reader = csv.DictReader(f)
            for row in reader:
                place_id = row.get("Place ID", "").strip()
                name = row.get("Business Name", "").strip()
                addr = row.get("Address", "").strip()

                key = place_id if place_id and place_id != "N/A" else f"{normalize_text(name)}|{normalize_text(addr)}"
                if key:
                    existing_map[key] = row
    except Exception as e:
        logger.error(f"Error reading existing CSV file '{csv_path}': {e}")

    return existing_map

def upsert_leads_to_csv(leads: List[Lead], csv_path: str = "leads.csv") -> Tuple[int, int, str]:
    """
    UPSERT leads into CSV database.
    Updates existing records while preserving 'First Seen' timestamp.
    Inserts new records seamlessly.
    Returns (inserted_count, updated_count, file_path).
    """
    existing_map = load_existing_leads_csv(csv_path)
    now_iso = get_utc_now_iso()

    inserted_count = 0
    updated_count = 0

    for lead in leads:
        lead_dict = lead.to_dict()
        b = lead.business
        key = b.place_id if b.place_id and b.place_id != "N/A" else f"{normalize_text(b.name)}|{normalize_text(b.address)}"

        if key in existing_map:
            original_first_seen = existing_map[key].get("First Seen") or lead_dict.get("First Seen") or now_iso
            lead_dict["First Seen"] = original_first_seen
            lead_dict["Last Checked"] = now_iso
            existing_map[key] = lead_dict
            updated_count += 1
        else:
            if not lead_dict.get("First Seen"):
                lead_dict["First Seen"] = now_iso
            lead_dict["Last Checked"] = now_iso
            existing_map[key] = lead_dict
            inserted_count += 1

    try:
        with open(csv_path, mode="w", newline="", encoding="utf-8") as f:
            writer = csv.DictWriter(f, fieldnames=CSV_FIELDNAMES)
            writer.writeheader()
            
            rows = list(existing_map.values())
            rows.sort(key=lambda r: float(r.get("Lead Score", 0.0)), reverse=True)

            for row in rows:
                writer.writerow(row)
    except Exception as e:
        logger.error(f"Error writing to CSV file '{csv_path}': {e}")

    return inserted_count, updated_count, csv_path

def export_leads_to_json(leads: List[Lead], json_path: str = "leads.json") -> str:
    """Exports leads into structured JSON format."""
    data = [lead.to_dict() for lead in leads]
    with open(json_path, mode="w", encoding="utf-8") as f:
        json.dump(data, f, indent=2)
    return json_path

def export_leads_to_excel(csv_path: str = "leads.csv", excel_path: str = "leads.xlsx") -> str:
    """Converts CSV leads sheet into an Excel (.xlsx) file using openpyxl if available."""
    try:
        import openpyxl
        wb = openpyxl.Workbook()
        ws = wb.active
        ws.title = "Sales Leads"

        if os.path.exists(csv_path):
            with open(csv_path, mode="r", encoding="utf-8") as f:
                reader = csv.reader(f)
                for row in reader:
                    ws.append(row)

            wb.save(excel_path)
            logger.info(f"Successfully exported Excel workbook to '{excel_path}'.")
            return excel_path
    except ImportError:
        logger.info("openpyxl library not installed. Skipping .xlsx export (leads.csv is available).")
    except Exception as e:
        logger.error(f"Error exporting Excel file '{excel_path}': {e}")

    return csv_path
