import { createOtachuBoxScraper } from "./scrapers/otachuBoxes.js";
import { scrapeSurugayaBoxes, type BoxScrapedPrice } from "./scrapers/surugaya.js";

export interface BoxScraper {
  shopId: string;
  displayName: string;
  scrape(targetUrl: string): Promise<BoxScrapedPrice[]>;
}

export interface BoxScrapeTarget {
  scraper: BoxScraper;
  shopUrl: string;
  series: string;
  pages: string[];
}

const otachuYugiohBoxScraper = createOtachuBoxScraper("otachu", "おたちゅう。秋葉原店");
const otachuOnePieceBoxScraper = createOtachuBoxScraper("otachu", "おたちゅう。秋葉原店");
const otachuPokemonBoxScraper = createOtachuBoxScraper("otachu", "おたちゅう。秋葉原店");

/**
 * BOX(密封商品)の買取価格スクレイプ対象。src/targets.tsの単品カード用と別立て
 * — 対応店舗・URLが違う(全店舗が単品と同じページでBOXも扱ってるわけではない)。
 *
 * 2026-07-25時点で確認できたのは駿河屋・おたちゅうのみ。メルカード・カード
 * マックス・おたちゅう2号店もBOX買取をやってることは確認済みだが、正確な
 * ページURLはまだ特定できていない — 追加の調査が必要(残タスク)。
 *
 * 駿河屋の遊戯王ページ(src/targets.tsのシングル限定フィルター付きURL)は
 * BOXを対象外にしてるURLなので、ここではワンピース・ポケモンのみ対象。
 */
export const boxScrapeTargets: BoxScrapeTarget[] = [
  {
    scraper: { shopId: "surugaya", displayName: "駿河屋", scrape: scrapeSurugayaBoxes },
    shopUrl: "https://www.suruga-ya.jp",
    series: "ワンピースカード",
    pages: [
      "https://www.suruga-ya.jp/kaitori/search_buy?category=5010800115&search_word=&page=1&rankBy=purchase_price(int):descending",
    ],
  },
  {
    scraper: { shopId: "surugaya", displayName: "駿河屋", scrape: scrapeSurugayaBoxes },
    shopUrl: "https://www.suruga-ya.jp",
    series: "ポケモンカード",
    pages: [
      "https://www.suruga-ya.jp/kaitori/search_buy?category=501080033&search_word=&page=1&rankBy=purchase_price(int):descending",
    ],
  },
  {
    scraper: otachuYugiohBoxScraper,
    shopUrl: "https://otachu-akiba.com",
    series: "遊戯王",
    pages: ["https://otachu-akiba.com/1gocard/buying_price/yugioh-box/"],
  },
  {
    scraper: otachuOnePieceBoxScraper,
    shopUrl: "https://otachu-akiba.com",
    series: "ワンピースカード",
    pages: ["https://otachu-akiba.com/1gocard/buying_price/onepiecscardgame-box/"],
  },
  {
    scraper: otachuPokemonBoxScraper,
    shopUrl: "https://otachu-akiba.com",
    series: "ポケモンカード",
    pages: ["https://otachu-akiba.com/1gocard/buying_price/pokemon-card-game/"],
  },
];
