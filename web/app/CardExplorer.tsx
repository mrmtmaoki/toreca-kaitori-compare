"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import type { AreaFilter, AttributeOption, CardSummary, SetOption, SortMode } from "@/lib/db";

const SORT_OPTIONS: { value: SortMode; label: string }[] = [
  { value: "shops_desc", label: "掲載店舗数が多い順" },
  { value: "price_desc", label: "最高価格が高い順" },
  { value: "price_asc", label: "最安価格が安い順" },
];

const AREA_OPTIONS: { value: AreaFilter | ""; label: string }[] = [
  { value: "", label: "エリア: すべて" },
  { value: "秋葉原", label: "秋葉原の店舗" },
  { value: "宅配", label: "全国宅配買取" },
];

export default function CardExplorer({
  initialCards,
  series,
  searchPlaceholder,
  setOptions,
  colorOptions,
  typeOptions,
}: {
  initialCards: CardSummary[];
  series: string;
  searchPlaceholder: string;
  setOptions?: SetOption[];
  colorOptions?: AttributeOption[];
  typeOptions?: AttributeOption[];
}) {
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<SortMode>("shops_desc");
  const [setFilter, setSetFilter] = useState("");
  const [colorFilter, setColorFilter] = useState("");
  const [typeFilter, setTypeFilter] = useState("");
  const [areaFilter, setAreaFilter] = useState<AreaFilter | "">("");
  const [cards, setCards] = useState<CardSummary[]>(initialCards);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const controller = new AbortController();
    const timer = setTimeout(async () => {
      setLoading(true);
      try {
        const params = new URLSearchParams();
        params.set("series", series);
        if (query.trim()) params.set("q", query.trim());
        else params.set("sort", sort);
        if (setFilter) params.set("set", setFilter);
        if (colorFilter) params.set("color", colorFilter);
        if (typeFilter) params.set("type", typeFilter);
        if (areaFilter) params.set("area", areaFilter);

        const res = await fetch(`/api/cards?${params.toString()}`, {
          signal: controller.signal,
        });
        const data = await res.json();
        setCards(data.cards);
      } catch (err) {
        if (!(err instanceof DOMException && err.name === "AbortError")) {
          console.error(err);
        }
      } finally {
        setLoading(false);
      }
    }, 250);

    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [query, sort, series, setFilter, colorFilter, typeFilter, areaFilter]);

  const heading = useMemo(() => {
    if (query.trim()) return `「${query.trim()}」の検索結果`;
    return SORT_OPTIONS.find((o) => o.value === sort)?.label ?? "";
  }, [query, sort]);

  return (
    <div className="mx-auto max-w-6xl px-5 pb-24">
      <div className="sticky top-0 z-10 -mx-5 bg-[var(--bg)]/85 px-5 py-4 backdrop-blur">
        <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
          <div className="relative min-w-[12rem] flex-1">
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={searchPlaceholder}
              className="w-full rounded-full border border-[var(--line)] bg-[var(--bg-card)] px-5 py-3 text-sm outline-none placeholder:text-[var(--ink-soft)] focus:border-[var(--gold)]"
            />
          </div>
          {!query.trim() && (
            <select
              value={sort}
              onChange={(e) => setSort(e.target.value as SortMode)}
              className="w-full shrink-0 truncate rounded-full border border-[var(--line)] bg-[var(--bg-card)] px-4 py-3 text-sm outline-none focus:border-[var(--gold)] sm:w-auto sm:max-w-[9.5rem]"
            >
              {SORT_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          )}
          {setOptions && setOptions.length > 0 && (
            <select
              value={setFilter}
              onChange={(e) => setSetFilter(e.target.value)}
              className="w-full shrink-0 truncate rounded-full border border-[var(--line)] bg-[var(--bg-card)] px-4 py-3 text-sm outline-none focus:border-[var(--gold)] sm:w-auto sm:max-w-[9.5rem]"
            >
              <option value="">セット: すべて</option>
              {setOptions.map((opt) => (
                <option key={opt.code} value={opt.code}>
                  {opt.code}({opt.count})
                </option>
              ))}
            </select>
          )}
          {colorOptions && colorOptions.length > 0 && (
            <select
              value={colorFilter}
              onChange={(e) => setColorFilter(e.target.value)}
              className="w-full shrink-0 truncate rounded-full border border-[var(--line)] bg-[var(--bg-card)] px-4 py-3 text-sm outline-none focus:border-[var(--gold)] sm:w-auto sm:max-w-[9.5rem]"
            >
              <option value="">色: すべて</option>
              {colorOptions.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.value}({opt.count})
                </option>
              ))}
            </select>
          )}
          {typeOptions && typeOptions.length > 0 && (
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="w-full shrink-0 truncate rounded-full border border-[var(--line)] bg-[var(--bg-card)] px-4 py-3 text-sm outline-none focus:border-[var(--gold)] sm:w-auto sm:max-w-[9.5rem]"
            >
              <option value="">タイプ: すべて</option>
              {typeOptions.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.value}({opt.count})
                </option>
              ))}
            </select>
          )}
          <select
            value={areaFilter}
            onChange={(e) => setAreaFilter(e.target.value as AreaFilter | "")}
            className="w-full shrink-0 truncate rounded-full border border-[var(--line)] bg-[var(--bg-card)] px-4 py-3 text-sm outline-none focus:border-[var(--gold)] sm:w-auto sm:max-w-[9.5rem]"
          >
            {AREA_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="mt-2 flex items-center gap-2 text-sm text-[var(--ink-soft)]">
        <span>{heading}</span>
        {loading && <span className="mono text-xs text-[var(--gold)]">読み込み中…</span>}
      </div>
      <p className="mt-1 mb-4 text-xs text-[var(--ink-soft)]">
        ⓘ
        カード名をクリックすると価格推移グラフ、価格をクリックすると各店舗のページに移動します。同じ店舗・同じカードでも、状態(美品/傷ありなど)やサイン入り・大会記念版などの違いにより複数の買取価格が存在する場合があります。表示は代表的な1件です。正式な金額は各店舗のページでご確認ください。
      </p>

      {cards.length === 0 && !loading && (
        <div className="rounded-2xl border border-[var(--line)] bg-[var(--bg-elevated)] px-6 py-14 text-center text-[var(--ink-soft)]">
          該当するカードが見つかりませんでした。
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {cards.map((card) => (
          <CardTile key={card.id} card={card} series={series} />
        ))}
      </div>
    </div>
  );
}

function CardTile({ card, series }: { card: CardSummary; series: string }) {
  const [expanded, setExpanded] = useState(false);
  const visiblePrices = expanded ? card.prices : card.prices.slice(0, 3);
  const spread = card.maxPrice - card.minPrice;

  return (
    <div className="group rounded-2xl border border-[var(--line)] bg-[var(--bg-card)] p-5 transition-colors hover:border-[var(--gold)]/50">
      <div className="flex items-start gap-3">
        <Link href={`/${series}/${card.id}`} className="shrink-0">
          <CardThumb imageUrl={card.imageUrl} name={card.name} />
        </Link>

        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <Link href={`/${series}/${card.id}`} className="min-w-0 hover:underline">
              <h3 className="text-[15px] font-bold leading-snug text-[var(--ink)]">{card.name}</h3>
            </Link>
            <span className="mono shrink-0 rounded-full bg-[var(--gold-soft)] px-2.5 py-1 text-[11px] font-bold text-[var(--gold)]">
              {card.shopCount}店舗
            </span>
          </div>

          <div className="mt-1.5 flex flex-wrap gap-1.5">
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
          </div>
        </div>
      </div>

      <div className="mt-4 flex items-baseline gap-1.5">
        <span className="mono text-3xl font-black text-[var(--best)]">
          ¥{card.maxPrice.toLocaleString()}
        </span>
        <span className="text-xs text-[var(--ink-soft)]">最高買取</span>
      </div>
      {spread > 0 && (
        <p className="mt-1 text-xs text-[var(--ink-soft)]">
          店舗間で最大
          <span className="mono text-[var(--gold)] font-bold"> ¥{spread.toLocaleString()} </span>
          差
        </p>
      )}

      <ul className="mt-4 space-y-1.5">
        {visiblePrices.map((p, i) => {
          const isBest = p.price === card.maxPrice;
          return (
            <li key={`${p.shopName}-${i}`}>
              <a
                href={p.sourceUrl}
                target="_blank"
                rel="noopener noreferrer"
                className={`flex items-center justify-between rounded-lg px-3 py-2 text-sm transition-colors ${
                  isBest
                    ? "bg-[var(--best-soft)] text-[var(--best)]"
                    : "bg-white/[0.03] text-[var(--ink)] hover:bg-white/[0.06]"
                }`}
              >
                <span className="flex min-w-0 items-center gap-1.5 truncate">
                  <span className="truncate">{p.shopName}</span>
                  {p.area === "宅配" && (
                    <span className="mono shrink-0 rounded-full bg-[var(--delivery-soft)] px-1.5 py-0.5 text-[9px] font-bold text-[var(--delivery)]">
                      宅配
                    </span>
                  )}
                </span>
                <span className="mono font-bold">¥{p.price.toLocaleString()}</span>
              </a>
            </li>
          );
        })}
      </ul>

      {card.prices.length > 3 && (
        <button
          onClick={() => setExpanded((v) => !v)}
          className="mt-2 text-xs text-[var(--gold)] hover:underline"
        >
          {expanded ? "閉じる" : `他 ${card.prices.length - 3} 店舗を見る`}
        </button>
      )}
    </div>
  );
}

export function CardThumb({ imageUrl, name }: { imageUrl: string | null; name: string }) {
  const [broken, setBroken] = useState(false);

  if (!imageUrl || broken) {
    return (
      <div
        aria-hidden
        className="flex h-[86px] w-[62px] shrink-0 items-center justify-center rounded-lg border border-[var(--line)] bg-[var(--bg-elevated)]"
      >
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="var(--ink-soft)" strokeWidth="1.5">
          <rect x="3" y="5" width="18" height="14" rx="2" />
          <circle cx="9" cy="10.5" r="1.5" fill="var(--ink-soft)" stroke="none" />
          <path d="M4 17l5-5 3 3 3-3 5 5" />
        </svg>
      </div>
    );
  }

  return (
    <div className="relative h-[86px] w-[62px] shrink-0 overflow-hidden rounded-lg border border-[var(--line)] bg-[var(--bg-elevated)]">
      <Image
        src={imageUrl}
        alt={name}
        fill
        sizes="62px"
        className="object-cover"
        onError={() => setBroken(true)}
      />
    </div>
  );
}
