import * as cheerio from "cheerio";
import { openDb } from "../db.js";

/**
 * ONE PIECEカードゲーム公式サイトのカードリスト(onepiece-cardgame.com/cardlist/)
 * から、カード番号→色・画像URLのマスターデータを取得してcardsテーブルに反映する。
 *
 * 買取店のスクレイプ(src/scrapers/*)とは別物 — 店舗側の生データに色情報を持って
 * いるのはフルコンプ・メルカードの2店舗だけで、在庫状況に依存するため網羅率が
 * 約72%止まり(2026-07-24調査)。画像も店舗の在庫依存で網羅率51.6%止まり
 * (2026-07-25調査)。公式サイトはカード番号ごとの独立したマスターデータなので、
 * 店舗の在庫と無関係にほぼ全カードを網羅できる。
 *
 * 画像は cards.official_image_url に保存し、店舗写真(price_records.image_url)
 * が無いカードのフォールバックとしてのみ使う(web/lib/db.ts rowsToCards) —
 * 店舗写真がある場合はそちらを優先する設計。
 *
 * 規約確認済み(2026-07-24): robots.txtなし、利用規約への明示リンクなし、
 * 著作権/転載禁止の注記もサイト上に見当たらなかった(ポケモン公式サイトのような
 * 明確な禁止文言はない)。画像URL自体もホットリンク制限なし(Referer偽装しても
 * 200、2026-07-25確認済み)。
 *
 * 新弾が出た時だけ変わる静的な参照データなので、毎日の価格スクレイプとは別に
 * 週1回程度の低頻度で十分 — npm run masterdata:onepiece で単体実行できる。
 */
const CARD_LIST_URL = "https://www.onepiece-cardgame.com/cardlist/";
const REQUEST_DELAY_MS = 500;
const USER_AGENT = "Mozilla/5.0 (compatible; toreca-kaitori-compare/0.1)";

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function fetchHtml(url: string): Promise<string> {
  const res = await fetch(url, { headers: { "User-Agent": USER_AGENT } });
  if (!res.ok) throw new Error(`onepiece-cardgame.com: HTTP ${res.status} for ${url}`);
  return res.text();
}

/** Pulls every series's <option value="NNNNNN"> id out of the #series select
 * — "収録"/"ALL" (no value) are skipped, they don't correspond to one set. */
function extractSeriesIds(html: string): string[] {
  const $ = cheerio.load(html);
  const ids: string[] = [];
  $("#series option").each((_, el) => {
    const value = $(el).attr("value");
    if (value) ids.push(value);
  });
  return ids;
}

interface CardMasterData {
  color: string | null;
  imageUrl: string | null;
}

/** Parses one series page's card entries: each is a <dt>...</dt><dd>...</dd>
 * pair, card number is the first <span> in .infoCol, color is .color's text
 * after its <h3> label (see the raw HTML sampled 2026-07-24 for the exact
 * shape — multi-color leader/character cards render as e.g. "緑/青"). The
 * card image is .frontCol img.lazy's data-src (the real URL — src is always
 * a shared "dummy.gif" placeholder swapped in by the site's own lazy-load
 * JS, which we don't execute), a path relative to CARD_LIST_URL. */
function extractCardData(html: string): Map<string, CardMasterData> {
  const $ = cheerio.load(html);
  const result = new Map<string, CardMasterData>();

  $("dl.modalCol dt").each((_, dt) => {
    const $dt = $(dt);
    const cardNumber = $dt.find(".infoCol span").first().text().trim();
    if (!cardNumber) return;

    const $dd = $dt.next("dd");
    const colorText = $dd.find(".color").first().text().replace(/^色/, "").trim();
    const rawImageSrc = $dd.find(".frontCol img.lazy").first().attr("data-src");
    const imageUrl = rawImageSrc ? new URL(rawImageSrc, CARD_LIST_URL).toString() : null;
    if (!colorText && !imageUrl) return;

    result.set(cardNumber, { color: colorText || null, imageUrl });
  });

  return result;
}

async function fetchAllCardData(): Promise<Map<string, CardMasterData>> {
  const indexHtml = await fetchHtml(CARD_LIST_URL);
  const seriesIds = extractSeriesIds(indexHtml);
  console.log(`ONE PIECEカードゲーム公式: ${seriesIds.length}セットを処理します`);

  const merged = new Map<string, CardMasterData>();
  // The index fetch already landed on the latest set's page — reuse it
  // instead of re-fetching that one series.
  for (const [k, v] of extractCardData(indexHtml)) merged.set(k, v);

  for (const seriesId of seriesIds) {
    await sleep(REQUEST_DELAY_MS);
    try {
      const html = await fetchHtml(`${CARD_LIST_URL}?series=${seriesId}`);
      const cardData = extractCardData(html);
      for (const [k, v] of cardData) merged.set(k, v);
      console.log(`  series=${seriesId} -> ${cardData.size}件`);
    } catch (err) {
      console.warn(`  series=${seriesId} failed: ${err instanceof Error ? err.message : err}`);
    }
  }

  return merged;
}

async function main() {
  const cardData = await fetchAllCardData();
  console.log(`合計 ${cardData.size} 件のカード番号→色/画像を取得`);

  const db = openDb();
  const updateColor = db.prepare(
    `UPDATE cards SET color = ? WHERE series = 'ワンピースカード' AND card_number = ? AND (color IS NULL OR color != ?)`
  );
  const updateImage = db.prepare(
    `UPDATE cards SET official_image_url = ? WHERE series = 'ワンピースカード' AND card_number = ? AND (official_image_url IS NULL OR official_image_url != ?)`
  );

  db.exec("BEGIN");
  let colorUpdated = 0;
  let imageUpdated = 0;
  for (const [cardNumber, { color, imageUrl }] of cardData) {
    if (color) colorUpdated += updateColor.run(color, cardNumber, color).changes as number;
    if (imageUrl) imageUpdated += updateImage.run(imageUrl, cardNumber, imageUrl).changes as number;
  }
  db.exec("COMMIT");

  const totalWithNumber = db
    .prepare(`SELECT COUNT(DISTINCT card_number) c FROM cards WHERE series = 'ワンピースカード' AND card_number IS NOT NULL`)
    .get() as { c: number };
  const totalColored = db
    .prepare(`SELECT COUNT(DISTINCT card_number) c FROM cards WHERE series = 'ワンピースカード' AND color IS NOT NULL`)
    .get() as { c: number };
  const totalImaged = db
    .prepare(
      `SELECT COUNT(DISTINCT card_number) c FROM cards WHERE series = 'ワンピースカード' AND (official_image_url IS NOT NULL OR id IN (SELECT card_id FROM price_records WHERE image_url IS NOT NULL))`
    )
    .get() as { c: number };

  console.log(`DB更新: 色${colorUpdated}行 / 画像${imageUpdated}行`);
  console.log(
    `色網羅率: ${totalColored.c} / ${totalWithNumber.c} = ${((totalColored.c / totalWithNumber.c) * 100).toFixed(1)}%`
  );
  console.log(
    `画像網羅率(店舗写真+公式フォールバック込み): ${totalImaged.c} / ${totalWithNumber.c} = ${((totalImaged.c / totalWithNumber.c) * 100).toFixed(1)}%`
  );

  db.close();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
