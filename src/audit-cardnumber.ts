import { openDb } from "./db.js";

// Every real bug found this session in this shape ("Y"/"F"/"DSEC" on フルコンプ,
// "BW-P"/"XY-P"/"SM-P" on 駿河屋・フルコンプ, "083/067" bare on カードマックス/
// おたちゅう/駿河屋) was the same root cause: a "card_number" that isn't
// actually unique per card — a print-era shorthand, a bare promo-series code,
// or a number that resets per set. The common symptom is one card_number
// value linked to many *unrelated* card names.
//
// Naively counting distinct canonical_name false-positives constantly though:
// a card_number legitimately shared by many real print variants of the *same*
// character (パラレル/コミック版パラレル/プロモ-25周年版/...) also produces many
// distinct canonical_name values, since the variant tag is baked into the
// name string (see src/variant.ts) — that's correct behavior, not a bug. So
// this compares the *base* name (text before the first tag paren) instead —
// many different base names sharing one card_number is the real red flag;
// many tag variations of the *same* base name is expected and fine.
const MIN_DISTINCT_BASE_NAMES = 3;
const MAX_ROWS = 40;

interface RawRow {
  series: string;
  card_number: string;
  canonical_name: string;
  shop_id: string;
}

// Mirrors what src/variant.ts actually strips into the `variant` matching
// column (parens, 【】/『』/《》 tags, bare "※word" markers) — without this,
// the same kind of tag src/variant.ts already correctly splits on (and that
// really does distinguish a real print) reads as a "different card" here too,
// producing false positives for a signal that's supposed to mean "the
// card_number itself doesn't uniquely identify one card."
function baseName(name: string): string {
  let base = name.replace(/[【《『]([^】》』]+)[】》』]/g, " ").replace(/[（(]([^（）()]+)[）)]/g, " ");
  base = base.replace(/※[^\s()（）※]+/g, " ");
  return base.replace(/\s+/g, " ").trim();
}

function main() {
  const db = openDb();

  const rows = db
    .prepare(
      `SELECT c.series, c.card_number, c.canonical_name, pr.shop_id
       FROM cards c
       JOIN price_records pr ON pr.card_id = c.id
       WHERE c.card_number IS NOT NULL AND c.card_number != ''
       GROUP BY c.series, c.card_number, c.canonical_name, pr.shop_id`
    )
    .all() as unknown as RawRow[];

  const groups = new Map<string, { series: string; cardNumber: string; baseNames: Set<string>; shops: Set<string> }>();
  for (const row of rows) {
    const key = row.series + " " + row.card_number;
    let g = groups.get(key);
    if (!g) {
      g = { series: row.series, cardNumber: row.card_number, baseNames: new Set(), shops: new Set() };
      groups.set(key, g);
    }
    g.baseNames.add(baseName(row.canonical_name));
    g.shops.add(row.shop_id);
  }

  const flagged = [...groups.values()]
    .filter((g) => g.baseNames.size >= MIN_DISTINCT_BASE_NAMES)
    .sort((a, b) => b.baseNames.size - a.baseNames.size);

  console.log(
    `=== 型番の一意性が怪しいもの (同一型番に${MIN_DISTINCT_BASE_NAMES}種類以上の別キャラ/カード名, ${flagged.length}件) ===`
  );
  console.log("(刷り違いタグは除いたベース名で比較。それでも複数種類あれば型番が個別カードを特定できていない可能性)\n");

  for (const g of flagged.slice(0, MAX_ROWS)) {
    console.log(`[${g.series}] "${g.cardNumber}"  ${g.baseNames.size}種類・${g.shops.size}店舗`);
    for (const n of [...g.baseNames].slice(0, 8)) console.log(`    - ${n}`);
    if (g.baseNames.size > 8) console.log(`    ...他${g.baseNames.size - 8}件`);
  }

  db.close();
}

main();
