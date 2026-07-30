import { getDb, getExcludedShopDbIds } from "./db";
import { toIsoDate, type PriceEvent } from "./priceTrend";

// All SQL "day" bucketing here is JST (UTC+9), not UTC — see toIsoDate's doc
// comment in priceTrend.ts for why (Japan-only site/shops, ~05:05 JST daily
// cron lands on the previous UTC calendar day). Must stay in sync with that
// function's definition of "JST calendar day" or the two disagree — already
// confirmed to cause a bogus "unconfirmed" (dashed) chart point and a
// wrongly-signed ranking for the same card on the same day.
const JST_OFFSET_SQL = "+9 hours";

function addDays(iso: string, days: number): string {
  const d = new Date(iso + "T00:00:00Z");
  d.setUTCDate(d.getUTCDate() + days);
  return toIsoDate(d);
}

function median(values: number[]): number {
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

/**
 * Real (non-dummy) price history for one card, day-by-day from its earliest
 * known price_record to today. Each day's maxPrice/medianPrice is the
 * cross-shop aggregate as of that day, forward-filling each shop's own last
 * known price (mirrors `insertPriceRecord`'s change-only-insert design — a
 * shop with no new row on a given day just means its price didn't change,
 * not that it's unknown).
 *
 * `confirmed` distinguishes two different reasons maxPrice might be what it
 * is on a given day: a genuine confirmed re-check (the shop currently
 * holding the max had a successful `scrape_runs` entry that day) vs an
 * unconfirmed carry-forward (that shop wasn't successfully scraped that day,
 * so its contribution — and therefore maxPrice — is an assumption, not a
 * verified fact) — see PriceTrendChart.tsx for how this renders (solid vs
 * dashed). Deliberately scoped to *only* the max-holding shop rather than
 * "every shop contributing to this day" — an unrelated shop being unchecked
 * shouldn't cast doubt on a max-price rise that a *different*, actually-
 * confirmed shop genuinely caused (confirmed bug 2026-07-25: this originally
 * required all shops confirmed, which could mark a real, confirmed price
 * rise as a dashed/"unconfirmed" segment just because some other shop for
 * the same card hadn't been rechecked that day — misleadingly implying a
 * flat carry-forward when the line was genuinely moving for a verified
 * reason). Consecutive days with identical (maxPrice, medianPrice, confirmed)
 * are collapsed into one event, matching the sparse "day the price actually
 * changed" shape the rest of web/lib/priceTrend.ts already expects.
 */
export function getCardPriceHistory(cardId: number, series: string): PriceEvent[] {
  const db = getDb();
  const excludedIds = getExcludedShopDbIds(db);
  const excludedClause = excludedIds.length > 0 ? `AND shop_id NOT IN (${excludedIds.join(",")})` : "";

  const records = db
    .prepare(
      `SELECT shop_id AS shopId, price, date(scraped_at, '${JST_OFFSET_SQL}') AS day
       FROM price_records WHERE card_id = ? ${excludedClause} ORDER BY scraped_at`
    )
    .all(cardId) as { shopId: number; price: number; day: string }[];

  if (records.length === 0) return [];

  const shopIds = [...new Set(records.map((r) => r.shopId))];
  const byShop = new Map<number, { day: string; price: number }[]>();
  for (const shopId of shopIds) byShop.set(shopId, []);
  for (const r of records) {
    const list = byShop.get(r.shopId)!;
    // Same-day multiple entries (shouldn't normally happen with daily
    // scraping) — keep the last one for that day.
    if (list.length > 0 && list[list.length - 1].day === r.day) {
      list[list.length - 1].price = r.price;
    } else {
      list.push({ day: r.day, price: r.price });
    }
  }

  const successfulRunDays = new Set(
    (
      db
        .prepare(
          `SELECT DISTINCT shop_id AS shopId, date(ran_at, '${JST_OFFSET_SQL}') AS day
           FROM scrape_runs WHERE series = ? AND succeeded = 1 AND shop_id IN (${shopIds.map(() => "?").join(",")})`
        )
        .all(series, ...shopIds) as { shopId: number; day: string }[]
    ).map((r) => `${r.shopId}:${r.day}`)
  );

  const earliestDay = records[0].day;
  const todayIso = toIsoDate(new Date());

  const events: PriceEvent[] = [];
  let prevKey: string | null = null;
  // Cursor per shop into its own sorted price list, forward-filling.
  const cursors = new Map<number, number>(shopIds.map((id) => [id, -1]));

  for (let day = earliestDay; day <= todayIso; day = addDays(day, 1)) {
    const knownPrices: { shopId: number; price: number }[] = [];

    for (const shopId of shopIds) {
      const list = byShop.get(shopId)!;
      let idx = cursors.get(shopId)!;
      while (idx + 1 < list.length && list[idx + 1].day <= day) idx++;
      cursors.set(shopId, idx);
      if (idx === -1) continue; // this shop hadn't listed the card yet as of this day
      knownPrices.push({ shopId, price: list[idx].price });
    }

    if (knownPrices.length === 0) continue;

    const maxPrice = Math.max(...knownPrices.map((p) => p.price));
    const medianPrice = Math.round(median(knownPrices.map((p) => p.price)));
    // Only the shop(s) actually holding today's max determine `confirmed` —
    // see the doc comment above for why this must not be "every shop".
    const maxHolders = knownPrices.filter((p) => p.price === maxPrice);
    const confirmed = maxHolders.some((p) => successfulRunDays.has(`${p.shopId}:${day}`));
    const key = `${maxPrice}|${medianPrice}|${confirmed}`;

    if (key !== prevKey) {
      events.push({ date: day, maxPrice, medianPrice, confirmed });
      prevKey = key;
    } else {
      // Still emit the extended endpoint so a flat run's final day is
      // present for resamplePriceTrend's forward-fill to key off of.
      events[events.length - 1] = { date: day, maxPrice, medianPrice, confirmed };
    }
  }

  return events;
}
