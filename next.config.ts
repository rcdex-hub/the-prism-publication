import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Vinext examines multipart requests before dispatching upload routes.
  // Allow multipart overhead; the upload API enforces the 5 MB image limit.
  experimental: { serverActions: { bodySizeLimit: "6mb" } },
};

export default nextConfig;
