import type { PriceEvent } from "./priceTrend";

// TEMPORARY: generates fake price history so the trend-chart UI/layout can be
// built and reviewed before real automated scrape history exists. Delete
// this file (and swap its call sites to a real price-history query) once
// enough real data has accumulated — see the "急上昇ピックアップ" section on
// the top page, which is intentionally NOT meant to go live with this data.

// Deterministic pseudo-random generator so the demo looks the same on every
// render/reload instead of jumping around — makes it easier to eyeball the
// chart while iterating on styling.
function mulberry32(seed: number) {
  return function () {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * `insertPriceRecord` (src/db.ts) only writes a row when the price actually
 * changes, so real history is a sparse list of change events, not one row
 * per day — this generator produces the same shape (only ~15-25% of days get
 * an event) so callers exercise the real forward-fill/bucketing logic in
 * web/lib/priceTrend.ts instead of a fake dense series.
 *
 * `direction` controls the last-10-day move (up/down/flat) so callers can
 * populate both 急上昇 and 急降下 lists from the same generator.
 */
export function generateDummyEvents(
  days: number,
  basePrice: number,
  seed: number,
  direction: "up" | "down" | "flat" = "up"
): PriceEvent[] {
  const rand = mulberry32(seed);
  const events: PriceEvent[] = [];
  let max = basePrice;
  const start = new Date();
  start.setDate(start.getDate() - days);
  const spikeSign = direction === "up" ? 1 : direction === "down" ? -1 : 0;

  for (let i = 0; i < days; i++) {
    const changeChance = 0.2;
    const inSpikeWindow = i > days - 10;
    if (!inSpikeWindow && rand() > changeChance) continue;

    const drift = (rand() - 0.48) * max * 0.05;
    const jump = rand() < 0.3 ? (rand() - 0.5) * max * 0.15 : 0;
    const spikeBoost = inSpikeWindow ? ((i - (days - 10)) / 10) * max * 0.45 * rand() * spikeSign : 0;
    max = Math.max(basePrice * 0.15, max + drift + jump + spikeBoost);

    const spread = max * (0.15 + rand() * 0.25);
    const median = Math.max(basePrice * 0.1, max - spread);

    const d = new Date(start);
    d.setDate(start.getDate() + i);
    events.push({
      date: d.toISOString().slice(0, 10),
      maxPrice: Math.round(max),
      medianPrice: Math.round(median),
    });
  }
  return events;
}

export interface DummyTrendCard {
  name: string;
  sub: string;
  base: number;
  seed: number;
  days: number;
  direction?: "up" | "down" | "flat";
}

export const DUMMY_TREND_CARDS: DummyTrendCard[] = [
  { name: "ゴール・D・ロジャー", sub: "OP09-118 / シークレットレア", base: 8000, seed: 1, days: 400, direction: "up" },
  { name: "リザードンEX", sub: "SV8-130/106 / スペシャルアートレア", base: 25000, seed: 2, days: 400, direction: "up" },
  { name: "青眼の白龍", sub: "20th シークレットレア", base: 60000, seed: 3, days: 45, direction: "up" },
];

export const DUMMY_FALLING_CARDS: DummyTrendCard[] = [
  { name: "ブラック・マジシャン", sub: "20thシークレットレア", base: 45000, seed: 11, days: 400, direction: "down" },
  { name: "サボ", sub: "OP07-046 / スーパーレア", base: 6000, seed: 12, days: 400, direction: "down" },
  { name: "ミュウツーEX", sub: "SV4a-078/190 / アートレア", base: 12000, seed: 13, days: 200, direction: "down" },
];
