import type { ScrapedPrice, ShopScraper } from "../types.js";

/**
 * カードショップ買賊王's price pages (e.g. pokemon.html) are just a client-side
 * shell — the actual data is fetched by the page's own JS from a plain JSON
 * file at /datejson/<page>.json, fetched directly here instead. Each top-level
 * key is a set name (used to disambiguate Pokémon's bare "NNN/NNN" numbers,
 * see src/scrapers/cardmax.ts for the same problem elsewhere); "_lastUpdated"
 * is metadata, not a set, and is skipped.
 */
interface KaizokuoRow {
  rarity?: string;
  number?: string;
  name?: string;
  price?: string;
  flag1?: string;
  flag2?: string;
  flag3?: string;
  flag4?: string;
  flag5?: string;
  flag6?: string;
}

const BARE_NUM_TOTAL_RE = /^\d+\/\d+$/;
// A bare series/promo code with no individual number (e.g. "XY-P" alone) isn't
// a real per-card identifier — confirmed elsewhere (フルコンプ/駿河屋) that this
// shape merges every unrelated card sharing that promo series. A real number
// always has a digit somewhere.
function isPlausibleCardNumber(code: string): boolean {
  return /\d/.test(code);
}

// Sheet names look like "【SV8】超電ブレイカー" — the bracketed part is the same
// shop-independent set code other shops (フルコンプ/晴れる屋2) use natively.
// Pulling just that out (instead of the whole "【SV8】超電ブレイカー" label) is
// what lets the resulting card_number actually match across shops for the
// same real card, rather than embedding this shop's own label text.
function extractSetCode(setName: string): string {
  const match = setName.match(/【([^】]+)】/);
  return match ? match[1] : setName;
}

async function scrape(targetUrl: string): Promise<ScrapedPrice[]> {
  const res = await fetch(targetUrl, {
    headers: { "User-Agent": "Mozilla/5.0 (compatible; toreca-kaitori-compare/0.1)" },
  });
  if (!res.ok) throw new Error(`kaizokuo: HTTP ${res.status} for ${targetUrl}`);
  const data = (await res.json()) as Record<string, KaizokuoRow[]>;

  const results: ScrapedPrice[] = [];
  for (const [setName, rows] of Object.entries(data)) {
    if (setName === "_lastUpdated" || !Array.isArray(rows)) continue;

    for (const row of rows) {
      const price = Number(row.price);
      if (!row.name || !Number.isFinite(price)) continue;

      // Names sometimes carry raw HTML (<small>, <font>) for guarantee/note
      // rows rather than real cards — strip tags, keep the text.
      const cleanName = row.name.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
      const extraTags = [row.flag1, row.flag2, row.flag3, row.flag4, row.flag5, row.flag6]
        .map((f) => f?.trim())
        .filter((f): f is string => !!f);
      const rawName = extraTags.length ? `${cleanName}(${extraTags.join(")(")})` : cleanName;

      let number = row.number?.trim();
      if (number && !isPlausibleCardNumber(number)) number = undefined;
      const cardNumber =
        number && BARE_NUM_TOTAL_RE.test(number)
          ? `${extractSetCode(setName)}-${number}`
          : (number ?? null);

      results.push({
        rawName,
        rarity: row.rarity?.trim() || null,
        cardNumber,
        price,
        sourceUrl: targetUrl,
      });
    }
  }

  return results;
}

export const kaizokuoPokemonScraper: ShopScraper = {
  shopId: "kaizokuo",
  displayName: "カードショップ買賊王",
  scrape,
};

export const kaizokuoOnePieceScraper: ShopScraper = {
  shopId: "kaizokuo",
  displayName: "カードショップ買賊王",
  scrape,
};
