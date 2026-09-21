"use client";

import React, { useState, useEffect, useCallback } from "react";
import { Sparkles, RefreshCw, History, Layers } from "lucide-react";
import LeadRunForm from "../components/LeadRunForm";
import RunStatusCard from "../components/RunStatusCard";
import LeadsTable from "../components/LeadsTable";
import LeadDetailModal from "../components/LeadDetailModal";
import PastRunsModal from "../components/PastRunsModal";
import {
  fetchHealth,
  fetchStatus,
  fetchLeads,
  fetchPastRuns,
  fetchRunDetail,
  LeadItem,
  RunState,
  PastRunItem,
} from "../lib/api";

export default function Dashboard() {
  const [backendConnected, setBackendConnected] = useState<boolean | null>(null);
  const [runState, setRunState] = useState<RunState | null>(null);
  const [leads, setLeads] = useState<LeadItem[]>([]);
  const [pastRuns, setPastRuns] = useState<PastRunItem[]>([]);
  const [selectedLead, setSelectedLead] = useState<LeadItem | null>(null);
  const [showPastRuns, setShowPastRuns] = useState(false);
  const [activeRunTitle, setActiveRunTitle] = useState<string>("Master Leads Database");

  const loadLeadsData = useCallback(async () => {
    try {
      const data = await fetchLeads();
      setLeads(data);
    } catch (err) {
      console.error("Failed to load leads:", err);
    }
  }, []);

  const loadPastRunsData = useCallback(async () => {
    try {
      const runs = await fetchPastRuns();
      setPastRuns(runs);
    } catch (err) {
      console.error("Failed to load past runs:", err);
    }
  }, []);

  useEffect(() => {
    let interval: any = null;

    const checkStatus = async () => {
      try {
        const isHealthy = await fetchHealth();
        setBackendConnected(isHealthy);

        if (isHealthy) {
          const st = await fetchStatus();
          setRunState(st);

          if (st.status === "COMPLETED") {
            loadLeadsData();
            loadPastRunsData();
          }
        }
      } catch (e) {
        setBackendConnected(false);
      }
    };

    checkStatus();
    interval = setInterval(checkStatus, 2500);

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [loadLeadsData, loadPastRunsData]);

  useEffect(() => {
    loadLeadsData();
    loadPastRunsData();
  }, [loadLeadsData, loadPastRunsData]);

  const handleSelectPastRun = async (filename: string) => {
    try {
      const runLeads = await fetchRunDetail(filename);
      setLeads(runLeads);
      setActiveRunTitle(`Past Run: ${filename}`);
    } catch (err) {
      console.error("Failed to load past run detail:", err);
    }
  };

  const handleResetToMaster = () => {
    loadLeadsData();
    setActiveRunTitle("Master Leads Database");
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans selection:bg-indigo-500 selection:text-white">
      {/* Header */}
      <header className="border-b border-slate-200 bg-white/80 backdrop-blur-md sticky top-0 z-40 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3.5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-gradient-to-tr from-indigo-600 to-indigo-700 rounded-xl text-white shadow-md shadow-indigo-500/20">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-slate-900 tracking-tight flex items-center gap-2">
                Ratingbuddy <span className="text-[11px] bg-indigo-50 text-indigo-700 font-extrabold px-2.5 py-0.5 rounded-full border border-indigo-200">AI LEAD GEN V2</span>
              </h1>
              <p className="text-xs text-slate-500 font-medium">Sales Intelligence & Google Review Growth Engine</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-xl border bg-slate-100/80 border-slate-200">
              <span
                className={`w-2 h-2 rounded-full ${
                  backendConnected === true
                    ? "bg-emerald-500 animate-pulse"
                    : backendConnected === false
                    ? "bg-red-500"
                    : "bg-slate-400"
                }`}
              />
              <span className="text-slate-700">
                {backendConnected === true ? "Backend Online" : backendConnected === false ? "Backend Offline" : "Connecting..."}
              </span>
            </div>

            <button
              onClick={() => setShowPastRuns(true)}
              className="flex items-center gap-1.5 text-xs font-semibold bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 px-3.5 py-1.5 rounded-xl transition-all shadow-sm"
            >
              <History className="w-3.5 h-3.5 text-indigo-600" /> Past Runs ({pastRuns.length})
            </button>
          </div>
        </div>
      </header>

      {/* Offline Banner */}
      {backendConnected === false && (
        <div className="bg-amber-50 border-b border-amber-200 px-4 py-2.5 text-center text-xs font-medium text-amber-800">
          ⚠️ Python FastAPI Backend is offline. Run: <code className="bg-amber-100 px-2 py-0.5 rounded font-mono font-bold text-amber-900">cd backend && uvicorn server:app --port 8000</code> in terminal to start it.
        </div>
      )}

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        {/* Form + Status Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          <div className="lg:col-span-7">
            <LeadRunForm
              isRunning={runState?.status === "RUNNING"}
              onRunStarted={() => {
                setActiveRunTitle("Active Run Leads");
              }}
            />
          </div>

          <div className="lg:col-span-5">
            <RunStatusCard status={runState} />
          </div>
        </div>

        {/* Table Section */}
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                <Layers className="w-5 h-5 text-indigo-600" />
                {activeRunTitle}
              </h2>
              <p className="text-xs text-slate-500 font-medium">Ranked by 100-point transparent lead score with Google Maps links</p>
            </div>

            <div className="flex items-center gap-2">
              {activeRunTitle !== "Master Leads Database" && (
                <button
                  onClick={handleResetToMaster}
                  className="text-xs text-indigo-600 hover:text-indigo-800 font-semibold underline"
                >
                  Reset to Master Database
                </button>
              )}
              <button
                onClick={loadLeadsData}
                className="flex items-center gap-1.5 text-xs bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 px-3 py-1.5 rounded-xl font-semibold shadow-sm transition-colors"
              >
                <RefreshCw className="w-3.5 h-3.5 text-slate-500" /> Refresh
              </button>
            </div>
          </div>

          <LeadsTable leads={leads} onSelectLead={(lead) => setSelectedLead(lead)} />
        </div>
      </main>

      {/* Modals */}
      <LeadDetailModal lead={selectedLead} onClose={() => setSelectedLead(null)} />
      <PastRunsModal
        runs={pastRuns}
        isOpen={showPastRuns}
        onClose={() => setShowPastRuns(false)}
        onSelectRun={handleSelectPastRun}
      />
    </div>
  );
}
