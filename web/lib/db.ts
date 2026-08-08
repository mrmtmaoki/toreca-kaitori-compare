import { DatabaseSync } from "node:sqlite";
import { existsSync } from "node:fs";
import path from "node:path";
import { EXCLUDED_SHOP_IDS, SHOPS } from "./shops";
import { toAffiliateUrl } from "./affiliateLinks";

let db: DatabaseSync | null = null;

// On Netlify, page.tsx Server Components and route.ts Route Handlers turned
// out to run with a different process.cwd() despite both being packaged
// into "the same" deployed function — the plain `../data/kaitori.db` guess
// (correct for local dev and for pages) threw ERR_SQLITE_ERROR/"unable to
// open database file" specifically from route handlers. Trying several
// plausible candidates and using whichever actually exists avoids depending
// on a single assumption about the runtime's working directory.
function resolveDbPath(): string {
  const candidates = [
    path.join(process.cwd(), "..", "data", "kaitori.db"),
    path.join(process.cwd(), "data", "kaitori.db"),
    path.join(process.cwd(), "..", "..", "data", "kaitori.db"),
    path.join(__dirname, "..", "..", "data", "kaitori.db"),
  ];
  const found = candidates.find((candidate) => existsSync(candidate));
  if (!found) {
    throw new Error(
      `kaitori.db not found. Tried:\n${candidates.join("\n")}\ncwd=${process.cwd()} __dirname=${__dirname}`
    );
  }
  return found;
}

export function getDb(): DatabaseSync {
  if (!db) {
    db = new DatabaseSync(resolveDbPath(), { readOnly: true });
  }
  return db;
}

export interface ShopPrice {
  shopName: string;
  area: "秋葉原" | "宅配";
  price: number;
  sourceUrl: string;
  scrapedAt: string;
}

export interface CardSummary {
  id: number;
  name: string;
  rarity: string | null;
  cardNumber: string | null;
  color: string | null;
  pokemonType: string | null;
  imageUrl: string | null;
  prices: ShopPrice[];
  minPrice: number;
  maxPrice: number;
  shopCount: number;
}

const SHOP_LABELS: Record<string, string> = Object.fromEntries(SHOPS.map((s) => [s.id, s.name]));
const SHOP_AREAS: Record<string, "秋葉原" | "宅配"> = Object.fromEntries(SHOPS.map((s) => [s.id, s.area]));

function labelForShop(name: string): string {
  return SHOP_LABELS[name] ?? name;
}

// Falls back to "秋葉原" for any shop not (yet) listed in SHOPS — matches
// this project's existing default before the 2026-07-27 宅配 expansion,
// so an unrecognized shop_id never silently mislabels as 宅配.
function areaForShop(name: string): "秋葉原" | "宅配" {
  return SHOP_AREAS[name] ?? "秋葉原";
}

export type AreaFilter = "秋葉原" | "宅配";

function shopIdsForArea(area: AreaFilter): string[] {
  return SHOPS.filter((s) => s.area === area).map((s) => s.id);
}

let excludedShopDbIdsCache: number[] | null = null;

/** DB-integer ids for EXCLUDED_SHOP_IDS, resolved once (the shops table's
 * id<->name mapping never changes without a redeploy). */
export function getExcludedShopDbIds(db: DatabaseSync): number[] {
  if (excludedShopDbIdsCache) return excludedShopDbIdsCache;
  if (EXCLUDED_SHOP_IDS.length === 0) return (excludedShopDbIdsCache = []);
  const placeholders = EXCLUDED_SHOP_IDS.map(() => "?").join(",");
  const rows = db
    .prepare(`SELECT id FROM shops WHERE name IN (${placeholders})`)
    .all(...EXCLUDED_SHOP_IDS) as { id: number }[];
  excludedShopDbIdsCache = rows.map((r) => r.id);
  return excludedShopDbIdsCache;
}

function latestPricesCte(db: DatabaseSync): string {
  const excludedIds = getExcludedShopDbIds(db);
  const exclusionClause = excludedIds.length > 0 ? `WHERE pr.shop_id NOT IN (${excludedIds.join(",")})` : "";
  return `
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
      ${exclusionClause}
    )
  `;
}

