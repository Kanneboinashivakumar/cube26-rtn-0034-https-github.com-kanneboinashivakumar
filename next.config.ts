import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Allow up to 10 MB body size for API routes handling 1–5 base64-encoded images
  experimental: {
    serverActions: {
      bodySizeLimit: "10mb",
    },
  },
};

export default nextConfig;
