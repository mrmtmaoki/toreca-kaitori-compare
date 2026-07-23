import { getDb, getCardById, type CardSummary } from "./db";
import { SERIES_LIST } from "./series";

export interface TopMover {
  series: string;
  card: CardSummary;
  previousMaxPrice: number;
  changeAmount: number;
  changePercent: number;
}

const TARGET_WINDOW_DAYS = 30;

/**
 * Biggest price riser per genre, comparing the current max buyback price
 * against its value as of `TARGET_WINDOW_DAYS` ago — or, while less history
 * than that actually exists, against the very first snapshot on record, so
 * this starts showing a real (if short-window) comparison as soon as a
 * second day of scrape data lands, rather than staying empty until a full
 * 30 days accumulates (see getEarliestAndLatestScrapeDates below).
 *
 * Returns null when there's only one scrape date in the whole DB (day one —
 * literally nothing to compare against yet, every card would show 0 change).
 */
export function getTopMoverPerGenre(): TopMover[] | null {
  const db = getDb();

  const { earliest, distinctDates } = db
    .prepare(
      `SELECT MIN(scraped_at) AS earliest, COUNT(DISTINCT date(scraped_at)) AS distinctDates
       FROM price_records`
    )
    .get() as { earliest: string | null; distinctDates: number };

  if (!earliest || distinctDates < 2) return null;

  const targetCutoff = new Date();
  targetCutoff.setDate(targetCutoff.getDate() - TARGET_WINDOW_DAYS);
  const targetCutoffIso = targetCutoff.toISOString();
  // Clamp to the earliest data we actually have — comparing against a date
  // before any record exists would just find nothing (see previous_latest
  // below), not a 0% change.
  const cutoff = targetCutoffIso > earliest ? targetCutoffIso : earliest;

  const movers: TopMover[] = [];

  for (const series of SERIES_LIST) {
    const row = db
      .prepare(
        `WITH current_latest AS (
           SELECT pr.card_id, pr.shop_id, pr.price,
             ROW_NUMBER() OVER (PARTITION BY pr.shop_id, pr.card_id ORDER BY pr.scraped_at DESC) AS rn
           FROM price_records pr
         ),
         previous_latest AS (
           SELECT pr.card_id, pr.shop_id, pr.price,
             ROW_NUMBER() OVER (PARTITION BY pr.shop_id, pr.card_id ORDER BY pr.scraped_at DESC) AS rn
           FROM price_records pr
           WHERE pr.scraped_at <= ?
         )
         SELECT c.id AS card_id, MAX(cl.price) AS current_max, MAX(pl.price) AS previous_max
         FROM cards c
         JOIN current_latest cl ON cl.card_id = c.id AND cl.rn = 1
         JOIN previous_latest pl ON pl.card_id = c.id AND pl.rn = 1
         WHERE c.series = ?
         GROUP BY c.id
         HAVING current_max > previous_max
         ORDER BY (current_max - previous_max) DESC
         LIMIT 1`
      )
      .get(cutoff, series.name) as { card_id: number; current_max: number; previous_max: number } | undefined;

    if (!row) continue;

    const card = getCardById(row.card_id, series.name);
    if (!card) continue;

    movers.push({
      series: series.slug,
      card,
      previousMaxPrice: row.previous_max,
      changeAmount: row.current_max - row.previous_max,
      changePercent: ((row.current_max - row.previous_max) / row.previous_max) * 100,
    });
  }

  return movers.length > 0 ? movers : null;
}
