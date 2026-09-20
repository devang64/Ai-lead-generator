"use client";

import React, { useState, useMemo } from "react";
import { Search, Star, ExternalLink, Filter, Eye, Phone } from "lucide-react";
import { LeadItem } from "../lib/api";

interface LeadsTableProps {
  leads: LeadItem[];
  onSelectLead: (lead: LeadItem) => void;
}

export default function LeadsTable({ leads, onSelectLead }: LeadsTableProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [gradeFilter, setGradeFilter] = useState<string>("ALL");
  const [categoryFilter, setCategoryFilter] = useState<string>("ALL");

  const categories = useMemo(() => {
    const cats = new Set(leads.map((l) => l["Category"]).filter(Boolean));
    return ["ALL", ...Array.from(cats)];
  }, [leads]);

  const filteredLeads = useMemo(() => {
    return leads.filter((l) => {
      const matchSearch =
        !searchTerm ||
        l["Business Name"]?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        l["Address"]?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        l["Area"]?.toLowerCase().includes(searchTerm.toLowerCase());

      const matchGrade = gradeFilter === "ALL" || l["Lead Grade"] === gradeFilter;
      const matchCategory = categoryFilter === "ALL" || l["Category"] === categoryFilter;

      return matchSearch && matchGrade && matchCategory;
    });
  }, [leads, searchTerm, gradeFilter, categoryFilter]);

  if (leads.length === 0) {
    return (
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-12 text-center text-slate-400 shadow-xl">
        <p className="text-base font-semibold text-slate-300">No leads found in database</p>
        <p className="text-xs text-slate-500 mt-1">Run a new lead generation pipeline above to populate leads!</p>
      </div>
    );
  }

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl shadow-xl overflow-hidden text-white">
      <div className="p-4 border-b border-slate-800 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 bg-slate-900/60">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search business name, address, area..."
            className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-4 py-2 text-xs font-medium text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
          />
        </div>

        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 text-xs text-slate-400">
            <Filter className="w-3.5 h-3.5" /> Grade:
            <select
              value={gradeFilter}
              onChange={(e) => setGradeFilter(e.target.value)}
              className="bg-slate-950 border border-slate-800 rounded-lg px-2 py-1 text-xs text-white focus:outline-none"
            >
              <option value="ALL">All Grades</option>
              <option value="A+">A+</option>
              <option value="A">A</option>
              <option value="B">B</option>
              <option value="C">C</option>
            </select>
          </div>

          <div className="flex items-center gap-1.5 text-xs text-slate-400">
            Category:
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="bg-slate-950 border border-slate-800 rounded-lg px-2 py-1 text-xs text-white focus:outline-none"
            >
              {categories.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs border-collapse">
          <thead>
            <tr className="border-b border-slate-800 bg-slate-950/80 text-slate-400 uppercase tracking-wider font-semibold text-[11px]">
              <th className="py-3 px-4">#</th>
              <th className="py-3 px-4">Business Name</th>
              <th className="py-3 px-4">Category</th>
              <th className="py-3 px-4">Rating / Reviews</th>
              <th className="py-3 px-4">Lead Score</th>
              <th className="py-3 px-4">Grade</th>
              <th className="py-3 px-4">Contact</th>
              <th className="py-3 px-4 text-center">Google Maps</th>
              <th className="py-3 px-4 text-right">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/60 font-medium">
            {filteredLeads.map((lead, idx) => {
              const gradeColor =
                lead["Lead Grade"] === "A+"
                  ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/30"
                  : lead["Lead Grade"] === "A"
                  ? "bg-teal-500/20 text-teal-300 border-teal-500/30"
                  : lead["Lead Grade"] === "B"
                  ? "bg-blue-500/20 text-blue-300 border-blue-500/30"
                  : "bg-amber-500/20 text-amber-300 border-amber-500/30";

              return (
                <tr key={idx} className="hover:bg-slate-800/40 transition-colors">
                  <td className="py-3.5 px-4 text-slate-500 font-mono">{idx + 1}</td>

                  <td className="py-3.5 px-4">
                    <div className="font-bold text-slate-100">{lead["Business Name"]}</div>
                    <div className="text-[11px] text-slate-400 font-normal">{lead["Area"]}</div>
                  </td>

                  <td className="py-3.5 px-4">
                    <span className="bg-slate-950 text-slate-300 border border-slate-800 px-2 py-0.5 rounded text-[11px]">
                      {lead["Category"]}
                    </span>
                  </td>

                  <td className="py-3.5 px-4">
                    <div className="flex items-center gap-1 font-bold text-amber-400">
                      {lead["Rating"]} <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                    </div>
                    <div className="text-[11px] text-slate-400 font-normal">{lead["Review Count"]} reviews</div>
                  </td>

                  <td className="py-3.5 px-4">
                    <div className="text-sm font-extrabold text-indigo-400">{lead["Lead Score"]}</div>
                    <div className="text-[10px] text-slate-500">out of 100</div>
                  </td>

                  <td className="py-3.5 px-4">
                    <span className={`px-2 py-0.5 rounded-md font-bold border text-xs ${gradeColor}`}>
                      {lead["Lead Grade"]}
                    </span>
                  </td>

                  <td className="py-3.5 px-4">
                    <div className="flex items-center gap-1 text-slate-300">
                      <Phone className="w-3 h-3 text-slate-500" />
                      {lead["Phone"] !== "N/A" ? lead["Phone"] : "Unlisted"}
                    </div>
                  </td>

                  <td className="py-3.5 px-4 text-center">
                    {lead["Google Maps Link"] ? (
                      <a
                        href={lead["Google Maps Link"]}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 text-xs text-indigo-400 hover:text-indigo-300 hover:underline"
                      >
                        Maps <ExternalLink className="w-3 h-3" />
                      </a>
                    ) : (
                      <span className="text-slate-600">-</span>
                    )}
                  </td>

                  <td className="py-3.5 px-4 text-right">
                    <button
                      onClick={() => onSelectLead(lead)}
                      className="inline-flex items-center gap-1.5 bg-indigo-600/30 hover:bg-indigo-600 text-indigo-300 hover:text-white border border-indigo-500/40 px-3 py-1.5 rounded-xl transition-all text-xs font-semibold"
                    >
                      <Eye className="w-3.5 h-3.5" /> Pitch
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="p-3 border-t border-slate-800 text-xs text-slate-500 text-right bg-slate-950/40">
        Showing {filteredLeads.length} of {leads.length} leads
      </div>
    </div>
  );
}
