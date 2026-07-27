/**
 * Posts one of 4 rotating trend summaries to Threads, chosen by which of the
 * day's 4 JST time slots (10:00/14:00/18:00/22:00, see
 * .github/workflows/threads-post.yml) triggered this run. Since the price
 * data itself only refreshes once/day (the 05:05 JST scrape), these 4 posts
 * share the same underlying snapshot but present different angles of it —
 * this is about spreading discovery touchpoints across the day for a
 * brand-new account, not about posting fresher data each time.
 *
 * Patterns:
 *   1. 急騰トレカ (risers)   — biggest gainer per genre vs ~30 days ago
 *   2. 急落トレカ (fallers)  — biggest faller per genre vs ~30 days ago
 *   3. 価格差ランキング       — biggest cross-shop price spread per genre,
 *      safety-filtered (>=3 shops, <=10x ratio) since anything wider is far
 *      more likely a card-matching bug than a real market gap (see
 *      src/../memory data-quality notes — every >10x spread found during
 *      this project's own audits turned out to be a mismatch, not a real
 *      price difference).
 *   4. 現在の最高額トレカ     — highest current buyback price per genre
 *
 * Risers/fallers logic mirrors web/lib/topMovers.ts's getTopMoverPerGenre in
 * plain SQL (duplicated, not imported, since this runs standalone via
 * GitHub Actions, not inside the Next.js app — see that file's comments for
 * why the cutoff is JST-clamped and why the earliest-day fallback exists).
 *
 * Requires THREADS_ACCESS_TOKEN in the environment (a long-lived Threads
 * API token; GitHub Actions injects it from the repo's THREADS_ACCESS_TOKEN
 * secret). Long-lived tokens expire after 60 days and need manual renewal.
 */
import { openDb } from "./db.js";

const SITE_URL = "https://kaitori-radar.netlify.app";
const JST_OFFSET_SQL = "+9 hours";
const TARGET_WINDOW_DAYS = 30;
const HASHTAGS = "#トレカ #遊戯王 #ワンピースカード #ポケモンカード #トレカ買取";

const SERIES = [
  { name: "遊戯王", label: "遊戯王" },
  { name: "ワンピースカード", label: "ワンピース" },
  { name: "ポケモンカード", label: "ポケモン" },
];

type Pattern = "risers" | "fallers" | "gap" | "top";

function todayJstLabel(): string {
  const now = new Date();
  const jst = new Date(now.getTime() + 9 * 60 * 60 * 1000);
  return `${jst.getUTCMonth() + 1}/${jst.getUTCDate()}`;
}

/** Picks the pattern by nearest of the 4 scheduled JST hours (10/14/18/22)
 * to the current run time, so the workflow's 4 cron triggers don't need to
 * pass any input — the script infers "which slot is this" from wall-clock
 * time. `--pattern=risers|fallers|gap|top` overrides this for manual/
 * one-off runs (e.g. `npm run post:threads-trend -- --pattern=risers`). */
function pickPattern(): Pattern {
  const override = process.argv.find((a) => a.startsWith("--pattern="))?.slice("--pattern=".length);
  if (override === "risers" || override === "fallers" || override === "gap" || override === "top") {
    return override;
  }

  const now = new Date();
  const jstHour = new Date(now.getTime() + 9 * 60 * 60 * 1000).getUTCHours();
  const slots: { hour: number; pattern: Pattern }[] = [
    { hour: 10, pattern: "risers" },
    { hour: 14, pattern: "fallers" },
    { hour: 18, pattern: "gap" },
    { hour: 22, pattern: "top" },
  ];
  let best = slots[0];
  let bestDist = 24;
  for (const s of slots) {
    const dist = Math.min(Math.abs(jstHour - s.hour), 24 - Math.abs(jstHour - s.hour));
    if (dist < bestDist) {
      best = s;
      bestDist = dist;
    }
  }
  return best.pattern;
}

function getComparisonCutoff(db: ReturnType<typeof openDb>): string | null {
  const { earliest, distinctDates } = db
    .prepare(
      `SELECT MIN(scraped_at) AS earliest, COUNT(DISTINCT date(scraped_at, '${JST_OFFSET_SQL}')) AS distinctDates
       FROM price_records`
    )
    .get() as { earliest: string | null; distinctDates: number };

  if (!earliest || distinctDates < 2) return null;

  const targetCutoff = new Date();
  targetCutoff.setDate(targetCutoff.getDate() - TARGET_WINDOW_DAYS);
  const targetCutoffIso = targetCutoff.toISOString();
  if (targetCutoffIso > earliest) return targetCutoffIso;

  const earliestJstDay = (
    db.prepare(`SELECT date(?, '${JST_OFFSET_SQL}') AS d`).get(earliest) as { d: string }
  ).d;
  return `${earliestJstDay}T14:59:59.999Z`;
}

