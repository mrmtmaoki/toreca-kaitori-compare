import * as cheerio from "cheerio";
import type { ScrapedPrice, ShopScraper } from "../types.js";

// "ピカチュウ(PROMO){雷}〈291/SV-P〉[SV-P]" → name / rarity / type(unused) / num-total / setCode.
const NAME_RE = /^(.+?)\(([^)]*)\)\{([^}]*)\}〈([^〉]+)〉\[([^\]]+)\]$/;
const BARE_NUM_TOTAL_RE = /^\d+\/\d+$/;
const RETRY_DELAYS_MS = [2000, 5000];

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/** These pages intermittently 503 (a different page fails each attempt) —
 * transient server load, not a real block. Retry before giving up. */
async function fetchWithRetry(url: string): Promise<Response> {
  let lastRes: Response | undefined;
  for (let attempt = 0; attempt <= RETRY_DELAYS_MS.length; attempt++) {
    const res = await fetch(url, {
      headers: { "User-Agent": "Mozilla/5.0 (compatible; toreca-kaitori-compare/0.1)" },
    });
    if (res.ok) return res;
    lastRes = res;
    if (attempt < RETRY_DELAYS_MS.length) {
      console.warn(`  hareruya2: HTTP ${res.status} for ${url} — retry ${attempt + 1}/${RETRY_DELAYS_MS.length}`);
      await sleep(RETRY_DELAYS_MS[attempt]);
    }
  }
  return lastRes!;
}

/**
 * 晴れる屋2 (Pokémon specialty shop) splits its buy list into one static page
 * per generation (buying-list-sv/ss/bw/sm/xy). Each row's name cell packs
 * name/rarity/type/number/setCode into one string with fixed brackets.
 * num-total repeats across sets like everywhere else, so the trailing
 * setCode prefixes it when it's a bare "NNN/NNN".
 */
export const hareruya2PokemonScraper: ShopScraper = {
  shopId: "hareruya2",
  displayName: "晴れる屋2",

  async scrape(targetUrl: string): Promise<ScrapedPrice[]> {
    const res = await fetchWithRetry(targetUrl);
    if (!res.ok) throw new Error(`hareruya2: HTTP ${res.status} for ${targetUrl}`);
    const html = await res.text();
    const $ = cheerio.load(html);

    const results: ScrapedPrice[] = [];

    $(".table_main").each((_, row) => {
      const $row = $(row);
      const rawName = $row.find(".table_left_cell").text().trim();
      const priceText = $row.find(".table_right_cell").text().trim();
      const price = Number(priceText.replace(/,/g, ""));
      if (!rawName || !Number.isFinite(price)) return;

      const match = rawName.match(NAME_RE);
      if (!match) return; // header row ("カード名"/"買取価格") or unexpected shape
      const [, name, rarity, , numTotal, setCode] = match;

      const cardNumber = BARE_NUM_TOTAL_RE.test(numTotal) ? `${setCode}-${numTotal}` : numTotal;

      results.push({
        rawName: name.trim(),
        rarity: rarity.trim() || null,
        cardNumber,
        price,
        sourceUrl: targetUrl,
      });
    });

    return results;
  },
};
