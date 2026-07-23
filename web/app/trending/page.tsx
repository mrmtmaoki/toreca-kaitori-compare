import type { Metadata } from "next";
import Link from "next/link";
import { DUMMY_FALLING_CARDS, DUMMY_TREND_CARDS } from "@/lib/dummyTrendData";
import { SITE_NAME, SITE_URL } from "@/lib/site";
import TestDataNotice from "../TestDataNotice";
import TrendingTabs from "../TrendingTabs";

const title = "トレカ買取価格チャート｜急上昇・急降下ピックアップ";
const description =
  "トレーディングカードの買取価格推移をチャートで確認。直近で急上昇・急降下しているカードをまとめてピックアップします。";

export const metadata: Metadata = {
  title,
  description,
  alternates: { canonical: `${SITE_URL}/trending` },
  openGraph: { title, description, url: `${SITE_URL}/trending`, siteName: SITE_NAME, locale: "ja_JP", type: "website" },
  twitter: { card: "summary_large_image", title, description },
};

export default function TrendingPage() {
  return (
    <main className="mx-auto max-w-4xl px-5 py-10">
      <Link
        href="/"
        className="mono inline-block text-xs tracking-[0.25em] text-[var(--gold)] uppercase hover:underline"
      >
        ← Kaitori Radar
      </Link>

      <h1 className="mt-2 mb-1 text-2xl font-black text-[var(--ink)]">急上昇 / 急降下ピックアップ</h1>
      <p className="mb-4 text-sm text-[var(--ink-soft)]">
        買取価格の推移を株価チャートのように可視化。直近で価格が急上昇・急降下しているカードをまとめました。
      </p>

      <TestDataNotice />
      <TrendingTabs rising={DUMMY_TREND_CARDS} falling={DUMMY_FALLING_CARDS} />
    </main>
  );
}