interface MoveLine {
  label: string;
  name: string;
  previous: number;
  current: number;
}

function getTopMoves(db: ReturnType<typeof openDb>, cutoff: string, direction: "up" | "down"): MoveLine[] {
  const having = direction === "up" ? "current_max > previous_max" : "current_max < previous_max";
  const orderBy = direction === "up" ? "(current_max - previous_max) DESC" : "(previous_max - current_max) DESC";
  const lines: MoveLine[] = [];
  for (const s of SERIES) {
    const row = db
      .prepare(
        `WITH current_latest AS (
           SELECT pr.card_id, pr.shop_id, pr.price,
             ROW_NUMBER() OVER (PARTITION BY pr.shop_id, pr.card_id ORDER BY pr.scraped_at DESC) AS rn
           FROM price_records pr
         ),
         previous_latest AS (
           SELECT pr.card_id, pr.shop_id, pr.price,
             ROW_NUMBER() OVER (PARTITION BY pr.shop_id, pr.card_id ORDER BY pr.scraped_at DESC) AS rn
           FROM price_records pr
           WHERE pr.scraped_at <= ?
         )
         SELECT c.canonical_name AS name, MAX(cl.price) AS current_max, MAX(pl.price) AS previous_max
         FROM cards c
         JOIN current_latest cl ON cl.card_id = c.id AND cl.rn = 1
         JOIN previous_latest pl ON pl.card_id = c.id AND pl.rn = 1
         WHERE c.series = ?
         GROUP BY c.id
         HAVING ${having}
         ORDER BY ${orderBy}
         LIMIT 1`
      )
      .get(cutoff, s.name) as { name: string; current_max: number; previous_max: number } | undefined;

    if (!row) continue;
    lines.push({ label: s.label, name: row.name, previous: row.previous_max, current: row.current_max });
  }
  return lines;
}

interface GapLine {
  label: string;
  name: string;
  min: number;
  max: number;
  shopCount: number;
}

/** Biggest cross-shop price spread per genre, safety-filtered: requires
 * >=3 shops (a 2-shop spread is much more likely a card-matching bug than a
 * real disagreement) and <=10x max/min ratio (every wider spread found
 * during this project's own audits turned out to be a mismatch, not a real
 * price difference — see src/../memory data-quality notes). */
function getPriceGaps(db: ReturnType<typeof openDb>): GapLine[] {
  const lines: GapLine[] = [];
  for (const s of SERIES) {
    const row = db
      .prepare(
        `WITH latest AS (
           SELECT pr.card_id, pr.shop_id, pr.price,
             ROW_NUMBER() OVER (PARTITION BY pr.shop_id, pr.card_id ORDER BY pr.scraped_at DESC) AS rn
           FROM price_records pr
         )
         SELECT c.canonical_name AS name, MIN(l.price) AS min_price, MAX(l.price) AS max_price,
                COUNT(DISTINCT l.shop_id) AS shop_count
         FROM cards c
         JOIN latest l ON l.card_id = c.id AND l.rn = 1
         WHERE c.series = ? AND c.card_number IS NOT NULL
         GROUP BY c.id
         HAVING shop_count >= 3 AND max_price <= min_price * 10
         ORDER BY (max_price - min_price) DESC
         LIMIT 1`
      )
      .get(s.name) as { name: string; min_price: number; max_price: number; shop_count: number } | undefined;

    if (!row) continue;
    lines.push({ label: s.label, name: row.name, min: row.min_price, max: row.max_price, shopCount: row.shop_count });
  }
  return lines;
}

interface TopLine {
  label: string;
  name: string;
  price: number;
}

/** Highest current buyback price per genre. Requires card_number IS NOT
 * NULL — confirmed live 2026-07-27 that without this, a ¥12,000,000
 * "ポケモンカードゲーム クリーチャーズボックス...関係者配布品" (a real,
 * verified 駿河屋 listing, but an unopened BOX/staff-distribution item, not
 * a single card) topped the ポケモン ranking. Single cards in this project
 * always carry a card_number by design (see src/db.ts findOrCreateCard);
 * rows without one are exactly the box/miscellaneous items that shouldn't
 * be presented as "the highest-value card". */
