"use client";

import { useState } from "react";
import Link from "next/link";
import TrendCard from "./TrendCard";
import type { PriceEvent } from "@/lib/priceTrend";

export interface TrendingCardData {
  id: number;
  seriesSlug: string;
  name: string;
  sub: string;
  changePercent: number;
  events: PriceEvent[];
}

export default function TrendingTabs({
  rising,
  falling,
  columns = 2,
}: {
  rising: TrendingCardData[];
  falling: TrendingCardData[];
  columns?: 2 | 3;
}) {
  const [tab, setTab] = useState<"up" | "down">("up");
  const cards = tab === "up" ? rising : falling;

  return (
    <div>
      <div className="mb-5 flex gap-1 rounded-full border border-[var(--line)] bg-[var(--bg-card)] p-1">
        <button
          onClick={() => setTab("up")}
          className={`flex-1 rounded-full py-2 text-sm font-bold transition-colors ${
            tab === "up" ? "bg-[var(--best-soft)] text-[var(--best)]" : "text-[var(--ink-soft)]"
          }`}
        >
          ↑ 急上昇
        </button>
        <button
          onClick={() => setTab("down")}
          className={`flex-1 rounded-full py-2 text-sm font-bold transition-colors ${
            tab === "down" ? "bg-[var(--down-soft)] text-[var(--down)]" : "text-[var(--ink-soft)]"
          }`}
        >
          ↓ 急降下
        </button>
      </div>

      {cards.length === 0 ? (
        <p className="py-8 text-center text-xs text-[var(--ink-soft)]">対象のカードがありません</p>
      ) : (
        <div className={`grid grid-cols-1 gap-4 ${columns === 3 ? "lg:grid-cols-3" : "lg:grid-cols-2"}`}>
          {cards.map((card, i) => (
            <Link key={card.id} href={`/${card.seriesSlug}/${card.id}`} className="block">
              <div className="mb-1.5 flex items-center gap-1.5">
                <span className="mono text-[10px] font-bold text-[var(--ink-soft)]">#{i + 1}</span>
                <span
                  className="mono text-[10px] font-bold"
                  style={{ color: tab === "up" ? "var(--best)" : "var(--down)" }}
                >
                  {tab === "up" ? "+" : ""}
                  {card.changePercent.toFixed(1)}%
                </span>
              </div>
              <TrendCard name={card.name} sub={card.sub} events={card.events} />
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
