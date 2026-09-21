"use client";

import React, { useState } from "react";
import { X, ExternalLink, Copy, Check, Star, ShieldCheck, MapPin, Phone, Globe, Flame, Award } from "lucide-react";
import { LeadItem } from "../lib/api";

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
      ? "bg-emerald-50 text-emerald-700 border-emerald-300"
      : lead["Lead Grade"] === "A"
      ? "bg-teal-50 text-teal-700 border-teal-300"
      : lead["Lead Grade"] === "B"
      ? "bg-blue-50 text-blue-700 border-blue-300"
      : "bg-amber-50 text-amber-700 border-amber-300";

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white border border-slate-200 w-full max-w-3xl max-h-[90vh] rounded-2xl shadow-2xl flex flex-col overflow-hidden text-slate-900">
        {/* Header */}
        <div className="p-6 border-b border-slate-200 flex items-start justify-between bg-slate-50/80">
          <div>
            <div className="flex items-center gap-3 mb-1">
              <h2 className="text-xl font-bold text-slate-900">{lead["Business Name"]}</h2>
              <span className={`text-xs font-extrabold px-2.5 py-0.5 rounded-md border ${gradeColor}`}>
                Grade {lead["Lead Grade"]}
              </span>
              <span className="text-xs bg-slate-200/70 text-slate-700 font-bold px-2 py-0.5 rounded">
                {lead["Category"]}
              </span>
            </div>
            <p className="text-xs text-slate-600 font-medium flex items-center gap-1">
              <MapPin className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
              {lead["Address"]}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6 overflow-y-auto font-sans">
          {/* Quick Metrics Bar */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
              <div className="text-[11px] text-slate-500 uppercase font-bold">Lead Score</div>
              <div className="text-lg font-black text-indigo-600">{lead["Lead Score"]} / 100</div>
            </div>

            <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
              <div className="text-[11px] text-slate-500 uppercase font-bold">Google Rating</div>
              <div className="text-lg font-black text-amber-600 flex items-center gap-1">
                {lead["Rating"]} <Star className="w-4 h-4 fill-amber-500 text-amber-500" />
                <span className="text-xs text-slate-500 font-normal">({lead["Review Count"]} reviews)</span>
              </div>
            </div>

            <div className="bg-slate-50 p-3 rounded-xl border border-slate-200">
              <div className="text-[11px] text-slate-500 uppercase font-bold">Contactability</div>
              <div className="text-lg font-black text-emerald-600">{lead["Contact Score"]} / 100</div>
            </div>

            <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 flex flex-col justify-between">
              <div className="text-[11px] text-slate-500 uppercase font-bold">Google Maps</div>
              {lead["Google Maps Link"] ? (
                <a
                  href={lead["Google Maps Link"]}
                  target="_blank"
                  rel="noreferrer"
                  className="text-xs font-bold text-indigo-600 hover:text-indigo-800 flex items-center gap-1 hover:underline"
                >
                  View Location <ExternalLink className="w-3.5 h-3.5" />
                </a>
              ) : (
                <span className="text-xs text-slate-400 font-medium">N/A</span>
              )}
            </div>
          </div>

          {/* Contact Bar */}
          <div className="flex flex-wrap gap-4 text-xs bg-slate-50 p-3 rounded-xl border border-slate-200 text-slate-700 font-medium">
            <div className="flex items-center gap-1.5">
              <Phone className="w-3.5 h-3.5 text-indigo-600" />
              <span>Phone:</span> <strong className="text-slate-900 font-bold">{lead["Phone"]}</strong>
            </div>
            {lead["Website"] !== "N/A" && (
              <div className="flex items-center gap-1.5">
                <Globe className="w-3.5 h-3.5 text-indigo-600" />
                <a href={lead["Website"]} target="_blank" rel="noreferrer" className="text-indigo-600 font-bold hover:underline">
                  Website
                </a>
              </div>
            )}
            <div className="flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
              <span>Data Confidence:</span> <strong className="text-emerald-700 font-bold">{lead["Data Confidence"]}</strong>
            </div>
          </div>

          {/* Competitor Gap */}
          <div className="bg-amber-50/70 p-4 rounded-xl border border-amber-200 space-y-1.5">
            <div className="flex items-center gap-2 text-xs font-bold text-amber-800 uppercase tracking-wider">
              <Flame className="w-4 h-4 text-amber-600" /> Competitor Gap Math
            </div>
            <p className="text-xs text-amber-900 font-medium">
              Trailing top competitor <strong className="text-slate-900 font-bold">{lead["Top Competitor"]}</strong> (
              {lead["Top Competitor Rating"]}★ / {lead["Top Competitor Reviews"]} reviews) by{" "}
              <strong className="text-amber-800 font-extrabold">{lead["Rating Gap"]}★ rating gap</strong> and{" "}
              <strong className="text-amber-800 font-extrabold">{lead["Review Gap"]} reviews gap</strong>.
            </p>
          </div>

          {/* Intelligence */}
          <div className="space-y-4">
            <div>
              <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Primary Pain Point</h4>
              <p className="text-sm font-semibold text-slate-800 bg-slate-50 p-3 rounded-xl border border-slate-200">
                {lead["Primary Pain Point"]}
              </p>
            </div>

            <div>
              <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Ratingbuddy Fit Reason</h4>
              <p className="text-sm text-slate-700 bg-slate-50 p-3 rounded-xl border border-slate-200 font-medium">
                {lead["Ratingbuddy Fit Reason"]}
              </p>
            </div>

            <div>
              <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Recommended Sales Angle</h4>
              <p className="text-sm text-indigo-900 bg-indigo-50 p-3 rounded-xl border border-indigo-200 font-semibold">
                {lead["Recommended Sales Angle"]}
              </p>
            </div>

            {/* Pitch */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold text-emerald-700 uppercase tracking-wider flex items-center gap-1.5">
                  <Award className="w-4 h-4 text-emerald-600" /> Personalized Outreach Opening
                </h4>
                <button
                  onClick={handleCopyOpening}
                  className="flex items-center gap-1.5 text-xs bg-indigo-600 hover:bg-indigo-700 text-white px-3 py-1 rounded-lg font-bold transition-all shadow-sm"
                >
                  {copied ? <Check className="w-3.5 h-3.5 text-emerald-200" /> : <Copy className="w-3.5 h-3.5" />}
                  {copied ? "Copied Pitch!" : "Copy Pitch"}
                </button>
              </div>
              <div className="bg-emerald-50/60 p-4 rounded-xl border border-emerald-200 text-sm font-medium italic text-slate-800 select-all leading-relaxed">
                "{lead["Personalized Opening"]}"
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-200 bg-slate-50 flex justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2 bg-slate-200 hover:bg-slate-300 text-slate-800 rounded-xl text-xs font-bold transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
