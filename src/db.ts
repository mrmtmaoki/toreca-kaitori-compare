import { DatabaseSync } from "node:sqlite";
import { normalizeCardNumber } from "./normalize.js";
import { canonicalizeRarity } from "./rarity.js";
import { extractVariantTag } from "./variant.js";

export function openDb(path = "data/kaitori.db") {
  const db = new DatabaseSync(path);
  db.exec(`
    CREATE TABLE IF NOT EXISTS shops (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT UNIQUE NOT NULL,
      url TEXT NOT NULL,
      last_checked_terms_at TEXT
    );

    CREATE TABLE IF NOT EXISTS cards (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      canonical_name TEXT NOT NULL,
      series TEXT,
      rarity TEXT,
      card_number TEXT,
      variant TEXT
    );
    CREATE UNIQUE INDEX IF NOT EXISTS idx_cards_number_rarity
      ON cards (series, card_number, rarity, variant) WHERE card_number IS NOT NULL;

    CREATE TABLE IF NOT EXISTS price_records (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      shop_id INTEGER NOT NULL REFERENCES shops(id),
      card_id INTEGER NOT NULL REFERENCES cards(id),
      price INTEGER NOT NULL,
      source_url TEXT NOT NULL,
      image_url TEXT,
      scraped_at TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_price_records_card ON price_records (card_id);
    CREATE INDEX IF NOT EXISTS idx_price_records_shop_card_time
      ON price_records (shop_id, card_id, scraped_at DESC);

    -- Confirms whether a shop+series was actually reachable on a given day,
    -- independent of whether any price changed — insertPriceRecord's
    -- dedup means "no new price_records that day" is ambiguous between
    -- "checked, nothing moved" and "the scrape itself failed" (e.g. a
    -- shop/network hiccup, seen live during this project's own automation
    -- setup). One row per scrape target per run, not per card: a page
    -- fetch failure affects every card on that page identically, so
    -- card-level granularity would just multiply row count for no benefit.
    CREATE TABLE IF NOT EXISTS scrape_runs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      shop_id INTEGER NOT NULL REFERENCES shops(id),
      series TEXT NOT NULL,
      succeeded INTEGER NOT NULL,
      ran_at TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_scrape_runs_shop_series_time
      ON scrape_runs (shop_id, series, ran_at DESC);
  `);
  return db;
}

/**
 * Records whether a shop+series was successfully reached on this run — see
 * the scrape_runs table comment above for why this is tracked separately
 * from price_records. `succeeded` means "at least one page for this
 * shop+series returned data"; a run with some pages failing and others
 * succeeding still counts as succeeded (partial data is still real
 * confirmation for the cards that were covered).
 */
export function logScrapeRun(
  db: DatabaseSync,
  input: { shopId: number; series: string; succeeded: boolean }
) {
  db.prepare(
    `INSERT INTO scrape_runs (shop_id, series, succeeded, ran_at) VALUES (?, ?, ?, ?)`
  ).run(input.shopId, input.series, input.succeeded ? 1 : 0, new Date().toISOString());
}

export function upsertShop(db: DatabaseSync, name: string, url: string) {
  db.prepare(
    `INSERT INTO shops (name, url) VALUES (?, ?)
     ON CONFLICT(name) DO UPDATE SET url = excluded.url`
  ).run(name, url);
  return db.prepare(`SELECT id FROM shops WHERE name = ?`).get(name) as { id: number };
}

/**
 * Matches a card primarily by normalized card_number (+rarity); falls back to a new
 * row keyed on name+rarity when no card number is available, per the design doc's
 * "型番優先、なければ名前+レアリティで緩くマッチング" policy.
 */
export function findOrCreateCard(
  db: DatabaseSync,
  input: { name: string; series: string; rarity: string | null; cardNumber: string | null }
) {
  const cardNumber = normalizeCardNumber(input.cardNumber);
  const rarity = canonicalizeRarity(input.rarity, input.series);
  // Same card_number+rarity can still mean genuinely different prints (parallel,
  // alt art, tournament stamp) when a shop only marks that via a "(...)" tag in
  // the name — fold it into the key so those don't collapse into one card.
  const variant = extractVariantTag(input.name);

  if (cardNumber) {
    const existing = db
      .prepare(
        `SELECT id FROM cards WHERE series = ? AND card_number = ? AND rarity IS ? AND variant IS ?`
      )
      .get(input.series, cardNumber, rarity, variant) as { id: number } | undefined;
    if (existing) return existing.id;
  } else {
    const existing = db
      .prepare(
        `SELECT id FROM cards WHERE series = ? AND card_number IS NULL AND canonical_name = ? AND rarity IS ?`
      )
      .get(input.series, input.name, rarity) as { id: number } | undefined;
    if (existing) return existing.id;
  }

  const result = db
    .prepare(
      `INSERT INTO cards (canonical_name, series, rarity, card_number, variant) VALUES (?, ?, ?, ?, ?)`
    )
    .run(input.name, input.series, rarity, cardNumber, variant);
  return Number(result.lastInsertRowid);
}

/**
 * Only inserts a new row when the price actually changed since this shop's
 * last recorded price for this card — with daily scraping, inserting
 * unconditionally would add a full copy of every price on every run (~73k
 * rows/day at current coverage) even when nothing moved, making price
 * history storage grow unboundedly. A trend chart only needs a new point
 * when the value actually changes; gaps are implicitly "still the same
 * price as the last point".
 */
export function insertPriceRecord(
  db: DatabaseSync,
  input: {
    shopId: number;
    cardId: number;
    price: number;
    sourceUrl: string;
    imageUrl?: string | null;
  }
) {
  const latest = db
    .prepare(
      `SELECT price FROM price_records WHERE shop_id = ? AND card_id = ?
       ORDER BY scraped_at DESC LIMIT 1`
    )
    .get(input.shopId, input.cardId) as { price: number } | undefined;
  if (latest && latest.price === input.price) return;

  db.prepare(
    `INSERT INTO price_records (shop_id, card_id, price, source_url, image_url, scraped_at)
     VALUES (?, ?, ?, ?, ?, ?)`
  ).run(
    input.shopId,
    input.cardId,
    input.price,
    input.sourceUrl,
    input.imageUrl ?? null,
    new Date().toISOString()
  );
}
