"use client";

import React, { useEffect, useRef } from "react";
import { CheckCircle2, AlertCircle, Loader2, Terminal, ExternalLink } from "lucide-react";
import { RunState } from "../lib/api";

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
      <div className="bg-white border border-slate-200 rounded-2xl p-6 text-slate-500 flex flex-col items-center justify-center min-h-[160px] text-center shadow-sm">
        <Terminal className="w-8 h-8 text-slate-400 mb-2" />
        <p className="text-sm font-bold text-slate-700">Ready to run</p>
        <p className="text-xs text-slate-400 font-medium">Select an area above and click "Start Lead Generation Run"</p>
      </div>
    );
  }

  const isRunning = status.status === "RUNNING";
  const isCompleted = status.status === "COMPLETED";
  const isError = status.status === "ERROR";

  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-4 text-slate-900">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-100 pb-4">
        <div className="flex items-center gap-3">
          {isRunning && <Loader2 className="w-6 h-6 text-indigo-600 animate-spin" />}
          {isCompleted && <CheckCircle2 className="w-6 h-6 text-emerald-600" />}
          {isError && <AlertCircle className="w-6 h-6 text-red-600" />}
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-lg font-bold text-slate-900">
                {isRunning && "Pipeline Running..."}
                {isCompleted && "Run Completed!"}
                {isError && "Run Failed"}
              </h3>
              <span
                className={`text-[10px] uppercase tracking-wider font-extrabold px-2.5 py-0.5 rounded-full border ${
                  isRunning
                    ? "bg-indigo-50 text-indigo-700 border-indigo-200"
                    : isCompleted
                    ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                    : "bg-red-50 text-red-700 border-red-200"
                }`}
              >
                {status.status}
              </span>
            </div>
            <p className="text-xs text-slate-500 font-medium mt-0.5">
              Area: <span className="text-slate-800 font-bold">{status.area}</span> · Categories:{" "}
              <span className="text-slate-800 font-bold">{status.categories.join(", ")}</span>
            </p>
          </div>
        </div>

        {status.sheet_url && (
          <a
            href={status.sheet_url}
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-1.5 text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white px-3.5 py-1.5 rounded-xl transition-all shadow-sm"
          >
            Open Sheet <ExternalLink className="w-3.5 h-3.5" />
          </a>
        )}
      </div>

      {/* Stats summary */}
      {isCompleted && (
        <div className="grid grid-cols-2 gap-3 bg-emerald-50/80 border border-emerald-200/80 p-3 rounded-xl text-xs">
          <div>
            <span className="text-slate-600 font-medium">Leads Generated:</span>{" "}
            <strong className="text-emerald-800 font-extrabold">{status.leads_count} leads</strong>
          </div>
          <div>
            <span className="text-slate-600 font-medium">Completed At:</span>{" "}
            <strong className="text-slate-800 font-bold">
              {status.completed_at ? new Date(status.completed_at).toLocaleTimeString() : "N/A"}
            </strong>
          </div>
        </div>
      )}

      {/* Error detail */}
      {isError && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-800 font-medium">
          <strong>Error:</strong> {status.error}
        </div>
      )}

      {/* Terminal Log Stream */}
      <div>
        <div className="flex items-center justify-between text-xs text-slate-600 font-semibold mb-1.5">
          <span className="flex items-center gap-1 font-mono text-[11px]">
            <Terminal className="w-3.5 h-3.5 text-slate-500" /> Execution Logs
          </span>
          <span className="text-[10px] text-slate-400">{status.logs?.length || 0} lines</span>
        </div>
        <div
          ref={logContainerRef}
          className="bg-slate-900 border border-slate-800 rounded-xl p-3 h-44 overflow-y-auto font-mono text-[11px] text-slate-200 space-y-1 select-text shadow-inner"
        >
          {status.logs && status.logs.length > 0 ? (
            status.logs.map((log, idx) => (
              <div
                key={idx}
                className={
                  log.includes("[ERROR]")
                    ? "text-red-400 font-bold"
                    : log.includes("[WARNING]")
                    ? "text-amber-300"
                    : log.includes("✓") || log.includes("[STORAGE]") || log.includes("[SHEETS]")
                    ? "text-emerald-400 font-bold"
                    : "text-slate-300"
                }
              >
                {log}
              </div>
            ))
          ) : (
            <span className="text-slate-500">Waiting for logs...</span>
          )}
        </div>
      </div>
    </div>
  );
}
