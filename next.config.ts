import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  webpack: (config) => {
    config.experiments = { ...config.experiments, asyncWebAssembly: true };
    config.module.rules.push({
      test: /\.wasm$/,
      type: 'webassembly/async'
    });
    return config;
  },
  // Turbopack configuration for WASM support
  turbopack: {}
};

export default nextConfig;
