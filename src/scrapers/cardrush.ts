import * as cheerio from "cheerio";
import type { ScrapedPrice, ShopScraper } from "../types.js";

const PAGE_DELAY_MS = 1000;
const PAGE_LIMIT = 100;
const MAX_PAGES = 300;

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// A bare print-era word like "初期" (early print) shows up in the model_number
// column sometimes — not a real card number, and (per the same bug seen on
// フルコンプ/駿河屋) would merge every card sharing that same non-number value.
function isPlausibleCardNumber(code: string): boolean {
  return /\d/.test(code);
}

/**
 * カードラッシュ's own site (cardrush.jp) doesn't expose the buy list as a
 * simple static page, but its "ラッシュメディア" sister site (cardrush.media)
 * republishes the same buying prices as a plain paginated HTML table —
 * ?page=N&limit=100, no JS rendering needed. "-" means the cell is empty
 * (no rarity / no model number for that listing).
 *
 * Note: cardrush-pokemon.jp's own robots.txt explicitly disallows ClaudeBot —
 * a clear opt-out signal — so Pokémon is deliberately not added here even
 * though cardrush.media itself doesn't carry that restriction, since the
 * price data ultimately comes from the same shop that asked not to be
 * accessed this way.
 */
function makeCardrushScraper(): ShopScraper["scrape"] {
  return async (targetUrl: string): Promise<ScrapedPrice[]> => {
    const allResults: ScrapedPrice[] = [];

    for (let page = 1; page <= MAX_PAGES; page++) {
      const url = `${targetUrl}?page=${page}&limit=${PAGE_LIMIT}`;
      const res = await fetch(url, {
        headers: { "User-Agent": "Mozilla/5.0 (compatible; toreca-kaitori-compare/0.1)" },
      });
      if (!res.ok) throw new Error(`cardrush: HTTP ${res.status} for ${url}`);
      const html = await res.text();
      const $ = cheerio.load(html);
      const rows = $("table.PriceTable tbody tr");
      if (rows.length === 0) break;

      rows.each((_, tr) => {
        const $tr = $(tr);
        const name = $tr.find("td.name").text().trim();
        const rarity = $tr.find("td.rarity").text().trim();
        const number = $tr.find("td.model_number").text().trim();
        const amountText = $tr.find("td.amount").text().trim();
        const price = Number(amountText.replace(/[¥,]/g, ""));
        if (!name || !Number.isFinite(price)) return;

        allResults.push({
          rawName: name,
          rarity: rarity && rarity !== "-" ? rarity : null,
          cardNumber: number && number !== "-" && isPlausibleCardNumber(number) ? number : null,
          price,
          sourceUrl: url,
        });
      });

      if (rows.length < PAGE_LIMIT) break; // last page
      await sleep(PAGE_DELAY_MS);
    }

    return allResults;
  };
}

export const cardrushYugiohScraper: ShopScraper = {
  shopId: "cardrush",
  displayName: "カードラッシュ",
  scrape: makeCardrushScraper(),
};

export const cardrushOnePieceScraper: ShopScraper = {
  shopId: "cardrush",
  displayName: "カードラッシュ",
  scrape: makeCardrushScraper(),
};
