"use client";

import { useEffect, useState, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { api } from "@/services/api";
import toast from "react-hot-toast";
import Cookies from "js-cookie";
import * as XLSX from "xlsx";

interface Subject {
  id: string;
  name: string;
  classesConducted: number;
  recentSessions: { id: string; date: string; method: string }[];
}

interface Course {
  id: string;
  name: string;
  subjects: Subject[];
}

export default function TeacherDashboard() {
  const router = useRouter();
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<{ name: string; role: string } | null>(null);

  const [menuOpen, setMenuOpen] = useState(false);
  const [modalState, setModalState] = useState<"none" | "course" | "subject" | "name" | "enroll">("none");
  const [selectedSubjectId, setSelectedSubjectId] = useState<string | null>(null);

  const [newCourse, setNewCourse] = useState({ name: "", code: "" });
  const [newSubject, setNewSubject] = useState({ name: "", courseId: "" });
  const [newName, setNewName] = useState("");
  
  // Directory States
  const [availableStudents, setAvailableStudents] = useState<any[]>([]);
  const [studentSearchQuery, setStudentSearchQuery] = useState("");
  const [loadingStudents, setLoadingStudents] = useState(false);

  // Bulk Upload States
  const [enrollTab, setEnrollTab] = useState<"directory" | "bulk">("directory");
  const [bulkData, setBulkData] = useState<{ email: string; rollNumber: string }[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

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
      const res = await api.get("/classroom/dashboard");
      setCourses(res.data);
    } catch (err) {
      toast.error("Failed to load dashboard");
    } finally {
      setLoading(false);
    }
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
      toast.success("Name updated successfully");
    } catch (err) {
      toast.error("Failed to update name");
    }
  };

  const handleCreateCourse = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.post("/classroom/courses", newCourse);
      setModalState("none");
      setNewCourse({ name: "", code: "" });
      loadDashboard();
      toast.success("Course created!");
    } catch (err) {
      toast.error("Failed to create course");
    }
  };

  const handleCreateSubject = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.post("/classroom/subjects", newSubject);
      setModalState("none");
      setNewSubject({ name: "", courseId: "" });
      loadDashboard();
      toast.success("Subject created!");
    } catch (err) {
      toast.error("Failed to create subject");
    }
  };

  const openEnrollModal = async (subjectId: string) => {
    setSelectedSubjectId(subjectId);
    setModalState("enroll");
    setEnrollTab("directory");
    setBulkData([]);
    setStudentSearchQuery("");
    setLoadingStudents(true);
    try {
      const res = await api.get("/classroom/students/all");
      setAvailableStudents(res.data);
    } catch (err) {
      toast.error("Failed to load students directory");
    } finally {
      setLoadingStudents(false);
    }
  };

  const enrollStudentByEmail = async (email: string) => {
    if (!selectedSubjectId) return;
    try {
      await api.post(`/classroom/${selectedSubjectId}/enroll`, { email });
      toast.success(`${email} enrolled successfully!`);
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Failed to add student. They may already be enrolled.");
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const bstr = evt.target?.result;
        const wb = XLSX.read(bstr, { type: "binary" });
        const wsname = wb.SheetNames[0];
        const ws = wb.Sheets[wsname];
        const data = XLSX.utils.sheet_to_json(ws);

        const extracted = data.map((row: any) => {
          const normalized: any = {};
          for (const key in row) normalized[key.toLowerCase().replace(/\s/g, "")] = row[key];
          
          return {
            email: normalized.email || normalized.emailaddress || normalized.institutionalemail || "",
            rollNumber: String(normalized.rollnumber || normalized.rollno || normalized.id || "")
          };
        }).filter(row => row.email && row.email.includes("@"));

        if (extracted.length === 0) {
          toast.error("No valid emails found. Check column headers.");
        } else {
          setBulkData(extracted);
          toast.success(`Found ${extracted.length} students!`);
        }
      } catch (err) {
        toast.error("Failed to read file. Please ensure it is a valid .xlsx or .csv");
      }
    };
    reader.readAsBinaryString(file);
  };

  const submitBulkEnrollment = async () => {
    if (!selectedSubjectId || bulkData.length === 0) return;
    setIsUploading(true);
    try {
      const res = await api.post(`/classroom/${selectedSubjectId}/bulk-enroll`, { students: bulkData });
      toast.success(`Successfully enrolled ${res.data.added} students!`);
      setBulkData([]);
      setModalState("none");
      loadDashboard();
    } catch (err) {
      toast.error("Bulk enrollment failed.");
    } finally {
      setIsUploading(false);
    }
  };

  // Helper filter function for the search bar
  const filteredStudents = availableStudents.filter(s => 
    s.name.toLowerCase().includes(studentSearchQuery.toLowerCase()) || 
    s.email.toLowerCase().includes(studentSearchQuery.toLowerCase()) ||
    (s.rollNumber && s.rollNumber.toLowerCase().includes(studentSearchQuery.toLowerCase()))
  );

  if (loading) return <div className="min-h-screen bg-teal-900 flex items-center justify-center animate-pulse font-black text-emerald-400 text-xl">Initialising Command Center...</div>;

  return (
    <div className="min-h-screen pb-20 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-teal-800 via-teal-900 to-emerald-900 text-teal-50 selection:bg-emerald-500/30 font-sans">
      
      <header className="sticky top-0 z-40 bg-teal-900/50 backdrop-blur-2xl border-b border-teal-500/20 px-6 py-4 flex justify-between items-center transition-all shadow-lg shadow-teal-900/20">
        <div>
          <h1 className="text-2xl font-black bg-clip-text text-transparent bg-gradient-to-r from-emerald-300 to-cyan-300 tracking-tight">LEDZIA</h1>
        </div>
        <div className="relative">
          <button onClick={() => setMenuOpen(!menuOpen)} className="flex items-center gap-3 bg-teal-800/40 hover:bg-teal-700/50 p-1.5 pr-4 rounded-2xl shadow-sm border border-teal-500/30 transition-all backdrop-blur-md">
            <div className="w-10 h-10 bg-gradient-to-br from-emerald-400 to-teal-500 text-teal-950 rounded-xl flex items-center justify-center font-bold shadow-lg shadow-emerald-500/20">
              {user?.name?.charAt(0) || "T"}
            </div>
            <div className="text-left block">
              <p className="font-bold text-sm text-teal-50 leading-tight">{user?.name}</p>
              <p className="text-[10px] text-emerald-300 font-black uppercase tracking-widest">{user?.role}</p>
            </div>
          </button>
          {menuOpen && (
            <div className="absolute right-0 mt-3 w-56 bg-teal-800/95 backdrop-blur-xl border border-teal-600/50 rounded-3xl shadow-2xl py-2 z-50 animate-in fade-in slide-in-from-top-2">
              <button onClick={() => { setModalState("name"); setMenuOpen(false); }} className="block w-full text-left px-6 py-3 text-sm font-bold text-teal-50 hover:bg-teal-700 hover:text-emerald-300 transition-colors">Edit Profile</button>
              <div className="h-px bg-teal-700/50 my-1 mx-4"></div>
              <button onClick={handleLogout} className="block w-full text-left px-6 py-3 text-sm font-bold text-rose-400 hover:bg-teal-700 transition-colors">Logout</button>
            </div>
          )}
        </div>
      </header>

      <main className="p-6 max-w-7xl mx-auto space-y-12">
        <div className="relative overflow-hidden bg-teal-800/30 backdrop-blur-xl rounded-[3rem] p-10 md:p-14 shadow-2xl border border-teal-400/20">
          <div className="absolute -top-24 -right-24 w-80 h-80 bg-emerald-400/20 rounded-full blur-3xl"></div>
          <div className="absolute -bottom-24 -left-24 w-80 h-80 bg-cyan-400/20 rounded-full blur-3xl"></div>
          <div className="relative z-10">
            <h2 className="text-emerald-300 font-bold uppercase tracking-[0.3em] text-xs mb-4">Faculty Dashboard</h2>
            <h1 className="text-4xl md:text-6xl font-black text-white mb-8 tracking-tighter">
              Welcome back, <br/> <span className="text-emerald-300">{user?.name.split(' ').slice(0,2).join(' ')}</span>
            </h1>
            <div className="flex flex-wrap gap-4">
              <button onClick={() => setModalState("course")} className="bg-gradient-to-r from-emerald-500 to-teal-500 text-teal-950 px-8 py-4 rounded-2xl font-black hover:scale-105 hover:shadow-[0_0_30px_rgba(16,185,129,0.3)] transition-all duration-300">
                + New Course
              </button>
              <button onClick={() => setModalState("subject")} className="bg-teal-900/40 backdrop-blur-md text-emerald-100 border border-teal-500/30 px-8 py-4 rounded-2xl font-black hover:bg-teal-700/50 transition-all duration-300">
                + Add Subject
              </button>
            </div>
          </div>
        </div>

        <div className="space-y-12">
          {courses.map((course) => (
            <div key={course.id} className="space-y-6">
              <div className="flex items-center gap-6">
                <h2 className="text-3xl font-black text-white tracking-tight">{course.name}</h2>
                <div className="h-[2px] bg-gradient-to-r from-emerald-400/50 to-transparent flex-grow rounded-full"></div>
              </div>
              <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
                {course.subjects.map((sub) => (
                  <div key={sub.id} className="group bg-teal-800/20 backdrop-blur-xl border border-teal-600/30 p-8 rounded-[2.5rem] shadow-xl hover:border-emerald-400/40 hover:bg-teal-800/40 hover:-translate-y-2 transition-all duration-500 flex flex-col">
                    <div className="flex justify-between items-start mb-6">
                      <div>
                        <h3 className="text-xl font-black text-white leading-tight group-hover:text-emerald-300 transition-colors">{sub.name}</h3>
                        <p className="text-[10px] font-black text-emerald-400 uppercase tracking-widest mt-2">Active Module</p>
                      </div>
                      <div className="bg-emerald-900/50 text-emerald-300 border border-emerald-500/20 px-4 py-1.5 rounded-full text-[10px] font-black shadow-sm">
                        {sub.classesConducted} SESSIONS
                      </div>
                    </div>
                    <div className="mb-8 flex-grow">
                      <p className="text-[10px] font-black text-teal-400/60 uppercase tracking-widest mb-3">Recent Logs</p>
                      {sub.recentSessions && sub.recentSessions.length > 0 ? (
                        <div className="space-y-2">
                          {sub.recentSessions.map(session => (
                            <div key={session.id} className="flex items-center justify-between bg-teal-900/30 p-2.5 rounded-xl border border-teal-700/30">
                              <span className="text-xs font-bold text-teal-100">{new Date(session.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}</span>
                              <span className={`text-[9px] font-black tracking-widest px-2 py-1 rounded-md border ${session.method === 'QR' ? 'bg-emerald-500/10 text-emerald-300 border-emerald-500/20' : 'bg-blue-500/10 text-blue-300 border-blue-500/20'}`}>
                                {session.method}
                              </span>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="bg-teal-900/20 border border-teal-800/30 border-dashed rounded-xl p-4 text-center">
                          <p className="text-xs text-teal-500/70 font-bold">No sessions recorded.</p>
                        </div>
                      )}
                    </div>
                    <div className="grid grid-cols-2 gap-3 mb-4">
                      <Link href={`/teacher/attendance/${sub.id}`} className="flex items-center justify-center py-3.5 bg-teal-900/60 text-teal-100 border border-teal-600/30 rounded-2xl text-xs font-black hover:bg-emerald-600 hover:text-white hover:border-emerald-500 transition-all shadow-inner">MANUAL</Link>
                      <Link href={`/teacher/attendance/${sub.id}/qr`} className="flex items-center justify-center py-3.5 bg-emerald-500/10 text-emerald-300 border border-emerald-500/30 rounded-2xl text-xs font-black hover:bg-emerald-500 hover:text-teal-950 transition-all">QR MODE</Link>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <button onClick={() => openEnrollModal(sub.id)} className="w-full flex items-center justify-center gap-2 py-3 border-2 border-dashed border-teal-600/50 text-teal-300 rounded-2xl text-[10px] font-black hover:border-emerald-400 hover:text-emerald-300 hover:bg-teal-700/30 transition-all group/btn">
                        <span className="text-sm group-hover/btn:rotate-90 transition-transform">+</span> ENROLL
                      </button>
                      <Link href={`/teacher/subject/${sub.id}`} className="w-full flex items-center justify-center gap-2 py-3 bg-teal-900/40 text-teal-200 rounded-2xl text-[10px] font-black hover:bg-teal-700/50 hover:text-white transition-all">
                        ANALYTICS &rarr;
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </main>

      {/* Modals */}
      {modalState !== "none" && (
        <div className="fixed inset-0 bg-teal-950/60 backdrop-blur-md flex items-center justify-center p-4 z-50 animate-in fade-in duration-300">
          <div className="bg-teal-800/90 backdrop-blur-2xl rounded-[3rem] shadow-2xl border border-emerald-500/30 max-w-md w-full p-10 animate-in zoom-in-95 duration-200">

            {modalState === "enroll" && (
              <div>
                <h3 className="text-3xl font-black mb-6 text-white tracking-tight">Enroll Students</h3>
                
                {/* Tabs */}
                <div className="flex bg-teal-950/50 p-1.5 rounded-2xl mb-8 border border-teal-800/50 shadow-inner">
                  <button onClick={() => setEnrollTab("directory")} className={`flex-1 py-3 text-xs font-black rounded-xl transition-all ${enrollTab === "directory" ? "bg-teal-500 text-teal-950 shadow-md" : "text-teal-400/50 hover:text-teal-300"}`}>DIRECTORY</button>
                  <button onClick={() => setEnrollTab("bulk")} className={`flex-1 py-3 text-xs font-black rounded-xl transition-all ${enrollTab === "bulk" ? "bg-emerald-500 text-teal-950 shadow-md" : "text-teal-400/50 hover:text-teal-300"}`}>BULK (.XLSX)</button>
                </div>

                {enrollTab === "directory" ? (
                  <div>
                    {/* UPDATED SEARCH BAR: Tells the teacher they can search by Roll No */}
                    <input 
                      type="text" 
                      value={studentSearchQuery} 
                      onChange={e => setStudentSearchQuery(e.target.value)} 
                      className="w-full p-4 bg-teal-900/50 border border-teal-600/50 rounded-2xl mb-4 outline-none focus:ring-2 focus:ring-emerald-400/50 text-white placeholder:text-teal-400/50 shadow-inner" 
                      placeholder="Search by roll no, name, or email..." 
                    />
                    
                    <div className="max-h-60 overflow-y-auto custom-scrollbar space-y-2 mb-6 pr-2">
                      {loadingStudents ? (
                        <p className="text-teal-300 text-center py-6 font-bold animate-pulse text-sm">Loading...</p>
                      ) : (
                        filteredStudents.map(student => (
                          <div key={student.id} className="flex items-center justify-between p-4 bg-teal-950/40 border border-teal-800/50 rounded-2xl hover:bg-teal-800/40 transition-colors">
                            <div className="truncate pr-4">
                              {/* UPDATED: Roll Number formatting logic */}
                              <p className="font-black text-white text-sm truncate flex items-center gap-2">
                                {student.rollNumber ? (
                                  <span className="text-emerald-400">{student.rollNumber}</span>
                                ) : (
                                  <span className="text-[9px] uppercase tracking-widest text-rose-300 bg-rose-500/10 border border-rose-500/30 px-2 py-0.5 rounded-md">Unassigned</span>
                                )}
                                {student.rollNumber && <span className="text-teal-600">—</span>}
                                <span>{student.name}</span>
                              </p>
                              <p className="text-[10px] font-bold text-teal-400/60 truncate mt-0.5">{student.email}</p>
                            </div>
                            <button onClick={() => enrollStudentByEmail(student.email)} className="px-4 py-2 shrink-0 bg-emerald-500/10 text-emerald-300 border border-emerald-500/30 rounded-xl text-xs font-black hover:bg-emerald-500 hover:text-teal-950 transition-colors">ENROLL</button>
                          </div>
                        ))
                      )}
                      {filteredStudents.length === 0 && !loadingStudents && (
                         <p className="text-teal-300/50 text-center py-6 font-bold text-sm">No students found.</p>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="space-y-6">
                    <div className="relative border-2 border-dashed border-teal-500/50 rounded-3xl p-8 text-center hover:bg-teal-700/20 transition-all">
                      <input type="file" accept=".csv, application/vnd.openxmlformats-officedocument.spreadsheetml.sheet, application/vnd.ms-excel" ref={fileInputRef} onChange={handleFileUpload} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" />
                      <div className="w-12 h-12 mx-auto mb-3 bg-teal-900 rounded-full flex items-center justify-center border border-teal-600">📄</div>
                      <p className="text-sm font-bold text-teal-100">Upload .XLSX or .CSV</p>
                      <p className="text-[10px] font-bold text-teal-400/60 mt-2">Requires 'Email' and 'Roll Number' columns</p>
                    </div>

                    {bulkData.length > 0 && (
                      <div className="bg-teal-950/50 p-4 rounded-2xl border border-teal-800">
                        <p className="text-sm font-black text-emerald-400 mb-1">{bulkData.length} Records Extracted</p>
                        <p className="text-xs text-teal-300/60">Preview: {bulkData[0].email} ({bulkData[0].rollNumber || 'No Roll Number'})</p>
                      </div>
                    )}
                    
                    <button onClick={submitBulkEnrollment} disabled={isUploading || bulkData.length === 0} className="w-full py-4 bg-gradient-to-r from-emerald-500 to-teal-500 text-teal-950 rounded-2xl font-black text-sm hover:shadow-[0_10px_30px_rgba(16,185,129,0.3)] disabled:opacity-50 transition-all">
                      {isUploading ? "IMPORTING..." : `IMPORT ${bulkData.length} STUDENTS`}
                    </button>
                  </div>
                )}

                <div className="flex justify-end border-t border-teal-700/50 pt-4 mt-4">
                  <button type="button" onClick={() => setModalState("none")} className="w-full px-6 py-4 bg-teal-900/60 border border-teal-700 text-teal-200 font-black text-sm hover:bg-teal-700/50 hover:text-white rounded-2xl transition-all">DONE</button>
                </div>
              </div>
            )}

            {modalState === "course" && (
              <form onSubmit={handleCreateCourse}>
                <h3 className="text-3xl font-black mb-2 text-white tracking-tight">New Course</h3>
                <p className="text-sm font-medium text-teal-200/70 mb-8 leading-relaxed">Create a new degree or program.</p>
                <div className="space-y-4 mb-8">
                  <input
                    type="text" required value={newCourse.name} onChange={e => setNewCourse({...newCourse, name: e.target.value})}
                    className="w-full p-5 bg-teal-900/50 border border-teal-600/50 rounded-2xl outline-none focus:ring-2 focus:ring-emerald-400/50 focus:border-emerald-400 transition-all font-bold text-white placeholder:text-teal-400/50 shadow-inner"
                    placeholder="Course Name (e.g., B.Tech CSE)" autoFocus
                  />
                  <input
                    type="text" required value={newCourse.code} onChange={e => setNewCourse({...newCourse, code: e.target.value})}
                    className="w-full p-5 bg-teal-900/50 border border-teal-600/50 rounded-2xl outline-none focus:ring-2 focus:ring-emerald-400/50 focus:border-emerald-400 transition-all font-bold text-white placeholder:text-teal-400/50 shadow-inner"
                    placeholder="Course Code (e.g., CSE-2026)"
                  />
                </div>
                <div className="flex justify-end gap-3">
                  <button type="button" onClick={() => setModalState("none")} className="px-6 py-4 text-teal-200 font-black text-sm hover:bg-teal-700/50 hover:text-white rounded-2xl transition-all">CANCEL</button>
                  <button type="submit" className="px-8 py-4 bg-gradient-to-r from-emerald-500 to-teal-500 text-teal-950 rounded-2xl font-black text-sm hover:shadow-[0_10px_30px_rgba(16,185,129,0.3)] hover:-translate-y-1 transition-all">CREATE COURSE</button>
                </div>
              </form>
            )}

            {modalState === "subject" && (
              <form onSubmit={handleCreateSubject}>
                <h3 className="text-3xl font-black mb-2 text-white tracking-tight">Add Subject</h3>
                <p className="text-sm font-medium text-teal-200/70 mb-8 leading-relaxed">Assign a new subject to an existing course.</p>
                <div className="space-y-4 mb-8">
                  <input
                    type="text" required value={newSubject.name} onChange={e => setNewSubject({...newSubject, name: e.target.value})}
                    className="w-full p-5 bg-teal-900/50 border border-teal-600/50 rounded-2xl outline-none focus:ring-2 focus:ring-emerald-400/50 focus:border-emerald-400 transition-all font-bold text-white placeholder:text-teal-400/50 shadow-inner"
                    placeholder="Subject Name (e.g., Software Engineering)" autoFocus
                  />
                  <select
                    required value={newSubject.courseId} onChange={e => setNewSubject({...newSubject, courseId: e.target.value})}
                    className="w-full p-5 bg-teal-900/50 border border-teal-600/50 rounded-2xl outline-none focus:ring-2 focus:ring-emerald-400/50 focus:border-emerald-400 transition-all font-bold text-white shadow-inner cursor-pointer appearance-none"
                  >
                    <option value="" className="bg-teal-800 text-teal-300">Select a Course...</option>
                    {courses.map(c => (
                      <option key={c.id} value={c.id} className="bg-teal-800 text-white">{c.name}</option>
                    ))}
                  </select>
                </div>
                <div className="flex justify-end gap-3">
                  <button type="button" onClick={() => setModalState("none")} className="px-6 py-4 text-teal-200 font-black text-sm hover:bg-teal-700/50 hover:text-white rounded-2xl transition-all">CANCEL</button>
                  <button type="submit" className="px-8 py-4 bg-gradient-to-r from-emerald-500 to-teal-500 text-teal-950 rounded-2xl font-black text-sm hover:shadow-[0_10px_30px_rgba(16,185,129,0.3)] hover:-translate-y-1 transition-all">ADD SUBJECT</button>
                </div>
              </form>
            )}

            {modalState === "name" && (
              <form onSubmit={handleUpdateName}>
                <h3 className="text-3xl font-black mb-2 text-white tracking-tight">Edit Profile</h3>
                <input
                  type="text" required value={newName} onChange={e => setNewName(e.target.value)}
                  className="w-full p-5 bg-teal-900/50 border border-teal-600/50 rounded-2xl mb-8 mt-6 outline-none focus:ring-2 focus:ring-emerald-400/50 focus:border-emerald-400 transition-all font-bold text-white placeholder:text-teal-400/50 shadow-inner"
                  placeholder="Your Full Name" autoFocus
                />
                <div className="flex justify-end gap-3">
                  <button type="button" onClick={() => setModalState("none")} className="px-6 py-4 text-teal-200 font-black text-sm hover:bg-teal-700/50 hover:text-white rounded-2xl transition-all">CANCEL</button>
                  <button type="submit" className="px-8 py-4 bg-gradient-to-r from-emerald-500 to-teal-500 text-teal-950 rounded-2xl font-black text-sm hover:shadow-[0_10px_30px_rgba(16,185,129,0.3)] hover:-translate-y-1 transition-all">SAVE CHANGES</button>
                </div>
              </form>
            )}

          </div>
        </div>
      )}
    </div>
  );
}