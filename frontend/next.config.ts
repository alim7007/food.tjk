import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  allowedDevOrigins: ["localhost:3000", "*.ngrok-free.app", "*.ngrok.app"],
  async rewrites() {
    return [
      { source: "/api/:path*", destination: "http://backend:8080/api/:path*" },
      { source: "/uploads/:path*", destination: "http://backend:8080/uploads/:path*" },
    ];
  },
};

export default nextConfig;
