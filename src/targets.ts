import { discoverCardmaxSequentialSetUrls, discoverCardmaxSetUrls } from "./cardmax-discovery.js";
import { discoverHobbystationSetUrls } from "./hobbystation-discovery.js";
import { cardmaxScraper } from "./scrapers/cardmax.js";
import { fullcompScraper } from "./scrapers/fullcomp.js";
import { hareruya2PokemonScraper } from "./scrapers/hareruya2.js";
import { hobbystationScraper } from "./scrapers/hobbystation.js";
import { kaizokuoOnePieceScraper, kaizokuoPokemonScraper } from "./scrapers/kaizokuo.js";
import { mercardOnePieceScraper } from "./scrapers/mercard.js";
import { createOtachuScraper, otachuScraper } from "./scrapers/otachu.js";
import { surugayaScraper } from "./scrapers/surugaya.js";
import { toretokuScraper } from "./scrapers/toretoku.js";
import { yellowSubmarineYugiohScraper } from "./scrapers/yellowsubmarine.js";
import type { ShopScraper } from "./types.js";

const otachu2Scraper = createOtachuScraper("otachu2", "おたちゅう。秋葉原2号店");

export interface ScrapeTarget {
  scraper: ShopScraper;
  shopUrl: string;
  /** The card game these pages belong to (used for cards.series, not the shop name) */
  series: string;
  /** One or more category/listing pages to scrape for this shop */
  pages: string[];
}

export interface DynamicScrapeTarget {
  scraper: ShopScraper;
  shopUrl: string;
  series: string;
  /** Resolved fresh at scrape time, so newly released sets are picked up automatically */
  discoverPages: () => Promise<string[]>;
}

/**
 * Add more entries to `pages` to widen coverage (e.g. other genres/sets for the
 * same shop) — each scraper works on a single listing URL at a time, per the
 * design doc's "1店舗ずつ動作確認しながら追加" approach.
 */
