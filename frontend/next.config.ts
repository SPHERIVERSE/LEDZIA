import type { NextConfig } from "next";
import withPWAInit from "next-pwa";

const withPWA = withPWAInit({
  dest: "public",
  disable: process.env.NODE_ENV === "development", 
  register: true,
  skipWaiting: true,
});

const nextConfig: NextConfig = {
  reactCompiler: true,
  
  typescript: {
    ignoreBuildErrors: true,
  },

  // Fixes the 502/WebSocket handshake block over your Cloudflare Tunnel
  allowedDevOrigins: [
    'localhost:3000'
  ]
};

export default withPWA(nextConfig);

