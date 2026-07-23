import { DatabaseSync } from "node:sqlite";
import path from "node:path";
import { SHOPS } from "./shops";

let db: DatabaseSync | null = null;

export function getDb(): DatabaseSync {
  if (!db) {
    const dbPath = path.join(process.cwd(), "..", "data", "kaitori.db");
    db = new DatabaseSync(dbPath, { readOnly: true });
  }
  return db;
}

export interface ShopPrice {
  shopName: string;
  price: number;
  sourceUrl: string;
  scrapedAt: string;
}

export interface CardSummary {
  id: number;
  name: string;
  rarity: string | null;
  cardNumber: string | null;
  imageUrl: string | null;
  prices: ShopPrice[];
  minPrice: number;
  maxPrice: number;
  shopCount: number;
}

const SHOP_LABELS: Record<string, string> = Object.fromEntries(SHOPS.map((s) => [s.id, s.name]));

function labelForShop(name: string): string {
  return SHOP_LABELS[name] ?? name;
}

const LATEST_PRICES_CTE = `
  WITH latest AS (
    SELECT
      pr.card_id,
      pr.shop_id,
      pr.price,
      pr.source_url,
      pr.image_url,
      pr.scraped_at,
      ROW_NUMBER() OVER (
        PARTITION BY pr.shop_id, pr.card_id ORDER BY pr.scraped_at DESC
      ) AS rn
    FROM price_records pr
  )
`;

function rowsToCards(
  rows: {
    id: number;
    canonical_name: string;
    rarity: string | null;
    card_number: string | null;
    shop_name: string;
    price: number;
    source_url: string;
    image_url: string | null;
    scraped_at: string;
  }[]
): CardSummary[] {
  const byCard = new Map<number, CardSummary>();

  for (const row of rows) {
    let card = byCard.get(row.id);
    if (!card) {
      card = {
        id: row.id,
        name: row.canonical_name,
        rarity: row.rarity,
        cardNumber: row.card_number,
        imageUrl: null,
        prices: [],
        minPrice: Infinity,
        maxPrice: -Infinity,
        shopCount: 0,
      };
      byCard.set(row.id, card);
    }
    if (!card.imageUrl && row.image_url) card.imageUrl = row.image_url;
    card.prices.push({
      shopName: labelForShop(row.shop_name),
      price: row.price,
      sourceUrl: row.source_url,
      scrapedAt: row.scraped_at,
    });
  }

  for (const card of byCard.values()) {
    // Highest buyback offer first — this is a kaitori (sell-to-shop) price
    // comparison site, so the shop paying the most is what the user actually
    // wants to see immediately, not buried past the "show more" fold.
    card.prices.sort((a, b) => b.price - a.price);
    card.maxPrice = card.prices[0].price;
    card.minPrice = card.prices[card.prices.length - 1].price;
    card.shopCount = card.prices.length;
  }

  return [...byCard.values()];
}

export function searchCards(query: string, series?: string, limit = 60): CardSummary[] {
  const db = getDb();
  const like = `%${query}%`;
  const seriesClause = series ? "AND series = ?" : "";
  const seriesArgs = series ? [series] : [];
  const rows = db
    .prepare(
      `${LATEST_PRICES_CTE}
       SELECT c.id, c.canonical_name, c.rarity, c.card_number,
              s.name AS shop_name, l.price, l.source_url, l.image_url, l.scraped_at
       FROM latest l
       JOIN cards c ON c.id = l.card_id
       JOIN shops s ON s.id = l.shop_id
       WHERE l.rn = 1
         AND c.id IN (
           SELECT id FROM cards
           WHERE (canonical_name LIKE ? OR card_number LIKE ?) ${seriesClause}
           LIMIT ?
         )
       ORDER BY c.canonical_name`
    )
    .all(like, like, ...seriesArgs, limit) as Parameters<typeof rowsToCards>[0];

  return rowsToCards(rows);
}

