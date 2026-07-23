import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getStats, topCards } from "@/lib/db";
import { getSeriesBySlug, SERIES_LIST } from "@/lib/series";
import { SITE_NAME, SITE_URL } from "@/lib/site";
import CardExplorer from "../CardExplorer";
import GenreNav from "../GenreNav";
import SiteFooter from "../SiteFooter";
import StatsBar from "../StatsBar";

// See app/page.tsx for why ISR (not force-dynamic) is correct here — the
// underlying DB file only changes once per Netlify deploy, not per request.
export const revalidate = 3600;

export async function generateStaticParams() {
  return SERIES_LIST.map((s) => ({ series: s.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ series: string }>;
}): Promise<Metadata> {
  const { series: slug } = await params;
  const series = getSeriesBySlug(slug);
  if (!series) return {};

  const title = `${series.label}買取価格 一括比較｜カイトリレーダー`;
  const description = `${series.tagline}。秋葉原の買取店の価格を横断比較し、同じカードがどこで一番高く売れるか一発で分かります。`;
  const url = `${SITE_URL}/${series.slug}`;

  return {
    title,
    description,
    alternates: { canonical: url },
    openGraph: { title, description, url, siteName: SITE_NAME, locale: "ja_JP", type: "website" },
    twitter: { card: "summary_large_image", title, description },
  };
}

export default async function SeriesPage({
  params,
}: {
  params: Promise<{ series: string }>;
}) {
  const { series: slug } = await params;
  const series = getSeriesBySlug(slug);
  if (!series) notFound();

  const stats = getStats(series.name);
  const initialCards = topCards("shops_desc", 30, series.name);

  const breadcrumbJsonLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: SITE_NAME, item: SITE_URL },
      { "@type": "ListItem", position: 2, name: series.label, item: `${SITE_URL}/${series.slug}` },
    ],
  };
  const itemListJsonLd = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    itemListElement: initialCards.slice(0, 30).map((card, i) => ({
      "@type": "ListItem",
      position: i + 1,
      url: `${SITE_URL}/${series.slug}/${card.id}`,
      name: card.name,
    })),
  };

  return (
    <main className="flex-1">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(itemListJsonLd) }} />
      <div className="mx-auto max-w-6xl px-5 pt-10 pb-4 sm:pt-14">
        <Link
          href="/"
          className="mono inline-block text-xs tracking-[0.25em] text-[var(--gold)] uppercase hover:underline"
        >
          ← Kaitori Radar
        </Link>
        <h1 className="mt-2 text-3xl leading-[1.15] font-black tracking-tight sm:text-5xl">
          {series.label}
          <span className="ml-2 text-lg font-bold text-[var(--ink-soft)] sm:text-2xl">
            買取価格比較
          </span>
        </h1>
        <p className="mt-3 max-w-xl text-sm text-[var(--ink-soft)] sm:text-base">
          {series.tagline}。同じカードの買取価格を1画面で比較できます。
        </p>

        <div className="mt-6">
          <GenreNav activeSlug={series.slug} />
        </div>

        <StatsBar
          shopCount={stats.shopCount}
          cardCount={stats.cardCount}
          lastScrapedAt={stats.lastScrapedAt}
        />
      </div>

      <CardExplorer
        key={series.slug}
        initialCards={initialCards}
        series={series.slug}
        searchPlaceholder={series.searchPlaceholder}
      />

      <SiteFooter />
    </main>
  );
}
