"use client";

import React, { useEffect, useRef } from "react";
import { CheckCircle2, AlertCircle, Loader2, Terminal, ExternalLink } from "lucide-react";
import { RunState } from "@/lib/api";

interface RunStatusCardProps {
  status: RunState | null;
}

export default function RunStatusCard({ status }: RunStatusCardProps) {
  const logContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (logContainerRef.current) {
      logContainerRef.current.scrollTop = logContainerRef.current.scrollHeight;
    }
  }, [status?.logs]);

  if (!status || status.status === "IDLE") {
    return (
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 text-slate-400 flex flex-col items-center justify-center min-h-[160px] text-center">
        <Terminal className="w-8 h-8 text-slate-600 mb-2" />
        <p className="text-sm font-medium">Ready to run</p>
        <p className="text-xs text-slate-500">Select an area above and click "Start Lead Generation Run"</p>
      </div>
    );
  }

  const isRunning = status.status === "RUNNING";
  const isCompleted = status.status === "COMPLETED";
  const isError = status.status === "ERROR";

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-800 pb-4">
        <div className="flex items-center gap-3">
          {isRunning && <Loader2 className="w-6 h-6 text-indigo-400 animate-spin" />}
          {isCompleted && <CheckCircle2 className="w-6 h-6 text-emerald-400" />}
          {isError && <AlertCircle className="w-6 h-6 text-red-400" />}
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-lg font-bold text-white">
                {isRunning && "Pipeline Running..."}
                {isCompleted && "Run Completed Successfully!"}
                {isError && "Run Failed"}
              </h3>
              <span
                className={`text-[10px] uppercase tracking-wider font-extrabold px-2 py-0.5 rounded-md ${
                  isRunning
                    ? "bg-indigo-950 text-indigo-300 border border-indigo-700"
                    : isCompleted
                    ? "bg-emerald-950 text-emerald-300 border border-emerald-700"
                    : "bg-red-950 text-red-300 border border-red-700"
                }`}
              >
                {status.status}
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Area: <span className="text-slate-200 font-semibold">{status.area}</span> · Categories:{" "}
              <span className="text-slate-200 font-semibold">{status.categories.join(", ")}</span>
            </p>
          </div>
        </div>

        {status.sheet_url && (
          <a
            href={status.sheet_url}
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-1.5 text-xs font-semibold bg-emerald-600 hover:bg-emerald-500 text-white px-3 py-1.5 rounded-lg transition-colors shadow-md shadow-emerald-900/40"
          >
            Open Sheet <ExternalLink className="w-3.5 h-3.5" />
          </a>
        )}
      </div>

      {/* Stats summary */}
      {isCompleted && (
        <div className="grid grid-cols-2 gap-3 bg-emerald-950/20 border border-emerald-900/30 p-3 rounded-xl text-xs">
          <div>
            <span className="text-slate-400">Leads Generated:</span>{" "}
            <strong className="text-emerald-300 font-bold">{status.leads_count} leads</strong>
          </div>
          <div>
            <span className="text-slate-400">Completed At:</span>{" "}
            <strong className="text-slate-200">
              {status.completed_at ? new Date(status.completed_at).toLocaleTimeString() : "N/A"}
            </strong>
          </div>
        </div>
      )}

      {/* Error detail */}
      {isError && (
        <div className="p-3 bg-red-950/80 border border-red-800 rounded-xl text-xs text-red-200">
          <strong>Error:</strong> {status.error}
        </div>
      )}

      {/* Terminal Log Stream */}
      <div>
        <div className="flex items-center justify-between text-xs text-slate-400 mb-1.5">
          <span className="flex items-center gap-1 font-mono text-[11px]">
            <Terminal className="w-3.5 h-3.5 text-slate-500" /> Execution Logs
          </span>
          <span className="text-[10px] text-slate-500">{status.logs?.length || 0} lines</span>
        </div>
        <div
          ref={logContainerRef}
          className="bg-slate-950 border border-slate-800 rounded-xl p-3 h-44 overflow-y-auto font-mono text-[11px] text-slate-300 space-y-1 select-text"
        >
          {status.logs && status.logs.length > 0 ? (
            status.logs.map((log, idx) => (
              <div
                key={idx}
                className={
                  log.includes("[ERROR]")
                    ? "text-red-400 font-semibold"
                    : log.includes("[WARNING]")
                    ? "text-amber-300"
                    : log.includes("✓") || log.includes("[STORAGE]") || log.includes("[SHEETS]")
                    ? "text-emerald-400 font-semibold"
                    : "text-slate-300"
                }
              >
                {log}
              </div>
            ))
          ) : (
            <span className="text-slate-600">Waiting for logs...</span>
          )}
        </div>
      </div>
    </div>
  );
}
