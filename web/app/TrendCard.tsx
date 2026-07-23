"use client";

import { useMemo, useState } from "react";
import PriceTrendChart from "./PriceTrendChart";
import { resamplePriceTrend, TREND_PERIODS, type PriceEvent, type TrendPeriodKey } from "@/lib/priceTrend";

function formatDateLong(iso: string) {
  const [y, m, d] = iso.split("-");
  return `${y}/${Number(m)}/${Number(d)}`;
}

export default function TrendCard({
  name,
  sub,
  events,
}: {
  name: string;
  sub: string;
  events: PriceEvent[];
}) {
  const [period, setPeriod] = useState<TrendPeriodKey>("1m");
  const [hovered, setHovered] = useState<PriceEvent | null>(null);
  const data = useMemo(() => resamplePriceTrend(events, period), [events, period]);

  const first = data[0];
  const last = data[data.length - 1];
  const shown = hovered ?? last;
  const changePct =
    first && shown && first.maxPrice > 0 ? ((shown.maxPrice - first.maxPrice) / first.maxPrice) * 100 : 0;
  const isUp = changePct >= 0;

  return (
    <div className="rounded-[var(--radius)] border border-[var(--line)] bg-[var(--bg-card)] p-5">
      <div className="mb-4 flex items-start justify-between">
        <div>
          <div className="font-bold text-[var(--ink)]">{name}</div>
          <div className="mono text-xs text-[var(--ink-soft)]">{sub}</div>
        </div>
        {shown && (
          <div className="text-right">
            <div
              className="mono text-2xl font-black transition-colors"
              style={{ color: isUp ? "var(--best)" : "var(--down)" }}
            >
              ¥{shown.maxPrice.toLocaleString()}
            </div>
            <div
              className="mono text-xs font-bold"
              style={{ color: isUp ? "var(--best)" : "var(--down)" }}
            >
              {isUp ? "+" : ""}
              {changePct.toFixed(1)}%
            </div>
            <div className="mt-0.5 text-[10px] text-[var(--ink-soft)]">
              {hovered ? formatDateLong(hovered.date) : "現在"}
            </div>
          </div>
        )}
      </div>

      <div className="mb-3 flex gap-1">
        {TREND_PERIODS.map((p) => (
          <button
            key={p.key}
            onClick={() => setPeriod(p.key)}
            className={`rounded-md px-2.5 py-1 text-xs font-medium transition-colors ${
              period === p.key
                ? "bg-[var(--gold-soft)] text-[var(--gold)]"
                : "text-[var(--ink-soft)] hover:bg-white/5"
            }`}
          >
            {p.label}
          </button>
        ))}
      </div>

      {data.length > 0 ? (
        <PriceTrendChart data={data} onHover={setHovered} />
      ) : (
        <p className="py-8 text-center text-xs text-[var(--ink-soft)]">この期間のデータがありません</p>
      )}
    </div>
  );
}
