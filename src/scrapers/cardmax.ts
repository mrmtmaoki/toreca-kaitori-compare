import * as cheerio from "cheerio";
import { CARDMAX_POKEMON_SET_CODE } from "../pokemon-sets.js";
import type { ScrapedPrice, ShopScraper } from "../types.js";

// Yu-Gi-Oh: "【遊戯王】魔救の輝跡(PSR)(BETB-JP049)◇シークレットレア"
// One Piece: "【ワンピース】(OP-16) (パラレル)ポートガス・D・エース(L)(OP16-001)◇"
//   — has an extra redundant "(set-code)" parenthetical between 】 and the name
//   that duplicates the card_number's set prefix, stripped separately below.
//   A second "(パラレル)"/"(漫画背景)" tag may follow it — that one is a real
//   print variant (see also src/variant.ts) and must be preserved: cardmax's own
//   rarity code often stays identical between the base and parallel print (e.g.
//   both "(パラレル)サカズキ" and "(漫画背景)サカズキ" are SR/OP16-065), so this
//   name tag is the only thing that tells them apart.
const PRODUCT_NAME_RE = /^【([^】]+)】(.+?)\(([^()]+)\)\(([^()]+)\)◇(.*)$/;
const LEADING_SET_CODE_JUNK_RE = /^\([A-Za-z]{1,6}-?\d{1,4}\)\s*/;
const PRICE_RE = /([\d,]+)円/;
// Pokémon's "card number" here is just "NNN/NNN" (number/set-total) with no set
// code baked in — unlike 遊戯王/ワンピース's cardNumber, which is always globally
// unique on its own (e.g. "BETB-JP049"). Since that number/total pattern repeats
// across many different Pokémon sets, using it bare would merge unrelated cards
// from different sets that happen to share a number (confirmed: OP16-065-style
// collisions, e.g. 083/067 existing identically in several sets). Each cardmax
// scrape call is already scoped to one set's page, so the URL's set slug
// (e.g. "pk0031") is used to disambiguate.
const BARE_NUM_TOTAL_RE = /^\d+\/\d+$/;
const SET_SLUG_RE = /\/shopbrand\/([a-z0-9]+)\/?(?:$|\?)/i;

/**
 * Cardmax serves EUC-JP encoded HTML with the price list rendered server-side
 * inside `ul > li` items — no JS/AJAX involved, just an unusual charset.
 *
 * The page also carries a site-wide "ranking" widget (`.M_rankingBox`) showing
 * trending items from *other* genres, which happens to use the same
 * `<li><a><img></a><a>name</a>...` markup and matches PRODUCT_NAME_RE just as
 * well as real listings — scraping `li` unscoped silently mixes in unrelated
 * cards. The actual product grid lives inside `.cp_tabpanel`, so the selector
 * is scoped there.
 */
export const cardmaxScraper: ShopScraper = {
  shopId: "cardmax",
  displayName: "カードマックス秋葉原店",

  async scrape(targetUrl: string): Promise<ScrapedPrice[]> {
    const res = await fetch(targetUrl, {
      headers: { "User-Agent": "Mozilla/5.0 (compatible; toreca-kaitori-compare/0.1)" },
    });
    if (!res.ok) throw new Error(`cardmax: HTTP ${res.status} for ${targetUrl}`);
    const buffer = await res.arrayBuffer();
    const html = new TextDecoder("euc-jp").decode(buffer);
    const $ = cheerio.load(html);

    const results: ScrapedPrice[] = [];
    const setSlugMatch = targetUrl.match(SET_SLUG_RE);
    const setSlug = setSlugMatch ? setSlugMatch[1] : null;

    $(".cp_tabpanel li").each((_, li) => {
      const $li = $(li);
      const nameText = $li.find("a").eq(1).text().trim() || $li.find("a").first().text().trim();
      const match = nameText.match(PRODUCT_NAME_RE);
      if (!match) return;

      const priceText = $li.text();
      const priceMatch = priceText.match(PRICE_RE);
      if (!priceMatch) return;
      const price = Number(priceMatch[1].replace(/,/g, ""));
      if (!Number.isFinite(price)) return;

      const [, series, name, rarityAbbr, cardNumberRaw, rarityName] = match;
      const imageUrl = $li.find("img").first().attr("src") ?? null;
      const cleanName = name.trim().replace(LEADING_SET_CODE_JUNK_RE, "").trim();
      const cardNumberTrimmed = cardNumberRaw.trim();
      // Prefer the shop-independent code (e.g. "SV8") over cardmax's own URL
      // slug when known — see src/pokemon-sets.ts for why the raw slug alone
      // can't cross-match with other shops.
      const setPrefix = setSlug ? (CARDMAX_POKEMON_SET_CODE[setSlug] ?? setSlug) : null;
      const cardNumber =
        setPrefix && BARE_NUM_TOTAL_RE.test(cardNumberTrimmed)
          ? `${setPrefix}-${cardNumberTrimmed}`
          : cardNumberTrimmed;

      results.push({
        rawName: cleanName,
        rarity: (rarityName?.trim() || rarityAbbr.trim()) || null,
        cardNumber,
        price,
        sourceUrl: targetUrl,
        imageUrl,
      });
      void series;
    });

    return results;
  },
};