function rowsToCards(
  rows: {
    id: number;
    canonical_name: string;
    rarity: string | null;
    card_number: string | null;
    color: string | null;
    pokemon_type: string | null;
    official_image_url: string | null;
    shop_name: string;
    price: number;
    source_url: string;
    image_url: string | null;
    scraped_at: string;
  }[]
): CardSummary[] {
  const byCard = new Map<number, CardSummary>();
  // Tracks whether a real shop photo has been recorded for a card yet, so a
  // shop photo (once found) can't be reverted back to the official fallback
  // by a later row, but the fallback also doesn't block the first shop photo
  // from taking over.
  const hasShopImage = new Set<number>();

  for (const row of rows) {
    let card = byCard.get(row.id);
    if (!card) {
      card = {
        id: row.id,
        name: row.canonical_name,
        rarity: row.rarity,
        cardNumber: row.card_number,
        color: row.color,
        pokemonType: row.pokemon_type,
        // Shop photo (set below) takes priority when it exists — the
        // official master image is only a fallback for cards no shop
        // currently has a photo for (see src/masterdata/onePieceColors.ts).
        imageUrl: row.official_image_url,
        prices: [],
        minPrice: Infinity,
        maxPrice: -Infinity,
        shopCount: 0,
      };
      byCard.set(row.id, card);
    }
    if (row.image_url && !hasShopImage.has(row.id)) {
      card.imageUrl = row.image_url;
      hasShopImage.add(row.id);
    }
    card.prices.push({
      shopName: labelForShop(row.shop_name),
      area: areaForShop(row.shop_name),
      price: row.price,
      sourceUrl: toAffiliateUrl(row.shop_name, row.source_url),
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

export function searchCards(
  query: string,
  series?: string,
  limit = 60,
  setCode?: string,
  color?: string,
  pokemonType?: string,
  area?: AreaFilter
): CardSummary[] {
  const db = getDb();
  const like = `%${query}%`;
  const seriesClause = series ? "AND series = ?" : "";
  const seriesArgs = series ? [series] : [];
  const setClause = setCode ? "AND (card_number = ? OR card_number LIKE ?)" : "";
  const setArgs = setCode ? [setCode, `${setCode}-%`] : [];
  const colorClause = color ? "AND color = ?" : "";
  const colorArgs = color ? [color] : [];
  const typeClause = pokemonType ? "AND pokemon_type = ?" : "";
  const typeArgs = pokemonType ? [pokemonType] : [];
  const areaShopIds = area ? shopIdsForArea(area) : null;
  const areaClause = areaShopIds ? `AND s.name IN (${areaShopIds.map(() => "?").join(",")})` : "";
  const areaArgs = areaShopIds ?? [];
  const rows = db
    .prepare(
      `${latestPricesCte(db)}
       SELECT c.id, c.canonical_name, c.rarity, c.card_number, c.color, c.pokemon_type, c.official_image_url,
              s.name AS shop_name, l.price, l.source_url, l.image_url, l.scraped_at
       FROM latest l
       JOIN cards c ON c.id = l.card_id
       JOIN shops s ON s.id = l.shop_id
       WHERE l.rn = 1 ${areaClause}
         AND c.id IN (
           SELECT id FROM cards
           WHERE (canonical_name LIKE ? OR card_number LIKE ?) ${seriesClause} ${setClause} ${colorClause} ${typeClause}
           LIMIT ?
         )
       ORDER BY c.canonical_name`
    )
    .all(...areaArgs, like, like, ...seriesArgs, ...setArgs, ...colorArgs, ...typeArgs, limit) as Parameters<
    typeof rowsToCards
  >[0];

  return rowsToCards(rows);
}

export function getCardById(id: number, series?: string): CardSummary | null {
  const db = getDb();
  const seriesClause = series ? "AND c.series = ?" : "";
  const args: (number | string)[] = series ? [id, series] : [id];
  const rows = db
    .prepare(
      `${latestPricesCte(db)}
       SELECT c.id, c.canonical_name, c.rarity, c.card_number, c.color, c.pokemon_type, c.official_image_url,
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
 * has at least one price record from a non-excluded shop, cheap to run even
 * at tens of thousands of rows since it skips the price-join used by the
 * card-detail queries above.
 *
 * Must apply the same EXCLUDED_SHOP_IDS filter getCardById does (via
 * latestPricesCte) — without it, a card whose only ever price records came
 * from an excluded shop (e.g. 遊々亭, see EXCLUDED_SHOP_IDS) still passed
 * this EXISTS check and stayed listed in the sitemap, but getCardById's
 * shop-filtered join found nothing for it and 404'd. Confirmed live
 * 2026-08-08: 46,027 遊々亭-only cards sitemapped-but-404ing, matching a
 * Search Console "indexed page not found (404)" warning. */
export function listAllCardRefs(): CardRef[] {
  const db = getDb();
  const excludedIds = getExcludedShopDbIds(db);
  const excludedClause = excludedIds.length > 0 ? `AND pr.shop_id NOT IN (${excludedIds.join(",")})` : "";
  return db
    .prepare(
      `SELECT DISTINCT c.id, c.series
       FROM cards c
       WHERE EXISTS (SELECT 1 FROM price_records pr WHERE pr.card_id = c.id ${excludedClause})
       ORDER BY c.id`
    )
    .all() as unknown as CardRef[];
}

export type SortMode = "shops_desc" | "price_desc" | "price_asc";

// card_number's shop-independent set prefix is everything before the first
// "-" (e.g. "SV8-001/025" -> "SV8", "OP07-109" -> "OP07"). A handful of bare
// codes with no number at all (e.g. "SSG") have no hyphen — used as-is, which
// just makes them their own single-card "set" group, a reasonable fallback.
export function extractSetCode(cardNumber: string): string {
  const idx = cardNumber.indexOf("-");
  return idx === -1 ? cardNumber : cardNumber.slice(0, idx);
}

export interface SetOption {
  code: string;
  count: number;
}

// Shared with app/[series]/set/[code]/page.tsx and app/[series]/page.tsx's
// "セットから探す" links: a set below this size is thin, near-duplicate
// content not worth its own crawlable page, so both "should this set get a
// link" and "does this set's page exist" need to agree on the same cutoff.
export const MIN_SET_PAGE_SIZE = 5;

// Set-code browsing pages only make sense for series whose card_number
// values actually follow a "SET-number" shape (see extractSetCode below).
// ポケモンカード's card_number data doesn't (e.g. "001/010", not
// "SET-001") — grouping it the same way would produce mostly garbage,
// near-duplicate groupings instead of real sets, so it's excluded here
// rather than in every caller.
export const SET_BROWSABLE_SERIES = ["遊戯王", "ワンピースカード"];

/** Distinct sets for a series, most-populated first, for a filter dropdown. */
export function listSetOptions(series: string): SetOption[] {
  const db = getDb();
  const rows = db
    .prepare(`SELECT DISTINCT card_number FROM cards WHERE series = ? AND card_number IS NOT NULL`)
    .all(series) as { card_number: string }[];

  const counts = new Map<string, number>();
  for (const row of rows) {
    const code = extractSetCode(row.card_number);
    // A bare "-" card_number (seen from a shop's own "no number" placeholder,
    // e.g. otachu — see src/scrapers/otachu.ts) extracts to an empty set
    // code, which would otherwise show as a blank, unfilterable dropdown
    // entry (empty string is falsy, so the filter query's setCode ? ... : ""
    // ternary silently treats "selected" the same as "no filter").
    if (code === "") continue;
    counts.set(code, (counts.get(code) ?? 0) + 1);
  }

  return [...counts.entries()]
    .map(([code, count]) => ({ code, count }))
    .sort((a, b) => b.count - a.count || a.code.localeCompare(b.code));
}

export interface AttributeOption {
  value: string;
  count: number;
}

/** Distinct colors for ワンピースカード, most-populated first — see
 * src/masterdata/onePieceColors.ts for how `color` gets populated. */
export function listColorOptions(series: string): AttributeOption[] {
  const db = getDb();
  const rows = db
    .prepare(
      `SELECT color AS value, COUNT(*) AS count FROM cards
       WHERE series = ? AND color IS NOT NULL GROUP BY color ORDER BY count DESC`
    )
    .all(series) as unknown as AttributeOption[];
  // node:sqlite rows have a null prototype, which Next.js refuses to pass
  // from a Server Component to a Client Component ("Only plain objects...
  // are supported") — rebuild as genuine plain objects, same reason
  // listSetOptions below builds its return value by hand instead of
  // returning DB rows directly.
  return rows.map((r) => ({ value: r.value, count: r.count }));
}

/** Distinct types for ポケモンカード, most-populated first — see
 * src/masterdata/pokemonTypes.ts for how `pokemon_type` gets populated. */
export function listPokemonTypeOptions(series: string): AttributeOption[] {
  const db = getDb();
  const rows = db
    .prepare(
      `SELECT pokemon_type AS value, COUNT(*) AS count FROM cards
       WHERE series = ? AND pokemon_type IS NOT NULL GROUP BY pokemon_type ORDER BY count DESC`
    )
    .all(series) as unknown as AttributeOption[];
  return rows.map((r) => ({ value: r.value, count: r.count }));
}

export function topCards(
  sort: SortMode,
  limit = 30,
  series?: string,
  setCode?: string,
  color?: string,
  pokemonType?: string,
  area?: AreaFilter
): CardSummary[] {
  const db = getDb();

  // Pull a generous candidate pool (latest price per shop/card), then
  // aggregate + sort in JS since the sort key (shop count, min/max price)
  // only exists after grouping.
  const seriesClause = series ? "AND c.series = ?" : "";
  const seriesArgs = series ? [series] : [];
  // Matches both "SV8-001/025"-shaped numbers (LIKE "SV8-%") and bare
  // no-hyphen codes stored as-is (= "SSG"), mirroring extractSetCode above.
  const setClause = setCode ? "AND (c.card_number = ? OR c.card_number LIKE ?)" : "";
  const setArgs = setCode ? [setCode, `${setCode}-%`] : [];
  const colorClause = color ? "AND c.color = ?" : "";
  const colorArgs = color ? [color] : [];
  const typeClause = pokemonType ? "AND c.pokemon_type = ?" : "";
  const typeArgs = pokemonType ? [pokemonType] : [];
  const areaShopIds = area ? shopIdsForArea(area) : null;
  const areaClause = areaShopIds ? `AND s.name IN (${areaShopIds.map(() => "?").join(",")})` : "";
  const areaArgs = areaShopIds ?? [];
  const rows = db
    .prepare(
      `${latestPricesCte(db)}
       SELECT c.id, c.canonical_name, c.rarity, c.card_number, c.color, c.pokemon_type, c.official_image_url,
              s.name AS shop_name, l.price, l.source_url, l.image_url, l.scraped_at
       FROM latest l
       JOIN cards c ON c.id = l.card_id
       JOIN shops s ON s.id = l.shop_id
       WHERE l.rn = 1 ${seriesClause} ${setClause} ${colorClause} ${typeClause} ${areaClause}`
    )
    .all(...seriesArgs, ...setArgs, ...colorArgs, ...typeArgs, ...areaArgs) as Parameters<
    typeof rowsToCards
  >[0];

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

  const excludedIds = getExcludedShopDbIds(db);
  const excludedClause = excludedIds.length > 0 ? `AND pr.shop_id NOT IN (${excludedIds.join(",")})` : "";
  const excludedShopsClause = excludedIds.length > 0 ? `WHERE id NOT IN (${excludedIds.join(",")})` : "";

  if (!series) {
    const shopCount = (
      db.prepare(`SELECT COUNT(*) AS c FROM shops ${excludedShopsClause}`).get() as { c: number }
    ).c;
    const cardCount = (db.prepare(`SELECT COUNT(*) AS c FROM cards`).get() as { c: number }).c;
    const priceRecordCount = (
      db.prepare(`SELECT COUNT(*) AS c FROM price_records pr WHERE 1=1 ${excludedClause}`).get() as {
        c: number;
      }
    ).c;
    const lastScrapedAt = (
      db
        .prepare(`SELECT MAX(pr.scraped_at) AS m FROM price_records pr WHERE 1=1 ${excludedClause}`)
        .get() as { m: string | null }
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
         WHERE c.series = ? ${excludedClause}`
      )
      .get(series) as { c: number }
  ).c;
  const priceRecordCount = (
    db
      .prepare(
        `SELECT COUNT(*) AS c
         FROM price_records pr JOIN cards c ON c.id = pr.card_id
         WHERE c.series = ? ${excludedClause}`
      )
      .get(series) as { c: number }
  ).c;
  const lastScrapedAt = (
    db
      .prepare(
        `SELECT MAX(pr.scraped_at) AS m
         FROM price_records pr JOIN cards c ON c.id = pr.card_id
         WHERE c.series = ? ${excludedClause}`
      )
      .get(series) as { m: string | null }
  ).m;

  return { shopCount, cardCount, priceRecordCount, lastScrapedAt };
}
