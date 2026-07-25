import * as cheerio from "cheerio";
import { SURUGAYA_POKEMON_SET_CODE } from "../pokemon-sets.js";
import type { ScrapedPrice, ShopScraper } from "../types.js";

// 駿河屋 inconsistently cases the ASCII portions of its own set labels — e.g.
// the same "MEGAドリームEX" set shows up as "...MEGAドリームex" (lowercase) on
// its live listing pages, and "ポケモンカードE「...」" as "...カードe「...」" —
// while SURUGAYA_POKEMON_SET_CODE's keys were transcribed once from a sample
// and don't track every casing drift since. NFKC normalization (below)
// doesn't touch letter case at all, so this silently fell through to the raw
// label the same way the full-width-space/"＆" mismatch used to (confirmed:
// 11 of the table's ~52 set labels affected, 222 card_numbers stuck as
// unmapped raw labels). Case-fold the lookup only — case isn't meaningfully
// distinctive in any of these labels, so this is safe.
const SURUGAYA_POKEMON_SET_CODE_CI = new Map(
  Object.entries(SURUGAYA_POKEMON_SET_CODE).map(([key, code]) => [key.toLowerCase(), code])
);

// card number is optional — some old promo listings have no leading number at
// all, e.g. "[SE]：青眼の白龍" (a 1999 event handout with no set code).
const PRODUCT_NAME_RE = /^([^[]*)\[([^\]]+)\]：(.+)$/;
// Pokémon's number is often just "NNN/NNN" (number/set-total), which repeats
// across different sets and otherwise collides unrelated cards that happen to
// share a number (confirmed on this same shop, e.g. two different promo cards
// both "011/084"). The `.category` cell (format "game/rarity/color/setName")
// carries the set name, used below to disambiguate.
const BARE_NUM_TOTAL_RE = /^\d+\/\d+$/;
// Some promo listings extract a bare *series* code with no per-card number at
// all — e.g. "BW-P[P]：トロピカルビーチ" vs "BW-P[P]：レックウザEX" both give
// cardNumber="BW-P", merging four unrelated ¥3,000〜¥3,960,000 tournament promos
// into one card. Same shape as フルコンプ's "Y"/"F"/"DSEC" placeholder bug — no
// digit means it's not really identifying one card, so it's dropped (falls back
// to name+rarity matching instead).
function isPlausibleCardNumber(code: string): boolean {
  return /\d/.test(code);
}
// 駿河屋 prefixes almost every Pokémon listing's name with "(キラ)" regardless of
// rarity — confirmed against 駿河屋's own data: of 3,858 (card_number, rarity)
// groups that include a "(キラ)"-tagged listing, only 2 also have a plain
// (non-キラ) listing for that same card. So for 99.95% of cards this is
// boilerplate, not a real distinguishing print, and folding it into the
// variant tag only blocks matching every other shop's plain listing for the
// same card. The two real exceptions (055/XY-P プロモ, DPBP#529 ★, which
// genuinely have both a キラ and non-キラ print) are preserved by only
// dropping the tag when 駿河屋's own page has no non-キラ listing to confuse
// it with — same grouping-based approach as おたちゅう's illustrator tags,
// see src/scrapers/otachu.ts.
const KIRA_TAG_RE = /^\(キラ\)/;
const PAGE_DELAY_MS = 1500;
const MAX_PAGES = 600;
const RETRY_DELAYS_MS = [2000, 5000]; // up to 2 retries before giving up on a page

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/** Suruga-ya's pagination intermittently 404s on pages that work fine moments
 * later — a transient server hiccup, not "end of results". Retry a couple of
 * times before treating it as the real end of the category.
 *
 * `fetch()` itself can also reject outright (DNS hiccup/connection reset/
 * timeout) rather than resolving with a non-ok Response — previously that
 * wasn't caught anywhere, so it propagated straight out of scrape()'s whole
 * pagination loop and discarded every page already collected (confirmed: one
 * transient network error on page ~60 of a ~600-page run wiped out all 59
 * successfully-fetched pages). Treated the same as an HTTP error here: retry,
 * then give up gracefully (return null) rather than throwing.
 */
