import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: { unoptimized: true },
  trailingSlash: false,
  allowedDevOrigins: ["127.0.0.1"],
};

export default nextConfig;
