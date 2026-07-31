import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async rewrites() {
    return process.env.USER_PORTAL === "true"
      ? {
          beforeFiles: [{ source: "/", destination: "/user" }],
          afterFiles: [],
          fallback: [],
        }
      : { beforeFiles: [], afterFiles: [], fallback: [] };
  },
};

export default nextConfig;
