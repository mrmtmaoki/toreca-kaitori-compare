import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { MIN_SET_PAGE_SIZE, SET_BROWSABLE_SERIES, topCards } from "@/lib/db";
import { getSeriesBySlug } from "@/lib/series";
import { SITE_NAME, SITE_URL } from "@/lib/site";
import { CardTile } from "../../../CardExplorer";
import GenreNav from "../../../GenreNav";
import SiteFooter from "../../../SiteFooter";

// See app/page.tsx for why ISR (not force-dynamic) is correct here.
export const revalidate = 3600;

const PAGE_SIZE = 60;

async function resolveSet(seriesSlug: string, code: string) {
  const series = getSeriesBySlug(seriesSlug);
  if (!series) return null;
  if (!SET_BROWSABLE_SERIES.includes(series.name)) return null;

  const cards = topCards("shops_desc", Number.MAX_SAFE_INTEGER, series.name, code);
  if (cards.length < MIN_SET_PAGE_SIZE) return null;

  return { series, cards };
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ series: string; code: string }>;
}): Promise<Metadata> {
  const { series: seriesSlug, code } = await params;
  const resolved = await resolveSet(seriesSlug, code);
  if (!resolved) return {};
  const { series, cards } = resolved;

  const title = `${code} 買取価格一覧｜${series.label}｜${SITE_NAME}`;
  const description = `${series.label}「${code}」収録カード${cards.length}種の買取価格を店舗横断で比較。`;
  const url = `${SITE_URL}/${series.slug}/set/${code}`;

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
      images: [`${SITE_URL}/opengraph-image`],
    },
    twitter: { card: "summary_large_image", title, description },
  };
}

export default async function SetPage({
  params,
  searchParams,
}: {
  params: Promise<{ series: string; code: string }>;
  searchParams: Promise<{ page?: string }>;
}) {
  const { series: seriesSlug, code } = await params;
  const resolved = await resolveSet(seriesSlug, code);
  if (!resolved) notFound();
  const { series, cards } = resolved;

  const { page: pageParam } = await searchParams;
  const totalPages = Math.max(1, Math.ceil(cards.length / PAGE_SIZE));
  const page = Math.min(totalPages, Math.max(1, Number(pageParam) || 1));
  const pageCards = cards.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const breadcrumbJsonLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: SITE_NAME, item: SITE_URL },
      { "@type": "ListItem", position: 2, name: series.label, item: `${SITE_URL}/${series.slug}` },
      { "@type": "ListItem", position: 3, name: code, item: `${SITE_URL}/${series.slug}/set/${code}` },
    ],
  };

  return (
    <main className="flex-1">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }} />
      <div className="mx-auto max-w-6xl px-5 pt-10 pb-4 sm:pt-14">
        <Link
          href={`/${series.slug}`}
          className="mono inline-block text-xs tracking-[0.25em] text-[var(--gold)] uppercase hover:underline"
        >
          ← {series.label}
        </Link>
        <h1 className="mt-2 text-3xl leading-[1.15] font-black tracking-tight sm:text-5xl">
          {code}
          <span className="ml-2 text-lg font-bold text-[var(--ink-soft)] sm:text-2xl">買取価格一覧</span>
        </h1>
        <p className="mt-3 max-w-xl text-sm text-[var(--ink-soft)] sm:text-base">
          {series.label}「{code}」収録カード{cards.length}種の買取価格を比較できます。
        </p>

        <div className="mt-6">
          <GenreNav activeSlug={series.slug} />
        </div>
      </div>

      <div className="mx-auto max-w-6xl px-5 pb-24">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {pageCards.map((card) => (
            <CardTile key={card.id} card={card} series={series.slug} />
          ))}
        </div>

        {totalPages > 1 && (
          <nav className="mt-8 flex items-center justify-center gap-4 text-sm">
            {page > 1 ? (
              <Link
                href={`/${series.slug}/set/${code}?page=${page - 1}`}
                className="rounded-full border border-[var(--line)] px-4 py-2 hover:border-[var(--gold)]"
              >
                ← 前へ
              </Link>
            ) : (
              <span />
            )}
            <span className="mono text-xs text-[var(--ink-soft)]">
              {page} / {totalPages}
            </span>
            {page < totalPages ? (
              <Link
                href={`/${series.slug}/set/${code}?page=${page + 1}`}
                className="rounded-full border border-[var(--line)] px-4 py-2 hover:border-[var(--gold)]"
              >
                次へ →
              </Link>
            ) : (
              <span />
            )}
          </nav>
        )}
      </div>

      <SiteFooter />
    </main>
  );
}
