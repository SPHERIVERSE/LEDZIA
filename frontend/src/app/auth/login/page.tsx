"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { api } from "@/services/api";
import toast from "react-hot-toast";
import Cookies from "js-cookie";

export default function LoginPage() {
  const router = useRouter();
  const [formData, setFormData] = useState({ email: "", password: "" });
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await api.post("/auth/login", formData);
      
      Cookies.set("token", res.data.access_token, { expires: 7 });
      localStorage.setItem("user", JSON.stringify(res.data.user));
      
      toast.success("Access Granted.");
      
      if (res.data.user.role === "TEACHER") {
        router.push("/teacher/dashboard");
      } else {
        router.push("/student/dashboard");
      }
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Invalid credentials");
    } finally {
      setLoading(false);
    }
  };

  return (
     <div className="min-h-screen flex items-center justify-center p-6 relative overflow-hidden bg-slate-950">
      <div className="absolute inset-0 bg-dots-indigo animate-dots-flow"></div>
      <div className="absolute top-20 left-20 w-96 h-96 bg-indigo-600/20 rounded-full blur-[100px] pointer-events-none"></div>
      <div className="absolute bottom-20 right-20 w-96 h-96 bg-blue-600/20 rounded-full blur-[100px] pointer-events-none"></div>

      <div className="w-full max-w-md relative z-10 animate-in fade-in zoom-in duration-700">
        <div className="bg-slate-900/60 backdrop-blur-2xl border-2 border-indigo-500/20 p-12 rounded-[3rem] shadow-[0_8px_32px_0_rgba(0,0,0,0.5)] text-center relative overflow-hidden">
          <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-indigo-400 to-transparent opacity-30"></div>

          <div className="mb-10">
            <h1 className="text-5xl font-black bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-indigo-400 tracking-tighter mb-3">LEDZIA</h1>
            <p className="text-xs font-black text-indigo-300/60 uppercase tracking-widest">Institutional Sign In</p>
          </div>

          <form onSubmit={handleLogin} className="space-y-5">
            <input
              type="email" required placeholder="name@institute.edu"
              className="w-full p-6 bg-slate-950/50 backdrop-blur-sm border border-slate-800 rounded-2xl text-center text-lg font-bold text-white outline-none focus:ring-4 focus:ring-indigo-500/20 focus:border-indigo-400 transition-all placeholder:text-slate-500 shadow-inner"
              onChange={e => setFormData({ ...formData, email: e.target.value })}
            />
            <input
              type="password" required placeholder="Password"
              className="w-full p-6 bg-slate-950/50 backdrop-blur-sm border border-slate-800 rounded-2xl text-center text-lg font-bold text-white outline-none focus:ring-4 focus:ring-indigo-500/20 focus:border-indigo-400 transition-all placeholder:text-slate-500 shadow-inner"
              onChange={e => setFormData({ ...formData, password: e.target.value })}
            />

            <button
              disabled={loading}
              className="w-full py-5 bg-gradient-to-r from-indigo-500 to-blue-600 text-white rounded-2xl font-black text-lg shadow-[0_10px_20px_rgba(79,70,229,0.2)] hover:shadow-[0_15px_30px_rgba(79,70,229,0.4)] hover:-translate-y-1 transition-all duration-300 disabled:opacity-50"
            >
              {loading ? "AUTHENTICATING..." : "SIGN IN"}
            </button>
          </form>

          <div className="mt-8 flex flex-col items-center gap-4 pt-6 border-t border-slate-800">
            <Link href="/auth/forgot-password" className="text-sm font-bold text-indigo-400 hover:text-indigo-300 transition-colors">
              Forgot Password?
            </Link>
            <p className="text-sm font-bold text-slate-400">
              Don't have an account?{" "}
              <Link href="/auth/register" className="text-indigo-400 font-black hover:text-indigo-300 transition-colors">
                Join LEDZIA
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div> 
  );
}