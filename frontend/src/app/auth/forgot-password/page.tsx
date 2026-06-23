"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { api } from "@/services/api";
import toast from "react-hot-toast";

export default function ForgotPasswordPage() {
  const router = useRouter();
  const [step, setStep] = useState<1 | 2>(1);
  
  // 1. ADDED confirmPassword to state
  const [formData, setFormData] = useState({ 
    email: "", 
    otp: "", 
    newPassword: "", 
    confirmPassword: "" 
  });
  
  const [loading, setLoading] = useState(false);

  const handleRequestReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await api.post("/auth/request-otp", { email: formData.email, reason: 'reset' });
      toast.success("Reset code sent to your email.");
      setStep(2);
    } catch (err: any) {
      toast.error(err.response?.data?.message || "User not found.");
    } finally {
      setLoading(false);
    }
  };

  const handleCompleteReset = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // 2. ADDED Password matching validation
    if (formData.newPassword !== formData.confirmPassword) {
      toast.error("Passwords do not match!");
      return;
    }
    
    if (formData.newPassword.length < 6) {
      toast.error("Password must be at least 6 characters.");
      return;
    }

    setLoading(true);
    try {
      await api.post("/auth/reset-password", {
        email: formData.email,
        otp: formData.otp,
        newPassword: formData.newPassword
      });
      toast.success("Password reset successful! Please log in.");
      router.push("/auth/login");
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Failed to reset password. Invalid OTP.");
    } finally {
      setLoading(false);
    }
  };

  return (
     <div className="min-h-screen flex items-center justify-center p-6 relative overflow-hidden bg-slate-950">
      <div className="absolute inset-0 bg-dots-indigo animate-dots-flow"></div>
      <div className="absolute top-20 left-20 w-96 h-96 bg-rose-600/10 rounded-full blur-[100px] pointer-events-none"></div>

      <div className="w-full max-w-md relative z-10 animate-in fade-in zoom-in duration-700">
        <div className="bg-slate-900/60 backdrop-blur-2xl border-2 border-indigo-500/20 p-12 rounded-[3rem] shadow-[0_8px_32px_0_rgba(0,0,0,0.5)] text-center">

          <div className="mb-10">
            <h1 className="text-4xl font-black text-white tracking-tighter mb-3">Reset Access</h1>
            <p className="text-xs font-black text-indigo-300/60 uppercase tracking-widest">Account Recovery</p>
          </div>

          {step === 1 ? (
            <form onSubmit={handleRequestReset} className="space-y-5 animate-in fade-in">
              {/* FIXED: Added value binding */}
              <input
                type="email" required placeholder="Enter your email"
                value={formData.email} 
                className="w-full p-6 bg-slate-950/50 border border-slate-800 rounded-2xl text-center text-lg font-bold text-white outline-none focus:ring-4 focus:ring-indigo-500/20"
                onChange={e => setFormData({ ...formData, email: e.target.value })}
              />
              <button disabled={loading} className="w-full py-5 bg-gradient-to-r from-indigo-500 to-blue-600 text-white rounded-2xl font-black hover:-translate-y-1 transition-all">
                {loading ? "SEARCHING..." : "SEND RESET CODE"}
              </button>
            </form>
          ) : (
            <form onSubmit={handleCompleteReset} className="space-y-5 animate-in slide-in-from-right fade-in">
              {/* FIXED: Added value binding */}
              <input
                type="text" required placeholder="6-Digit Code" maxLength={6}
                value={formData.otp}
                className="w-full p-6 bg-slate-950/50 border border-indigo-500/50 rounded-2xl text-center text-lg font-black tracking-widest text-white outline-none focus:ring-4 focus:ring-indigo-500/20"
                onChange={e => setFormData({ ...formData, otp: e.target.value })}
              />
              {/* FIXED: Added value binding */}
              <input
                type="password" required placeholder="New Password"
                value={formData.newPassword}
                className="w-full p-6 bg-slate-950/50 border border-slate-800 rounded-2xl text-center text-lg font-bold text-white outline-none focus:ring-4 focus:ring-indigo-500/20"
                onChange={e => setFormData({ ...formData, newPassword: e.target.value })}
              />
              {/* NEW: Confirm Password Field */}
              <input
                type="password" required placeholder="Confirm New Password"
                value={formData.confirmPassword}
                className="w-full p-6 bg-slate-950/50 border border-slate-800 rounded-2xl text-center text-lg font-bold text-white outline-none focus:ring-4 focus:ring-indigo-500/20"
                onChange={e => setFormData({ ...formData, confirmPassword: e.target.value })}
              />
              <button disabled={loading} className="w-full py-5 bg-gradient-to-r from-emerald-500 to-teal-600 text-white rounded-2xl font-black hover:-translate-y-1 transition-all">
                {loading ? "UPDATING..." : "CONFIRM NEW PASSWORD"}
              </button>
            </form>
          )}

          <div className="mt-8 pt-6 border-t border-slate-800">
            <Link href="/auth/login" className="text-sm font-bold text-slate-400 hover:text-white transition-colors">
              &larr; Back to Sign In
            </Link>
          </div>
        </div>
      </div>
    </div> 
  );
}