export const scrapeTargets: ScrapeTarget[] = [
  {
    scraper: fullcompScraper,
    shopUrl: "https://www.fullcomp.jp",
    series: "遊戯王",
    pages: ["https://www.fullcomp.jp/akihabara/kaitori/18189"],
  },
  {
    scraper: surugayaScraper,
    shopUrl: "https://www.suruga-ya.jp",
    series: "遊戯王",
    pages: [
      "https://www.suruga-ya.jp/kaitori/search_buy?category=501080040&search_word=&page=1&rankBy=purchase_price(int):descending&restrict[]=boxpacksingle=%E3%82%B7%E3%83%B3%E3%82%B0%E3%83%AB&restrict[]=estimate_by_mail=false&restrict[]=expensive%20purchase=true&restrict[]=language=%E6%97%A5%E6%9C%AC%E8%AA%9E%E7%89%88",
    ],
  },
  {
    scraper: otachuScraper,
    shopUrl: "https://otachu-akiba.com",
    series: "遊戯王",
    pages: ["https://otachu-akiba.com/1gocard/buying_price/yugioh/"],
  },
  {
    scraper: yellowSubmarineYugiohScraper,
    shopUrl: "https://yellowsubmarine.co.jp",
    series: "遊戯王",
    pages: ["https://yellowsubmarine.co.jp/reuse/yugio/"],
  },

  // --- ワンピースカード ---
  {
    scraper: fullcompScraper,
    shopUrl: "https://www.fullcomp.jp",
    series: "ワンピースカード",
    pages: ["https://www.fullcomp.jp/akihabara/kaitori/18982"],
  },
  {
    scraper: surugayaScraper,
    shopUrl: "https://www.suruga-ya.jp",
    series: "ワンピースカード",
    pages: [
      "https://www.suruga-ya.jp/kaitori/search_buy?category=5010800115&search_word=&page=1&rankBy=purchase_price(int):descending",
    ],
  },
  {
    scraper: otachuScraper,
    shopUrl: "https://otachu-akiba.com",
    series: "ワンピースカード",
    pages: ["https://otachu-akiba.com/1gocard/buying_price/onepiececard/"],
  },
  {
    // 遊戯王ページ(yugioh-kaitori)は形式が別物かつ113件と小規模だったため見送り、
    // ワンピースのみ対応。
    scraper: mercardOnePieceScraper,
    shopUrl: "https://akihabara-cardshop.com",
    series: "ワンピースカード",
    pages: ["https://akihabara-cardshop.com/onepice-kaitori/"],
  },
  // カードラボ(c-labo-kaitori.jp)は意図的に外しています。robots.txt上は問題ありませんが、
  // 価格グリッドの描画がクライアント側で navigator.webdriver 等の自動化シグナルを見て
  // 出し分けられており(Playwrightでは常に空、実ブラウザでのみ表示)、これはドラゴンスターや
  // BIGMAGICのCloudflare防御と同種の「自動アクセスのブロック」と判断し、対応を見送りました。
  //
  // カードラッシュ(cardrush.jp/cardrush.media、src/scrapers/cardrush.ts、未使用)も意図的
  // に外しています。cardrush.media/data_policy に「クローリングやスクレイピングを目的とした
  // 自動アクセスによる価格情報の取得」を明確に禁止する規約があり、「当社が運営する全ての
  // webサイト」に適用されると明記されているため、cardrush.mediaも対象に含まれると判断。
  // 2026-07-23、実装後にこの規約に気づき、収集済みデータとともに削除しました。

  // --- ポケモンカード ---
  {
    scraper: fullcompScraper,
    shopUrl: "https://www.fullcomp.jp",
    series: "ポケモンカード",
    pages: ["https://www.fullcomp.jp/akihabara/kaitori/19879"],
  },
  {
    scraper: surugayaScraper,
    shopUrl: "https://www.suruga-ya.jp",
    series: "ポケモンカード",
    pages: [
      "https://www.suruga-ya.jp/kaitori/search_buy?category=501080033&search_word=&page=1&rankBy=purchase_price(int):descending",
    ],
  },
  {
    // おたちゅうは遊戯王/ワンピースと違い、ポケモンをカードプール規模のため
    // 世代ごとに複数ページへ分割している(1ページに統合されていない)。
    scraper: otachuScraper,
    shopUrl: "https://otachu-akiba.com",
    series: "ポケモンカード",
    pages: [
      "https://otachu-akiba.com/1gocard/buying_price/pokemoncardgamemega/", // MEGA(最新)
      "https://otachu-akiba.com/1gocard/buying_price/%E3%83%9D%E3%82%B1%E3%82%AB/", // スカーレット＆バイオレット
      "https://otachu-akiba.com/1gocard/buying_price/%E5%89%A3%E7%9B%BE/", // ソード＆シールド
      "https://otachu-akiba.com/1gocard/buying_price/sunmoon/", // サン＆ムーン
      "https://otachu-akiba.com/1gocard/buying_price/promotional-card/", // プロモーションカード
    ],
  },
  {
    // 2号店は1号店とは別の物理店舗・独立した在庫/価格なので別ショップとして登録。
    scraper: otachu2Scraper,
    shopUrl: "https://otachu-akiba.com/2go",
    series: "ポケモンカード",
    pages: [
      "https://otachu-akiba.com/2go/buying_price/%E3%80%90%E3%83%9D%E3%82%B1%E3%83%A2%E3%83%B3%E3%82%AB%E3%83%BC%E3%83%89%E6%97%A7%E8%A3%8F%E9%9D%A2%E8%B2%B7%E5%8F%96%E8%A1%A8%E3%80%91/", // 旧裏面
    ],
  },
  {
    scraper: kaizokuoPokemonScraper,
    shopUrl: "https://www.kaizokuo.online",
    series: "ポケモンカード",
    pages: ["https://www.kaizokuo.online/datejson/pokemon.json"],
  },
  {
    scraper: kaizokuoOnePieceScraper,
    shopUrl: "https://www.kaizokuo.online",
    series: "ワンピースカード",
    pages: ["https://www.kaizokuo.online/datejson/onepeace.json"],
  },
  {
    scraper: hareruya2PokemonScraper,
    shopUrl: "https://www.hareruya2.com",
    series: "ポケモンカード",
    pages: [
      "https://www.hareruya2.com/pages/buying-list-sv", // スカーレット＆バイオレット
      "https://www.hareruya2.com/pages/buying-list-ss", // ソード＆シールド
      "https://www.hareruya2.com/pages/buying-list-sm", // サン＆ムーン
      "https://www.hareruya2.com/pages/buying-list-xy", // XY
      "https://www.hareruya2.com/pages/buying-list-bw", // BW
    ],
  },

  // --- 宅配買取(全国) 2026-07-27追加 ---
  // トレトクは1ジャンル=1静的ページに全カードが載っているため(クライアント側の
  // 検索/絞り込みはCSS表示切り替えのみ、生HTMLに全件ある)、他店のような
  // セット単位のディスカバリーが不要。
  {
    scraper: toretokuScraper,
    shopUrl: "https://kaitori-toretoku.jp",
    series: "遊戯王",
    pages: ["https://kaitori-toretoku.jp/buypricelist/yugioh"],
  },
  {
    scraper: toretokuScraper,
    shopUrl: "https://kaitori-toretoku.jp",
    series: "ワンピースカード",
    pages: ["https://kaitori-toretoku.jp/buypricelist/onepiece"],
  },
  {
    scraper: toretokuScraper,
    shopUrl: "https://kaitori-toretoku.jp",
    series: "ポケモンカード",
    pages: ["https://kaitori-toretoku.jp/buypricelist/pokemon"],
  },
];

