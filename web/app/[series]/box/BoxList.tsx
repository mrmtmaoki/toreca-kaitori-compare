"use client";

import { useMemo, useState } from "react";
import type { BoxPrice } from "@/lib/boxPrices";

export default function BoxList({ boxes }: { boxes: BoxPrice[] }) {
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const q = query.trim();
    if (!q) return boxes;
    return boxes.filter(
      (b) =>
        b.productName.includes(q) ||
        b.shopName.includes(q) ||
        (b.setCode?.includes(q) ?? false)
    );
  }, [boxes, query]);

  return (
    <>
      <div className="mb-4">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="商品名・セット名で検索"
          className="w-full rounded-full border border-[var(--line)] bg-[var(--bg-card)] px-5 py-3 text-sm outline-none placeholder:text-[var(--ink-soft)] focus:border-[var(--gold)]"
        />
      </div>

      {filtered.length === 0 ? (
        <div className="rounded-2xl border border-[var(--line)] bg-[var(--bg-elevated)] px-6 py-14 text-center text-[var(--ink-soft)]">
          該当するBOX・パックが見つかりませんでした。
        </div>
      ) : (
        <ul className="space-y-2">
          {filtered.map((b, i) => (
            <li key={`${b.shopName}-${b.productName}-${i}`}>
              <a
                href={b.sourceUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-between gap-3 rounded-xl border border-[var(--line)] bg-[var(--bg-card)] px-4 py-3 text-sm transition-colors hover:border-[var(--gold)]/50"
              >
                <div className="min-w-0 flex-1">
                  <p className="truncate font-bold text-[var(--ink)]">{b.productName}</p>
                  <p className="mono text-xs text-[var(--ink-soft)]">
                    {b.shopName}
                    {b.setCode ? ` ・ ${b.setCode}` : ""}
                  </p>
                </div>
                <span className="mono shrink-0 text-lg font-black text-[var(--best)]">
                  ¥{b.price.toLocaleString()}
                </span>
              </a>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
