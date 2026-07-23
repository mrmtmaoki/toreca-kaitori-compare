import Link from "next/link";
import { getStats, topCards } from "@/lib/db";
import { SERIES_LIST } from "@/lib/series";
import SiteFooter from "./SiteFooter";
import StatsBar from "./StatsBar";

// Data comes from a SQLite file that's updated by periodic scrapes, so this
// page must not be statically prerendered at build time.
export const dynamic = "force-dynamic";

export default function HomePage() {
  const stats = getStats();
  const genres = SERIES_LIST.map((s) => {
    const seriesStats = getStats(s.name);
    const top = topCards("shops_desc", 1, s.name)[0] ?? null;
    return { ...s, cardCount: seriesStats.cardCount, topCardName: top?.name ?? null };
  });

  return (
    <main className="flex-1">
      <div className="mx-auto max-w-6xl px-5 pt-14 pb-4 sm:pt-20">
        <p className="mono mb-3 text-xs tracking-[0.25em] text-[var(--gold)] uppercase">
          Kaitori Radar
        </p>
        <h1 className="text-4xl leading-[1.15] font-black tracking-tight sm:text-6xl">
          そのカード、
          <br className="sm:hidden" />
          <span className="bg-gradient-to-r from-[var(--gold)] to-amber-300 bg-clip-text text-transparent">
            どこで売るのが一番高い？
          </span>
        </h1>
        <p className="mt-4 max-w-xl text-sm text-[var(--ink-soft)] sm:text-base">
          秋葉原のトレカ買取店を横断検索。同じカードの買取価格を1画面で比較できます。
        </p>

        <StatsBar
          shopCount={stats.shopCount}
          cardCount={stats.cardCount}
          lastScrapedAt={stats.lastScrapedAt}
        />
      </div>

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

      <SiteFooter />
    </main>
  );
}
