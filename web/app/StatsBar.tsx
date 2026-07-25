export default function StatsBar({
  shopCount,
  cardCount,
  lastScrapedAt,
}: {
  shopCount: number;
  cardCount: number;
  lastScrapedAt: string | null;
}) {
  const items = [
    { label: "対応店舗", value: `${shopCount}店舗` },
    { label: "収録カード", value: `${cardCount.toLocaleString()}件` },
    {
      label: "最終更新",
      // "ja-JP" alone only controls formatting style (month/day order, etc)
      // — the actual clock time still follows the JS runtime's own system
      // timezone unless timeZone is passed explicitly too. Netlify's server
      // runtime is UTC, so without this a JST-morning scrape (e.g. 08:51
      // JST) rendered as the previous UTC calendar day (23:51, "7/24") —
      // same JST/UTC day-boundary bug class as web/lib/priceHistory.ts.
      value: lastScrapedAt
        ? new Date(lastScrapedAt).toLocaleString("ja-JP", {
            timeZone: "Asia/Tokyo",
            month: "numeric",
            day: "numeric",
            hour: "2-digit",
            minute: "2-digit",
          })
        : "--",
    },
  ];

  return (
    <div className="mt-8 flex flex-wrap gap-3">
      {items.map((item) => (
        <div
          key={item.label}
          className="rounded-xl border border-[var(--line)] bg-[var(--bg-elevated)] px-4 py-2.5"
        >
          <div className="text-[10px] text-[var(--ink-soft)] tracking-wide">{item.label}</div>
          <div className="mono text-lg font-bold text-[var(--ink)]">{item.value}</div>
        </div>
      ))}
    </div>
  );
}
