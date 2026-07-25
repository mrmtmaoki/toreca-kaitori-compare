import * as cheerio from "cheerio";
import type { BoxScrapedPrice } from "./surugaya.js";

const PRICE_RE = /¥\s*([\d,]+)/;
// Some おたちゅう pages (confirmed on the Pokémon box page) put a lazy-loaded
// <img> wrapped in <noscript> ahead of the actual name in the same cell —
// standard HTML parsing treats <noscript> content as opaque text when
// scripting is assumed enabled (cheerio's default), which pollutes
// cells.text() with raw "<img src=...>" markup as literal text. The real
// name is reliably the last <b>...</b> in the cell on those pages, so pull
// that out of the cell's raw HTML directly rather than trusting .text().
const LAST_BOLD_RE = /<b>([^<]+)<\/b>(?!.*<b>)/s;

function extractProductName($cell: cheerio.Cheerio<any>): string {
  const boldMatch = ($cell.html() ?? "").match(LAST_BOLD_RE);
  if (boldMatch) return boldMatch[1].trim();
  return $cell.text().trim();
}

/**
 * おたちゅう's dedicated BOX(未開封ボックス)pages are a much simpler single-page
 * table than the main card price lists (商品名/金額/更新/JAN, `tr.row-N`, same
 * WordPress platform as src/scrapers/otachu.ts) — no pagination, no card
 * number to parse out, no set code embedded in the product name (confirmed
 * 2026-07-25: names are era-shorthand like "Vol.5 (BOX)", not the
 * "[SET-CODE]"-suffixed shape 駿河屋 uses) so setCode is always null here.
 */
export function createOtachuBoxScraper(shopId: string, displayName: string) {
  return {
    shopId,
    displayName,

    async scrape(targetUrl: string): Promise<BoxScrapedPrice[]> {
      const res = await fetch(targetUrl, {
        headers: { "User-Agent": "Mozilla/5.0 (compatible; toreca-kaitori-compare/0.1)" },
      });
      if (!res.ok) throw new Error(`otachu-box: HTTP ${res.status} for ${targetUrl}`);
      const html = await res.text();
      const $ = cheerio.load(html);

      const results: BoxScrapedPrice[] = [];

      $('tr[class^="row-"]').each((_, row) => {
        const $row = $(row);
        if ($row.find("th").length > 0) return; // header row

        const cells = $row.find("td");
        const productName = extractProductName(cells.eq(0));
        const priceText = cells.eq(1).text().trim();
        if (!productName) return;

        const priceMatch = priceText.match(PRICE_RE);
        if (!priceMatch) return;
        const price = Number(priceMatch[1].replace(/,/g, ""));
        if (!Number.isFinite(price)) return;

        results.push({ productName, setCode: null, price, sourceUrl: targetUrl });
      });

      return results;
    },
  };
}
