"use client";

import React, { useState } from "react";
import { Play, Sparkles, MapPin, Layers, Share2, Globe } from "lucide-react";
import { triggerRun } from "../lib/api";

const PRESET_LOCATIONS = [
  { state: "Gujarat", city: "Surat", area: "Adajan" },
  { state: "Gujarat", city: "Surat", area: "Vesu" },
  { state: "Gujarat", city: "Surat", area: "Pal" },
  { state: "Gujarat", city: "Ahmedabad", area: "Navrangpura" },
  { state: "Maharashtra", city: "Mumbai", area: "Bandra West" },
  { state: "Maharashtra", city: "Pune", area: "Koregaon Park" },
  { state: "Karnataka", city: "Bengaluru", area: "Koramangala" },
  { state: "Delhi", city: "New Delhi", area: "Connaught Place" },
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
  const [area, setArea] = useState("Adajan");
  const [city, setCity] = useState("Surat");
  const [state, setState] = useState("Gujarat");
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

  const handleSelectPreset = (loc: { state: string; city: string; area: string }) => {
    setState(loc.state);
    setCity(loc.city);
    setArea(loc.area);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    try {
      await triggerRun({
        area,
        city,
        state,
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
    <div className="bg-white border border-slate-200 rounded-2xl p-6 text-slate-900 shadow-sm">
      <div className="flex items-center justify-between mb-6 border-b border-slate-100 pb-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-indigo-50 border border-indigo-100 rounded-xl text-indigo-600">
            <Sparkles className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-slate-900 tracking-tight">Run Lead Generator</h2>
            <p className="text-xs text-slate-500 font-medium">Configure location & parameters to search live Google Maps</p>
          </div>
        </div>
      </div>

      {errorMsg && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl text-red-800 text-xs font-medium">
          {errorMsg}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Dynamic Location Inputs */}
        <div className="space-y-3">
          <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 flex items-center gap-1.5">
            <MapPin className="w-3.5 h-3.5 text-indigo-600" /> Target Location (Any State, City, Area)
          </label>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-[11px] font-bold text-slate-500 mb-1">State</label>
              <input
                type="text"
                value={state}
                onChange={(e) => setState(e.target.value)}
                required
                placeholder="e.g. Gujarat"
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-900 placeholder-slate-400 focus:outline-none focus:border-indigo-600 focus:ring-2 focus:ring-indigo-100 text-xs font-semibold"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-500 mb-1">City</label>
              <input
                type="text"
                value={city}
                onChange={(e) => setCity(e.target.value)}
                required
                placeholder="e.g. Surat"
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-900 placeholder-slate-400 focus:outline-none focus:border-indigo-600 focus:ring-2 focus:ring-indigo-100 text-xs font-semibold"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-500 mb-1">Area / Locality</label>
              <input
                type="text"
                value={area}
                onChange={(e) => setArea(e.target.value)}
                required
                placeholder="e.g. Adajan"
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-900 placeholder-slate-400 focus:outline-none focus:border-indigo-600 focus:ring-2 focus:ring-indigo-100 text-xs font-semibold"
              />
            </div>
          </div>

          {/* Quick Location Presets */}
          <div className="flex flex-wrap gap-1.5 pt-1">
            <span className="text-[11px] font-semibold text-slate-400 flex items-center gap-1 self-center mr-1">
              <Globe className="w-3 h-3" /> Presets:
            </span>
            {PRESET_LOCATIONS.map((loc) => {
              const isActive = state === loc.state && city === loc.city && area === loc.area;
              return (
                <button
                  key={`${loc.area}-${loc.city}`}
                  type="button"
                  onClick={() => handleSelectPreset(loc)}
                  className={`text-[11px] font-semibold px-2.5 py-1 rounded-lg border transition-all ${
                    isActive
                      ? "bg-indigo-50 border-indigo-300 text-indigo-700"
                      : "bg-slate-100/70 border-slate-200 text-slate-600 hover:bg-slate-200/60"
                  }`}
                >
                  {loc.area}, {loc.city}
                </button>
              );
            })}
          </div>
        </div>

        {/* Categories */}
        <div>
          <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-2 flex items-center gap-1.5">
            <Layers className="w-3.5 h-3.5 text-indigo-600" /> Categories
          </label>
          <div className="flex flex-wrap gap-2">
            {AVAILABLE_CATEGORIES.map((cat) => {
              const selected = categories.includes(cat);
              return (
                <button
                  key={cat}
                  type="button"
                  onClick={() => toggleCategory(cat)}
                  className={`text-xs font-bold px-3.5 py-1.5 rounded-xl border transition-all ${
                    selected
                      ? "bg-indigo-600 border-indigo-600 text-white shadow-sm shadow-indigo-600/30"
                      : "bg-slate-100/80 border-slate-200 text-slate-600 hover:bg-slate-200/80"
                  }`}
                >
                  {selected ? "✓ " : "+ "}
                  {cat}
                </button>
              );
            })}
          </div>
        </div>

        {/* Sliders / Numerical Options */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 bg-slate-50/80 p-4 rounded-xl border border-slate-200">
          <div>
            <label className="block text-[11px] font-bold text-slate-600 mb-1">
              Max Candidates / Cat
            </label>
            <input
              type="number"
              value={candidateLimit}
              onChange={(e) => setCandidateLimit(Number(e.target.value))}
              min={5}
              max={100}
              className="w-full bg-white border border-slate-300 rounded-lg px-3 py-1.5 text-xs font-bold text-slate-900 focus:outline-none focus:border-indigo-600"
            />
          </div>

          <div>
            <label className="block text-[11px] font-bold text-slate-600 mb-1">
              Top Final Leads
            </label>
            <input
              type="number"
              value={finalLimit}
              onChange={(e) => setFinalLimit(Number(e.target.value))}
              min={1}
              max={50}
              className="w-full bg-white border border-slate-300 rounded-lg px-3 py-1.5 text-xs font-bold text-slate-900 focus:outline-none focus:border-indigo-600"
            />
          </div>

          <div>
            <label className="block text-[11px] font-bold text-slate-600 mb-1">
              Rating Range (★)
            </label>
            <div className="flex items-center gap-1">
              <input
                type="number"
                step="0.1"
                value={minRating}
                onChange={(e) => setMinRating(Number(e.target.value))}
                className="w-full bg-white border border-slate-300 rounded-lg px-2 py-1.5 text-xs font-bold text-slate-900 focus:outline-none"
              />
              <span className="text-slate-400">-</span>
              <input
                type="number"
                step="0.1"
                value={maxRating}
                onChange={(e) => setMaxRating(Number(e.target.value))}
                className="w-full bg-white border border-slate-300 rounded-lg px-2 py-1.5 text-xs font-bold text-slate-900 focus:outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-bold text-slate-600 mb-1">
              Review Count Range
            </label>
            <div className="flex items-center gap-1">
              <input
                type="number"
                value={minReviews}
                onChange={(e) => setMinReviews(Number(e.target.value))}
                className="w-full bg-white border border-slate-300 rounded-lg px-2 py-1.5 text-xs font-bold text-slate-900 focus:outline-none"
              />
              <span className="text-slate-400">-</span>
              <input
                type="number"
                value={maxReviews}
                onChange={(e) => setMaxReviews(Number(e.target.value))}
                className="w-full bg-white border border-slate-300 rounded-lg px-2 py-1.5 text-xs font-bold text-slate-900 focus:outline-none"
              />
            </div>
          </div>
        </div>

        {/* Sheets Checkbox */}
        <div className="flex items-center gap-3 bg-emerald-50/80 border border-emerald-200/80 p-3 rounded-xl">
          <input
            type="checkbox"
            id="sheets-toggle"
            checked={uploadSheets}
            onChange={(e) => setUploadSheets(e.target.checked)}
            className="w-4 h-4 accent-emerald-600 rounded cursor-pointer"
          />
          <label htmlFor="sheets-toggle" className="text-xs font-bold text-emerald-800 cursor-pointer flex items-center gap-1.5">
            <Share2 className="w-3.5 h-3.5 text-emerald-600" />
            Upload generated leads directly to Google Sheets
          </label>
        </div>

        {/* Submit */}
        <button
          type="submit"
          disabled={isRunning}
          className={`w-full py-3.5 px-6 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-all ${
            isRunning
              ? "bg-slate-200 text-slate-400 cursor-not-allowed border border-slate-300"
              : "bg-indigo-600 hover:bg-indigo-700 text-white shadow-md shadow-indigo-600/20 active:scale-[0.99]"
          }`}
        >
          {isRunning ? (
            <>
              <div className="w-4 h-4 border-2 border-slate-400 border-t-transparent rounded-full animate-spin" />
              Searching Live Google Maps...
            </>
          ) : (
            <>
              <Play className="w-4 h-4 fill-white" />
              Start Live Lead Generation Run
            </>
          )}
        </button>
      </form>
    </div>
  );
}
