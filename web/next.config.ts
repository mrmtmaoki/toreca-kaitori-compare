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
      { protocol: "https", hostname: "www.onepiece-cardgame.com" },
      // 2026-07-27 宅配買取拡張: 遊々亭/ホビーステーション/トレトク
      { protocol: "https", hostname: "card.yuyu-tei.jp" },
      { protocol: "https", hostname: "www.hobbystation-single.jp" },
      { protocol: "https", hostname: "yamatokuimg.blob.core.windows.net" },
    ],
  },
};

export default nextConfig;
