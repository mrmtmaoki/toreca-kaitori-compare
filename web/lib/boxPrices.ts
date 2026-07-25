import { getDb } from "./db";
import { toAffiliateUrl } from "./affiliateLinks";
import { SHOPS } from "./shops";

export interface BoxPrice {
  shopName: string;
  setCode: string | null;
  productName: string;
  price: number;
  sourceUrl: string;
}

const SHOP_LABELS: Record<string, string> = Object.fromEntries(SHOPS.map((s) => [s.id, s.name]));

/** Latest known price per (shop, product_name) for a series, highest first —
 * BOX/密封商品 prices aren't tied to a card_id (see src/db.ts box_prices
 * table), so unlike card listings there's no cross-shop grouping by a shared
 * key: product names are shop-specific free text (駿河屋 embeds a set code,
 * おたちゅう doesn't — see src/scrapers/surugaya.ts / otachuBoxes.ts). */
export function listBoxPrices(series: string): BoxPrice[] {
  const db = getDb();
  const rows = db
    .prepare(
      `WITH latest AS (
         SELECT shop_id, product_name, set_code, price, source_url,
           ROW_NUMBER() OVER (PARTITION BY shop_id, product_name ORDER BY scraped_at DESC) AS rn
         FROM box_prices
         WHERE series = ?
       )
       SELECT s.name AS shop_name, l.set_code, l.product_name, l.price, l.source_url
       FROM latest l JOIN shops s ON s.id = l.shop_id
       WHERE l.rn = 1
       ORDER BY l.price DESC`
    )
    .all(series) as {
    shop_name: string;
    set_code: string | null;
    product_name: string;
    price: number;
    source_url: string;
  }[];

  return rows.map((r) => ({
    shopName: SHOP_LABELS[r.shop_name] ?? r.shop_name,
    setCode: r.set_code,
    productName: r.product_name,
    price: r.price,
    sourceUrl: toAffiliateUrl(r.shop_name, r.source_url),
  }));
}
