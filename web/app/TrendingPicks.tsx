import Link from "next/link";
import { CardThumb } from "./CardExplorer";
import { getTopMoverPerGenre } from "@/lib/topMovers";
import { getSeriesBySlug } from "@/lib/series";
import { DUMMY_FALLING_CARDS, DUMMY_TREND_CARDS, generateDummyEvents } from "@/lib/dummyTrendData";
import TestDataNotice from "./TestDataNotice";
import TrendingTabs, { type TrendingCardData } from "./TrendingTabs";

const DUMMY_RISING: TrendingCardData[] = DUMMY_TREND_CARDS.map((c, i) => ({
  id: -1 - i,
  seriesSlug: "yugioh",
  name: c.name,
  sub: c.sub,
  changePercent: 0,
  events: generateDummyEvents(c.days, c.base, c.seed, c.direction),
}));
const DUMMY_FALLING: TrendingCardData[] = DUMMY_FALLING_CARDS.map((c, i) => ({
  id: -100 - i,
  seriesSlug: "yugioh",
  name: c.name,
  sub: c.sub,
  changePercent: 0,
  events: generateDummyEvents(c.days, c.base, c.seed, c.direction),
}));

/**
 * Real "biggest riser per genre" once there are at least 2 scrape dates in
 * the DB to compare (see getTopMoverPerGenre); until then, falls back to the
 * dummy chart teaser so the homepage section isn't just empty while real
 * history accumulates. No manual cutover needed — swaps on its own once the
 * daily scrape cron has run at least twice.
 */
export default function TrendingPicks() {
  const movers = getTopMoverPerGenre();

  if (!movers) {
    return (
      <div className="mx-auto max-w-6xl px-5 pb-4">
        <div className="mt-10 mb-3 flex items-center justify-between gap-2">
          <p className="text-sm font-bold text-[var(--ink-soft)]">急上昇 / 急降下ピックアップ</p>
          <Link href="/trending" className="text-xs font-bold text-[var(--gold)] hover:underline">
            もっと見る →
          </Link>
        </div>
        <TestDataNotice />
        <TrendingTabs rising={DUMMY_RISING} falling={DUMMY_FALLING} columns={3} />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl px-5 pb-4">
      <div className="mt-10 mb-3 flex items-center justify-between gap-2">
        <p className="text-sm font-bold text-[var(--ink-soft)]">ジャンル別 急上昇カード</p>
        <Link
          href="/trending"
          className="mono rounded-full bg-[var(--gold-soft)] px-4 py-2 text-sm font-bold text-[var(--gold)] transition-colors hover:bg-[var(--gold)] hover:text-[var(--bg)]"
        >
          急上昇/急降下チャート →
        </Link>
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {movers.map((mover) => {
          const series = getSeriesBySlug(mover.series);
          return (
            <Link
              key={mover.card.id}
              href={`/${mover.series}/${mover.card.id}`}
              className="flex gap-3 rounded-2xl border border-[var(--line)] bg-[var(--bg-card)] p-4 transition-colors hover:border-[var(--gold)]/50"
            >
              <CardThumb imageUrl={mover.card.imageUrl} name={mover.card.name} />
              <div className="min-w-0 flex-1">
                <span
                  className="mono text-[10px] font-bold tracking-wide uppercase"
                  style={{ color: series?.accent }}
                >
                  {series?.label}
                </span>
                <p className="truncate text-sm font-bold text-[var(--ink)]">{mover.card.name}</p>
                <p className="mono mt-1 text-lg font-black" style={{ color: "var(--best)" }}>
                  ¥{mover.card.maxPrice.toLocaleString()}
                </p>
                <p className="mono text-xs font-bold" style={{ color: "var(--best)" }}>
                  ↑ +{mover.changePercent.toFixed(0)}%(+¥{mover.changeAmount.toLocaleString()})
                </p>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
