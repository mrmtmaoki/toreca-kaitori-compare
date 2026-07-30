// Mirrors the shopId/displayName/shopUrl set in src/targets.ts. Kept here
// (not read from the DB) since this doubles as static content for the
// /shops page — the `shops` table only has whatever url was last upserted
// by a scrape run, not a stable place to hang a description.
export interface ShopInfo {
  id: string;
  name: string;
  url: string;
  description: string;
  /** 秋葉原 = walk-in Akihabara store, 宅配 = nationwide mail-in buyback —
   * drives the /shops page grouping and the "宅配" badge shown per price
   * row (see web/lib/db.ts's areaForShop). */
  area: "秋葉原" | "宅配";
}

export const SHOPS: ShopInfo[] = [
  {
    id: "fullcomp",
    name: "フルコンプ秋葉原店",
    url: "https://www.fullcomp.jp",
    description: "遊戯王・ワンピースカード・ポケモンカードを幅広く取り扱う秋葉原の買取店。",
    area: "秋葉原",
  },
  {
    id: "surugaya",
    name: "駿河屋",
    url: "https://www.suruga-ya.jp",
    description: "全国展開・宅配買取対応の大手中古販売チェーン。取扱点数が非常に多い。",
    area: "宅配",
  },
  {
    id: "cardmax",
    name: "カードマックス秋葉原店",
    url: "https://www.akiba.cardmax.jp",
    description: "秋葉原のトレカ専門買取店。過去弾から最新弾まで幅広くカバー。",
    area: "秋葉原",
  },
  {
    id: "otachu",
    name: "おたちゅう。秋葉原店",
    url: "https://otachu-akiba.com",
    description: "秋葉原のトレカ・ホビー買取店。イラストレーター別の希少プロモにも強い。",
    area: "秋葉原",
  },
  {
    id: "otachu2",
    name: "おたちゅう。秋葉原2号店",
    url: "https://otachu-akiba.com/2go",
    description: "おたちゅう。の2号店。主に旧裏面ポケモンカードなどヴィンテージ商品を取り扱う。",
    area: "秋葉原",
  },
  {
    id: "kaizokuo",
    name: "カードショップ買賊王",
    url: "https://www.kaizokuo.online",
    description: "ポケモンカード・ワンピースカードを取り扱う秋葉原の買取店。",
    area: "秋葉原",
  },
  {
    id: "mercard",
    name: "メルカード秋葉原",
    url: "https://akihabara-cardshop.com",
    description: "ワンピースカードを中心に取り扱う秋葉原の買取店。",
    area: "秋葉原",
  },
  {
    id: "hareruya2",
    name: "晴れる屋2",
    url: "https://www.hareruya2.com",
    description: "秋葉原でポケモンカードを中心に取り扱う買取店。",
    area: "秋葉原",
  },
  {
    id: "yellowsubmarine",
    name: "イエローサブマリン",
    url: "https://yellowsubmarine.co.jp",
    description: "遊戯王カードを取り扱う老舗ホビーショップチェーン。",
    area: "秋葉原",
  },
  {
    id: "hobbystation",
    name: "ホビーステーション",
    url: "https://www.hobbystation-single.jp",
    description: "全国対応の宅配買取に対応するトレーディングカードショップ。",
    area: "宅配",
  },
  {
    id: "toretoku",
    name: "トレトク",
    url: "https://kaitori-toretoku.jp",
    description: "全国対応の宅配買取専門サービス。",
    area: "宅配",
  },
];

/**
 * Shops no longer scraped but whose historical price_records/scrape_runs
 * rows are kept in the DB rather than deleted. Excluded here (not just
 * dropped from SHOPS above) so every price query in web/lib/db.ts,
 * topMovers.ts, and priceHistory.ts filters them out too — otherwise a
 * price frozen at whatever it was on the last successful scrape would keep
 * silently counting as "current" forever. See README's
 * "対応を見送った店舗" for why each entry stopped being scraped.
 */
export const EXCLUDED_SHOP_IDS = ["yuyutei"];