async function fetchPageWithRetry(url: string): Promise<Response | null> {
  let lastRes: Response | null = null;
  for (let attempt = 0; attempt <= RETRY_DELAYS_MS.length; attempt++) {
    try {
      const res = await fetch(url, {
        headers: { "User-Agent": "Mozilla/5.0 (compatible; toreca-kaitori-compare/0.1)" },
      });
      if (res.ok) return res;
      lastRes = res;
      if (attempt < RETRY_DELAYS_MS.length) {
        console.warn(
          `  surugaya: HTTP ${res.status} for ${url} — retry ${attempt + 1}/${RETRY_DELAYS_MS.length}`
        );
      }
    } catch (err) {
      lastRes = null;
      if (attempt < RETRY_DELAYS_MS.length) {
        console.warn(
          `  surugaya: fetch failed for ${url} (${err instanceof Error ? err.message : String(err)}) — retry ${attempt + 1}/${RETRY_DELAYS_MS.length}`
        );
      }
    }
    if (attempt < RETRY_DELAYS_MS.length) await sleep(RETRY_DELAYS_MS[attempt]);
  }
  return lastRes;
}

/** Pulls the set name (last "/"-separated segment) out of the `.category`
 * cell, e.g. "ポケモンカードゲーム/P/ドラゴン/オリジナルスーパーレア..." → the set name.
 * Trailing annotations like "[価格上昇中]" tacked on without a separator are
 * stripped too. */
