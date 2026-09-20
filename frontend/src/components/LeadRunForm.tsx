"use client";

import React, { useState } from "react";
import { Play, Sparkles, MapPin, Layers, Share2 } from "lucide-react";
import { triggerRun } from "../lib/api";

const PRESET_AREAS = [
  "Adajan Surat",
  "Pal Surat",
  "Vesu Surat",
  "VIP Road Surat",
  "Althan Surat",
  "Katargam Surat",
  "Varachha Surat",
];

const AVAILABLE_CATEGORIES = [
  "Salon",
  "Restaurant",
  "Cafe",
  "Spa",
  "Gym",
  "Dental Clinic",
];

interface LeadRunFormProps {
  isRunning: boolean;
  onRunStarted: () => void;
}

export default function LeadRunForm({ isRunning, onRunStarted }: LeadRunFormProps) {
  const [area, setArea] = useState("Adajan Surat");
  const [categories, setCategories] = useState<string[]>(["Salon", "Restaurant", "Cafe"]);
  const [candidateLimit, setCandidateLimit] = useState(50);
  const [finalLimit, setFinalLimit] = useState(15);
  const [minRating, setMinRating] = useState(3.5);
  const [maxRating, setMaxRating] = useState(4.3);
  const [minReviews, setMinReviews] = useState(5);
  const [maxReviews, setMaxReviews] = useState(80);
  const [uploadSheets, setUploadSheets] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const toggleCategory = (cat: string) => {
    if (categories.includes(cat)) {
      if (categories.length > 1) {
        setCategories(categories.filter((c) => c !== cat));
      }
    } else {
      setCategories([...categories, cat]);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    try {
      await triggerRun({
        area,
        categories,
        candidate_limit: Number(candidateLimit),
        final_limit: Number(finalLimit),
        min_rating: Number(minRating),
        max_rating: Number(maxRating),
        min_reviews: Number(minReviews),
        max_reviews: Number(maxReviews),
        upload_sheets: uploadSheets,
      });
      onRunStarted();
    } catch (err: any) {
      setErrorMsg(err.message || "Failed to launch pipeline");
    }
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 text-white shadow-xl">
      <div className="flex items-center justify-between mb-6 border-b border-slate-800 pb-4">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-gradient-to-tr from-indigo-500 to-purple-600 rounded-xl text-white">
            <Sparkles className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-xl font-bold tracking-tight">Run Lead Generator</h2>
            <p className="text-sm text-slate-400">Configure search parameters & launch pipeline</p>
          </div>
        </div>
      </div>

      {errorMsg && (
        <div className="mb-4 p-3 bg-red-950/80 border border-red-800 rounded-xl text-red-200 text-sm">
          {errorMsg}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
          <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2 flex items-center gap-1.5">
            <MapPin className="w-3.5 h-3.5 text-indigo-400" /> Target Search Area
          </label>
          <input
            type="text"
            value={area}
            onChange={(e) => setArea(e.target.value)}
            required
            placeholder="e.g. Adajan Surat"
            className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-slate-100 placeholder-slate-600 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 text-sm font-medium"
          />
          <div className="flex flex-wrap gap-1.5 mt-2">
            {PRESET_AREAS.map((preset) => (
              <button
                key={preset}
                type="button"
                onClick={() => setArea(preset)}
                className={`text-xs px-2.5 py-1 rounded-lg border transition-colors ${
                  area === preset
                    ? "bg-indigo-600/30 border-indigo-500 text-indigo-300"
                    : "bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200"
                }`}
              >
                {preset}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2 flex items-center gap-1.5">
            <Layers className="w-3.5 h-3.5 text-indigo-400" /> Categories
          </label>
          <div className="flex flex-wrap gap-2">
            {AVAILABLE_CATEGORIES.map((cat) => {
              const selected = categories.includes(cat);
              return (
                <button
                  key={cat}
                  type="button"
                  onClick={() => toggleCategory(cat)}
                  className={`text-xs font-semibold px-3 py-1.5 rounded-xl border transition-all ${
                    selected
                      ? "bg-indigo-600 border-indigo-500 text-white shadow-lg shadow-indigo-600/20"
                      : "bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700"
                  }`}
                >
                  {selected ? "✓ " : "+ "}
                  {cat}
                </button>
              );
            })}
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 bg-slate-950/60 p-4 rounded-xl border border-slate-800/80">
          <div>
            <label className="block text-[11px] font-semibold text-slate-400 mb-1">
              Max Candidates / Cat
            </label>
            <input
              type="number"
              value={candidateLimit}
              onChange={(e) => setCandidateLimit(Number(e.target.value))}
              min={5}
              max={100}
              className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-1.5 text-sm font-semibold text-white focus:outline-none focus:border-indigo-500"
            />
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-slate-400 mb-1">
              Top Final Leads
            </label>
            <input
              type="number"
              value={finalLimit}
              onChange={(e) => setFinalLimit(Number(e.target.value))}
              min={1}
              max={50}
              className="w-full bg-slate-900 border border-slate-800 rounded-lg px-3 py-1.5 text-sm font-semibold text-white focus:outline-none focus:border-indigo-500"
            />
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-slate-400 mb-1">
              Rating Range (★)
            </label>
            <div className="flex items-center gap-1">
              <input
                type="number"
                step="0.1"
                value={minRating}
                onChange={(e) => setMinRating(Number(e.target.value))}
                className="w-full bg-slate-900 border border-slate-800 rounded-lg px-2 py-1.5 text-xs text-white focus:outline-none"
              />
              <span className="text-slate-600">-</span>
              <input
                type="number"
                step="0.1"
                value={maxRating}
                onChange={(e) => setMaxRating(Number(e.target.value))}
                className="w-full bg-slate-900 border border-slate-800 rounded-lg px-2 py-1.5 text-xs text-white focus:outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-slate-400 mb-1">
              Review Count Range
            </label>
            <div className="flex items-center gap-1">
              <input
                type="number"
                value={minReviews}
                onChange={(e) => setMinReviews(Number(e.target.value))}
                className="w-full bg-slate-900 border border-slate-800 rounded-lg px-2 py-1.5 text-xs text-white focus:outline-none"
              />
              <span className="text-slate-600">-</span>
              <input
                type="number"
                value={maxReviews}
                onChange={(e) => setMaxReviews(Number(e.target.value))}
                className="w-full bg-slate-900 border border-slate-800 rounded-lg px-2 py-1.5 text-xs text-white focus:outline-none"
              />
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3 bg-emerald-950/30 border border-emerald-800/40 p-3 rounded-xl">
          <input
            type="checkbox"
            id="sheets-toggle"
            checked={uploadSheets}
            onChange={(e) => setUploadSheets(e.target.checked)}
            className="w-4 h-4 accent-emerald-500 rounded cursor-pointer"
          />
          <label htmlFor="sheets-toggle" className="text-xs font-semibold text-emerald-300 cursor-pointer flex items-center gap-1.5">
            <Share2 className="w-3.5 h-3.5 text-emerald-400" />
            Upload generated leads directly to Google Sheets
          </label>
        </div>

        <button
          type="submit"
          disabled={isRunning}
          className={`w-full py-3.5 px-6 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-all ${
            isRunning
              ? "bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-700"
              : "bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 text-white shadow-lg shadow-indigo-500/25 hover:opacity-95 active:scale-[0.99]"
          }`}
        >
          {isRunning ? (
            <>
              <div className="w-4 h-4 border-2 border-slate-400 border-t-transparent rounded-full animate-spin" />
              Pipeline Execution in Progress...
            </>
          ) : (
            <>
              <Play className="w-4 h-4 fill-white" />
              Start Lead Generation Run
            </>
          )}
        </button>
      </form>
    </div>
  );
}
