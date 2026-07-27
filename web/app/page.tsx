import Link from "next/link";
import { getStats, topCards } from "@/lib/db";
import { SERIES_LIST } from "@/lib/series";
import { SITE_NAME, SITE_URL } from "@/lib/site";
import AffiliateBanner from "./AffiliateBanner";
import SiteFooter from "./SiteFooter";
import StatsBar from "./StatsBar";
import TrendingPicks from "./TrendingPicks";

// data/kaitori.db only actually changes once a day (bundled fresh into each
// Netlify deploy by the scrape workflow — see netlify.toml/`included_files`
// and .github/workflows/scrape.yml), so force-dynamic bought no real
// freshness here, just a full SQLite round-trip on every single request.
// Revalidating hourly caches the rendered page instead, which is a real
// Core Web Vitals/TTFB win with no actual staleness cost.
export const revalidate = 3600;

const websiteJsonLd = {
  "@context": "https://schema.org",
  "@type": "WebSite",
  name: SITE_NAME,
  url: SITE_URL,
  description: "トレーディングカードの買取価格を複数店舗で横断比較できるサイト。",
};

export default function HomePage() {
  const stats = getStats();
  const genres = SERIES_LIST.map((s) => {
    const seriesStats = getStats(s.name);
    const top = topCards("shops_desc", 1, s.name)[0] ?? null;
    return { ...s, cardCount: seriesStats.cardCount, topCardName: top?.name ?? null };
  });

  return (
    <main className="flex-1">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(websiteJsonLd) }} />
      <div className="mx-auto max-w-6xl px-5 pt-14 pb-4 sm:pt-20">
        <div className="mb-4 flex items-baseline gap-3">
          <span className="text-2xl font-black tracking-tight text-[var(--gold)] sm:text-3xl">
            買取レーダー
          </span>
          <span className="mono text-[10px] tracking-[0.25em] text-[var(--ink-soft)] uppercase sm:text-xs">
            Kaitori Radar
          </span>
        </div>
        <h1 className="text-4xl leading-[1.15] font-black tracking-tight sm:text-6xl">
          そのカード、
          <br className="sm:hidden" />
          <span className="bg-gradient-to-r from-[var(--gold)] to-amber-300 bg-clip-text text-transparent">
            どこで売るのが一番高い？
          </span>
        </h1>
        <p className="mt-4 max-w-xl text-sm text-[var(--ink-soft)] sm:text-base">
          秋葉原の店舗と全国対応の宅配買取、トレカ買取価格を一覧にまとめました。各サイトを見て回らなくても、同じカードの買取価格を1画面で比較でき、価格推移もチャートで確認できます。
        </p>

        <StatsBar
          shopCount={stats.shopCount}
          cardCount={stats.cardCount}
          lastScrapedAt={stats.lastScrapedAt}
        />
      </div>

      <TrendingPicks />

      <div className="mx-auto max-w-6xl px-5 pb-24">
        <p className="mt-10 mb-4 text-sm font-bold text-[var(--ink-soft)]">
          ジャンルを選んで比較
        </p>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {genres.map((g) => (
            <Link
              key={g.slug}
              href={`/${g.slug}`}
              className="group relative overflow-hidden rounded-2xl border border-[var(--line)] bg-[var(--bg-card)] p-6 transition-colors hover:border-[var(--gold)]/50"
            >
              <div
                aria-hidden
                className="absolute top-0 left-0 h-full w-1"
                style={{ backgroundColor: g.accent }}
              />
              <div className="flex items-center gap-4 pl-2">
                <div className="min-w-0 flex-1">
                  <h2 className="text-xl font-black text-[var(--ink)]">{g.label}</h2>
                  <p className="mt-1 text-xs text-[var(--ink-soft)]">{g.tagline}</p>
                  <p className="mono mt-3 text-sm font-bold" style={{ color: g.accent }}>
                    {g.cardCount.toLocaleString()}件を比較
                  </p>
                  {g.topCardName && (
                    <p className="mt-1 truncate text-xs text-[var(--ink-soft)]">
                      注目: {g.topCardName}
                    </p>
                  )}
                </div>
                <span
                  className="mono shrink-0 text-2xl transition-transform group-hover:translate-x-1"
                  style={{ color: g.accent }}
                >
                  →
                </span>
              </div>
            </Link>
          ))}
        </div>
      </div>

      <AffiliateBanner />

      <SiteFooter />
    </main>
  );
}
