import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Pin the workspace root to this project so the parent portfolios/ lockfile
  // isn't mistaken for the app root.
  turbopack: {
    root: __dirname,
  },
};

export default nextConfig;
