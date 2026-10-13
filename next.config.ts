import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  allowedDevOrigins: [
    "admin.lvh.me",
    "admin.lvh.me:3000",
    "admin.localhost",
    "admin.localhost:3000",
    "localhost:3000",
  ],
  experimental: {
    serverActions: {
      bodySizeLimit: "15mb",
    },
  },
};

export default nextConfig;
