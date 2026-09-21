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
      <div className="bg-white border border-slate-200 rounded-2xl p-12 text-center text-slate-500 shadow-sm">
        <p className="text-base font-bold text-slate-700">No leads found in database</p>
        <p className="text-xs text-slate-400 font-medium mt-1">Run a new lead generation pipeline above to populate leads!</p>
      </div>
    );
  }

  return (
    <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden text-slate-900">
      {/* Controls Bar */}
      <div className="p-4 border-b border-slate-200 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 bg-slate-50/60">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search business name, address, area..."
            className="w-full bg-white border border-slate-300 rounded-xl pl-9 pr-4 py-2 text-xs font-semibold text-slate-900 placeholder-slate-400 focus:outline-none focus:border-indigo-600 focus:ring-2 focus:ring-indigo-100"
          />
        </div>

        <div className="flex items-center gap-3">
          {/* Grade filter */}
          <div className="flex items-center gap-1.5 text-xs text-slate-600 font-semibold">
            <Filter className="w-3.5 h-3.5 text-slate-400" /> Grade:
            <select
              value={gradeFilter}
              onChange={(e) => setGradeFilter(e.target.value)}
              className="bg-white border border-slate-300 rounded-lg px-2.5 py-1 text-xs font-bold text-slate-800 focus:outline-none focus:border-indigo-600"
            >
              <option value="ALL">All Grades</option>
              <option value="A+">A+</option>
              <option value="A">A</option>
              <option value="B">B</option>
              <option value="C">C</option>
            </select>
          </div>

          {/* Category filter */}
          <div className="flex items-center gap-1.5 text-xs text-slate-600 font-semibold">
            Category:
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="bg-white border border-slate-300 rounded-lg px-2.5 py-1 text-xs font-bold text-slate-800 focus:outline-none focus:border-indigo-600"
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

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs border-collapse">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-100/70 text-slate-600 uppercase tracking-wider font-bold text-[11px]">
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
          <tbody className="divide-y divide-slate-100 font-medium text-slate-800">
            {filteredLeads.map((lead, idx) => {
              const gradeColor =
                lead["Lead Grade"] === "A+"
                  ? "bg-emerald-50 text-emerald-700 border-emerald-300"
                  : lead["Lead Grade"] === "A"
                  ? "bg-teal-50 text-teal-700 border-teal-300"
                  : lead["Lead Grade"] === "B"
                  ? "bg-blue-50 text-blue-700 border-blue-300"
                  : "bg-amber-50 text-amber-700 border-amber-300";

              return (
                <tr key={idx} className="hover:bg-slate-50/80 transition-colors">
                  <td className="py-3.5 px-4 text-slate-400 font-mono font-bold">{idx + 1}</td>

                  <td className="py-3.5 px-4">
                    <div className="font-bold text-slate-900 text-sm">{lead["Business Name"]}</div>
                    <div className="text-[11px] text-slate-500 font-medium">{lead["Area"]}</div>
                  </td>

                  <td className="py-3.5 px-4">
                    <span className="bg-slate-100 text-slate-700 border border-slate-200 px-2.5 py-0.5 rounded text-[11px] font-semibold">
                      {lead["Category"]}
                    </span>
                  </td>

                  <td className="py-3.5 px-4">
                    <div className="flex items-center gap-1 font-extrabold text-amber-600">
                      {lead["Rating"]} <Star className="w-3.5 h-3.5 fill-amber-500 text-amber-500" />
                    </div>
                    <div className="text-[11px] text-slate-500 font-normal">{lead["Review Count"]} reviews</div>
                  </td>

                  <td className="py-3.5 px-4">
                    <div className="text-sm font-black text-indigo-600">{lead["Lead Score"]}</div>
                    <div className="text-[10px] text-slate-400 font-semibold">out of 100</div>
                  </td>

                  <td className="py-3.5 px-4">
                    <span className={`px-2.5 py-0.5 rounded-md font-extrabold border text-xs ${gradeColor}`}>
                      {lead["Lead Grade"]}
                    </span>
                  </td>

                  <td className="py-3.5 px-4">
                    <div className="flex items-center gap-1 text-slate-700 font-medium">
                      <Phone className="w-3 h-3 text-slate-400" />
                      {lead["Phone"] !== "N/A" ? lead["Phone"] : "Unlisted"}
                    </div>
                  </td>

                  <td className="py-3.5 px-4 text-center">
                    {lead["Google Maps Link"] ? (
                      <a
                        href={lead["Google Maps Link"]}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 text-xs font-bold text-indigo-600 hover:text-indigo-800 hover:underline"
                      >
                        Maps <ExternalLink className="w-3 h-3" />
                      </a>
                    ) : (
                      <span className="text-slate-400">-</span>
                    )}
                  </td>

                  <td className="py-3.5 px-4 text-right">
                    <button
                      onClick={() => onSelectLead(lead)}
                      className="inline-flex items-center gap-1.5 bg-indigo-50 hover:bg-indigo-600 text-indigo-700 hover:text-white border border-indigo-200 px-3 py-1.5 rounded-xl transition-all text-xs font-bold shadow-sm"
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

      <div className="p-3 border-t border-slate-200 text-xs text-slate-500 font-semibold text-right bg-slate-50/40">
        Showing {filteredLeads.length} of {leads.length} leads
      </div>
    </div>
  );
}