function getTopValue(db: ReturnType<typeof openDb>): TopLine[] {
  const lines: TopLine[] = [];
  for (const s of SERIES) {
    const row = db
      .prepare(
        `WITH latest AS (
           SELECT pr.card_id, pr.shop_id, pr.price,
             ROW_NUMBER() OVER (PARTITION BY pr.shop_id, pr.card_id ORDER BY pr.scraped_at DESC) AS rn
           FROM price_records pr
         )
         SELECT c.canonical_name AS name, MAX(l.price) AS max_price
         FROM cards c
         JOIN latest l ON l.card_id = c.id AND l.rn = 1
         WHERE c.series = ? AND c.card_number IS NOT NULL
         GROUP BY c.id
         ORDER BY max_price DESC
         LIMIT 1`
      )
      .get(s.name) as { name: string; max_price: number } | undefined;

    if (!row) continue;
    lines.push({ label: s.label, name: row.name, price: row.max_price });
  }
  return lines;
}

function formatMovesPost(title: string, moves: MoveLine[]): string {
  const lines = [`${title}(${todayJstLabel()})`, ""];
  for (const m of moves) {
    const pct = Math.round(((m.current - m.previous) / m.previous) * 100);
    const sign = pct >= 0 ? "+" : "";
    lines.push(`${m.label}: ${m.name} ¥${m.previous.toLocaleString()}→¥${m.current.toLocaleString()} (${sign}${pct}%)`);
  }
  lines.push("", `買取レーダーで価格を比較 → ${SITE_URL}/trending`, "", HASHTAGS);
  return lines.join("\n");
}

function formatGapPost(gaps: GapLine[]): string {
  const lines = [`💰 店舗間で価格差の大きいトレカ(${todayJstLabel()})`, ""];
  for (const g of gaps) {
    lines.push(`${g.label}: ${g.name} ¥${g.min.toLocaleString()}〜¥${g.max.toLocaleString()}(${g.shopCount}店舗)`);
  }
  lines.push("", `同じカードでもこんなに違う → ${SITE_URL}`, "", HASHTAGS);
  return lines.join("\n");
}

function formatTopPost(tops: TopLine[]): string {
  const lines = [`👑 現在の最高額トレカ(${todayJstLabel()})`, ""];
  for (const t of tops) {
    lines.push(`${t.label}: ${t.name} ¥${t.price.toLocaleString()}`);
  }
  lines.push("", `買取レーダーで価格を比較 → ${SITE_URL}`, "", HASHTAGS);
  return lines.join("\n");
}

async function postToThreads(text: string, accessToken: string): Promise<void> {
  const meRes = await fetch(`https://graph.threads.net/v1.0/me?fields=id&access_token=${accessToken}`);
  const me = (await meRes.json()) as { id?: string; error?: unknown };
  if (!me.id) throw new Error(`Failed to resolve Threads user id: ${JSON.stringify(me)}`);

  const createRes = await fetch(`https://graph.threads.net/v1.0/${me.id}/threads`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ media_type: "TEXT", text, access_token: accessToken }),
  });
  const created = (await createRes.json()) as { id?: string; error?: unknown };
  if (!created.id) throw new Error(`Failed to create Threads post container: ${JSON.stringify(created)}`);

  const publishRes = await fetch(`https://graph.threads.net/v1.0/${me.id}/threads_publish`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ creation_id: created.id, access_token: accessToken }),
  });
  const published = (await publishRes.json()) as { id?: string; error?: unknown };
  if (!published.id) throw new Error(`Failed to publish Threads post: ${JSON.stringify(published)}`);

  console.log("Threads投稿完了:", published.id);
}

async function main() {
  const accessToken = process.env.THREADS_ACCESS_TOKEN;
  if (!accessToken) throw new Error("THREADS_ACCESS_TOKEN is not set");

  const pattern = pickPattern();
  console.log("選択パターン:", pattern);

  const db = openDb();

  let text: string | null = null;

  if (pattern === "risers" || pattern === "fallers") {
    const cutoff = getComparisonCutoff(db);
    if (!cutoff) {
      console.log("比較対象となる過去データがまだ無いためスキップ");
    } else {
      const moves = getTopMoves(db, cutoff, pattern === "risers" ? "up" : "down");
      if (moves.length > 0) {
        text = formatMovesPost(pattern === "risers" ? "📈 本日の急騰トレカ" : "📉 本日の急落トレカ", moves);
      }
    }
  } else if (pattern === "gap") {
    const gaps = getPriceGaps(db);
    if (gaps.length > 0) text = formatGapPost(gaps);
  } else {
    const tops = getTopValue(db);
    if (tops.length > 0) text = formatTopPost(tops);
  }

  db.close();

  if (!text) {
    console.log("対象データなし、投稿スキップ");
    return;
  }

  console.log("投稿内容:\n" + text);
  await postToThreads(text, accessToken);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