export function getCardById(id: number, series?: string): CardSummary | null {
  const db = getDb();
  const seriesClause = series ? "AND c.series = ?" : "";
  const args: (number | string)[] = series ? [id, series] : [id];
  const rows = db
    .prepare(
      `${LATEST_PRICES_CTE}
       SELECT c.id, c.canonical_name, c.rarity, c.card_number,
              s.name AS shop_name, l.price, l.source_url, l.image_url, l.scraped_at
       FROM latest l
       JOIN cards c ON c.id = l.card_id
       JOIN shops s ON s.id = l.shop_id
       WHERE l.rn = 1 AND c.id = ? ${seriesClause}`
    )
    .all(...args) as Parameters<typeof rowsToCards>[0];

  const cards = rowsToCards(rows);
  return cards[0] ?? null;
}

export interface CardRef {
  id: number;
  series: string;
}

/** Lightweight id+series listing for sitemap generation — every card that
 * has at least one price record, cheap to run even at tens of thousands of
 * rows since it skips the price-join used by the card-detail queries above. */
export function listAllCardRefs(): CardRef[] {
  const db = getDb();
  return db
    .prepare(
      `SELECT DISTINCT c.id, c.series
       FROM cards c
       WHERE EXISTS (SELECT 1 FROM price_records pr WHERE pr.card_id = c.id)
       ORDER BY c.id`
    )
    .all() as unknown as CardRef[];
}

export type SortMode = "shops_desc" | "price_desc" | "price_asc";

export function topCards(sort: SortMode, limit = 30, series?: string): CardSummary[] {
  const db = getDb();

  // Pull a generous candidate pool (latest price per shop/card), then
  // aggregate + sort in JS since the sort key (shop count, min/max price)
  // only exists after grouping.
  const seriesClause = series ? "AND c.series = ?" : "";
  const seriesArgs = series ? [series] : [];
  const rows = db
    .prepare(
      `${LATEST_PRICES_CTE}
       SELECT c.id, c.canonical_name, c.rarity, c.card_number,
              s.name AS shop_name, l.price, l.source_url, l.image_url, l.scraped_at
       FROM latest l
       JOIN cards c ON c.id = l.card_id
       JOIN shops s ON s.id = l.shop_id
       WHERE l.rn = 1 ${seriesClause}`
    )
    .all(...seriesArgs) as Parameters<typeof rowsToCards>[0];

  const cards = rowsToCards(rows);

  cards.sort((a, b) => {
    if (sort === "shops_desc") return b.shopCount - a.shopCount || b.maxPrice - a.maxPrice;
    if (sort === "price_desc") return b.maxPrice - a.maxPrice;
    return a.minPrice - b.minPrice;
  });

  return cards.slice(0, limit);
}

export interface Stats {
  shopCount: number;
  cardCount: number;
  priceRecordCount: number;
  lastScrapedAt: string | null;
}

export function getStats(series?: string): Stats {
  const db = getDb();

  if (!series) {
    const shopCount = (db.prepare(`SELECT COUNT(*) AS c FROM shops`).get() as { c: number }).c;
    const cardCount = (db.prepare(`SELECT COUNT(*) AS c FROM cards`).get() as { c: number }).c;
    const priceRecordCount = (
      db.prepare(`SELECT COUNT(*) AS c FROM price_records`).get() as { c: number }
    ).c;
    const lastScrapedAt = (
      db.prepare(`SELECT MAX(scraped_at) AS m FROM price_records`).get() as { m: string | null }
    ).m;
    return { shopCount, cardCount, priceRecordCount, lastScrapedAt };
  }

  const cardCount = (
    db.prepare(`SELECT COUNT(*) AS c FROM cards WHERE series = ?`).get(series) as { c: number }
  ).c;
  const shopCount = (
    db
      .prepare(
        `SELECT COUNT(DISTINCT pr.shop_id) AS c
         FROM price_records pr JOIN cards c ON c.id = pr.card_id
         WHERE c.series = ?`
      )
      .get(series) as { c: number }
  ).c;
  const priceRecordCount = (
    db
      .prepare(
        `SELECT COUNT(*) AS c
         FROM price_records pr JOIN cards c ON c.id = pr.card_id
         WHERE c.series = ?`
      )
      .get(series) as { c: number }
  ).c;
  const lastScrapedAt = (
    db
      .prepare(
        `SELECT MAX(pr.scraped_at) AS m
         FROM price_records pr JOIN cards c ON c.id = pr.card_id
         WHERE c.series = ?`
      )
      .get(series) as { m: string | null }
  ).m;

  return { shopCount, cardCount, priceRecordCount, lastScrapedAt };
}
