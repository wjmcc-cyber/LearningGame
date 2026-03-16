import path from "path";
import type { NextConfig } from "next";
import { initOpenNextCloudflareForDev } from "@opennextjs/cloudflare";

initOpenNextCloudflareForDev();

const nextConfig: NextConfig = {
  turbopack: {
    root: path.join(process.cwd()),
  },
};

export default nextConfig;
