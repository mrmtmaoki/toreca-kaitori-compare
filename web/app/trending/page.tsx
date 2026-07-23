import Link from "next/link";
import { DUMMY_FALLING_CARDS, DUMMY_TREND_CARDS } from "@/lib/dummyTrendData";
import TestDataNotice from "../TestDataNotice";
import TrendingTabs from "../TrendingTabs";

export const dynamic = "force-dynamic";

export default function TrendingPage() {
  return (
    <main className="mx-auto max-w-4xl px-5 py-10">
      <Link
        href="/"
        className="mono inline-block text-xs tracking-[0.25em] text-[var(--gold)] uppercase hover:underline"
      >
        ← Kaitori Radar
      </Link>

      <h1 className="mt-2 mb-4 text-2xl font-black text-[var(--ink)]">急上昇 / 急降下ピックアップ</h1>

      <TestDataNotice />
      <TrendingTabs rising={DUMMY_TREND_CARDS} falling={DUMMY_FALLING_CARDS} />
    </main>
  );
}
