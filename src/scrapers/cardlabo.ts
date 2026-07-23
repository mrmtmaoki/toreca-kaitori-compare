import { chromium } from "playwright";
import type { ScrapedPrice, ShopScraper } from "../types.js";

// e.g. "【遊戯】真紅眼の超越黒竜【プリズマティックシークレット/融合】BETB-JP036"
const NAME_RE = /^【([^】]+)】(.+?)【([^】]+)】(\S+)$/;

/**
 * NOT wired into targets.ts — kept for reference only.
 *
 * Cardlabo's price grid is populated client-side, and it is only rendered for
 * sessions that look like a real browser: under Playwright (navigator.webdriver
 * === true) the grid stays empty, while a manual Chrome session renders it fine.
 * That's an active automation check, not just "needs JS" — treat it the same as
 * the Cloudflare-gated shops (Dragon Star, BIGMAGIC) and don't try to defeat it
 * (e.g. by spoofing navigator.webdriver). Left here in case the shop grants
 * explicit permission for automated access in the future.
 */
export const cardlaboScraper: ShopScraper = {
  shopId: "cardlabo",
  displayName: "カードラボ",

  async scrape(targetUrl: string): Promise<ScrapedPrice[]> {
    const browser = await chromium.launch();
    try {
      const page = await browser.newPage({
        userAgent: "Mozilla/5.0 (compatible; toreca-kaitori-compare/0.1)",
      });
      await page.goto(targetUrl, { waitUntil: "domcontentloaded" });
      await page.waitForSelector(".goods_name", { timeout: 15000 }).catch(() => {});

      const items = await page.$$eval('li[class*="list_item_"]', (nodes) =>
        nodes.map((node) => ({
          name: node.querySelector(".goods_name")?.textContent?.trim() ?? "",
          priceText: node.querySelector(".figure")?.textContent?.trim() ?? "",
        }))
      );

      return items
        .map(({ name, priceText }) => {
          const price = Number(priceText.replace(/[^\d]/g, ""));
          if (!name || !Number.isFinite(price) || price === 0) return null;

          const match = name.match(NAME_RE);
          return {
            rawName: match ? match[2].trim() : name,
            rarity: match ? match[3].trim() : null,
            cardNumber: match ? match[4].trim() : null,
            price,
            sourceUrl: targetUrl,
          } satisfies ScrapedPrice;
        })
        .filter((r): r is ScrapedPrice => r !== null);
    } finally {
      await browser.close();
    }
  },
};
