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
  const [activeRunTitle, setActiveRunTitle] = useState<string>("Current Master Leads Database");

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
    setActiveRunTitle("Current Master Leads Database");
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans selection:bg-indigo-500 selection:text-white">
      <header className="border-b border-slate-800/80 bg-slate-900/60 backdrop-blur-md sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3.5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-gradient-to-tr from-indigo-500 to-purple-600 rounded-xl text-white shadow-lg shadow-indigo-500/20">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-white tracking-tight flex items-center gap-2">
                ReviewFlow <span className="text-xs bg-indigo-950 text-indigo-300 font-extrabold px-2 py-0.5 rounded border border-indigo-800">AI LEAD GEN V2</span>
              </h1>
              <p className="text-xs text-slate-400">Sales Intelligence & Google Review Growth Engine</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-lg border bg-slate-900 border-slate-800">
              <span
                className={`w-2 h-2 rounded-full ${
                  backendConnected === true
                    ? "bg-emerald-400 animate-pulse"
                    : backendConnected === false
                    ? "bg-red-500"
                    : "bg-slate-500"
                }`}
              />
              <span className="text-slate-300">
                {backendConnected === true ? "Backend Online" : backendConnected === false ? "Backend Offline" : "Connecting..."}
              </span>
            </div>

            <button
              onClick={() => setShowPastRuns(true)}
              className="flex items-center gap-1.5 text-xs font-semibold bg-slate-900 hover:bg-slate-800 text-slate-200 border border-slate-700 px-3 py-1.5 rounded-xl transition-all"
            >
              <History className="w-3.5 h-3.5 text-indigo-400" /> Past Runs ({pastRuns.length})
            </button>
          </div>
        </div>
      </header>

      {backendConnected === false && (
        <div className="bg-amber-950/80 border-b border-amber-800/80 px-4 py-2 text-center text-xs text-amber-200">
          ⚠️ Python FastAPI Backend is offline. Run: <code className="bg-amber-900 px-1.5 py-0.5 rounded font-mono">cd backend && uvicorn server:app --port 8000</code> in terminal to start it.
        </div>
      )}

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          <div className="lg:col-span-7">
            <LeadRunForm
              isRunning={runState?.status === "RUNNING"}
              onRunStarted={() => {
                setActiveRunTitle("Current Active Run Leads");
              }}
            />
          </div>

          <div className="lg:col-span-5">
            <RunStatusCard status={runState} />
          </div>
        </div>

        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h2 className="text-xl font-bold text-white flex items-center gap-2">
                <Layers className="w-5 h-5 text-indigo-400" />
                {activeRunTitle}
              </h2>
              <p className="text-xs text-slate-400">Ranked by 100-point transparent lead score with Google Maps links</p>
            </div>

            <div className="flex items-center gap-2">
              {activeRunTitle !== "Current Master Leads Database" && (
                <button
                  onClick={handleResetToMaster}
                  className="text-xs text-slate-400 hover:text-white underline font-medium"
                >
                  Reset to Master Database
                </button>
              )}
              <button
                onClick={loadLeadsData}
                className="flex items-center gap-1.5 text-xs bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800 px-3 py-1.5 rounded-xl font-semibold transition-colors"
              >
                <RefreshCw className="w-3.5 h-3.5" /> Refresh
              </button>
            </div>
          </div>

          <LeadsTable leads={leads} onSelectLead={(lead) => setSelectedLead(lead)} />
        </div>
      </main>

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
