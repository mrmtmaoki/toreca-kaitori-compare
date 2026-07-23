import { openDb } from "./db.js";

// A single card_id spanning a huge price range is almost always a data bug
// (two genuinely different prints/cards sharing one card_id), not real market
// variance — see src/variant.ts and the fullcomp "Y"/"F"/"DSEC" placeholder
// card_number bug for the two known root causes. Run this after every scrape
// so new bug patterns (new shops, new games) surface instead of hiding in the
// price list.
//
// Thresholds are picked from the actual max/min ratio distribution (checked
// 2026-07-22, post variant-key fix, 1228 multi-record cards): cross-shop
// ratios sit at p90=12x / p95=50x — most of the 12x-and-under spread looks
// like ordinary cross-shop pricing-strategy differences, so 20x is set just
// past that knee to catch the outlier tail without flooding on normal
// variance. Same-shop ratios are much tighter (p90=3.7x / p95=24x) since two
// listings at the *same* shop for what we consider "the same card" should
// usually track closely, so a lower 5x bar is used there. Re-check this
// distribution (see the query in this file's history / project memory) as
// more shops/genres are added — the "normal" spread may shift.
const MIN_RECORDS = 3;
const CROSS_SHOP_RATIO_THRESHOLD = 20;
const SAME_SHOP_RATIO_THRESHOLD = 5;
const MAX_ROWS = 40;

interface CardRow {
  id: number;
  series: string | null;
  canonical_name: string;
  card_number: string | null;
  rarity: string | null;
  variant: string | null;
  minp: number;
  maxp: number;
  n: number;
  shopN: number;
}

interface PriceRow {
  shop: string;
  price: number;
  source_url: string;
}

function printCard(db: ReturnType<typeof openDb>, row: CardRow) {
  const key = [row.card_number, row.rarity, row.variant].filter(Boolean).join(" / ");
  console.log(
    `[${row.series ?? "?"}] ${row.canonical_name}${key ? ` (${key})` : ""}  card_id=${row.id}`
  );
  console.log(
    `  ¥${row.minp.toLocaleString()} 〜 ¥${row.maxp.toLocaleString()}  ` +
      `(${row.n}件 / ${row.shopN}店舗 / 倍率 ${(row.maxp / Math.max(row.minp, 1)).toFixed(1)}x)`
  );
  const perShop = db
    .prepare(
      `SELECT s.name AS shop, pr.price, pr.source_url
       FROM price_records pr JOIN shops s ON s.id = pr.shop_id
       WHERE pr.card_id = ?
       ORDER BY pr.price DESC`
    )
    .all(row.id) as unknown as PriceRow[];
  for (const p of perShop) {
    console.log(`    ${p.shop.padEnd(10)} ¥${p.price.toLocaleString().padStart(9)}  ${p.source_url}`);
  }
}

function main() {
  const db = openDb();

  console.log(`=== 店舗間スプレッド異常 (${CROSS_SHOP_RATIO_THRESHOLD}倍以上, ${MIN_RECORDS}件以上) ===`);
  const crossShop = db
    .prepare(
      `SELECT c.id, c.series, c.canonical_name, c.card_number, c.rarity, c.variant,
              MIN(pr.price) AS minp, MAX(pr.price) AS maxp, COUNT(*) AS n,
              COUNT(DISTINCT pr.shop_id) AS shopN
       FROM cards c JOIN price_records pr ON pr.card_id = c.id
       GROUP BY c.id
       HAVING n >= ? AND maxp > minp * ?
       ORDER BY maxp DESC
       LIMIT ?`
    )
    .all(MIN_RECORDS, CROSS_SHOP_RATIO_THRESHOLD, MAX_ROWS) as unknown as CardRow[];

  if (crossShop.length === 0) {
    console.log("(該当なし)");
  } else {
    for (const row of crossShop) printCard(db, row);
  }

  // Same shop + same card_id spanning a huge range is a stronger signal: it
  // means either the same shop lists multiple physically-distinct copies
  // under our matching key (a modeling gap, not fixable by matching alone),
  // or the card is still miscategorized. Worth a human look either way.
  console.log(
    `\n=== 同一店舗内スプレッド異常 (${SAME_SHOP_RATIO_THRESHOLD}倍以上, 要確認: マッチングの精度不足の可能性) ===`
  );
  const sameShop = db
    .prepare(
      `SELECT c.id, c.series, c.canonical_name, c.card_number, c.rarity, c.variant,
              MIN(pr.price) AS minp, MAX(pr.price) AS maxp, COUNT(*) AS n, 1 AS shopN
       FROM cards c JOIN price_records pr ON pr.card_id = c.id
       GROUP BY c.id, pr.shop_id
       HAVING n >= 2 AND maxp > minp * ?
       ORDER BY maxp DESC
       LIMIT ?`
    )
    .all(SAME_SHOP_RATIO_THRESHOLD, MAX_ROWS) as unknown as CardRow[];

  if (sameShop.length === 0) {
    console.log("(該当なし)");
  } else {
    for (const row of sameShop) printCard(db, row);
  }

  db.close();
}

main();
