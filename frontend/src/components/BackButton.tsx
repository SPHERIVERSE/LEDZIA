"use client";

import { useRouter } from "next/navigation";

export default function BackButton() {
  const router = useRouter();

  return (
    <button 
      onClick={() => router.back()}
      className="group flex items-center gap-2 px-4 py-2 mb-6 bg-white/60 backdrop-blur-md border border-white/40 rounded-full shadow-sm hover:shadow-md hover:bg-white transition-all duration-300"
    >
      <svg 
        xmlns="http://www.w3.org/2000/svg" 
        className="h-5 w-5 text-gray-500 group-hover:-translate-x-1 transition-transform" 
        fill="none" viewBox="0 0 24 24" stroke="currentColor"
      >
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
      </svg>
      <span className="font-bold text-sm text-gray-700">Back</span>
    </button>
  );
}
