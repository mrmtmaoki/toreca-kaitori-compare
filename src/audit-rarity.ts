import { openDb } from "./db.js";

// Same card_number, different rarity *or variant* text — some of these are
// genuinely different real prints (a card legitimately released as both レア
// and シークレットレア, or a real パラレル vs 通常 print — these usually price
// far apart), but many are the same real card split apart because a shop's
// abbreviation isn't yet mapped in src/rarity.ts, or src/variant.ts extracted
// slightly different tag text for the same real print across shops (which
// usually price close together, since it's the same real print). Price
// closeness is used as the signal to rank candidates — it can't prove either
// way on its own, but a human skimming the list should start at the top.
const MIN_CARD_NUMBER_LEN = 3; // skip near-empty/junk numbers
const MAX_ROWS = 40;

interface PriceRow {
  series: string;
  card_number: string;
  key_value: string | null;
  minp: number;
  maxp: number;
}

interface Candidate {
  series: string;
  cardNumber: string;
  rows: PriceRow[];
  priceRatio: number;
}

function findMismatchCandidates(rows: PriceRow[]): Candidate[] {
  const groups = new Map<string, PriceRow[]>();
  for (const row of rows) {
    const groupKey = row.series + " " + row.card_number;
    const list = groups.get(groupKey) ?? [];
    list.push(row);
    groups.set(groupKey, list);
  }

  const candidates: Candidate[] = [];
  for (const groupRows of groups.values()) {
    const distinctValues = new Set(groupRows.map((r) => r.key_value ?? ""));
    if (distinctValues.size < 2) continue;
    const overallMin = Math.min(...groupRows.map((r) => r.minp));
    const overallMax = Math.max(...groupRows.map((r) => r.maxp));
    const priceRatio = overallMax / Math.max(overallMin, 1);
    candidates.push({
      series: groupRows[0].series,
      cardNumber: groupRows[0].card_number,
      rows: groupRows,
      priceRatio,
    });
  }

  // Closest price range first — most likely to be the same real card split
  // by a text mismatch rather than a genuinely different, pricier print.
  candidates.sort((a, b) => a.priceRatio - b.priceRatio);
  return candidates;
}

function printCandidates(
  title: string,
  note: string,
  candidates: Candidate[],
  labelFor: (v: string | null) => string
) {
  console.log("\n=== " + title + " (全" + candidates.length + "件中、価格が近い順に上位" + MAX_ROWS + "件) ===");
  console.log(note);

  for (const c of candidates.slice(0, MAX_ROWS)) {
    console.log("\n[" + c.series + "] " + c.cardNumber + "  倍率 " + c.priceRatio.toFixed(1) + "x");
    for (const r of c.rows) {
      console.log(
        "    " + labelFor(r.key_value) + ": ¥" + r.minp.toLocaleString() + "〜¥" + r.maxp.toLocaleString()
      );
    }
  }
}

function main() {
  const db = openDb();

  const rarityRows = db
    .prepare(
      `SELECT c.series, c.card_number, c.rarity AS key_value,
              MIN(pr.price) AS minp, MAX(pr.price) AS maxp
       FROM cards c
       JOIN price_records pr ON pr.card_id = c.id
       WHERE c.card_number IS NOT NULL
         AND length(c.card_number) >= ?
         AND (c.variant IS NULL OR c.variant = '')
       GROUP BY c.series, c.card_number, c.rarity`
    )
    .all(MIN_CARD_NUMBER_LEN) as unknown as PriceRow[];

  printCandidates(
    "同一型番・レアリティ表記違い候補",
    "(価格帯が近い = 表記ゆれで分裂しているだけの可能性が高い。価格差が大きいものは本当に別レアリティの可能性が高い)",
    findMismatchCandidates(rarityRows),
    (v) => v ?? "(なし)"
  );

  const variantRows = db
    .prepare(
      `SELECT c.series, (c.card_number || '/' || COALESCE(c.rarity, '')) AS card_number,
              c.variant AS key_value,
              MIN(pr.price) AS minp, MAX(pr.price) AS maxp
       FROM cards c
       JOIN price_records pr ON pr.card_id = c.id
       WHERE c.card_number IS NOT NULL
         AND length(c.card_number) >= ?
         AND c.variant IS NOT NULL AND c.variant != ''
       GROUP BY c.series, c.card_number, c.rarity, c.variant`
    )
    .all(MIN_CARD_NUMBER_LEN) as unknown as PriceRow[];

  printCandidates(
    "同一型番+レアリティ・バリアント表記違い候補",
    "(価格帯が近い = 同じ刷り違いなのにタグの文言が店舗ごとに違うだけの可能性が高い)",
    findMismatchCandidates(variantRows),
    (v) => v || "(バリアントなし)"
  );

  db.close();
}

main();
