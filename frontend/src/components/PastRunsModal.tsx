"use client";

import React from "react";
import { X, History, Calendar, FileText, ChevronRight } from "lucide-react";
import { PastRunItem } from "../lib/api";

interface PastRunsModalProps {
  runs: PastRunItem[];
  isOpen: boolean;
  onClose: () => void;
  onSelectRun: (filename: string) => void;
}

export default function PastRunsModal({ runs, isOpen, onClose, onSelectRun }: PastRunsModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white border border-slate-200 w-full max-w-xl max-h-[80vh] rounded-2xl shadow-2xl flex flex-col overflow-hidden text-slate-900">
        <div className="p-5 border-b border-slate-200 flex items-center justify-between bg-slate-50/80">
          <div className="flex items-center gap-2">
            <History className="w-5 h-5 text-indigo-600" />
            <h3 className="text-lg font-bold text-slate-900">Past Pipeline Runs</h3>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200/60">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-4 space-y-2 overflow-y-auto">
          {runs.length === 0 ? (
            <p className="text-xs text-slate-500 font-medium text-center py-8">No historical runs saved yet.</p>
          ) : (
            runs.map((r) => (
              <div
                key={r.filename}
                onClick={() => {
                  onSelectRun(r.filename);
                  onClose();
                }}
                className="bg-slate-50 border border-slate-200 hover:border-indigo-400 hover:bg-indigo-50/50 p-3.5 rounded-xl cursor-pointer transition-all flex items-center justify-between group"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <Calendar className="w-3.5 h-3.5 text-indigo-600" />
                    <span className="text-sm font-bold text-slate-900">{r.timestamp}</span>
                    <span className="text-xs bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded border border-indigo-200 font-extrabold">
                      {r.area}
                    </span>
                  </div>
                  <div className="text-xs text-slate-500 font-medium flex items-center gap-3 mt-1">
                    <span className="flex items-center gap-1">
                      <FileText className="w-3 h-3 text-slate-400" /> {r.leads_count} leads saved
                    </span>
                    <span>·</span>
                    <span>{(r.size_bytes / 1024).toFixed(1)} KB</span>
                  </div>
                </div>

                <ChevronRight className="w-5 h-5 text-slate-400 group-hover:text-indigo-600 transition-colors" />
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
