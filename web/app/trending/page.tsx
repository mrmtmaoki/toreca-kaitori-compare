import type { Metadata } from "next";
import Link from "next/link";
import { getTopMoversRanked, hasMultiDayHistory } from "@/lib/topMovers";
import { getCardPriceHistory } from "@/lib/priceHistory";
import { SERIES_LIST } from "@/lib/series";
import { SITE_NAME, SITE_URL } from "@/lib/site";
import { DUMMY_FALLING_CARDS, DUMMY_TREND_CARDS, generateDummyEvents } from "@/lib/dummyTrendData";
import TestDataNotice from "../TestDataNotice";
import TrendingTabs, { type TrendingCardData } from "../TrendingTabs";
import AffiliateBanner from "../AffiliateBanner";

const title = "トレカ買取価格チャート｜急上昇・急降下ピックアップ";
const description =
  "トレーディングカードの買取価格推移をチャートで確認。直近で急上昇・急降下しているカードをまとめてピックアップします。";

export const metadata: Metadata = {
  title,
  description,
  alternates: { canonical: `${SITE_URL}/trending` },
  openGraph: {
    title,
    description,
    url: `${SITE_URL}/trending`,
    siteName: SITE_NAME,
    locale: "ja_JP",
    type: "website",
    images: [`${SITE_URL}/opengraph-image`],
  },
  twitter: { card: "summary_large_image", title, description },
};

const RANK_LIMIT = 3;

export default function TrendingPage() {
  const enoughHistory = hasMultiDayHistory();

  return (
    <main className="mx-auto max-w-5xl px-5 py-10">
      <Link
        href="/"
        className="mono inline-block text-xs tracking-[0.25em] text-[var(--gold)] uppercase hover:underline"
      >
        ← {SITE_NAME}
      </Link>

      <h1 className="mt-2 mb-1 text-2xl font-black text-[var(--ink)]">急上昇 / 急降下ピックアップ</h1>
      <p className="mb-4 text-sm text-[var(--ink-soft)]">
        買取価格の推移を株価チャートのように可視化。直近で価格が急上昇・急降下しているカードをジャンル別にまとめました。
      </p>

      {!enoughHistory ? (
        <>
          <TestDataNotice />
          <TrendingTabsFromDummy />
        </>
      ) : (
        <div className="space-y-10">
          {SERIES_LIST.map((series) => {
            const rising = getTopMoversRanked(series.name, "up", RANK_LIMIT).map((m): TrendingCardData => ({
              id: m.card.id,
              seriesSlug: series.slug,
              name: m.card.name,
              sub: m.card.cardNumber ?? m.card.rarity ?? "",
              changePercent: m.changePercent,
              events: getCardPriceHistory(m.card.id, series.name),
            }));
            const falling = getTopMoversRanked(series.name, "down", RANK_LIMIT).map((m): TrendingCardData => ({
              id: m.card.id,
              seriesSlug: series.slug,
              name: m.card.name,
              sub: m.card.cardNumber ?? m.card.rarity ?? "",
              changePercent: m.changePercent,
              events: getCardPriceHistory(m.card.id, series.name),
            }));

            if (rising.length === 0 && falling.length === 0) return null;

            return (
              <section key={series.slug}>
                <div className="mb-3 flex items-center justify-between gap-2">
                  <h2 className="text-lg font-black text-[var(--ink)]" style={{ color: series.accent }}>
                    {series.label}
                  </h2>
                  <Link
                    href={`/${series.slug}`}
                    className="text-xs font-bold text-[var(--gold)] hover:underline"
                  >
                    一覧を見る →
                  </Link>
                </div>
                <TrendingTabs rising={rising} falling={falling} columns={3} />
              </section>
            );
          })}
        </div>
      )}

      {enoughHistory && <AffiliateBanner />}
    </main>
  );
}

// Kept only as the pre-automation-history fallback (see hasEnoughHistory
// above) — mirrors the previous always-dummy behavior of this page.
function TrendingTabsFromDummy() {
  const rising: TrendingCardData[] = DUMMY_TREND_CARDS.map((c, i) => ({
    id: -1 - i,
    seriesSlug: "yugioh",
    name: c.name,
    sub: c.sub,
    changePercent: 0,
    events: generateDummyEvents(c.days, c.base, c.seed, c.direction),
  }));
  const falling: TrendingCardData[] = DUMMY_FALLING_CARDS.map((c, i) => ({
    id: -100 - i,
    seriesSlug: "yugioh",
    name: c.name,
    sub: c.sub,
    changePercent: 0,
    events: generateDummyEvents(c.days, c.base, c.seed, c.direction),
  }));
  return <TrendingTabs rising={rising} falling={falling} columns={3} />;
}
