import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
  turbopack: {
    root: __dirname,
  },
  webpack: (config) => {
    config.resolve.alias = {
      ...config.resolve.alias,
      "tw-animate-css": path.resolve(
        __dirname,
        "node_modules/tw-animate-css/dist/tw-animate.css"
      ),
    };
    return config;
  },
};

export default nextConfig;
