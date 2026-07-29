"use client";

import { useEffect, useState } from "react";

// "PR" label is required disclosure under Japan's stealth-marketing
// regulation (景品表示法, enforced since 2023) for any paid/affiliate
// promotional link. Every href/img src pair below (tracking redirects) and
// the 1x1 tracking pixels must be used exactly as issued by A8.net, not
// modified or proxied through next/image.

// オンラインオリパ「どっかん！トレカ」— PC/スマホ両対応。ポイント購入時の
// 成果報酬(¥700)は下の DOPA! より低いが、PC訪問者にも成果が付くので、
// アプリ限定のDOPA!が刺さらないPC側の受け皿として残す。
function DokkanBanner() {
  return (
    <div className="flex flex-col items-center gap-1 py-2">
      <span className="mono text-[10px] tracking-wider text-[var(--ink-soft)]">PR</span>
      <a href="https://px.a8.net/svt/ejp?a8mat=4B8810+67V08I+5PLE+5YZ75" rel="nofollow noopener" target="_blank">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          width={300}
          height={250}
          alt="オンラインオリパの【どっかん！トレカ】"
          src="https://www25.a8.net/svt/bgt?aid=260724132376&wid=001&eno=01&mid=s00000026645001003000&mc=1"
        />
      </a>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        width={1}
        height={1}
        src="https://www12.a8.net/0.gif?a8mat=4B8810+67V08I+5PLE+5YZ75"
        alt=""
        style={{ position: "absolute" }}
      />
    </div>
  );
}

// オンラインオリパ「DOPA!」— アプリ限定(新規アプリインストール¥300、新規
// ポイント購入¥4,000と単価がどっかん！トレカよりかなり高いが、PCではアプリ
// をインストールできず成果が発生しないため、モバイル訪問者にのみ表示する。
function DopaBanner() {
  return (
    <div className="flex flex-col items-center gap-1 py-2">
      <span className="mono text-[10px] tracking-wider text-[var(--ink-soft)]">PR</span>
      <a href="https://px.a8.net/svt/ejp?a8mat=4B8ACV+7B5M5U+5CJO+BXIYP" rel="nofollow noopener" target="_blank">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          width={300}
          height={250}
          alt="オンラインオリパ【DOPA!(ドーパ)】"
          src="https://www22.a8.net/svt/bgt?aid=260727151442&wid=001&eno=01&mid=s00000024954002004000&mc=1"
        />
      </a>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        width={1}
        height={1}
        src="https://www16.a8.net/0.gif?a8mat=4B8ACV+7B5M5U+5CJO+BXIYP"
        alt=""
        style={{ position: "absolute" }}
      />
    </div>
  );
}

// Client-side device check, not server-side (via next/headers) — reading
// the request's User-Agent server-side would opt every page rendering this
// component out of ISR (headers() forces dynamic rendering), undoing the
// Core Web Vitals win those pages' `revalidate` config was chosen for (see
// e.g. app/page.tsx). Deciding client-side after mount avoids that, at the
// cost of the banner appearing one tick after the rest of the page — an
// acceptable tradeoff for a below-the-fold affiliate slot. Rendering only
// the chosen variant (not both, hidden via CSS) matters here specifically
// because each variant's 1x1 tracking pixel fires an "impression" to a
// different ASP program the moment its <img> exists in the DOM — showing
// both would double-count impressions on both programs' reports regardless
// of which one the visitor could actually convert on.
function isMobileViewport(): boolean {
  return window.matchMedia("(max-width: 768px)").matches;
}

export default function AffiliateBanner() {
  const [variant, setVariant] = useState<"mobile" | "desktop" | null>(null);

  useEffect(() => {
    setVariant(isMobileViewport() ? "mobile" : "desktop");
  }, []);

  if (!variant) return null;
  return variant === "mobile" ? <DopaBanner /> : <DokkanBanner />;
}
