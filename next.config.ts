import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // The floating dev badge overlaps the phone column's bottom-left corner.
  devIndicators: false,
  images: {
    // Photos are served straight from Cloudinary with fixed transformations,
    // so Next's optimizer is bypassed deliberately (see src/lib/cloudinary.ts).
    unoptimized: true,
  },
};

export default nextConfig;
