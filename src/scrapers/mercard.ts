import * as cheerio from "cheerio";
import type { ScrapedPrice, ShopScraper } from "../types.js";

// メルカード秋葉原's real card number is always one of these known set-code
// prefixes + number (e.g. "OP02-099", "ST01-001", "EB04-061"), but the raw
// 型番 cell wraps it in freeform print/edition text with no fixed separator —
// e.g. "チャンピオンシップ版OP02-099", "SPOP05-119『OP11』",
// "シリアル入りOP01-016※青背景【海外版】". Matching the known-prefix shape
// directly (rather than "letters+digits+hyphen+digits" generically) avoids
// mis-splitting cases like "SPOP05-119" where a generic pattern would grab an
// extra leading letter from the print-type prefix. Promo cards use a
// different, single-group shape — "P-112" not "P112-XXXX" — matched
// separately (confirmed ~24% of this shop's previously-unmatched rows).
const CARD_NUMBER_RE = /(?:OP|ST|EB)\d{1,3}-\d{2,4}|P-\d{1,4}/;
// メルカード always notes a card's ワンピースカード in-game color as a bare 《...》
// tag (e.g. "《赤》") alongside the real print-type bracket — but color is a
// fixed attribute of the card itself, never something that varies between two
// listings of the exact same print (confirmed: every OP09-118 ゴール・D・ロジャー
// row here carries "赤" regardless of which parallel/print it is). Folding it
// into the variant tag only blocks matching against every other shop, which
// doesn't bother recording it at all — so it's dropped rather than kept as a
// distinguishing tag, same rationale as the ★/illust. decorative tags in
// src/variant.ts (scoped to this file rather than that shared table since
// bare color words aren't safely droppable in other games — e.g. 遊戯王 has
// genuinely distinct token cards like "羊トークン(青)" vs "(黄)").
const ONE_PIECE_COLOR_TAGS = new Set(["赤", "青", "黄", "緑", "黒", "紫", "多色"]);

/**
 * メルカード秋葉原's price pages (e.g. onepice-kaitori) are a client-side shell
 * whose comment literally says "ここにGASで生成したHTMLを貼り付け" (paste the
 * Google-Apps-Script-generated HTML here) — the whole card grid is already
 * server-rendered into the page, no JS execution needed to read it.
 */
export const mercardOnePieceScraper: ShopScraper = {
  shopId: "mercard",
  displayName: "メルカード秋葉原",

  async scrape(targetUrl: string): Promise<ScrapedPrice[]> {
    const res = await fetch(targetUrl, {
      headers: { "User-Agent": "Mozilla/5.0 (compatible; toreca-kaitori-compare/0.1)" },
    });
    if (!res.ok) throw new Error(`mercard: HTTP ${res.status} for ${targetUrl}`);
    const html = await res.text();
    const $ = cheerio.load(html);

    const results: ScrapedPrice[] = [];

    $("#pageContent .tr").each((_, row) => {
      const $row = $(row);
      const rawName = $row.find(".td2").text().trim();
      const rawNumber = $row.find(".td3").text().replace(/^型/, "").trim();
      const imageUrl = $row.find(".td1 img").first().attr("src") ?? null;
      const priceText = $row.find(".td5 .price").text().trim();
      const price = Number(priceText.replace(/,/g, ""));
      if (!rawName || !Number.isFinite(price)) return;

      const tags: string[] = [];

      // Name: 【...】/《...》/『...』-wrapped tags, plus any plain trailing text
      // (未開封/開封品/ForJapan/※...) that isn't inside brackets. The page's own
      // "rarity"-labeled cell (.td4, no longer read above) actually holds card
      // *type* (CHARACTER/LEADER/EVENT/...), not rarity — confirmed live, every
      // row shows it regardless of true rarity. The real rarity/print code
      // (SEC/SR/L/パラレル/プロモ/...) is always the FIRST 【】-style bracket in
      // the name instead, so it's pulled out here rather than folded into tags;
      // later brackets remain real print/color tags.
      const firstBracketIdx = rawName.search(/[【《『]/);
      const baseName = (firstBracketIdx === -1 ? rawName : rawName.slice(0, firstBracketIdx)).trim();
      if (!baseName) return; // no name before any bracket = not a single card (e.g. a boxed set)
      let nameRest = firstBracketIdx === -1 ? "" : rawName.slice(firstBracketIdx);
      let rarity: string | null = null;
      let sawFirstBracket = false;
      nameRest = nameRest.replace(/([【《『])([^】》』]+)[】》』]/g, (_m, bracket: string, raw: string) => {
        const t = raw.trim();
        if (bracket === "《" && ONE_PIECE_COLOR_TAGS.has(t)) return " ";
        if (!sawFirstBracket) {
          rarity = t;
          sawFirstBracket = true;
        } else {
          tags.push(t);
        }
        return " ";
      });
      const nameLeftover = nameRest.replace(/※/g, " ").trim();
      if (nameLeftover) tags.push(nameLeftover);

      // 型番: pull out the real card number, fold everything else (print-type
      // prefix/suffix, 【海外版】 etc.) into tags too.
      const numberMatch = rawNumber.match(CARD_NUMBER_RE);
      let cardNumber: string | null = null;
      if (numberMatch) {
        cardNumber = numberMatch[0];
        const numberLeftover = (
          rawNumber.slice(0, numberMatch.index) + rawNumber.slice(numberMatch.index! + numberMatch[0].length)
        )
          .replace(/[【《『]([^】》』]+)[】》』]/g, (_m, t: string) => {
            tags.push(t.trim());
            return " ";
          })
          .replace(/※/g, " ")
          .trim();
        if (numberLeftover) tags.push(numberLeftover);
      } else if (rawNumber) {
        tags.push(rawNumber);
      }

      results.push({
        rawName: tags.length ? `${baseName}(${tags.join(")(")})` : baseName,
        rarity: rarity || null,
        cardNumber,
        price,
        sourceUrl: targetUrl,
        imageUrl,
      });
    });

    return results;
  },
};
