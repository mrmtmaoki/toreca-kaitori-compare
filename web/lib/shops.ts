// Mirrors the shopId/displayName/shopUrl set in src/targets.ts. Kept here
// (not read from the DB) since this doubles as static content for the
// /shops page — the `shops` table only has whatever url was last upserted
// by a scrape run, not a stable place to hang a description.
export interface ShopInfo {
  id: string;
  name: string;
  url: string;
  description: string;
}

export const SHOPS: ShopInfo[] = [
  {
    id: "fullcomp",
    name: "フルコンプ秋葉原店",
    url: "https://www.fullcomp.jp",
    description: "遊戯王・ワンピースカード・ポケモンカードを幅広く取り扱う秋葉原の買取店。",
  },
  {
    id: "surugaya",
    name: "駿河屋",
    url: "https://www.suruga-ya.jp",
    description: "全国展開・宅配買取対応の大手中古販売チェーン。取扱点数が非常に多い。",
  },
  {
    id: "cardmax",
    name: "カードマックス秋葉原店",
    url: "https://www.akiba.cardmax.jp",
    description: "秋葉原のトレカ専門買取店。過去弾から最新弾まで幅広くカバー。",
  },
  {
    id: "otachu",
    name: "おたちゅう。秋葉原店",
    url: "https://otachu-akiba.com",
    description: "秋葉原のトレカ・ホビー買取店。イラストレーター別の希少プロモにも強い。",
  },
  {
    id: "otachu2",
    name: "おたちゅう。秋葉原2号店",
    url: "https://otachu-akiba.com/2go",
    description: "おたちゅう。の2号店。主に旧裏面ポケモンカードなどヴィンテージ商品を取り扱う。",
  },
  {
    id: "kaizokuo",
    name: "カードショップ買賊王",
    url: "https://www.kaizokuo.online",
    description: "ポケモンカード・ワンピースカードを取り扱う買取店。",
  },
  {
    id: "mercard",
    name: "メルカード秋葉原",
    url: "https://akihabara-cardshop.com",
    description: "ワンピースカードを中心に取り扱う秋葉原の買取店。",
  },
  {
    id: "hareruya2",
    name: "晴れる屋2",
    url: "https://www.hareruya2.com",
    description: "ポケモンカードを中心に取り扱う買取店。",
  },
  {
    id: "yellowsubmarine",
    name: "イエローサブマリン",
    url: "https://yellowsubmarine.co.jp",
    description: "遊戯王カードを取り扱う老舗ホビーショップチェーン。",
  },
];
