import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Increase body size limit for API routes handling 1–5 base64-encoded images.
  // Each image can be up to ~2MB base64-encoded, so 5 × 2MB = ~10MB payload.
  experimental: {
    serverActions: {
      bodySizeLimit: "10mb",
    },
  },
  outputFileTracingIncludes: {
    "/api/**/*": ["./public/demo-data/**/*", "./demo-data/**/*"],
  },
};

export default nextConfig;
