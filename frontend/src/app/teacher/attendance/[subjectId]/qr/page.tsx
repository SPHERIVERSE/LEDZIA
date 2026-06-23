"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { QRCodeSVG } from "qrcode.react";
import { api } from "@/services/api";
import toast from "react-hot-toast";
import BackButton from "@/components/BackButton"; // 1. Added the Back Button

export default function DynamicQR() {
  const { subjectId } = useParams();
  const [token, setToken] = useState("");
  const [timeLeft, setTimeLeft] = useState(30);

  const refreshToken = async () => {
    try {
      const res = await api.get(`/classroom/${subjectId}/qr-token`);
      setToken(res.data.qrToken);
      setTimeLeft(30);
    } catch (err) {
      setToken(""); 
      toast.error("Connection error: Retrying...");
    }
  };

  useEffect(() => {
    refreshToken();
    const interval = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          refreshToken();
          return 30;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="min-h-screen p-6 md:p-12 flex flex-col items-center">
      <div className="w-full max-w-4xl">
        {/* 2. Reusable Back Button */}
        <BackButton />

        {/* 3. The Standout Hero Section */}
        <div className="relative overflow-hidden bg-gradient-to-br from-gray-900 to-gray-800 rounded-[3rem] p-8 md:p-16 shadow-2xl border border-gray-700 text-center text-white">
          
          {/* Decorative Glows */}
          <div className="absolute -top-24 -left-24 w-64 h-64 bg-blue-500/20 rounded-full blur-3xl"></div>
          <div className="absolute -bottom-24 -right-24 w-64 h-64 bg-purple-500/20 rounded-full blur-3xl"></div>

          <div className="relative z-10">
            <h2 className="text-gray-400 font-bold uppercase tracking-[0.3em] text-xs mb-4">
              Real-Time Verification
            </h2>
            <h1 className="text-4xl md:text-5xl font-black mb-10 tracking-tight">
              Scan to Mark Attendance
            </h1>

            {/* 4. The Glass-encased QR Code */}
            <div className="inline-block p-4 md:p-8 bg-white rounded-[2.5rem] shadow-[0_0_50px_rgba(59,130,246,0.3)] mb-10 transition-transform hover:scale-105 duration-500">
              {token ? (
                <QRCodeSVG 
                  value={token} 
                  size={window?.innerWidth < 768 ? 200 : 320} 
                  level="H" 
                  includeMargin={false}
                  className="rounded-xl"
                />
              ) : (
                <div className="w-[200 md:320px] h-[200 md:320px] flex items-center justify-center text-gray-400 font-bold animate-pulse">
                  Generating Token...
                </div>
              )}
            </div>

            {/* 5. Animated Progress Timer */}
            <div className="max-w-xs mx-auto space-y-4">
              <div className="flex justify-between items-end px-1">
                <span className="text-xs font-black tracking-widest text-blue-400 uppercase">Secure Session</span>
                <span className="text-2xl font-black tabular-nums">{timeLeft}s</span>
              </div>
              
              <div className="w-full h-3 bg-gray-700/50 rounded-full overflow-hidden border border-white/5">
                <div 
                  className="h-full bg-gradient-to-r from-blue-500 to-indigo-500 transition-all duration-1000 ease-linear"
                  style={{ width: `${(timeLeft / 30) * 100}%` }}
                ></div>
              </div>
              
              <p className="text-gray-500 text-xs font-medium">
                The QR code will automatically rotate to prevent proxy attendance.
              </p>
            </div>
          </div>
        </div>

        {/* 6. Status Footer */}
        <div className="mt-12 flex flex-col items-center gap-4">
          <div className="flex items-center gap-3 px-6 py-3 bg-white/50 backdrop-blur-md rounded-full border border-white/20 shadow-sm">
            <span className="relative flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500"></span>
            </span>
            <span className="text-sm font-bold text-gray-700 tracking-tight">System Live & Encrypted</span>
          </div>
        </div>
      </div>
    </div>
  );
}
