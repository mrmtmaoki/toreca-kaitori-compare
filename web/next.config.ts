import type { NextConfig } from "next";
import path from "node:path";

const nextConfig: NextConfig = {
  turbopack: {
    root: path.join(__dirname),
  },
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "www.suruga-ya.jp" },
      // suruga-ya's photo.php URL is a redirect gateway, not the image itself —
      // it 302s to cdn.suruga-ya.jp, which Next.js's image optimizer re-checks
      // against remotePatterns after following the redirect (confirmed live:
      // still 403'd with only www.suruga-ya.jp listed, until this was added).
      { protocol: "https", hostname: "cdn.suruga-ya.jp" },
      { protocol: "https", hostname: "makeshop-multi-images.akamaized.net" },
      { protocol: "https", hostname: "otachu-akiba.com" },
      { protocol: "https", hostname: "www.mercardop.jp" },
    ],
  },
};

export default nextConfig;