/**
 * カードマックスはゲームごとに「セット一覧ページ」からリンクを辿る必要があり、
 * 新セットが出るとURLが増える。静的リストではなく毎回の実行時にその時点の
 * 全セットURLを取得することで、新弾を自動追従できるようにしている。
 */
export const dynamicScrapeTargets: DynamicScrapeTarget[] = [
  {
    scraper: cardmaxScraper,
    shopUrl: "https://www.akiba.cardmax.jp",
    series: "遊戯王",
    discoverPages: () =>
      discoverCardmaxSetUrls("https://www.akiba.cardmax.jp/shopbrand/goods01/", "yg"),
  },
  {
    scraper: cardmaxScraper,
    shopUrl: "https://www.akiba.cardmax.jp",
    series: "ワンピースカード",
    discoverPages: () => discoverCardmaxSequentialSetUrls("https://www.akiba.cardmax.jp", "op"),
  },
  {
    scraper: cardmaxScraper,
    shopUrl: "https://www.akiba.cardmax.jp",
    series: "ポケモンカード",
    discoverPages: () =>
      discoverCardmaxSetUrls("https://www.akiba.cardmax.jp/shopbrand/goods04/", "pk"),
  },

  // --- 宅配買取(全国) 2026-07-27追加 ---
  // 遊々亭(yuyu-tei.jp)は2026-07-28〜30の3日連続でGitHub Actions実行時のみ
  // discoverページ取得が403で失敗(ローカル/手動実行では毎回成功)。同一User-Agent
  // でランナー側だけ拒否されており、GitHub ActionsのランナーIPレンジに対する
  // ブロックと判断。README「対応を見送った店舗」の他店(カードラボ等)と同じ
  // 「技術的な検知回避はしない」方針に基づき、自動スクレイプ対象からは除外。
  // src/scrapers/yuyutei.ts・src/yuyutei-discovery.tsは手動実行用に残置。
  {
    scraper: hobbystationScraper,
    shopUrl: "https://www.hobbystation-single.jp",
    series: "遊戯王",
    discoverPages: () => discoverHobbystationSetUrls("yg"),
  },
  {
    scraper: hobbystationScraper,
    shopUrl: "https://www.hobbystation-single.jp",
    series: "ワンピースカード",
    discoverPages: () => discoverHobbystationSetUrls("op"),
  },
  {
    scraper: hobbystationScraper,
    shopUrl: "https://www.hobbystation-single.jp",
    series: "ポケモンカード",
    discoverPages: () => discoverHobbystationSetUrls("pk"),
  },
];
