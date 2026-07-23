import * as cheerio from "cheerio";
import type { ScrapedPrice, ShopScraper } from "../types.js";

/**
 * イエローサブマリン's 遊戯王 buy list is one big plain HTML `<table>` — no
 * `<thead>`/`<tbody>` split, the header row is just an ordinary `<tr><td>...`
 * like every data row, so it's skipped by checking the price cell parses as a
 * number. Page is served as Shift_JIS.
 */
export const yellowSubmarineYugiohScraper: ShopScraper = {
  shopId: "yellowsubmarine",
  displayName: "イエローサブマリン",

  async scrape(targetUrl: string): Promise<ScrapedPrice[]> {
    const res = await fetch(targetUrl, {
      headers: { "User-Agent": "Mozilla/5.0 (compatible; toreca-kaitori-compare/0.1)" },
    });
    if (!res.ok) throw new Error(`yellowsubmarine: HTTP ${res.status} for ${targetUrl}`);
    const buffer = await res.arrayBuffer();
    const html = new TextDecoder("shift_jis").decode(buffer);
    const $ = cheerio.load(html);

    const results: ScrapedPrice[] = [];

    $("table tr").each((_, tr) => {
      const cells = $(tr)
        .find("td")
        .map((_i, td) => $(td).text().trim())
        .get();
      if (cells.length < 5) return;

      const [, rarity, cardNumber, name, priceText] = cells;
      const price = Number(priceText.replace(/,/g, ""));
      if (!name || !Number.isFinite(price)) return;

      results.push({
        rawName: name,
        rarity: rarity || null,
        cardNumber: cardNumber || null,
        price,
        sourceUrl: targetUrl,
      });
    });

    return results;
  },
};
