import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { listBoxPrices } from "@/lib/boxPrices";
import { getSeriesBySlug } from "@/lib/series";
import { SITE_NAME, SITE_URL } from "@/lib/site";
import GenreNav from "../../GenreNav";
import SiteFooter from "../../SiteFooter";
import AffiliateBanner from "../../AffiliateBanner";
import BoxList from "./BoxList";

export const revalidate = 3600;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ series: string }>;
}): Promise<Metadata> {
  const { series: slug } = await params;
  const series = getSeriesBySlug(slug);
  if (!series) return {};

  const title = `${series.label}BOX(未開封)買取価格比較｜${SITE_NAME}`;
  const description = `${series.label}の未開封BOX・パックの買取価格を店舗横断で比較。`;
  const url = `${SITE_URL}/${series.slug}/box`;

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

export default async function BoxPricePage({ params }: { params: Promise<{ series: string }> }) {
  const { series: slug } = await params;
  const series = getSeriesBySlug(slug);
  if (!series) notFound();

  const boxes = listBoxPrices(series.name);

  return (
    <main className="flex-1">
      <div className="mx-auto max-w-4xl px-5 pt-10 pb-4 sm:pt-14">
        <Link
          href={`/${series.slug}`}
          className="mono inline-block text-xs tracking-[0.25em] text-[var(--gold)] uppercase hover:underline"
        >
          ← {series.label}
        </Link>
        <h1 className="mt-2 text-3xl leading-[1.15] font-black tracking-tight sm:text-5xl">
          {series.label}
          <span className="ml-2 text-lg font-bold text-[var(--ink-soft)] sm:text-2xl">
            BOX買取価格比較
          </span>
        </h1>
        <p className="mt-3 max-w-xl text-sm text-[var(--ink-soft)] sm:text-base">
          未開封BOX・パックをまるごと売る際の買取価格です。単品カードの価格は
          <Link href={`/${series.slug}`} className="text-[var(--gold)] hover:underline">
            こちら
          </Link>
          。
        </p>

        <div className="mt-6">
          <GenreNav activeSlug={series.slug} />
        </div>
      </div>

      <div className="mx-auto max-w-4xl px-5 pb-24">
        {boxes.length === 0 ? (
          <div className="rounded-2xl border border-[var(--line)] bg-[var(--bg-elevated)] px-6 py-14 text-center text-[var(--ink-soft)]">
            現在BOX買取価格のデータがありません。
          </div>
        ) : (
          <BoxList boxes={boxes} />
        )}
      </div>

      <AffiliateBanner />

      <SiteFooter />
    </main>
  );
}
