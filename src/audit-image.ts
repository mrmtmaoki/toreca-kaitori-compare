import { openDb } from "./db.js";

// Two price_records that point at the literal same product image are almost
// certainly the same physical card — a signal independent of name/rarity/
// variant text entirely, so it catches splits the text-based audits
// (audit-rarity.ts, audit-cardnumber.ts) can miss, e.g. a genuine OCR-ish
// card_number typo or a rarity string that reads as totally unrelated text.
// Only 駿河屋/カードマックス currently capture image_url, so this only covers
// those two shops for now — still worth running as-is.
const MAX_ROWS = 40;

interface Row {
  image_url: string;
  series: string;
  card_id: number;
  canonical_name: string;
  rarity: string | null;
  card_number: string | null;
  variant: string | null;
}

function main() {
  const db = openDb();

  const rows = db
    .prepare(
      `SELECT pr.image_url, c.series, c.id AS card_id, c.canonical_name, c.rarity, c.card_number, c.variant
       FROM price_records pr
       JOIN cards c ON c.id = pr.card_id
       WHERE pr.image_url IS NOT NULL
       GROUP BY pr.image_url, c.id`
    )
    .all() as unknown as Row[];

  const byImage = new Map<string, Row[]>();
  for (const row of rows) {
    const list = byImage.get(row.image_url) ?? [];
    list.push(row);
    byImage.set(row.image_url, list);
  }

  const groups = [...byImage.entries()].filter(([, list]) => new Set(list.map((r) => r.card_id)).size > 1);

  console.log(`=== 同一画像URLで別カード扱いになっているもの (${groups.length}件、上位${MAX_ROWS}件) ===`);
  console.log("(同じ画像 = ほぼ確実に同じ物理カード。card_number/rarity/variantのどれかがズレて分裂している)\n");

  for (const [imageUrl, list] of groups.slice(0, MAX_ROWS)) {
    console.log(imageUrl);
    const seen = new Set<number>();
    for (const r of list) {
      if (seen.has(r.card_id)) continue;
      seen.add(r.card_id);
      console.log(
        `    [${r.series}] ${r.canonical_name}  (${r.card_number ?? "-"} / ${r.rarity ?? "-"} / ${r.variant ?? "-"})  card_id=${r.card_id}`
      );
    }
  }

  db.close();
}

main();
