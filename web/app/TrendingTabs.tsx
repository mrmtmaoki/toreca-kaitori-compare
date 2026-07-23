"use client";

import { useState } from "react";
import TrendCard from "./TrendCard";
import { generateDummyEvents, type DummyTrendCard } from "@/lib/dummyTrendData";

export default function TrendingTabs({
  rising,
  falling,
  columns = 2,
}: {
  rising: DummyTrendCard[];
  falling: DummyTrendCard[];
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

      <div className={`grid grid-cols-1 gap-4 ${columns === 3 ? "lg:grid-cols-3" : "lg:grid-cols-2"}`}>
        {cards.map((card) => (
          <TrendCard
            key={card.name}
            name={card.name}
            sub={card.sub}
            events={generateDummyEvents(card.days, card.base, card.seed, card.direction)}
          />
        ))}
      </div>
    </div>
  );
}
