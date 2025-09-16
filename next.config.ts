// File: next.config.ts
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // This option helps ensure all files are correctly bundled for a serverless environment.
  output: 'standalone',
};

export default nextConfig;