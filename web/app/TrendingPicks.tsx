import Link from "next/link";
import { DUMMY_FALLING_CARDS, DUMMY_TREND_CARDS } from "@/lib/dummyTrendData";
import TestDataNotice from "./TestDataNotice";
import TrendingTabs from "./TrendingTabs";

/**
 * TEMPORARY placeholder content — see web/lib/dummyTrendData.ts. Swap
 * DUMMY_TREND_CARDS/DUMMY_FALLING_CARDS for a real "biggest recent movers"
 * query once enough automated scrape history exists, and drop
 * <TestDataNotice /> below at the same time.
 */
export default function TrendingPicks() {
  return (
    <div className="mx-auto max-w-6xl px-5 pb-4">
      <div className="mt-10 mb-3 flex items-center justify-between gap-2">
        <p className="text-sm font-bold text-[var(--ink-soft)]">急上昇 / 急降下ピックアップ</p>
        <Link href="/trending" className="text-xs font-bold text-[var(--gold)] hover:underline">
          もっと見る →
        </Link>
      </div>
      <TestDataNotice />
      <TrendingTabs rising={DUMMY_TREND_CARDS} falling={DUMMY_FALLING_CARDS} columns={3} />
    </div>
  );
}
