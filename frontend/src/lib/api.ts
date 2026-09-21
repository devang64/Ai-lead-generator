const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export interface LeadItem {
  "Business Name": string;
  "Place ID": string;
  "Category": string;
  "Address": string;
  "Google Maps Link": string;
  "Area": string;
  "City": string;
  "Rating": string | number;
  "Review Count": string | number;
  "Reviews Last 30 Days": string | number;
  "Reviews Last 90 Days": string | number;
  "Reviews Last 180 Days": string | number;
  "Review Velocity": string | number;
  "Competitor Count": string | number;
  "Strong Competitors Count": string | number;
  "Competitor Average Rating": string | number;
  "Competitor Average Reviews": string | number;
  "Top Competitor": string;
  "Top Competitor Rating": string | number;
  "Top Competitor Reviews": string | number;
  "Rating Gap": string | number;
  "Review Gap": string | number;
  "Phone": string;
  "Email": string;
  "Website": string;
  "Lead Score": string | number;
  "Lead Grade": string;
  "Contact Score": string | number;
  "Data Confidence": string;
  "Primary Pain Point": string;
  "Pain Point Evidence": string;
  "Ratingbuddy Fit Reason": string;
  "Recommended Sales Angle": string;
  "Personalized Opening": string;
  "First Seen": string;
  "Last Checked": string;
  "Source": string;
  "Search Area": string;
  "Search Query": string;
}

export interface RunState {
  status: "IDLE" | "RUNNING" | "COMPLETED" | "ERROR";
  started_at: string | null;
  completed_at: string | null;
  area: string;
  categories: string[];
  error: string | null;
  leads_count: number;
  sheet_url: string | null;
  logs: string[];
}

export interface PastRunItem {
  filename: string;
  timestamp: string;
  area: string;
  leads_count: number;
  size_bytes: number;
}

export async function fetchHealth(): Promise<boolean> {
  try {
    const res = await fetch(`${API_BASE_URL}/api/health`);
    return res.ok;
  } catch {
    return false;
  }
}

export async function triggerRun(data: {
  area: string;
  city: string;
  state: string;
  categories: string[];
  candidate_limit: number;
  final_limit: number;
  min_rating: number;
  max_rating: number;
  min_reviews: number;
  max_reviews: number;
  upload_sheets: boolean;
}): Promise<void> {
  const res = await fetch(`${API_BASE_URL}/api/run`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.detail || "Failed to trigger run");
  }
}

export async function fetchStatus(): Promise<RunState> {
  const res = await fetch(`${API_BASE_URL}/api/status`);
  if (!res.ok) throw new Error("Failed to fetch status");
  return res.json();
}

export async function fetchLeads(): Promise<LeadItem[]> {
  const res = await fetch(`${API_BASE_URL}/api/leads`);
  if (!res.ok) throw new Error("Failed to fetch leads");
  const data = await res.json();
  return data.leads || [];
}

export async function fetchPastRuns(): Promise<PastRunItem[]> {
  const res = await fetch(`${API_BASE_URL}/api/runs`);
  if (!res.ok) throw new Error("Failed to fetch past runs");
  const data = await res.json();
  return data.runs || [];
}

export async function fetchRunDetail(filename: string): Promise<LeadItem[]> {
  const res = await fetch(`${API_BASE_URL}/api/runs/${filename}`);
  if (!res.ok) throw new Error("Failed to fetch run details");
  const data = await res.json();
  return data.leads || [];
}
