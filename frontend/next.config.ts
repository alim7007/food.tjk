import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  allowedDevOrigins: ["localhost:3000", "*.ngrok-free.app", "*.ngrok.app"],
};

export default nextConfig;
