"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Scanner } from "@yudiel/react-qr-scanner";
import { api } from "@/services/api";
import { db } from "@/lib/db";
import toast from "react-hot-toast";
import BackButton from "@/components/BackButton";

export default function StudentScanner() {
  const router = useRouter();
  const [isScanning, setIsScanning] = useState(true);
  const [lastFailedToken, setLastFailedToken] = useState<string | null>(null);
  
  // New State: Tracks the visual feedback color of the scanner
  const [scanStatus, setScanStatus] = useState<"idle" | "success" | "error">("idle");

  const handleScan = async (result: string) => {
    if (!result || result === lastFailedToken) return; 
    
    setIsScanning(false);

    const attendanceData = {
      qrToken: result,
      deviceTimestamp: new Date().toISOString(),
      method: "QR_SCAN",
      status: "pending" as const
    };

    try {
      if (navigator.onLine) {
        await api.post("/attendance/verify-qr", attendanceData);
        toast.success("Attendance marked successfully!");
      } else {
        await db.syncQueue.add(attendanceData);
        toast.success("Offline: Scan saved locally.");
      }

      // Trigger the Green Success UI
      setScanStatus("success");

      setTimeout(() => {
        router.push("/student/dashboard");
      }, 600);

    } catch (err: any) {
      toast.error(err.response?.data?.message || "Expired code. Waiting for refresh...");
      setLastFailedToken(result); 
      
      // Trigger the Red Error UI
      setScanStatus("error");
      
      setTimeout(() => {
        setIsScanning(true);
        // Reset back to Blue Idle UI for the next attempt
        setScanStatus("idle");
      }, 1000);
    }
  };

  // Theme mapping ensures Tailwind compiler catches the exact classes
  const theme = {
    idle: {
      gradient: "to-blue-900/40",
      glow: "bg-blue-500/10",
      border: "border-blue-400/30",
      spinner: "border-blue-500",
      badgeText: "text-blue-400",
      badgeBg: "bg-blue-500/5 border-blue-500/20",
      label: "Secure Scanner"
    },
    success: {
      gradient: "to-emerald-900/40",
      glow: "bg-emerald-500/15",
      border: "border-emerald-400/50",
      spinner: "border-emerald-500",
      badgeText: "text-emerald-400",
      badgeBg: "bg-emerald-500/10 border-emerald-500/30",
      label: "Attendance Synced"
    },
    error: {
      gradient: "to-rose-900/40",
      glow: "bg-rose-500/15",
      border: "border-rose-400/50",
      spinner: "border-rose-500",
      badgeText: "text-rose-400",
      badgeBg: "bg-rose-500/10 border-rose-500/30",
      label: "Invalid Code"
    }
  }[scanStatus];

  return (
    <div className={`min-h-screen flex flex-col items-center justify-center p-6 relative overflow-hidden bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-black via-black ${theme.gradient} transition-colors duration-700 ease-in-out`}>
      
      <div className="absolute top-8 left-6 z-20">
        <BackButton />
      </div>

      {/* Decorative background glow for the camera view */}
      <div className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 rounded-full blur-[120px] pointer-events-none transition-colors duration-700 ease-in-out ${theme.glow}`}></div>

      {/* The Main Scanner Container */}
      <div className="w-full max-w-md aspect-square overflow-hidden rounded-[2.5rem] border-4 border-white/5 relative shadow-2xl bg-black/50 backdrop-blur-md">
        {isScanning ? (
          <>
            <div className={`absolute inset-0 border-2 rounded-[2rem] m-12 pointer-events-none animate-pulse z-10 transition-colors duration-700 ${theme.border}`}></div>
            
            {/* ADD THE FORMATS PROP HERE */}
            <Scanner 
              formats={["qr_code"]} 
              onScan={(detected) => handleScan(detected[0].rawValue)} 
            />
          </>
	) : (
          <div className="w-full h-full flex flex-col items-center justify-center space-y-4">
            <div className={`w-12 h-12 border-4 border-t-transparent rounded-full animate-spin transition-colors duration-500 ${theme.spinner}`}></div>
            <div className={`font-black text-xl tracking-tight transition-colors duration-500 ${scanStatus === 'error' ? 'text-rose-400' : scanStatus === 'success' ? 'text-emerald-400' : 'text-white'}`}>
              {scanStatus === 'error' ? 'Verifying...' : scanStatus === 'success' ? 'Verified!' : 'Verifying...'}
            </div>
          </div>
        )}
      </div>

      {/* Status Text & Instructions */}
      <div className="mt-12 text-center relative z-10">
        <div className={`inline-block px-4 py-1.5 backdrop-blur-md rounded-full border mb-4 transition-all duration-700 ${theme.badgeBg}`}>
          <span className={`text-[10px] font-black uppercase tracking-[0.2em] transition-colors duration-700 ${theme.badgeText}`}>
            {theme.label}
          </span>
        </div>
        <h3 className="text-white font-black text-2xl mb-3 tracking-tighter">Align QR Code</h3>
        <p className="text-gray-400 text-sm max-w-xs leading-relaxed font-medium">
          Position the teacher's screen inside the frame to record your attendance.
        </p>
      </div>
    </div>
  );
}
