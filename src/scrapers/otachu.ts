import * as cheerio from "cheerio";
import type { ScrapedPrice, ShopScraper } from "../types.js";

const PRICE_RE = /¥\s*([\d,]+)/;
// Pokémon's "number" column is just "NNN/NNN" (number/set-total), which repeats
// across different sets — bare, it collides unrelated cards from different sets
// that happen to share a number (confirmed, e.g. 174/086 = both ゼクロムex and
// レシラムex within one page). 遊戯王/ワンピース numbers are already globally
// unique (e.g. "BETB-JP049") and never match this, so they're unaffected.
const BARE_NUM_TOTAL_RE = /^\d+\/\d+$/;
// Divider rows read like "SV11bブラックボルト" (set code immediately followed by
// the Japanese set name, no separator) — the leading ASCII run is the real,
// shop-independent set code (e.g. "SV11b"), which is what フルコンプ/晴れる屋2
// natively use too. Extracting just that (rather than using the whole label,
// Japanese name included) is what lets these shops' card_number strings for
// the same real card actually match each other instead of each embedding a
// different shop-specific label for the same set.
function extractSetCode(label: string): string {
  const match = label.match(/^[A-Za-z0-9-]+/);
  return match ? match[0] : label;
}

type ColumnRole = "name" | "price" | "rarity" | "number" | "image" | "ignore";

// おたちゅう2号店's 旧裏面(vintage) pages don't split card number into its own
// column — instead the name cell has the card name, "No.XXX", a "★マークあり/
// マークなし" authentication-mark note, and a hidden furigana reading all joined
// by <br>, e.g. "フシギバナ<br>No.003<br>★マークあり<br><span class=screen-reader-text>...".
const EMBEDDED_NUMBER_LINE_RE = /^No\.?\s*(\S+)$/i;
const MARK_LINE_RE = /マークあり|マークなし/;

function parseComboNameCell(rawText: string): {
  name: string;
  embeddedNumber: string | null;
  markTag: string | null;
} {
  const lines = rawText
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);
  if (lines.length <= 1) return { name: rawText.trim(), embeddedNumber: null, markTag: null };

  let embeddedNumber: string | null = null;
  let markTag: string | null = null;
  const nameLines: string[] = [];
  for (const line of lines) {
    const numMatch = line.match(EMBEDDED_NUMBER_LINE_RE);
    if (numMatch) {
      embeddedNumber = numMatch[1];
      continue;
    }
    if (MARK_LINE_RE.test(line)) {
      markTag = line;
      continue;
    }
    nameLines.push(line);
  }
  // The furigana reading line (if present) also lands in nameLines since it
  // matches neither pattern above — the real name is always the first line.
  return { name: nameLines[0] ?? rawText.trim(), embeddedNumber, markTag };
}

// おたちゅう often appends a "(illustrator name)"/"(design description)" tag to
// a card's name even when there's only ONE real print at that card_number+
// rarity — other shops don't bother noting the illustrator at all, so keeping
// it as a variant tag would needlessly block matching their plain listing for
// the same card. But this tag is NOT always decorative: some cards (mostly
// promos, e.g. "P-001") genuinely have several different real prints by
// different illustrators sharing one card_number+rarity, each a separately
// priced collectible (confirmed: 6 distinct illustrator tags for P-001 alone,
// at 6 different prices) — collapsing those would wrongly merge different
// collectibles. Whether a given tag is decorative or load-bearing can't be
// known from the tag text alone, but otachu's OWN page tells us: if a
// card_number+rarity pair has only one listing on the page, its tag is
// (at most) crediting that single print and safe to drop; if it has several
// listings, the tags are the only thing telling them apart and must stay.
// Applied after a full first pass over the page (see scrape()) since the
// group size isn't known until every row has been read.
const NAME_TAG_RE = /[（(]([^（）()]+)[）)]/g;
function splitNameTags(name: string): { baseName: string; tags: string[] } {
  const tags: string[] = [];
  const baseName = name
    .replace(NAME_TAG_RE, (_m, t: string) => {
      tags.push(t.trim());
      return "";
    })
    .replace(/\s+/g, " ")
    .trim();
  return { baseName, tags };
}

function classifyHeader(headerText: string): ColumnRole {
  const h = headerText.trim();
  if (h.includes("買取") || h.includes("価格") || h.includes("金額")) return "price";
  if (h.includes("レア")) return "rarity";
  // The "No." column header shows up as "No.", "ＮＯ．", and bare "ＮＯ" (no
  // dot) across different pages — NFKC folds full-width to half-width first
  // (ＮＯ→NO, ．→.) so one comparison catches all three instead of needing a
  // literal entry per variant. Confirmed this was silently dropping the
  // card-number column on some pages (e.g. おたちゅう's 遊戯王 page's "ＮＯ"
  // header), which meant most of its rows fell back to name+rarity matching
  // and could never merge with any shop that does provide a card_number.
  const normalized = h.normalize("NFKC").toUpperCase().replace(/\./g, "");
  if (h.includes("型番") || normalized === "NO" || h.includes("JAN")) return "number";
  if (h.includes("カード名") || h.includes("名称") || h.includes("商品")) return "name";
  if (h.includes("画像")) return "image";
  return "ignore";
}

