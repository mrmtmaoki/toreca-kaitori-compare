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
      value: lastScrapedAt
        ? new Date(lastScrapedAt).toLocaleString("ja-JP", {
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
