"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/services/api";
import toast from "react-hot-toast";
import Cookies from "js-cookie";
import DashboardSkeleton from "@/components/DashboardSkeleton";
import Link from "next/link"

interface AuditLog {
  id: string;
  date: string;
  isPresent: boolean;
  method: string;
}

interface SubjectStat {
  subjectId: string;
  subjectName: string;
  courseName: string;
  teacherName: string;
  totalClasses: number;
  presentClasses: number;
  percentage: number;
  auditLogs: AuditLog[];
}

export default function StudentDashboard() {
  const router = useRouter();
  const [stats, setStats] = useState<SubjectStat[]>([]);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<{ name: string; role: string } | null>(null);

  // UI States
  const [menuOpen, setMenuOpen] = useState(false);
  const [modalState, setModalState] = useState<"none" | "name">("none");
  const [expandedLog, setExpandedLog] = useState<string | null>(null);
  const [newName, setNewName] = useState("");

  useEffect(() => {
    loadDashboard();
    const storedUser = localStorage.getItem("user");
    if (storedUser) {
      const parsed = JSON.parse(storedUser);
      setUser(parsed);
      setNewName(parsed.name);
    }
  }, []);

  const loadDashboard = async () => {
    try {
      const res = await api.get("/attendance/student-dashboard");
      setStats(res.data);
    } catch (err) {
      toast.error("Failed to load attendance data");
    } finally {
      setLoading(false);
    }
  };

  const calculateOverall = () => {
    if (stats.length === 0) return 0;
    const totalPresent = stats.reduce((acc, curr) => acc + curr.presentClasses, 0);
    const totalHeld = stats.reduce((acc, curr) => acc + curr.totalClasses, 0);
    return totalHeld === 0 ? 0 : Math.round((totalPresent / totalHeld) * 100);
  };

  const handleLogout = () => {
    Cookies.remove("token");
    localStorage.removeItem("user");
    router.push("/auth/login");
  };

  const handleUpdateName = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.patch("/auth/profile/name", { name: newName });
      const updatedUser = { ...user!, name: newName };
      localStorage.setItem("user", JSON.stringify(updatedUser));
      setUser(updatedUser);
      setModalState("none");
      toast.success("Name updated!");
    } catch (err) {
      toast.error("Failed to update name");
    }
  };

  if (loading) return (
    <div className="p-8 max-w-4xl mx-auto">
       <div className="h-10 w-64 bg-blue-50 rounded mb-8 animate-pulse"></div>
       <DashboardSkeleton />
    </div>
  );

  const overall = calculateOverall();

  return (
    <div className="min-h-screen bg-[#f8fafc]">
      {/* Top Navigation */}
      <header className="bg-white shadow-sm shadow-blue-900/5 px-6 py-4 flex justify-between items-center relative border-b border-blue-50">
        <div>
          <h1 className="text-2xl font-black text-blue-950 tracking-tight">Student Portal</h1>
          <p className="text-sm text-blue-400 font-medium">View your attendance and history</p>
        </div>

        {/* User Menu */}
        <div className="relative">
          <button 
            onClick={() => setMenuOpen(!menuOpen)}
            className="flex items-center gap-3 hover:bg-rose-50/50 p-1.5 pr-4 rounded-full transition-all border border-transparent hover:border-rose-100"
          >
            <div className="text-right hidden md:block">
              <p className="font-bold text-sm text-blue-950">{user?.name}</p>
              <p className="text-[10px] text-rose-400 font-black uppercase tracking-widest">{user?.role}</p>
            </div>
            <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-blue-800 shadow-md shadow-blue-500/20 text-white rounded-full flex items-center justify-center font-black text-lg">
              {user?.name?.charAt(0) || "U"}
            </div>
          </button>

          {menuOpen && (
            <div className="absolute right-0 mt-3 w-56 bg-white border border-blue-100 rounded-2xl shadow-xl shadow-blue-900/10 py-2 z-50 animate-in fade-in slide-in-from-top-2">
              <button 
                onClick={() => { setModalState("name"); setMenuOpen(false); }}
                className="block w-full text-left px-5 py-2.5 text-sm font-bold text-blue-900 hover:bg-blue-50 hover:text-blue-700 transition-colors"
              >
                Edit Profile
              </button>
              <div className="h-px bg-blue-50 my-1 mx-4"></div>
              <button 
                onClick={handleLogout}
                className="block w-full text-left px-5 py-2.5 text-sm font-bold text-rose-500 hover:bg-rose-50 hover:text-rose-600 transition-colors"
              >
                Logout
              </button>
            </div>
          )}
        </div>
      </header>

      <main className="p-6 max-w-5xl mx-auto space-y-10">
  
        {/* The Massive Hero Card - Deep Blue Theme */}
        <div className="relative overflow-hidden bg-gradient-to-br from-blue-900 via-blue-900 to-[#1e1b4b] rounded-[3rem] p-10 md:p-14 shadow-2xl shadow-blue-900/20 border border-blue-800 text-center text-white">
          {/* Decorative background blur mapping colors to attendance status */}
          <div className={`absolute -top-32 -right-32 w-80 h-80 rounded-full blur-3xl opacity-30 transition-colors duration-700 ${overall >= 75 ? 'bg-blue-400' : 'bg-rose-500'}`}></div>
          <div className={`absolute -bottom-32 -left-32 w-80 h-80 rounded-full blur-3xl opacity-20 transition-colors duration-700 ${overall >= 75 ? 'bg-indigo-400' : 'bg-pink-500'}`}></div>
          
          <div className="relative z-10">
            <h2 className="text-blue-300 font-bold uppercase tracking-[0.3em] text-xs mb-4">Overall Attendance</h2>
            <div className="text-8xl md:text-9xl font-black mb-6 tracking-tighter drop-shadow-lg">
              {overall}%
            </div>
            <p className={`text-sm font-bold px-5 py-2.5 rounded-full inline-block backdrop-blur-md border ${overall >= 75 ? "bg-blue-500/20 text-blue-200 border-blue-400/30" : "bg-rose-500/20 text-rose-200 border-rose-400/30"}`}>
              {overall >= 75 ? "Looking Good! You are above the 75% limit." : "Warning: Attendance is critically low."}
            </p>

            <div className="mt-10">
              <Link href="/student/scan" className="inline-flex items-center gap-3 bg-gradient-to-r from-rose-400 to-rose-500 text-white px-10 py-5 rounded-2xl font-black shadow-lg shadow-rose-500/30 hover:shadow-rose-500/50 hover:-translate-y-1 hover:scale-105 transition-all duration-300 border border-rose-400/50">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" /></svg>
                SCAN QR CODE
              </Link>
            </div>
          </div>
        </div>

        {/* Extravagant Subject Cards - Clean White Glass */}
        <div className="grid gap-6 md:grid-cols-2">
          {stats.map((stat) => (
            <div key={stat.subjectId} className="bg-white rounded-[2rem] shadow-[0_8px_30px_rgb(30,58,138,0.04)] border border-blue-50 overflow-hidden flex flex-col hover:-translate-y-1 hover:shadow-[0_20px_40px_rgb(30,58,138,0.08)] transition-all duration-300">
              <div className="p-8">
                <div className="flex justify-between items-start mb-6">
                  <div>
                    <h3 className="font-black text-xl text-blue-950 tracking-tight leading-tight">{stat.subjectName}</h3>
                    <p className="text-sm font-bold text-blue-400 mt-1">{stat.courseName} <span className="text-blue-200 mx-1">•</span> Prof. {stat.teacherName}</p>
                  </div>
                  <div className={`text-4xl font-black tracking-tighter ${stat.percentage >= 75 ? 'text-blue-600' : 'text-rose-500'}`}>
                    {stat.percentage}%
                  </div>
                </div>

                {/* Progress Bar - Blue for safe, Pink for warning */}
                <div className="w-full bg-blue-50 rounded-full h-3.5 mb-5 overflow-hidden border border-blue-100/50">
                  <div 
                    className={`h-full rounded-full transition-all duration-1000 ease-out shadow-inner ${stat.percentage >= 75 ? 'bg-gradient-to-r from-blue-400 to-blue-600' : 'bg-gradient-to-r from-rose-400 to-rose-500'}`} 
                    style={{ width: `${stat.percentage}%` }}
                  ></div>
                </div>

                <div className="flex justify-between items-center text-sm font-black text-blue-300">
                  <span className="bg-blue-50 px-4 py-2 rounded-xl border border-blue-100/50">{stat.presentClasses} / {stat.totalClasses} CLASSES</span>
                  <button 
                    onClick={() => setExpandedLog(expandedLog === stat.subjectId ? null : stat.subjectId)}
                    className="text-blue-600 hover:text-white hover:bg-blue-600 transition-all bg-blue-50 px-4 py-2 rounded-xl border border-blue-100/50 shadow-sm"
                  >
                    {expandedLog === stat.subjectId ? "CLOSE HISTORY" : "VIEW HISTORY"}
                  </button>
                </div>

                {/* Audit Logs */}
                {expandedLog === stat.subjectId && (
                  <div className="mt-6 pt-4 border-t border-dashed border-blue-100 space-y-2 max-h-48 overflow-y-auto pr-2 custom-scrollbar">
                    {stat.auditLogs.map(log => (
                      <div key={log.id} className="flex justify-between items-center text-xs p-3 bg-white border border-blue-50 rounded-xl shadow-sm">
                        <span className="text-blue-400 font-bold">{new Date(log.date).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })}</span>
                        <span className={`font-black tracking-wider px-3 py-1 rounded-lg ${log.isPresent ? 'bg-blue-50 text-blue-600' : 'bg-rose-50 text-rose-500'}`}>
                          {log.isPresent ? "PRESENT" : "ABSENT"}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </main>

      {/* Edit Name Modal - Matched to Theme */}
      {modalState === "name" && (
        <div className="fixed inset-0 bg-blue-950/40 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
          <div className="bg-white rounded-[2rem] shadow-2xl shadow-blue-900/20 border border-blue-100 max-w-md w-full p-8 animate-in zoom-in-95 duration-200">
            <form onSubmit={handleUpdateName}>
              <h3 className="text-2xl font-black mb-2 text-blue-950 tracking-tight">Edit Profile</h3>
              <p className="text-sm font-medium text-blue-400 mb-6">Update how your name appears to professors.</p>
              
              <input 
                type="text" required value={newName} onChange={e => setNewName(e.target.value)}
                className="w-full p-4 bg-blue-50/50 border border-blue-100 rounded-2xl mb-8 outline-none focus:ring-4 focus:ring-rose-500/10 focus:border-rose-400 transition-all font-bold text-blue-900 placeholder:text-blue-300" 
                placeholder="Your Full Name"
                autoFocus
              />
              <div className="flex justify-end gap-3">
                <button type="button" onClick={() => setModalState("none")} className="px-6 py-3 text-blue-400 font-black text-sm hover:bg-blue-50 hover:text-blue-600 rounded-xl transition-all">
                  CANCEL
                </button>
                <button type="submit" className="px-8 py-3 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-xl font-black text-sm shadow-lg shadow-blue-600/20 hover:shadow-blue-600/40 hover:-translate-y-0.5 transition-all">
                  SAVE CHANGES
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
