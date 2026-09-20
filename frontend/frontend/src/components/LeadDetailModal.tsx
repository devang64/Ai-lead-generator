"use client";

import React, { useState } from "react";
import { X, ExternalLink, Copy, Check, Star, ShieldCheck, MapPin, Phone, Globe, Flame, Award } from "lucide-react";
import { LeadItem } from "@/lib/api";

interface LeadDetailModalProps {
  lead: LeadItem | null;
  onClose: () => void;
}

export default function LeadDetailModal({ lead, onClose }: LeadDetailModalProps) {
  const [copied, setCopied] = useState(false);

  if (!lead) return null;

  const handleCopyOpening = () => {
    if (lead["Personalized Opening"]) {
      navigator.clipboard.writeText(lead["Personalized Opening"]);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const gradeColor =
    lead["Lead Grade"] === "A+"
      ? "bg-emerald-500/20 text-emerald-400 border-emerald-500/30"
      : lead["Lead Grade"] === "A"
      ? "bg-teal-500/20 text-teal-400 border-teal-500/30"
      : lead["Lead Grade"] === "B"
      ? "bg-blue-500/20 text-blue-400 border-blue-500/30"
      : "bg-amber-500/20 text-amber-400 border-amber-500/30";

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-800 w-full max-w-3xl max-h-[90vh] rounded-2xl shadow-2xl flex flex-col overflow-hidden text-white animate-in fade-in zoom-in-95 duration-200">
        {/* Modal Header */}
        <div className="p-6 border-b border-slate-800 flex items-start justify-between bg-slate-900/80">
          <div>
            <div className="flex items-center gap-3 mb-1">
              <h2 className="text-xl font-bold text-white">{lead["Business Name"]}</h2>
              <span className={`text-xs font-bold px-2.5 py-0.5 rounded-md border ${gradeColor}`}>
                Grade {lead["Lead Grade"]}
              </span>
              <span className="text-xs bg-slate-800 text-slate-300 font-medium px-2 py-0.5 rounded">
                {lead["Category"]}
              </span>
            </div>
            <p className="text-xs text-slate-400 flex items-center gap-1">
              <MapPin className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
              {lead["Address"]}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Content */}
        <div className="p-6 space-y-6 overflow-y-auto font-sans">
          {/* Quick Metrics & Links Bar */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="bg-slate-950/70 p-3 rounded-xl border border-slate-800">
              <div className="text-[11px] text-slate-400 uppercase font-semibold">Lead Score</div>
              <div className="text-lg font-extrabold text-indigo-400">{lead["Lead Score"]} / 100</div>
            </div>

            <div className="bg-slate-950/70 p-3 rounded-xl border border-slate-800">
              <div className="text-[11px] text-slate-400 uppercase font-semibold">Google Rating</div>
              <div className="text-lg font-extrabold text-amber-400 flex items-center gap-1">
                {lead["Rating"]} <Star className="w-4 h-4 fill-amber-400 text-amber-400" />
                <span className="text-xs text-slate-400 font-normal">({lead["Review Count"]} reviews)</span>
              </div>
            </div>

            <div className="bg-slate-950/70 p-3 rounded-xl border border-slate-800">
              <div className="text-[11px] text-slate-400 uppercase font-semibold">Contactability</div>
              <div className="text-lg font-extrabold text-emerald-400">{lead["Contact Score"]} / 100</div>
            </div>

            <div className="bg-slate-950/70 p-3 rounded-xl border border-slate-800 flex flex-col justify-between">
              <div className="text-[11px] text-slate-400 uppercase font-semibold">Google Maps</div>
              {lead["Google Maps Link"] ? (
                <a
                  href={lead["Google Maps Link"]}
                  target="_blank"
                  rel="noreferrer"
                  className="text-xs font-semibold text-indigo-400 hover:text-indigo-300 flex items-center gap-1"
                >
                  View Location <ExternalLink className="w-3.5 h-3.5" />
                </a>
              ) : (
                <span className="text-xs text-slate-500">N/A</span>
              )}
            </div>
          </div>

          {/* Contact Details */}
          <div className="flex flex-wrap gap-4 text-xs bg-slate-950/40 p-3 rounded-xl border border-slate-800/60 text-slate-300">
            <div className="flex items-center gap-1.5">
              <Phone className="w-3.5 h-3.5 text-indigo-400" />
              <span>Phone:</span> <strong>{lead["Phone"]}</strong>
            </div>
            {lead["Website"] !== "N/A" && (
              <div className="flex items-center gap-1.5">
                <Globe className="w-3.5 h-3.5 text-indigo-400" />
                <a href={lead["Website"]} target="_blank" rel="noreferrer" className="text-indigo-400 hover:underline">
                  Website
                </a>
              </div>
            )}
            <div className="flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
              <span>Data Confidence:</span> <strong className="text-emerald-300">{lead["Data Confidence"]}</strong>
            </div>
          </div>

          {/* Competitor Gap Analysis */}
          <div className="bg-slate-950/70 p-4 rounded-xl border border-slate-800 space-y-2">
            <div className="flex items-center gap-2 text-xs font-bold text-amber-400 uppercase tracking-wider">
              <Flame className="w-4 h-4" /> Competitor Gap Math
            </div>
            <p className="text-xs text-slate-300">
              Trailing top competitor <strong className="text-white">{lead["Top Competitor"]}</strong> (
              {lead["Top Competitor Rating"]}★ / {lead["Top Competitor Reviews"]} reviews) by{" "}
              <strong className="text-amber-300">{lead["Rating Gap"]}★ rating gap</strong> and{" "}
              <strong className="text-amber-300">{lead["Review Gap"]} reviews gap</strong>.
            </p>
          </div>

          {/* Sales Intelligence */}
          <div className="space-y-4">
            <div>
              <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Primary Pain Point</h4>
              <p className="text-sm font-medium text-slate-200 bg-slate-950 p-3 rounded-xl border border-slate-800">
                {lead["Primary Pain Point"]}
              </p>
            </div>

            <div>
              <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">ReviewFlow Fit Reason</h4>
              <p className="text-sm text-slate-300 bg-slate-950 p-3 rounded-xl border border-slate-800">
                {lead["ReviewFlow Fit Reason"]}
              </p>
            </div>

            <div>
              <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Recommended Sales Angle</h4>
              <p className="text-sm text-indigo-300 bg-indigo-950/30 p-3 rounded-xl border border-indigo-900/50 font-medium">
                {lead["Recommended Sales Angle"]}
              </p>
            </div>

            {/* Personalized Outreach Opening Pitch */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold text-emerald-400 uppercase tracking-wider flex items-center gap-1.5">
                  <Award className="w-4 h-4" /> Personalized Outreach Opening
                </h4>
                <button
                  onClick={handleCopyOpening}
                  className="flex items-center gap-1.5 text-xs bg-indigo-600 hover:bg-indigo-500 text-white px-3 py-1 rounded-lg font-semibold transition-colors"
                >
                  {copied ? <Check className="w-3.5 h-3.5 text-emerald-300" /> : <Copy className="w-3.5 h-3.5" />}
                  {copied ? "Copied Pitch!" : "Copy Pitch"}
                </button>
              </div>
              <div className="bg-slate-950 p-4 rounded-xl border border-emerald-900/50 text-sm italic text-slate-200 select-all leading-relaxed">
                "{lead["Personalized Opening"]}"
              </div>
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="p-4 border-t border-slate-800 bg-slate-900/80 flex justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-semibold transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