/**
 * Otachu publishes buy price tables as regular WordPress post content
 * (`tr.row-N > td.column-1..N`), but the column *order* differs per genre
 * page (e.g. Dragon Ball: name/price/date/JAN — Yu-Gi-Oh: number/rarity/name/price).
 * Each table's own header row (`th.column-N`) is read first to map columns
 * to fields instead of assuming a fixed order.
 *
 * Same platform/theme is used by おたちゅう's 2号店 (otachu-akiba.com/2go/...) — a
 * physically separate store with its own inventory/pricing, so it's registered
 * as its own shop (see createOtachuScraper) rather than merged into 1号店's prices.
 */
export function createOtachuScraper(shopId: string, displayName: string): ShopScraper {
  return {
    shopId,
    displayName,

    scrape,
  };
}

async function scrape(targetUrl: string): Promise<ScrapedPrice[]> {
  const res = await fetch(targetUrl, {
    headers: { "User-Agent": "Mozilla/5.0 (compatible; toreca-kaitori-compare/0.1)" },
  });
  if (!res.ok) throw new Error(`otachu: HTTP ${res.status} for ${targetUrl}`);
  const html = await res.text();
  const $ = cheerio.load(html);

  interface RawEntry {
    baseName: string;
    freeTags: string[];
    markTag: string | null;
    rarity: string | null;
    cardNumber: string | null;
    price: number;
    imageUrl: string | null;
  }
  const rawEntries: RawEntry[] = [];
  let columnRoles: ColumnRole[] = [];
  // Some tables (Pokémon) insert a mid-table divider row that's only a set
  // name (e.g. "SV11bブラックボルト") with every other column blank — used
  // below to disambiguate the bare "NNN/NNN" number format.
  let currentSetLabel: string | null = null;

  $('tr[class^="row-"]').each((_, row) => {
    const $row = $(row);
    const headerCells = $row.find("th");

    if (headerCells.length > 0) {
      columnRoles = headerCells.toArray().map((th) => classifyHeader($(th).text()));
      return;
    }
    if (columnRoles.length === 0) return; // no header seen yet for this table

    const cells = $row.find("td");
    const fields: Partial<Record<ColumnRole, string>> = {};
    let imageUrl: string | null = null;
    cells.each((i, td) => {
      const role = columnRoles[i];
      if (role === "image") {
        const src = $(td).find("img").first().attr("src") ?? null;
        // WordPress emits these as plain "http://" even though the same
        // path serves identically over https (confirmed) — Next's image
        // optimizer only allowlists https for this host, so http:// URLs
        // 400 instead of loading.
        imageUrl = src ? src.replace(/^http:\/\//, "https://") : null;
        return;
      }
      if (role && role !== "ignore") fields[role] = $(td).text().trim();
    });

    if (fields.name && !fields.price && !fields.number && !fields.rarity) {
      currentSetLabel = fields.name;
      return;
    }

    if (!fields.name || !fields.price) return;
    const priceMatch = fields.price.match(PRICE_RE) ?? fields.price.match(/([\d,]+)/);
    if (!priceMatch) return;
    const price = Number(priceMatch[1].replace(/,/g, ""));
    if (!Number.isFinite(price)) return;

    const combo = parseComboNameCell(fields.name);
    const { baseName, tags: freeTags } = splitNameTags(combo.name);
    // Otachu renders a bare "-" in the No. column for cards it has no number
    // for (its own "N/A" convention) — taken literally this becomes a fake
    // card_number whose extracted set code is "" (everything before the
    // first "-"), producing a blank, unfilterable phantom entry in the set
    // dropdown. Treat it the same as no number at all.
    const rawNumberRaw = combo.embeddedNumber ?? fields.number;
    const rawNumber = rawNumberRaw && /^-+$/.test(rawNumberRaw) ? null : rawNumberRaw;

    const cardNumber =
      rawNumber && currentSetLabel && (combo.embeddedNumber || BARE_NUM_TOTAL_RE.test(rawNumber))
        ? `${extractSetCode(currentSetLabel)}-${rawNumber}`
        : (rawNumber ?? null);

    rawEntries.push({
      baseName,
      freeTags,
      markTag: combo.markTag,
      rarity: fields.rarity ?? null,
      cardNumber,
      price,
      imageUrl,
    });
  });

  const groupCounts = new Map<string, number>();
  for (const e of rawEntries) {
    const key = `${e.cardNumber ?? ""} ${e.rarity ?? ""}`;
    groupCounts.set(key, (groupCounts.get(key) ?? 0) + 1);
  }

  return rawEntries.map((e) => {
    const key = `${e.cardNumber ?? ""} ${e.rarity ?? ""}`;
    const keepFreeTags = (groupCounts.get(key) ?? 0) > 1;
    const tags = [...(keepFreeTags ? e.freeTags : []), ...(e.markTag ? [e.markTag] : [])];
    return {
      rawName: tags.length ? `${e.baseName}(${tags.join(")(")})` : e.baseName,
      rarity: e.rarity,
      cardNumber: e.cardNumber,
      price: e.price,
      sourceUrl: targetUrl,
      imageUrl: e.imageUrl,
    };
  });
}

export const otachuScraper = createOtachuScraper("otachu", "おたちゅう。秋葉原店");
