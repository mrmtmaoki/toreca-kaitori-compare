import type { NextConfig } from "next";
import path from "node:path";

const nextConfig: NextConfig = {
  turbopack: {
    root: path.join(__dirname),
  },
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "www.suruga-ya.jp" },
      { protocol: "https", hostname: "makeshop-multi-images.akamaized.net" },
      { protocol: "https", hostname: "otachu-akiba.com" },
      { protocol: "https", hostname: "www.mercardop.jp" },
    ],
  },
};

export default nextConfig;
