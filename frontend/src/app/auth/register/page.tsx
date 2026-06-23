"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { api } from "@/services/api";
import toast from "react-hot-toast";
import Cookies from "js-cookie";

export default function RegisterPage() {
  const router = useRouter();
  const [formData, setFormData] = useState({ name: "", email: "", role: "STUDENT", institutionId: "", otp: "", password: "", confirmPassword: "" });
  const [institutions, setInstitutions] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState<1 | 2>(1); 

  useEffect(() => {
    const fetchInstitutions = async () => {
      try {
        const res = await api.get("/classroom/institutions");
        setInstitutions(res.data);
      } catch (err) {
        console.error("Fetch Error:", err);
      }
    };
    fetchInstitutions();
  }, []);

  const handleRequestOtp = async () => {
    if (!formData.name || !formData.email || !formData.institutionId) {
      toast.error("Please fill out all details first.");
      return;
    }
    setLoading(true);
    try {
      await api.post("/auth/request-otp", { email: formData.email, reason: 'register' });
      toast.success("Verification code sent to your email!");
      setStep(2);
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Failed to send code. Email might be in use.");
    } finally {
      setLoading(false);
    }
  };

  const handleCompleteRegistration = async (e: React.FormEvent) => {
    e.preventDefault();
    if (formData.password !== formData.confirmPassword) {
      toast.error("Passwords do not match!");
      return;
    }
    if (formData.password.length < 6) {
      toast.error("Password must be at least 6 characters.");
      return;
    }

    setLoading(true);
    try {
      const res = await api.post("/auth/register", formData);
      
      Cookies.set("token", res.data.access_token, { expires: 7 });
      localStorage.setItem("user", JSON.stringify(res.data.user));
      
      toast.success("Identity Secured. Welcome to LEDZIA!");
      
      if (res.data.user.role === "TEACHER") {
        router.push("/teacher/dashboard");
      } else {
        router.push("/student/dashboard");
      }
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Registration failed");
    } finally {
      setLoading(false);
    }
  };

  return (
     <div className="min-h-screen flex items-center justify-center p-4 sm:p-6 relative overflow-hidden bg-slate-950">
        <div className="absolute inset-0 bg-dots-teal animate-dots-flow"></div>
        <div className="absolute top-0 -left-20 w-[300px] sm:w-[500px] h-[300px] sm:h-[500px] bg-teal-600/15 rounded-full blur-[120px] pointer-events-none"></div>
        <div className="absolute bottom-0 -right-20 w-[300px] sm:w-[500px] h-[300px] sm:h-[500px] bg-emerald-600/15 rounded-full blur-[120px] pointer-events-none"></div>

        <div className="w-full max-w-xl relative z-10 animate-in fade-in slide-in-from-bottom-8 duration-700">
          {/* UPDATED: Adjusted padding (p-8 sm:p-14) for better mobile card fit */}
          <div className="bg-slate-900/60 backdrop-blur-2xl border-2 border-teal-500/20 p-8 sm:p-14 rounded-[2.5rem] sm:rounded-[3.5rem] shadow-[0_8px_32px_0_rgba(0,0,0,0.5)] relative overflow-hidden">
               
          <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-teal-400 to-transparent opacity-30"></div>

          <div className="text-center mb-8 sm:mb-10">
            <h1 className="text-3xl sm:text-4xl font-black text-white tracking-tighter drop-shadow-sm">Create Identity</h1>
            <p className="text-[10px] sm:text-xs font-black text-teal-300/50 uppercase tracking-widest mt-2">Secure Institutional Access</p>
          </div>

          <form onSubmit={handleCompleteRegistration} className="space-y-4 sm:space-y-5">
            {/* Step 1: Basic Info */}
            <div className={`space-y-4 sm:space-y-5 transition-all duration-500 ${step === 2 ? 'opacity-50 pointer-events-none' : ''}`}>
              <div className="flex p-1.5 bg-slate-950/50 backdrop-blur-md rounded-2xl gap-2 border border-slate-800 shadow-inner">
                {["STUDENT", "TEACHER"].map(r => (
                  <button key={r} type="button" onClick={() => setFormData({...formData, role: r})} disabled={step === 2}
                    className={`flex-1 py-3 sm:py-3.5 rounded-xl font-black text-[10px] sm:text-xs tracking-wider transition-all duration-300 ${
                      formData.role === r ? "bg-teal-500 text-slate-950 shadow-[0_4px_12px_rgba(20,184,166,0.3)]" : "text-slate-500 hover:text-teal-300"
                    }`}>
                    {r}
                  </button>
                ))}
              </div>
              
              <input type="text" required placeholder="Full Legal Name" disabled={step === 2}
                className="w-full p-4 sm:p-5 bg-slate-950/50 backdrop-blur-sm border border-slate-800 rounded-xl outline-none focus:ring-4 focus:ring-teal-500/20 focus:border-teal-400 font-bold text-white placeholder:text-slate-500 text-sm sm:text-base"
                onChange={e => setFormData({ ...formData, name: e.target.value })} />

              <select required disabled={step === 2} onChange={(e) => setFormData({ ...formData, institutionId: e.target.value })}
                className="w-full p-4 sm:p-5 bg-slate-950/50 backdrop-blur-sm border border-slate-800 rounded-xl outline-none focus:ring-4 focus:ring-teal-500/20 focus:border-teal-400 font-bold text-white text-sm sm:text-base">
                <option value="" className="bg-slate-900 text-slate-400">Select Your Institution</option>
                {institutions.map((inst: any) => (
                  <option key={inst.id} value={inst.id} className="bg-slate-900 text-white">{inst.name}</option>
                ))}
              </select>

              {/* UPDATED: Responsive flexbox for Email & Verify Button */}
              <div className="flex flex-col sm:flex-row gap-3">
                <input type="email" required placeholder="Institutional Email" disabled={step === 2}
                  className="w-full sm:flex-1 p-4 sm:p-5 bg-slate-950/50 backdrop-blur-sm border border-slate-800 rounded-xl outline-none focus:ring-4 focus:ring-teal-500/20 focus:border-teal-400 font-bold text-white placeholder:text-slate-500 text-sm sm:text-base"
                  onChange={e => setFormData({ ...formData, email: e.target.value })} />
                
                {step === 1 && (
                  <button type="button" onClick={handleRequestOtp} disabled={loading}
                    className="w-full sm:w-auto px-6 py-4 sm:py-0 shrink-0 rounded-xl font-black text-sm text-slate-950 bg-teal-400 hover:bg-teal-300 shadow-[0_10px_20px_rgba(20,184,166,0.2)] transition-all flex items-center justify-center">
                    {loading ? "SENDING..." : "VERIFY"}
                  </button>
                )}
              </div>
            </div>

            {/* Step 2: OTP & Passwords */}
            {step === 2 && (
              <div className="space-y-4 sm:space-y-5 animate-in slide-in-from-top-4 fade-in duration-500">
                <input type="text" required placeholder="Enter 6-Digit OTP" maxLength={6}
                  className="w-full p-4 sm:p-5 bg-slate-950/50 backdrop-blur-sm border border-teal-500/50 rounded-xl outline-none focus:ring-4 focus:ring-teal-500/20 focus:border-teal-400 font-black text-center tracking-[0.5em] sm:tracking-[1em] text-white placeholder:text-slate-500 placeholder:tracking-normal placeholder:font-bold text-lg sm:text-xl"
                  onChange={e => setFormData({ ...formData, otp: e.target.value })} />
                
                <input type="password" required placeholder="Set Secure Password" 
                  className="w-full p-4 sm:p-5 bg-slate-950/50 backdrop-blur-sm border border-slate-800 rounded-xl outline-none focus:ring-4 focus:ring-teal-500/20 focus:border-teal-400 font-bold text-white placeholder:text-slate-500 text-sm sm:text-base"
                  onChange={e => setFormData({ ...formData, password: e.target.value })} />
                  
                <input type="password" required placeholder="Confirm Password" 
                  className="w-full p-4 sm:p-5 bg-slate-950/50 backdrop-blur-sm border border-slate-800 rounded-xl outline-none focus:ring-4 focus:ring-teal-500/20 focus:border-teal-400 font-bold text-white placeholder:text-slate-500 text-sm sm:text-base"
                  onChange={e => setFormData({ ...formData, confirmPassword: e.target.value })} />

                <button type="submit" disabled={loading} 
                  className="w-full py-4 sm:py-5 rounded-xl font-black text-base sm:text-lg text-slate-950 shadow-[0_10px_20px_rgba(20,184,166,0.2)] hover:shadow-[0_15px_30px_rgba(20,184,166,0.3)] hover:-translate-y-1 transition-all duration-300 bg-teal-400 hover:bg-teal-300">
                  {loading ? "PROVISIONING..." : "ACTIVATE ACCOUNT"}
                </button>
              </div>
            )}
          </form>

          <div className="mt-6 sm:mt-8 pt-6 border-t border-slate-800 text-center">
            <p className="text-xs sm:text-sm font-bold text-slate-400">
              Already verified?{" "}
              <Link href="/auth/login" className="text-teal-400 font-black hover:text-teal-300 transition-colors drop-shadow-sm">
                Sign In
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}