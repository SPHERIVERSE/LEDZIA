import type { Metadata, Viewport } from "next";
//import { Inter } from "next/font/google";
import { Plus_Jakarta_Sans } from "next/font/google"; // 1. Import the new font
import "./globals.css";
import { OfflineSyncProvider } from "./OfflineSyncProvider"; // We'll create this wrapper
import { Toaster } from "react-hot-toast";

//const inter = Inter({ subsets: ["latin"] });

const jakarta = Plus_Jakarta_Sans({ 
  subsets: ["latin"],
  variable: '--font-jakarta',
});

// 1. Add the viewport export for PWA mobile scaling and theme colors
export const viewport: Viewport = {
  themeColor: "#10b981", // Emerald-500
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export const metadata: Metadata = {
  title: "LEDZIA Attendance",
  description: "Next-Gen Attendance Management",
  manifest: "/manifest.json?v=1",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      {/* 3. Apply the font and a premium animated gradient background */}
      <body className={`${jakarta.variable} font-sans antialiased bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-blue-50 via-white to-purple-50 min-h-screen custom-scrollbar`}>
        <Toaster position="top-center" />
        {children}
      </body>
    </html>
  );
}
