"""
FastAPI REST Server for AI Lead Generator Dashboard UI.
Provides API endpoints to trigger lead generation runs, monitor live execution status,
fetch current leads, and browse past runs history.
"""

import csv
import json
import logging
import os
import sys
import threading
import time
from datetime import datetime
from typing import List, Dict, Any, Optional

from fastapi import FastAPI, BackgroundTasks, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

# Ensure backend directory is in python path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from lead_generator.cli import run_pipeline
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
    GOOGLE_SHEETS_SPREADSHEET_ID,
    RUNS_DIR,
)
from lead_generator.storage import CSV_FIELDNAMES, load_existing_leads_csv

# Configure logging to capture logs in memory for live UI streaming
class ListLogHandler(logging.Handler):
    def __init__(self):
        super().__init__()
        self.logs: List[str] = []

    def emit(self, record):
        try:
            msg = self.format(record)
            self.logs.append(msg)
            if len(self.logs) > 500:
                self.logs.pop(0)
        except Exception:
            pass

log_handler = ListLogHandler()
log_handler.setFormatter(logging.Formatter("[%(levelname)s] %(message)s"))
logging.getLogger("lead_generator").addHandler(log_handler)
logging.getLogger("lead_generator").setLevel(logging.INFO)

app = FastAPI(title="AI Lead Generator Backend API", version="2.0")

# Enable CORS for Next.js frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Global execution state
execution_state: Dict[str, Any] = {
    "status": "IDLE",  # IDLE | RUNNING | COMPLETED | ERROR
    "started_at": None,
    "completed_at": None,
    "area": "",
    "categories": [],
    "error": None,
    "leads_count": 0,
    "sheet_url": None,
}

state_lock = threading.Lock()

class RunRequest(BaseModel):
    area: str = Field(default=DEFAULT_AREA, description="Target search area (e.g. 'Adajan Surat')")
    categories: List[str] = Field(default=DEFAULT_CATEGORIES, description="List of categories")
    candidate_limit: int = Field(default=DEFAULT_CANDIDATE_LIMIT, description="Candidates per category")
    final_limit: int = Field(default=DEFAULT_FINAL_LIMIT, description="Top final leads count")
    min_rating: float = Field(default=DEFAULT_MIN_RATING)
    max_rating: float = Field(default=DEFAULT_MAX_RATING)
    min_reviews: int = Field(default=DEFAULT_MIN_REVIEWS)
    max_reviews: int = Field(default=DEFAULT_MAX_REVIEWS)
    upload_sheets: bool = Field(default=True, description="Upload to Google Sheets")
    spreadsheet_id: Optional[str] = Field(default=GOOGLE_SHEETS_SPREADSHEET_ID)

def execute_pipeline_task(req: RunRequest):
    global execution_state
    with state_lock:
        execution_state["status"] = "RUNNING"
        execution_state["started_at"] = datetime.now().isoformat()
        execution_state["completed_at"] = None
        execution_state["area"] = req.area
        execution_state["categories"] = req.categories
        execution_state["error"] = None
        execution_state["leads_count"] = 0
        execution_state["sheet_url"] = None
        log_handler.logs.clear()

    try:
        leads = run_pipeline(
            area=req.area,
            categories=req.categories,
            limit=req.candidate_limit,
            final_limit=req.final_limit,
            min_rating=req.min_rating,
            max_rating=req.max_rating,
            min_reviews=req.min_reviews,
            max_reviews=req.max_reviews,
            csv_path=DEFAULT_CSV_PATH,
            runs_dir=RUNS_DIR,
            upload_sheets=req.upload_sheets,
            sheets_spreadsheet_id=req.spreadsheet_id if req.upload_sheets else "",
        )
        with state_lock:
            execution_state["status"] = "COMPLETED"
            execution_state["completed_at"] = datetime.now().isoformat()
            execution_state["leads_count"] = len(leads)
            if req.upload_sheets and req.spreadsheet_id:
                execution_state["sheet_url"] = f"https://docs.google.com/spreadsheets/d/{req.spreadsheet_id}"
    except Exception as e:
        with state_lock:
            execution_state["status"] = "ERROR"
            execution_state["completed_at"] = datetime.now().isoformat()
            execution_state["error"] = str(e)
        logging.getLogger("lead_generator").error(f"Pipeline run error: {e}")

@app.get("/api/health")
def health_check():
    return {"status": "ok", "timestamp": datetime.now().isoformat()}

@app.get("/api/status")
def get_status():
    with state_lock:
        state = dict(execution_state)
        state["logs"] = list(log_handler.logs)
        return state

@app.post("/api/run")
def trigger_run(req: RunRequest):
    with state_lock:
        if execution_state["status"] == "RUNNING":
            raise HTTPException(status_code=400, detail="A pipeline execution is already in progress.")

    thread = threading.Thread(target=execute_pipeline_task, args=(req,), daemon=True)
    thread.start()

    return {"message": "Lead generation pipeline launched successfully.", "area": req.area, "categories": req.categories}

@app.get("/api/leads")
def get_leads():
    """Returns current leads from master CSV as list of dicts."""
    csv_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), DEFAULT_CSV_PATH)
    if not os.path.exists(csv_path):
        return {"leads": [], "total": 0}

    try:
        with open(csv_path, mode="r", encoding="utf-8") as f:
            reader = csv.DictReader(f)
            leads = list(reader)
            return {"leads": leads, "total": len(leads)}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to read leads CSV: {e}")

@app.get("/api/runs")
def list_runs():
    """Lists past timestamped run CSV files."""
    runs_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), RUNS_DIR)
    if not os.path.exists(runs_path):
        return {"runs": []}

    runs = []
    try:
        files = [f for f in os.listdir(runs_path) if f.startswith("leads_") and f.endswith(".csv")]
        files.sort(reverse=True)

        for filename in files:
            filepath = os.path.join(runs_path, filename)
            count = 0
            try:
                with open(filepath, mode="r", encoding="utf-8") as f:
                    reader = csv.DictReader(f)
                    count = len(list(reader))
            except Exception:
                pass

            # Extract area & timestamp from filename: leads_YYYY-MM-DD_HH-MM-SS_Area_Name.csv
            parts = filename.replace(".csv", "").split("_")
            timestamp_str = f"{parts[1]} {parts[2].replace('-', ':')}" if len(parts) >= 3 else "Unknown"
            area_str = " ".join(parts[3:]) if len(parts) >= 4 else "Surat"

            runs.append({
                "filename": filename,
                "timestamp": timestamp_str,
                "area": area_str,
                "leads_count": count,
                "size_bytes": os.path.getsize(filepath),
            })
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to list runs: {e}")

    return {"runs": runs}

@app.get("/api/runs/{filename}")
def get_run_detail(filename: str):
    """Returns leads from a specific run CSV file."""
    if ".." in filename or "/" in filename:
        raise HTTPException(status_code=400, detail="Invalid filename.")

    runs_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), RUNS_DIR)
    filepath = os.path.join(runs_path, filename)

    if not os.path.exists(filepath):
        raise HTTPException(status_code=404, detail="Run file not found.")

    try:
        with open(filepath, mode="r", encoding="utf-8") as f:
            reader = csv.DictReader(f)
            leads = list(reader)
            return {"filename": filename, "leads": leads, "total": len(leads)}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to read run file: {e}")
