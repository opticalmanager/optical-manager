import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  allowedDevOrigins: [
    "admin.lvh.me",
    "admin.lvh.me:3000",
    "admin.localhost",
    "admin.localhost:3000",
    "localhost:3000",
  ],
};

export default nextConfig;
