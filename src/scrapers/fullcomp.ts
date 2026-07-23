import type { ScrapedPrice, ShopScraper } from "../types.js";

/**
 * Fullcomp embeds the entire price table as a JS array literal (`var tableData = [...]`)
 * directly in the page HTML — no separate API call, no headless browser needed.
 * Row *length and field meaning* differs by genre:
 *  - Yu-Gi-Oh: 7 elements [serial, rarity, cardNumber, name, "", "", price],
 *    name is plain (e.g. "青眼の白龍"), field4/field5 always empty
 *  - One Piece: 7 elements [serial, color(unused), rarityCode, name, field4, field5,
 *    price] — the *name* field embeds the real card number (e.g.
 *    "【LP】モンキー・D・ルフィ(OP05-060)"), and field4/field5 carry the event/promo
 *    source and illustrator ("CHAMPIONSHIP26-27ﾛｺﾞ", "illust.otton") for special
 *    prints — set on ~84% of One Piece rows. These are the *only* thing
 *    distinguishing a ¥200 base print from an artist-signed ¥2,000,000
 *    tournament-award print that otherwise shares the same card_number+rarity,
 *    so they're folded into the name as "(...)" tags for src/variant.ts to pick up.
 *  - Pokémon: 8 elements [serial, category(unused), color(unused), rarityCode,
 *    name, trendFlag("UP!"/""; not a variant signal, ignored), "", price] — the
 *    name embeds "(number/total)setCode" instead of a One-Piece-style single
 *    trailing number, e.g. "【SAR】アイアントex(130/106)sv8", plus an optional
 *    bare "※..." suffix marker for special finishes (e.g. "※ﾏｽﾀｰﾎﾞｰﾙ").
 * The Yu-Gi-Oh/One-Piece name shape is detected per-row (not passed in), so new
 * genres following that same "【CODE】name(NUMBER)" convention work automatically;
 * Pokémon is instead detected by row length, since its field layout actually
 * differs (an extra leading category column).
 */
const EMBEDDED_NUMBER_NAME_RE = /^【([^】]+)】(.+?)\(([A-Za-z0-9][A-Za-z0-9-]*)\)$/;
// Trailing set code is often omitted on older sets (just "...(201/187)" with
// nothing after), so it's optional — falls back to num/total alone as cardNumber.
// The leading 【rarityCode】 bracket is also sometimes missing (older prints) —
// harmless to drop since row[3] already carries the rarity code independently.
const POKEMON_NAME_RE = /^(?:【[^】]+】)?(.+?)\(([^()]+)\)([A-Za-z0-9]*)(.*)$/;

/**
 * field2 is usually a real card number ("BETB-JP049", "PH-52"), but for some
 * vintage/reprint listings fullcomp puts a bare print-era shorthand there
 * instead ("Y" = pre-errata print, "F" = 復刻版, "ST"/"EX" seen too) — not a
 * card number at all. Those have no digit, so a huge number of unrelated
 * cards would otherwise collide on the same (fake) "card_number" + rarity.
 */
function isPlausibleCardNumber(code: string): boolean {
  return /\d/.test(code);
}

export const fullcompScraper: ShopScraper = {
  shopId: "fullcomp",
  displayName: "フルコンプ秋葉原店",

  async scrape(targetUrl: string): Promise<ScrapedPrice[]> {
    const res = await fetch(targetUrl, {
      headers: { "User-Agent": "Mozilla/5.0 (compatible; toreca-kaitori-compare/0.1)" },
    });
    if (!res.ok) throw new Error(`fullcomp: HTTP ${res.status} for ${targetUrl}`);
    const html = await res.text();

    const start = html.indexOf("var tableData = [");
    if (start === -1) throw new Error(`fullcomp: tableData not found on ${targetUrl}`);
    const arrayStart = html.indexOf("[", start);
    const end = html.indexOf("];", arrayStart);
    if (end === -1) throw new Error(`fullcomp: end of tableData not found on ${targetUrl}`);

    const jsonish = html
      .slice(arrayStart, end + 1)
      .replace(/,\s*\]/g, "]"); // trailing comma before closing bracket

    let rows: string[][];
    try {
      rows = JSON.parse(jsonish);
    } catch (err) {
      throw new Error(`fullcomp: failed to parse tableData on ${targetUrl}: ${err}`);
    }

    return rows
      .map((row) => {
        const price = Number(row[row.length - 1]);
        if (!Number.isFinite(price)) return null;

        if (row.length === 8) {
          const rarityCode = row[3]?.trim() || null;
          const pokemonMatch = (row[4] ?? "").trim().match(POKEMON_NAME_RE);
          if (!pokemonMatch) return null;
          const [, cardName, numTotal, setCode, trailingMarker] = pokemonMatch;
          // Some promo listings have no individual number at all — just the
          // promo series itself in parens, e.g. "(XY-P)" or "(SM-P)" — which
          // otherwise merges every unrelated promo card sharing that series
          // (confirmed: "XY-P" alone collided 32 different cards). A real
          // number/total always has a digit; a bare series code doesn't.
          const pokemonCardNumber = setCode ? `${setCode}-${numTotal}` : numTotal;
          return {
            rawName: `${cardName.trim()}${trailingMarker.trim()}`,
            rarity: rarityCode,
            cardNumber: isPlausibleCardNumber(numTotal) ? pokemonCardNumber : null,
            price,
            sourceUrl: targetUrl,
          } satisfies ScrapedPrice;
        }

        const [, field1, field2, name, field4, field5] = row;
        const extraTags = [field4, field5]
          .map((f) => f?.trim())
          .filter((f): f is string => !!f);
        const withExtraTags = (baseName: string) =>
          extraTags.length ? `${baseName}(${extraTags.join(")(")})` : baseName;

        const embedded = name.trim().match(EMBEDDED_NUMBER_NAME_RE);
        if (embedded) {
          return {
            rawName: withExtraTags(embedded[2].trim()),
            rarity: field2?.trim() || null,
            cardNumber: embedded[3],
            price,
            sourceUrl: targetUrl,
          } satisfies ScrapedPrice;
        }

        const cardNumber = field2?.trim() || null;
        return {
          rawName: withExtraTags(name.trim()),
          rarity: field1?.trim() || null,
          cardNumber: cardNumber && isPlausibleCardNumber(cardNumber) ? cardNumber : null,
          price,
          sourceUrl: targetUrl,
        } satisfies ScrapedPrice;
      })
      .filter((r): r is ScrapedPrice => r !== null);
  },
};
