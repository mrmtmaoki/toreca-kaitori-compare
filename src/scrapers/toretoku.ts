import * as cheerio from "cheerio";
import type { ScrapedPrice, ShopScraper } from "../types.js";

/**
 * トレトク serves every card for a genre on a single static page (~300+
 * `<li data-name data-price data-modelNumber data-rarity data-pack data-date>`
 * rows, client-side search/filter only hides some via CSS — the full data is
 * already in the raw HTML), so unlike 遊々亭/ホビーステーション this needs no
 * set discovery step. data-modelNumber is the real printed card number for
 * modern cards (e.g. "SOI-JP001") but falls back to トレトク's own internal
 * pack-numbering for vintage cards predating official set codes (e.g.
 * "106-036") — those simply won't cross-shop-match, which is expected and
 * harmless (see src/data quality notes on "missed match is safer than wrong
 * match").
 *
 * ポケモンカードのみ: data-modelNumber は「SETCODE NNN/NNN」をスペース区切りで
 * 書く(例: "S12A 025/172")。normalizeCardNumber(src/normalize.ts)は全ての
 * 空白を除去するだけでハイフンは挿入しないため、そのまま渡すと"S12A025/172"
 * になり、他店の"S12A-025/172"形式と食い違って永久にクロスマッチしない
 * (SETCODE自体は他店とのcross-reference突合で290件超確認済み、大半が正しい —
 * 食い違っていたのはスペース→ハイフンの変換漏れだけだった)。ここで先に
 * ハイフンへ変換しておく。末尾に付くレアリティの重複(例: "VS水炎 049/141 C")
 * はdata-rarityと同一の場合のみ切り落とす。
 */
const POKEMON_LABEL_NUM_RE = /^(.+?)\s+(\d+\/\d+)(?:\s+(\S+))?$/;

function normalizePokemonModelNumber(modelNumber: string, rarity: string | null): string {
  const m = modelNumber.match(POKEMON_LABEL_NUM_RE);
  if (!m) return modelNumber;
  const [, label, bareNumber, trailingRarity] = m;
  if (trailingRarity && trailingRarity !== rarity) return modelNumber;
  return `${label.trim()}-${bareNumber}`;
}
export const toretokuScraper: ShopScraper = {
  shopId: "toretoku",
  displayName: "トレトク",

  async scrape(targetUrl: string): Promise<ScrapedPrice[]> {
    const res = await fetch(targetUrl, {
      headers: { "User-Agent": "Mozilla/5.0 (compatible; toreca-kaitori-compare/0.1)" },
    });
    if (!res.ok) throw new Error(`toretoku: HTTP ${res.status} for ${targetUrl}`);
    const html = await res.text();
    const $ = cheerio.load(html);

    const results: ScrapedPrice[] = [];

    $("li[data-price]").each((_, li) => {
      const $li = $(li);
      const name = $li.attr("data-name")?.trim();
      const priceRaw = $li.attr("data-price");
      if (!name || !priceRaw) return;
      const price = Number(priceRaw);
      if (!Number.isFinite(price) || price <= 0) return;

      const rawModelNumber = $li.attr("data-modelnumber")?.trim() || null;
      const rarity = $li.attr("data-rarity")?.trim() || null;
      const imageUrl = $li.find("img").first().attr("src") ?? null;

      // data-name repeats " <cardNumber> <rarity>" as a plain (non-paren)
      // trailing suffix (e.g. "モンキー・D・ルフィ (パラレル) OP01-003 L") —
      // strip it for display; any real variant tag earlier in the string
      // (like "(パラレル)") is left untouched for extractVariantTag downstream.
      const suffix = rawModelNumber && rarity ? ` ${rawModelNumber} ${rarity}` : null;
      const cleanName = suffix && name.endsWith(suffix) ? name.slice(0, -suffix.length).trim() : name;

      const isPokemon = targetUrl.includes("/buypricelist/pokemon");
      const cardNumber = rawModelNumber
        ? isPokemon
          ? normalizePokemonModelNumber(rawModelNumber, rarity)
          : rawModelNumber
        : null;

      results.push({
        rawName: cleanName,
        rarity,
        cardNumber,
        price,
        sourceUrl: targetUrl,
        imageUrl,
      });
    });

    return results;
  },
};
