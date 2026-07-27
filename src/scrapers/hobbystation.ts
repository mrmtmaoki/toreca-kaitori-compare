import * as cheerio from "cheerio";
import { HOBBYSTATION_POKEMON_SET_CODE, HOBBYSTATION_POKEMON_SET_TOTAL } from "../pokemon-sets.js";
import { canonicalizeRarity } from "../rarity.js";
import type { ScrapedPrice, ShopScraper } from "../types.js";

// Internal SKU shown above each product, e.g. "YG-BETB-JP036PSE" or
// "PK-M5-118MUR" — genre prefix + card_number with the rarity code glued
// directly onto the end, no separator. Card numbers always end in digits;
// rarity codes are pure uppercase letters, so the boundary is "last digit,
// then a trailing run of uppercase letters". One Piece's code instead ends
// in a hyphenated internal sequence number ("OP-OP16-065-02", not a rarity —
// confirmed by the absence of a rarity dropdown-sort match and no
// letter-suffix pattern), so it needs its own strip rule and yields no
// rarity at all.
const YG_PK_CODE_RE = /^[A-Z]{2}-(.+?[0-9])([A-Z]+)$/;
const OP_CODE_RE = /^OP-(.+)-\d{1,2}$/;
const PRICE_RE = /([\d,]+)\s*円/;
const GENRE_PATH_RE = /hobbystation-single\.jp\/([a-z]{2})\//i;

// The ShopScraper interface only takes a target URL, not a series — unlike
// cardmax.ts's PRODUCT_NAME_RE (which captures series from the name text
// itself), hobbystation's genre lives only in the URL path
// (/yg|pk|op/kaitori/product/list), so it's read from there instead.
function seriesFromUrl(targetUrl: string): string {
  const match = targetUrl.match(GENRE_PATH_RE);
  switch (match?.[1]) {
    case "yg":
      return "遊戯王";
    case "pk":
      return "ポケモンカード";
    case "op":
      return "ワンピースカード";
    default:
      return "";
  }
}

function parseCode(rawCode: string, series: string): { cardNumber: string | null; rarity: string | null } {
  const code = rawCode.trim();
  if (series === "ワンピースカード") {
    const m = code.match(OP_CODE_RE);
    return { cardNumber: m ? m[1] : code.replace(/^OP-/, ""), rarity: null };
  }
  const m = code.match(YG_PK_CODE_RE);
  if (!m) return { cardNumber: code.replace(/^[A-Z]{2}-/, ""), rarity: null };
  let cardNumber = m[1];
  // ポケモンのみ: 型番先頭のセットスラッグが実際の公式コードと食い違う場合が
  // ある(cross-reference済み、src/pokemon-sets.tsのHOBBYSTATION_POKEMON_SET_CODE
  // 参照)。一致している大半のスラッグはこの表に載っておらず、そのまま使う。
  if (series === "ポケモンカード") {
    const slugMatch = cardNumber.match(/^([A-Z0-9]+)-(\d+)$/);
    if (slugMatch) {
      const [, slug, num] = slugMatch;
      const mappedSlug = HOBBYSTATION_POKEMON_SET_CODE[slug] ?? slug;
      const total = HOBBYSTATION_POKEMON_SET_TOTAL[slug];
      cardNumber = total ? `${mappedSlug}-${num}/${total}` : `${mappedSlug}-${num}`;
    }
  }
  return { cardNumber, rarity: m[2] };
}

/**
 * The displayed name often repeats the rarity as a trailing "(...)" tag on
 * top of the glued SKU (e.g. "真紅眼の超越黒竜(オーバーフレーム仕様)
 * (プリズマティックシークレットレア)", "メガダークライex(MUR)") — if left in,
 * src/variant.ts's extractVariantTag would fold that redundant rarity text
 * into the matching key's variant field, producing a (rarity, variant) pair
 * no other shop produces for the same card. Stripped here only when the
 * trailing paren's own text resolves (raw or canonicalized) to the same
 * rarity already parsed from the SKU — a real trailing variant tag (like
 * "(オーバーフレーム仕様)") never matches the rarity and is left alone.
 */
function stripRedundantRarityTag(name: string, rarity: string | null, series: string): string {
  if (!rarity) return name;
  const match = name.match(/^(.*)\(([^()]+)\)$/);
  if (!match) return name;
  const [, base, tag] = match;
  const normalizedTag = tag.normalize("NFKC").trim();
  const canonicalRarity = canonicalizeRarity(rarity, series);
  if (normalizedTag === rarity.trim() || normalizedTag === canonicalRarity) {
    return base.trim();
  }
  return name;
}

export const hobbystationScraper: ShopScraper = {
  shopId: "hobbystation",
  displayName: "ホビーステーション",

  async scrape(targetUrl: string): Promise<ScrapedPrice[]> {
    const res = await fetch(targetUrl, {
      headers: { "User-Agent": "Mozilla/5.0 (compatible; toreca-kaitori-compare/0.1)" },
    });
    if (!res.ok) throw new Error(`hobbystation: HTTP ${res.status} for ${targetUrl}`);
    const html = await res.text();
    const $ = cheerio.load(html);
    const series = seriesFromUrl(targetUrl);

    const results: ScrapedPrice[] = [];

    $(".searchRsultList > li").each((_, li) => {
      const $li = $(li);
      const rawCode = $li.children("div").first().text().trim();
      if (!rawCode) return;

      const rawName = $li.find(".list_product_Name_pc").text().trim();
      if (!rawName) return;

      const priceText = $li.find(".packageDetail").first().text();
      const priceMatch = priceText.match(PRICE_RE);
      if (!priceMatch) return;
      const price = Number(priceMatch[1].replace(/,/g, ""));
      if (!Number.isFinite(price) || price <= 0) return;

      const { cardNumber, rarity } = parseCode(rawCode, series);
      const cleanName = stripRedundantRarityTag(rawName, rarity, series);
      const imageUrl = $li.find("figure img").attr("src") ?? null;
      const absoluteImageUrl = imageUrl
        ? new URL(imageUrl, "https://www.hobbystation-single.jp").toString()
        : null;

      results.push({
        rawName: cleanName,
        rarity,
        cardNumber,
        price,
        sourceUrl: targetUrl,
        imageUrl: absoluteImageUrl,
      });
    });

    return results;
  },
};
