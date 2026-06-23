"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { api } from "@/services/api";
import toast from "react-hot-toast";
import BackButton from "@/components/BackButton";

interface Student {
  id: string;
  name: string;
  email: string;
}

export default function ManualAttendancePage() {
  const router = useRouter();
  const params = useParams(); 
  const subjectId = params.subjectId as string; 
  const [students, setStudents] = useState<Student[]>([]);
  const [attendance, setAttendance] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!subjectId || subjectId === "[subjectId]") return;
    const fetchStudents = async () => {
      try {
        const res = await api.get(`/classroom/${subjectId}/students`);
        setStudents(res.data);
        
        const initialMap: Record<string, boolean> = {};
        res.data.forEach((s: Student) => { initialMap[s.id] = false; });
        setAttendance(initialMap);
      } catch (err) {
        toast.error("Failed to load student roster");
      } finally {
        setLoading(false);
      }
    };
    fetchStudents();
  }, [subjectId]);

  const toggleStatus = (studentId: string) => {
    setAttendance(prev => ({ ...prev, [studentId]: !prev[studentId] }));
  };

  const markAll = (status: boolean) => {
    const updatedMap: Record<string, boolean> = {};
    students.forEach((s) => { updatedMap[s.id] = status; });
    setAttendance(updatedMap);
  };

  const handleSubmit = async () => {
    setSaving(true);
    try {
      const records = Object.entries(attendance).map(([studentId, isPresent]) => ({
        studentId,
        subjectId,
        isPresent,
        deviceTimestamp: new Date().toISOString()
      }));

      await api.post("/classroom/attendance/manual", { records });
      toast.success("Roster saved successfully!");
      router.push("/teacher/dashboard");
    } catch (err) {
      toast.error("Failed to submit attendance");
    } finally {
      setSaving(false);
    }
  };

  const presentCount = Object.values(attendance).filter(Boolean).length;

  return (
    <div className="min-h-screen p-6 relative overflow-hidden bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-teal-800 via-teal-900 to-emerald-900 text-teal-50">
      
      {/* Floating Orbs */}
      <div className="absolute top-0 -left-20 w-[500px] h-[500px] bg-teal-400/10 rounded-full blur-[120px] animate-[float_6s_ease-in-out_infinite] pointer-events-none"></div>
      <div className="absolute bottom-0 -right-20 w-[500px] h-[500px] bg-emerald-400/10 rounded-full blur-[120px] animate-[float_6s_ease-in-out_infinite] [animation-delay:4s] pointer-events-none"></div>

      <div className="relative z-10 max-w-4xl mx-auto space-y-8 mt-10">
        <BackButton />

        {/* Header Section */}
        <div className="bg-teal-900/40 backdrop-blur-2xl border border-teal-500/30 p-8 rounded-[2rem] shadow-2xl flex flex-col md:flex-row items-center justify-between gap-6">
          <div>
            <h1 className="text-3xl font-black text-white tracking-tighter mb-1">Manual Roster</h1>
            <p className="text-sm font-bold text-emerald-300 uppercase tracking-widest">{new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}</p>
          </div>
          
          <div className="flex items-center gap-4 bg-teal-950/40 p-2 rounded-2xl border border-teal-700 shadow-inner">
            <button onClick={() => markAll(true)} className="px-6 py-2.5 rounded-xl font-bold text-xs bg-emerald-500/10 text-emerald-300 hover:bg-emerald-500/20 transition-colors">Mark All Present</button>
            <button onClick={() => markAll(false)} className="px-6 py-2.5 rounded-xl font-bold text-xs bg-rose-500/10 text-rose-300 hover:bg-rose-500/20 transition-colors">Mark All Absent</button>
          </div>
        </div>

        {/* Student List */}
        <div className="bg-teal-900/40 backdrop-blur-2xl border border-teal-500/30 rounded-[2rem] shadow-2xl overflow-hidden">
          {loading ? (
            <div className="p-12 text-center text-teal-300 font-bold animate-pulse">Loading class roster...</div>
          ) : (
            <div className="divide-y divide-teal-800/50">
              {students.map((student: any) => (
                <div key={student.id} className="p-6 flex items-center justify-between hover:bg-teal-800/40 transition-colors group">
                  <div className="truncate pr-4">
                    {/* UPDATED: Roll Number Primary Rendering */}
                    <p className="font-black text-white text-lg truncate flex items-center gap-2">
                      {student.rollNumber ? (
                        <span className="text-emerald-400">{student.rollNumber}</span>
                      ) : (
                        <span className="text-[9px] uppercase tracking-widest text-rose-300 bg-rose-500/10 border border-rose-500/30 px-2 py-0.5 rounded-md">Unassigned</span>
                      )}
                      {student.rollNumber && <span className="text-teal-600">—</span>}
                      <span className="group-hover:text-emerald-300 transition-colors">{student.name}</span>
                    </p>
                    <p className="text-xs font-medium text-teal-200/60 mt-1">{student.email}</p>
                  </div>
                  
                  {/* Status Toggle */}
                  <button
                    onClick={() => toggleStatus(student.id)}
                    className={`relative w-32 h-12 rounded-full p-1 transition-all duration-300 shadow-inner ${
                      attendance[student.id] 
                        ? "bg-gradient-to-r from-emerald-400 to-teal-500 border border-emerald-300" 
                        : "bg-teal-950/60 border border-teal-700"
                    }`}
                  >
                    <div className={`absolute top-1 bottom-1 w-1/2 rounded-full bg-white shadow-md transition-all duration-300 flex items-center justify-center ${
                      attendance[student.id] ? "translate-x-[90%]" : "translate-x-0"
                    }`}>
                      <span className={`text-[10px] font-black tracking-wider ${attendance[student.id] ? "text-teal-800" : "text-teal-400"}`}>
                        {attendance[student.id] ? "PRES" : "ABS"}
                      </span>
                    </div>
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Action Bar */}
        <div className="sticky bottom-6 bg-teal-900/90 backdrop-blur-2xl border border-emerald-500/30 p-6 rounded-[2rem] shadow-[0_20px_40px_rgba(0,0,0,0.4)] flex items-center justify-between">
          <div>
            <p className="text-sm font-bold text-teal-300">Total Present</p>
            <p className="text-2xl font-black text-white"><span className="text-emerald-400">{presentCount}</span> / {students.length}</p>
          </div>
          
          <button
            onClick={handleSubmit}
            disabled={saving || loading}
            className="px-10 py-4 bg-gradient-to-r from-emerald-500 to-teal-500 text-teal-950 rounded-2xl font-black text-lg shadow-[0_0_20px_rgba(16,185,129,0.3)] hover:shadow-[0_0_30px_rgba(16,185,129,0.5)] transition-all hover:-translate-y-1 disabled:opacity-50"
          >
            {saving ? "SAVING ROSTER..." : "SUBMIT ATTENDANCE"}
          </button>
        </div>

      </div>
    </div>
  );
}