function extractSetLabel(categoryText: string): string | null {
  const parts = categoryText
    .split("/")
    .map((p) => p.trim())
    .filter(Boolean);
  if (parts.length === 0) return null;
  const last = parts[parts.length - 1].replace(/\[.*$/, "").trim();
  if (!last) return null;
  // 駿河屋 writes this label with full-width "＆" and full-width spaces between
  // words (e.g. "スカーレット＆バイオレット　拡張パック　超電ブレイカー"), which
  // never matched SURUGAYA_POKEMON_SET_CODE's keys (built without spaces, half-
  // width "&") — every row silently fell through to the raw Japanese label
  // instead of "SV8", so this shop could never card_number-match any other
  // shop for the entire Pokémon genre. NFKC folds the "＆", and full-width
  // spaces normalize to regular spaces under NFKC too, so stripping whitespace
  // after normalizing reduces both forms to one identical string.
  const normalized = last.normalize("NFKC").replace(/\s+/g, "");
  // Prefer the shop-independent code (e.g. "SV8") over 駿河屋's own Japanese
  // set label when known — see src/pokemon-sets.ts for why this is required
  // for cross-shop matching, not just cosmetic.
  return SURUGAYA_POKEMON_SET_CODE_CI.get(normalized.toLowerCase()) ?? normalized;
}

interface RawEntry {
  name: string;
  hasKiraTag: boolean;
  rarity: string | null;
  cardNumber: string | null;
  price: number;
  sourceUrl: string;
  imageUrl: string | null;
  pokemonType: string | null;
}

const IMAGE_RESOLVE_CONCURRENCY = 5;

/**
 * suruga-ya's own <img src> is a redirect gateway (database/photo.php?...),
 * not the image itself — it 302s to the real file on cdn.suruga-ya.jp.
 * Netlify's Image CDN doesn't follow that redirect when transforming
 * next/image requests (confirmed live: the gateway URL 403'd even with
 * cdn.suruga-ya.jp itself allowlisted, while the resolved cdn URL served
 * fine), so the redirect is resolved once here at scrape time instead.
 */
// suruga-ya redirects listings with no real photo to its own generic
// placeholder graphic rather than 404ing — surfacing that (confirmed:
// ~8% of listings resolve here) would look worse than this app's own
// fallback icon, so it's treated the same as "no image" (null).
const NO_PHOTO_RE = /no_photo/;

async function resolveImageUrl(url: string): Promise<string | null> {
  try {
    const res = await fetch(url, {
      method: "HEAD",
      redirect: "manual",
      headers: { "User-Agent": "Mozilla/5.0 (compatible; toreca-kaitori-compare/0.1)" },
    });
    if (res.status >= 300 && res.status < 400) {
      const location = res.headers.get("location");
      if (location) {
        if (NO_PHOTO_RE.test(location)) return null;
        return new URL(location, url).toString();
      }
    }
  } catch {
    // Network hiccup resolving the redirect — fall back to the gateway
    // URL below rather than dropping the image entirely.
  }
  return url;
}

/** Resolves every not-yet-seen imageUrl in `entries` in place, a few at a
 * time so a single page's worth of rows doesn't fire dozens of requests
 * at once against suruga-ya. */
async function resolveImageUrls(entries: RawEntry[], cache: Map<string, string | null>): Promise<void> {
  const unique = [...new Set(entries.map((e) => e.imageUrl).filter((u): u is string => !!u && !cache.has(u)))];
  for (let i = 0; i < unique.length; i += IMAGE_RESOLVE_CONCURRENCY) {
    const batch = unique.slice(i, i + IMAGE_RESOLVE_CONCURRENCY);
    const resolved = await Promise.all(batch.map((u) => resolveImageUrl(u)));
    batch.forEach((u, idx) => cache.set(u, resolved[idx]));
  }
  for (const entry of entries) {
    if (entry.imageUrl && cache.has(entry.imageUrl)) entry.imageUrl = cache.get(entry.imageUrl) ?? null;
  }
}

// 駿河屋 lists sealed box/pack products (e.g. "【BOX】ONE PIECE カードゲーム
// ブースターパック 新時代の主役 [OP-05]") in the same listing table as single
// cards. These never match PRODUCT_NAME_RE (no "[rarity]：" shape), so they
// fell through with cardNumber=null and got scraped as if they were single
// cards with an unusually long, box-shaped name — confirmed 434 such rows
// polluting card search/listings (2026-07-25). Genuine single cards with no
// card number (real vintage/event promos) never start with these two
// prefixes, confirmed by sampling every other shop's null-card_number "BOX"
// hits, which are all real singles (e.g. "ピカチュウ(スペシャルBOXミミッキュだよ)"
// — a card *from* a box, not the box itself) — so this is safe to skip
// without the isPlausibleCardNumber-style risk of dropping real cards.
export const SEALED_PRODUCT_NAME_RE = /^【\s*(?:BOX|パック)\s*】/;

function parsePage($: cheerio.CheerioAPI, targetUrl: string): RawEntry[] {
  const results: RawEntry[] = [];

  $("tr.listap").each((_, row) => {
    const $row = $(row);
    const productName = $row.find(".product-name").first().text().trim();
    const dataProductRaw = $row.find("input[data-product]").attr("data-product");
    if (!productName || !dataProductRaw) return;
    if (SEALED_PRODUCT_NAME_RE.test(productName)) return;

    let price: number | null = null;
    try {
      const parsed = JSON.parse(dataProductRaw.replace(/&quot;/g, '"'));
      price = typeof parsed.kakaku === "number" ? parsed.kakaku : Number(parsed.kakaku);
    } catch {
      // handled by the Number.isFinite check below
    }
    // kakaku: -1 means "メールにてお見積" (individual quote by email, no fixed
    // buyback price) — not a real price, so skip it rather than showing ¥-1.
    if (price === null || !Number.isFinite(price) || price < 0) return;

    const match = productName.match(PRODUCT_NAME_RE);
    const rawImageSrc = $row.find("img").first().attr("src");
    // Bump the thumbnail size param (ss = tiny) up to a more usable size.
    const imageUrl = rawImageSrc ? rawImageSrc.replace(/size=ss\b/, "size=m") : null;

    let rawCardNumber = match ? match[1].trim() || null : null;
    if (rawCardNumber && !isPlausibleCardNumber(rawCardNumber)) rawCardNumber = null;
    let cardNumber = rawCardNumber;
    // .category is "game/rarity/type-or-cardtype/setName" (e.g.
    // "ポケモンカードゲーム/MA/炎/超電ブレイカー" — the 3rd segment is the
    // elemental type for ポケモンカード, or a card-type label for other
    // genres). Only meaningful for Pokémon but harmless to extract regardless
    // — pokemon_type is only ever read back for that series (see web/lib/db.ts).
    let pokemonType: string | null = null;
    if (rawCardNumber && BARE_NUM_TOTAL_RE.test(rawCardNumber)) {
      const categoryText = $row.find(".category").first().text();
      const setLabel = extractSetLabel(categoryText);
      if (setLabel) cardNumber = `${setLabel}-${rawCardNumber}`;
      const parts = categoryText.split("/").map((p) => p.trim()).filter(Boolean);
      pokemonType = parts[2] || null;
    }

    const fullName = match ? match[3].trim() : productName;
    const hasKiraTag = KIRA_TAG_RE.test(fullName);

    // Each row's .title link points at a stable per-listing detail page
    // (/kaitori/kaitori_detail/<shinaban>) — a real product URL, unlike
    // `targetUrl` (the shared search-results page this row happened to
    // appear on, which drifts as prices/rank change between scrapes and is
    // shared by every other card on the same page). Falling back to
    // targetUrl only if the link is ever missing, rather than dropping the
    // row, since a slightly-wrong link beats losing the price entirely.
    const detailHref = $row.find(".title a").first().attr("href");
    const sourceUrl = detailHref ? new URL(detailHref, targetUrl).toString() : targetUrl;

    results.push({
      name: hasKiraTag ? fullName.replace(KIRA_TAG_RE, "") : fullName,
      hasKiraTag,
      rarity: match ? match[2].trim() : null,
      cardNumber,
      price,
      sourceUrl,
      imageUrl,
      pokemonType,
    });
  });

  return results;
}

/**
 * Suruga-ya's kaitori search results are plain server-rendered HTML tables
 * (`table.result` > `tr.listap`). Price is also duplicated in a JSON blob on the
 * row's checkbox `data-product` attribute, which is the most reliable source.
 *
 * `targetUrl` is treated as page 1 of a search; this follows the `li.next > a`
 * pagination link until it disappears (or MAX_PAGES is hit), so a single target
 * URL yields the whole category.
 */
export const surugayaScraper: ShopScraper = {
  shopId: "surugaya",
  displayName: "駿河屋",

  async scrape(targetUrl: string): Promise<ScrapedPrice[]> {
    const allResults: RawEntry[] = [];
    let currentUrl: string | null = targetUrl;
    let pageCount = 0;
    // On some categories (seen on ポケモンカードゲーム, ~500 real pages) 駿河屋 keeps
    // serving a `li.next` link well past the real end and just repeats the same
    // page content forever instead of 404ing — so `li.next` disappearing isn't a
    // reliable stop condition on its own. Track each page's signature and stop as
    // soon as it matches the previous one.
    let previousPageSignature: string | null = null;

    while (currentUrl && pageCount < MAX_PAGES) {
      const res = await fetchPageWithRetry(currentUrl);
      if (!res || !res.ok) {
        // A single bad page (transient error, or the item count shifted since
        // pagination started) shouldn't discard everything collected so far —
        // stop here and return what we have rather than throwing.
        console.warn(
          `  surugaya: ${res ? `HTTP ${res.status}` : "fetch failed"} for ${currentUrl} — stopping pagination early, keeping ${allResults.length} 件`
        );
        break;
      }
      const html = await res.text();
      const $ = cheerio.load(html);
      const pageResults = parsePage($, currentUrl);

      const signature = pageResults.map((r) => `${r.name}:${r.price}`).join("|");
      if (signature && signature === previousPageSignature) {
        console.warn(
          `  surugaya: page content repeated at ${currentUrl} — real end of pagination reached, keeping ${allResults.length} 件`
        );
        break;
      }
      previousPageSignature = signature;

      allResults.push(...pageResults);
      pageCount += 1;

      const nextHref = $("li.next > a").first().attr("href");
      currentUrl = nextHref ? new URL(nextHref, currentUrl).toString() : null;

      if (currentUrl) await sleep(PAGE_DELAY_MS);
    }

    await resolveImageUrls(allResults, new Map());

    const groupHasNonKira = new Map<string, boolean>();
    for (const e of allResults) {
      if (!e.hasKiraTag) groupHasNonKira.set(`${e.cardNumber ?? ""} ${e.rarity ?? ""}`, true);
    }

    return allResults.map((e) => {
      const keepKiraTag = e.hasKiraTag && groupHasNonKira.has(`${e.cardNumber ?? ""} ${e.rarity ?? ""}`);
      return {
        rawName: keepKiraTag ? `(キラ)${e.name}` : e.name,
        rarity: e.rarity,
        cardNumber: e.cardNumber,
        price: e.price,
        sourceUrl: e.sourceUrl,
        imageUrl: e.imageUrl,
        pokemonType: e.pokemonType,
      };
    });
  },
};

export interface BoxScrapedPrice {
  productName: string;
  setCode: string | null;
  price: number;
  sourceUrl: string;
}

// 駿河屋's box/pack names end with the set code in brackets, e.g.
// "【BOX】ONE PIECE カードゲーム ブースターパック 神速の拳 [OP-11]" — captures
// "OP-11". Not always present (some listings have no trailing bracket), in
// which case setCode stays null rather than guessing.
const TRAILING_SET_CODE_RE = /\[([A-Za-z0-9-]+)\]\s*$/;

function parseBoxPage($: cheerio.CheerioAPI, targetUrl: string): BoxScrapedPrice[] {
  const results: BoxScrapedPrice[] = [];

  $("tr.listap").each((_, row) => {
    const $row = $(row);
    const productName = $row.find(".product-name").first().text().trim();
    const dataProductRaw = $row.find("input[data-product]").attr("data-product");
    if (!productName || !dataProductRaw || !SEALED_PRODUCT_NAME_RE.test(productName)) return;

    let price: number | null = null;
    try {
      const parsed = JSON.parse(dataProductRaw.replace(/&quot;/g, '"'));
      price = typeof parsed.kakaku === "number" ? parsed.kakaku : Number(parsed.kakaku);
    } catch {
      // handled by the Number.isFinite check below
    }
    if (price === null || !Number.isFinite(price) || price < 0) return;

    const detailHref = $row.find(".title a").first().attr("href");
    const sourceUrl = detailHref ? new URL(detailHref, targetUrl).toString() : targetUrl;
    const setCodeMatch = productName.match(TRAILING_SET_CODE_RE);

    results.push({
      productName,
      setCode: setCodeMatch ? setCodeMatch[1] : null,
      price,
      sourceUrl,
    });
  });

  return results;
}

/**
 * Same pagination shape as surugayaScraper.scrape() but pulls BOX/パック
 * (sealed product) listings instead of single cards — the two are
 * deliberately kept as separate crawls (rather than sharing one pass) since
 * they feed different tables (cards vs box_prices) with different shapes,
 * and card listing pages are a small, cheap re-fetch for this shop.
 */
export async function scrapeSurugayaBoxes(targetUrl: string): Promise<BoxScrapedPrice[]> {
  const allResults: BoxScrapedPrice[] = [];
  let currentUrl: string | null = targetUrl;
  let pageCount = 0;
  let previousPageSignature: string | null = null;

  while (currentUrl && pageCount < MAX_PAGES) {
    const res = await fetchPageWithRetry(currentUrl);
    if (!res || !res.ok) {
      console.warn(
        `  surugaya(box): ${res ? `HTTP ${res.status}` : "fetch failed"} for ${currentUrl} — stopping pagination early, keeping ${allResults.length} 件`
      );
      break;
    }
    const html = await res.text();
    const $ = cheerio.load(html);
    const pageResults = parseBoxPage($, currentUrl);

    const signature = pageResults.map((r) => `${r.productName}:${r.price}`).join("|");
    if (signature && signature === previousPageSignature) {
      console.warn(`  surugaya(box): page content repeated at ${currentUrl} — real end of pagination reached`);
      break;
    }
    previousPageSignature = signature;

    allResults.push(...pageResults);
    pageCount += 1;

    const nextHref = $("li.next > a").first().attr("href");
    currentUrl = nextHref ? new URL(nextHref, currentUrl).toString() : null;

    if (currentUrl) await sleep(PAGE_DELAY_MS);
  }

  return allResults;
}
