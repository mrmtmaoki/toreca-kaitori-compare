import * as cheerio from "cheerio";
import { YUYUTEI_POKEMON_SET_CODE } from "../pokemon-sets.js";
import type { ScrapedPrice, ShopScraper } from "../types.js";

// Rarity lives only inside the card image's alt text, e.g.
// "BETB-JP001 PSE 疾風の豹戦士パンサーウォリアー" — card_number, rarity code,
// then the name (which may carry a real trailing "(オーバーフレーム)"-style
// variant tag, left untouched here so src/variant.ts's extractVariantTag
// picks it up downstream). The visible card_number <span> next to the image
// omits the rarity, so the alt text is the only source for it.
const ALT_RE = /^(\S+)\s+(\S+)\s+(.+)$/;
const PRICE_RE = /([\d,]+)\s*円/;
// Some 遊戯王プロモ cards have no real printed number and show a bare "-"
// placeholder instead — passed through unfiltered, every such card collided
// into one card_id (confirmed: 34 unrelated promos merged under one row,
// ¥80〜¥19,800). Same failure shape as src/scrapers/fullcomp.ts's "Y"/"F"
// placeholders — require at least one digit or treat as no card number.
function isPlausibleCardNumber(code: string): boolean {
  return /\d/.test(code);
}
// ポケモンカードの型番はセットコードを含まない裸の「NNN/NNN」形式で、複数の
// セットをまたいで同じ数字が再利用される(src/scrapers/cardmax.tsの既存コメント
// 参照)。生のまま使うと無関係な別セットの別カードが衝突する(確認済み:
// 「086/070」が複数セットで別カードとして倍率200倍超の衝突を起こした)。
// 遊々亭独自のURLセットスラッグ(例: "s05a")で前置して衝突を防ぐ。スラッグが
// src/pokemon-sets.tsのYUYUTEI_POKEMON_SET_CODEに載っていれば公式コードへ
// 変換して他店とクロスマッチできるようにし、載っていないスラッグはそのまま
// 使う — 「マッチしない」方が「誤って合体する」よりずっと安全という方針。
const BARE_NUM_TOTAL_RE = /^\d+\/\d+$/;
const SET_SLUG_RE = /\/sell\/[a-z]+\/s\/([a-z0-9]+)$/i;

export const yuyuteiScraper: ShopScraper = {
  shopId: "yuyutei",
  displayName: "遊々亭",

  async scrape(targetUrl: string): Promise<ScrapedPrice[]> {
    const res = await fetch(targetUrl, {
      headers: { "User-Agent": "Mozilla/5.0 (compatible; toreca-kaitori-compare/0.1)" },
    });
    if (!res.ok) throw new Error(`yuyutei: HTTP ${res.status} for ${targetUrl}`);
    const html = await res.text();
    const $ = cheerio.load(html);
    const setSlugMatch = targetUrl.match(SET_SLUG_RE);
    const setSlug = setSlugMatch ? setSlugMatch[1] : null;

    const results: ScrapedPrice[] = [];

    $(".card-product").each((_, el) => {
      const $el = $(el);
      const alt = $el.find("img.card").attr("alt")?.trim();
      if (!alt) return;
      const altMatch = alt.match(ALT_RE);
      if (!altMatch) return;
      const [, cardNumberRaw, rarity, name] = altMatch;

      const priceText = $el.find("strong").first().text();
      const priceMatch = priceText.match(PRICE_RE);
      if (!priceMatch) return;
      const price = Number(priceMatch[1].replace(/,/g, ""));
      if (!Number.isFinite(price) || price <= 0) return;

      const imageUrl = $el.find("img.card").attr("src") ?? null;

      const cardNumberTrimmed = cardNumberRaw.trim();
      let cardNumber: string | null = isPlausibleCardNumber(cardNumberTrimmed) ? cardNumberTrimmed : null;
      if (cardNumber && setSlug && BARE_NUM_TOTAL_RE.test(cardNumber)) {
        const slugUpper = setSlug.toUpperCase();
        const mappedSlug = YUYUTEI_POKEMON_SET_CODE[slugUpper] ?? slugUpper;
        cardNumber = `${mappedSlug}-${cardNumber}`;
      }

      results.push({
        rawName: name.trim(),
        rarity: rarity.trim(),
        cardNumber,
        price,
        sourceUrl: targetUrl,
        imageUrl,
      });
    });

    return results;
  },
};
