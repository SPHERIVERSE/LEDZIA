"use client";

import { useEffect, useState, useRef } from "react";
import { useParams } from "next/navigation";
import { api } from "@/services/api";
import BackButton from "@/components/BackButton";
import DashboardSkeleton from "@/components/DashboardSkeleton";
import toast from "react-hot-toast";
import * as XLSX from "xlsx";

interface SubjectStats {
  subjectName: string;
  courseName: string;
  totalSessions: number;
  recentSessions: { id: string; date: string; method: string; presentCount: number }[];
  // UPDATED: Added rollNumber to the interface
  students: { id: string; name: string; email: string; rollNumber?: string; totalPresent: number; percentage: number }[];
}

export default function SubjectAnalytics() {
  const params = useParams();
  const subjectId = params.subjectId as string;
  const [stats, setStats] = useState<SubjectStats | null>(null);
  const [loading, setLoading] = useState(true);
  
  const [isExporting, setIsExporting] = useState(false);
  const [exportMenuOpen, setExportMenuOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!subjectId) return;
    const fetchStats = async () => {
      try {
        const res = await api.get(`/classroom/${subjectId}/stats`);
        setStats(res.data);
      } catch (err) {
        console.error("Failed to load stats");
      } finally {
        setLoading(false);
      }
    };
    fetchStats();

    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setExportMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [subjectId]);

  const handleExport = async (format: "xlsx" | "csv") => {
    setExportMenuOpen(false); 
    setIsExporting(true);
    toast.loading(`Compiling ${format.toUpperCase()}...`, { id: "export-toast" });
    
    try {
      const res = await api.get(`/classroom/${subjectId}/export`);
      const { filename, data } = res.data;

      if (data.length === 0) {
        toast.error("No data to export.", { id: "export-toast" });
        return;
      }

      const worksheet = XLSX.utils.json_to_sheet(data);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, "Attendance");

      const colWidths = Object.keys(data[0]).map(key => ({ wch: Math.max(key.length, 15) }));
      worksheet['!cols'] = colWidths;

      if (format === "xlsx") {
        XLSX.writeFile(workbook, `${filename}.xlsx`);
      } else {
        XLSX.writeFile(workbook, `${filename}.csv`, { bookType: "csv" });
      }
      
      toast.success("Export complete!", { id: "export-toast" });
    } catch (err) {
      toast.error("Failed to export data.", { id: "export-toast" });
    } finally {
      setIsExporting(false);
    }
  };

  if (loading) return <div className="p-8"><DashboardSkeleton /></div>;
  if (!stats) return <div className="p-8 text-teal-200">Failed to load analytics.</div>;

  return (
    <div className="min-h-screen p-4 md:p-6 pb-20 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-teal-800 via-teal-900 to-emerald-900 text-teal-50">
      <div className="max-w-6xl mx-auto space-y-6 md:space-y-10 mt-6 md:mt-10">
        <BackButton />

        {/* Hero Summary - Responsive Padding & Layout */}
        <div className="relative z-50 bg-teal-900/40 backdrop-blur-2xl border border-teal-500/30 p-6 md:p-10 rounded-[2rem] md:rounded-[2.5rem] shadow-2xl flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="min-w-0">
            <h1 className="text-2xl md:text-4xl font-black text-white tracking-tight mb-2 truncate">{stats.subjectName}</h1>
            <p className="text-teal-300 font-bold uppercase tracking-widest text-xs md:text-sm">{stats.courseName} <span className="text-emerald-400/50 mx-2">•</span> Analytics</p>
          </div>
          
          <div className="flex items-center gap-4 w-auto justify-between md:justify-end">
            <div className="text-center bg-teal-950/40 px-4 md:px-6 py-3 rounded-2xl border border-teal-700 shadow-inner">
              <p className="text-[10px] md:text-xs font-bold text-teal-400 uppercase tracking-widest mb-1">Total Classes</p>
              <p className="text-2xl md:text-3xl font-black text-emerald-300">{stats.totalSessions}</p>
            </div>
            
            <div className="relative z-50" ref={dropdownRef}>
              <button 
                onClick={() => setExportMenuOpen(!exportMenuOpen)}
                disabled={isExporting}
                className="px-4 md:px-6 py-4 md:py-5 bg-gradient-to-r from-emerald-500 to-teal-500 text-teal-950 rounded-2xl font-black text-xs md:text-sm shadow-[0_10px_30px_rgba(16,185,129,0.3)] hover:shadow-[0_15px_30px_rgba(16,185,129,0.4)] hover:-translate-y-1 disabled:opacity-50 transition-all flex items-center gap-2 md:gap-3"
              >
                {isExporting ? "EXPORTING..." : (
                  <>
                    <svg className="w-4 h-4 md:w-5 md:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"></path></svg>
                    <span className="hidden md:inline">EXPORT OPTIONS</span>
                    <span className="md:hidden">EXPORT</span>
                    <svg className={`w-3 h-3 md:w-4 md:h-4 transition-transform duration-300 ${exportMenuOpen ? "rotate-180" : ""}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M19 9l-7 7-7-7"></path></svg>
                  </>
                )}
              </button>

              {exportMenuOpen && (
                <div className="absolute right-0 mt-3 w-64 bg-teal-900/95 backdrop-blur-xl border border-teal-600/50 rounded-3xl shadow-2xl py-2 animate-in fade-in slide-in-from-top-2">
                  <button 
                    onClick={() => handleExport("xlsx")} 
                    className="w-full text-left px-6 py-4 text-sm font-bold text-teal-50 hover:bg-teal-800 transition-colors flex items-center gap-4 group"
                  >
                    <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center group-hover:bg-emerald-500/20 transition-colors">
                      <svg className="w-5 h-5 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path></svg>
                    </div>
                    <div>
                      <p className="group-hover:text-emerald-300 transition-colors">Excel Document</p>
                      <p className="text-[10px] font-medium text-teal-400/70">Rich formatting (.xlsx)</p>
                    </div>
                  </button>
                  
                  <div className="h-px bg-teal-700/50 my-1 mx-4"></div>
                  
                  <button 
                    onClick={() => handleExport("csv")} 
                    className="w-full text-left px-6 py-4 text-sm font-bold text-teal-50 hover:bg-teal-800 transition-colors flex items-center gap-4 group"
                  >
                    <div className="w-10 h-10 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center group-hover:bg-blue-500/20 transition-colors">
                      <svg className="w-5 h-5 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path></svg>
                    </div>
                    <div>
                      <p className="group-hover:text-blue-300 transition-colors">CSV Data File</p>
                      <p className="text-[10px] font-medium text-teal-400/70">Raw data for ERPs (.csv)</p>
                    </div>
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Main Grid: Responsive 1 column to 3 columns */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 md:gap-8">
          
          {/* Recent Sessions */}
          <div className="space-y-4 md:space-y-6 min-w-0">
            <h2 className="text-lg md:text-xl font-black text-white tracking-tight px-2">Recent Sessions</h2>
            <div className="bg-teal-900/40 backdrop-blur-xl border border-teal-500/20 rounded-[2rem] shadow-xl p-4 md:p-6 space-y-4 max-h-[400px] md:max-h-[600px] overflow-y-auto custom-scrollbar">
              {stats.recentSessions.length === 0 ? (
                <p className="text-teal-300/50 text-center py-10 font-bold">No sessions recorded yet.</p>
              ) : (
                stats.recentSessions.map(session => (
                  <div key={session.id} className="bg-teal-950/30 border border-teal-800/50 p-5 rounded-2xl flex items-center justify-between hover:bg-teal-800/40 transition-colors">
                    <div>
                      <p className="font-bold text-white text-sm">
                        {new Date(session.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                      </p>
                      <p className="text-xs font-bold text-teal-400 mt-1">{session.presentCount} Students Present</p>
                    </div>
                    <div className={`px-3 py-1.5 rounded-xl text-[10px] font-black tracking-widest border ${
                      session.method === 'QR' 
                        ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30' 
                        : 'bg-blue-500/20 text-blue-300 border-blue-500/30'
                    }`}>
                      {session.method}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

         {/* Student Performance Table - Horizontal Scroll wrapper */}
          <div className="lg:col-span-2 space-y-4 md:space-y-6 min-w-0">
            <h2 className="text-lg md:text-xl font-black text-white tracking-tight px-2">Student Performance</h2>
            <div className="bg-teal-900/40 backdrop-blur-xl border border-teal-500/20 rounded-[2rem] shadow-xl overflow-hidden">
              <div className="overflow-x-auto custom-scrollbar">
                <table className="w-full text-left border-collapse min-w-[500px]">
                  <thead>
                    <tr className="bg-teal-950/50 border-b border-teal-800/50">
                      <th className="p-4 md:p-6 text-[10px] md:text-xs font-black text-teal-400 uppercase tracking-widest">Student</th>
                      <th className="p-4 md:p-6 text-[10px] md:text-xs font-black text-teal-400 uppercase tracking-widest text-center">Attendance</th>
                      <th className="p-6 text-[10px] md:text-xs font-black text-teal-400 uppercase tracking-widest text-right">%</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-teal-800/30">
                    {stats.students.map(student => (
                      <tr key={student.id} className="hover:bg-teal-800/30 transition-colors">
                        
                        {/* UPDATED: Roll Number Formatting */}
                        <td className="p-4 md:p-6">
                          <p className="font-black text-white text-sm truncate flex items-center gap-2">
                            {student.rollNumber ? (
                              <span className="text-emerald-400">{student.rollNumber}</span>
                            ) : (
                              <span className="text-[9px] uppercase tracking-widest text-rose-300 bg-rose-500/10 border border-rose-500/30 px-2 py-0.5 rounded-md">Unassigned</span>
                            )}
                            {student.rollNumber && <span className="text-teal-600">—</span>}
                            <span>{student.name}</span>
                          </p>
                          <p className="text-xs text-teal-300/70 mt-1">{student.email}</p>
                        </td>

                        <td className="p-6 text-center font-bold text-teal-100">
                          {student.totalPresent} <span className="text-teal-500">/ {stats.totalSessions}</span>
                        </td>
                        <td className="p-6 text-right">
                          <div className={`inline-block px-4 py-2 rounded-xl text-sm font-black border ${
                            student.percentage >= 75 
                              ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' 
                              : 'bg-rose-500/10 text-rose-400 border-rose-500/20'
                          }`}>
                            {student.percentage}%
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}