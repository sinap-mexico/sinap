import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
  reactStrictMode: false,
  // Output standalone for Vercel serverless optimization
  output: "standalone",
  // Allow API routes up to 60s (default is 10s on hobby plan)
  experimental: {
    maxDuration: 60,
  },
  // Optimize images
  images: {
    formats: ["image/avif", "image/webp"],
  },
  allowedDevOrigins: [
    'http://21.0.2.93:8080',
    'http://21.0.2.93:81',
    'http://localhost:8080',
  ],
};

export default nextConfig;
