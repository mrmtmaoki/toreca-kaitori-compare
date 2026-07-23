import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getCardById } from "@/lib/db";
import { getSeriesBySlug } from "@/lib/series";
import { SITE_NAME, SITE_URL } from "@/lib/site";
import { generateDummyEvents } from "@/lib/dummyTrendData";
import { CardThumb } from "../../CardExplorer";
import ShareButtons from "../../ShareButtons";
import TestDataNotice from "../../TestDataNotice";
import TrendCard from "../../TrendCard";

// See app/page.tsx for why ISR (not force-dynamic) is correct here.
export const revalidate = 3600;

async function resolveCard(seriesSlug: string, cardIdParam: string) {
  const series = getSeriesBySlug(seriesSlug);
  if (!series) return null;

  const cardId = Number(cardIdParam);
  if (!Number.isInteger(cardId)) return null;

  const card = getCardById(cardId, series.name);
  if (!card) return null;

  return { series, card };
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ series: string; cardId: string }>;
}): Promise<Metadata> {
  const { series: seriesSlug, cardId } = await params;
  const resolved = await resolveCard(seriesSlug, cardId);
  if (!resolved) return {};
  const { series, card } = resolved;

  const title = `${card.name} 買取価格比較｜${SITE_NAME}`;
  const description = `${card.name}の買取価格を${card.shopCount}店舗で横断比較。最高¥${card.maxPrice.toLocaleString()}。価格推移チャートで相場の動きもチェックできます。`;
  const url = `${SITE_URL}/${series.slug}/${card.id}`;

  return {
    title,
    description,
    alternates: { canonical: url },
    openGraph: {
      title,
      description,
      url,
      siteName: SITE_NAME,
      locale: "ja_JP",
      type: "website",
      images: card.imageUrl ? [{ url: card.imageUrl }] : undefined,
    },
    twitter: { card: "summary_large_image", title, description },
  };
}

export default async function CardDetailPage({
  params,
}: {
  params: Promise<{ series: string; cardId: string }>;
}) {
  const { series: seriesSlug, cardId } = await params;
  const resolved = await resolveCard(seriesSlug, cardId);
  if (!resolved) notFound();
  const { series, card } = resolved;

  // TEMPORARY: dummy trend data seeded by the card's real id, so the same
  // card always shows the same fake series — see web/lib/dummyTrendData.ts.
  const events = generateDummyEvents(300, card.maxPrice || 3000, card.id, "up");

  return (
    <main className="mx-auto max-w-3xl px-5 py-10">
      <Link
        href={`/${series.slug}`}
        className="mono inline-block text-xs tracking-[0.25em] text-[var(--gold)] uppercase hover:underline"
      >
        ← {series.label}
      </Link>

      <div className="mt-4 flex items-start gap-4">
        <CardThumb imageUrl={card.imageUrl} name={card.name} />
        <div className="min-w-0 flex-1">
          <h1 className="text-xl font-black leading-snug text-[var(--ink)] sm:text-2xl">{card.name}</h1>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {card.rarity && (
              <span className="mono rounded-md bg-white/5 px-2 py-0.5 text-[11px] text-[var(--ink-soft)]">
                {card.rarity}
              </span>
            )}
            {card.cardNumber && (
              <span className="mono rounded-md bg-white/5 px-2 py-0.5 text-[11px] text-[var(--ink-soft)]">
                {card.cardNumber}
              </span>
            )}
            <span className="mono rounded-md bg-[var(--gold-soft)] px-2 py-0.5 text-[11px] font-bold text-[var(--gold)]">
              {card.shopCount}店舗で比較可能
            </span>
          </div>
        </div>
      </div>

      <div className="mt-4">
        <ShareButtons cardName={card.name} maxPrice={card.maxPrice} url={`${SITE_URL}/${series.slug}/${card.id}`} />
      </div>

      <section className="mt-8">
        <h2 className="mb-3 text-sm font-bold text-[var(--ink-soft)]">価格推移</h2>
        <TestDataNotice />
        <TrendCard name={card.name} sub={card.cardNumber ?? card.rarity ?? ""} events={events} />
      </section>

      <section className="mt-8">
        <h2 className="mb-3 text-sm font-bold text-[var(--ink-soft)]">店舗別買取価格</h2>
        <ul className="space-y-1.5">
          {card.prices.map((p, i) => {
            const isBest = p.price === card.maxPrice;
            return (
              <li key={`${p.shopName}-${i}`}>
                <a
                  href={p.sourceUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`flex items-center justify-between rounded-lg px-4 py-3 text-sm transition-colors ${
                    isBest
                      ? "bg-[var(--best-soft)] text-[var(--best)]"
                      : "bg-white/[0.03] text-[var(--ink)] hover:bg-white/[0.06]"
                  }`}
                >
                  <span className="truncate">{p.shopName}</span>
                  <span className="mono font-bold">¥{p.price.toLocaleString()}</span>
                </a>
              </li>
            );
          })}
        </ul>
      </section>
    </main>
  );
}
