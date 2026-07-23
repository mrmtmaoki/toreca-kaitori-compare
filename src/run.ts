import { findOrCreateCard, insertPriceRecord, openDb, upsertShop } from "./db.js";
import { dynamicScrapeTargets, scrapeTargets, type ScrapeTarget } from "./targets.js";

const REQUEST_DELAY_MS = 3000;

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function processTarget(db: ReturnType<typeof openDb>, target: ScrapeTarget) {
  const shop = upsertShop(db, target.scraper.shopId, target.shopUrl);
  console.log(`\n=== ${target.scraper.displayName}(${target.series}) ===`);

  for (const pageUrl of target.pages) {
    try {
      const prices = await target.scraper.scrape(pageUrl);
      console.log(`  ${pageUrl} -> ${prices.length} 件`);

      for (const p of prices) {
        const cardId = findOrCreateCard(db, {
          name: p.rawName,
          series: target.series,
          rarity: p.rarity,
          cardNumber: p.cardNumber,
        });
        insertPriceRecord(db, {
          shopId: shop.id,
          cardId,
          price: p.price,
          sourceUrl: p.sourceUrl,
          imageUrl: p.imageUrl,
        });
      }
    } catch (err) {
      console.error(`  失敗: ${pageUrl}`, err instanceof Error ? err.message : err);
    }

    await sleep(REQUEST_DELAY_MS);
  }
}

/**
 * --shop=<shopId> restricts the run to one shop (e.g. `npm run scrape -- --shop=fullcomp`)
 * — useful while iterating on a single scraper's parsing logic, since a full run
 * re-walks every shop (駿河屋's pagination and カードマックスの100+ sets alone take
 * several minutes) even though only one shop's code changed. Safe to do: each shop's
 * records are upserted independently, so this doesn't touch other shops' existing
 * data. Do a full run (no flag) before relying on cross-shop comparisons, since that's
 * the only way to get every shop's data on the same matching-logic version at once.
 *
 * --series=<name> restricts to one game (e.g. `--series=ポケモンカード`) — useful when
 * adding a brand-new genre, since (unlike a shared matching-logic change) a new
 * series can never collide with existing cards of a different series, so there's
 * no need to rebuild the whole DB just to try it out.
 */
function parseFilters(): { shopId: string | null; series: string | null } {
  const args = process.argv.slice(2);
  const shopArg = args.find((a) => a.startsWith("--shop="));
  const seriesArg = args.find((a) => a.startsWith("--series="));
  return {
    shopId: shopArg ? shopArg.slice("--shop=".length) : null,
    series: seriesArg ? seriesArg.slice("--series=".length) : null,
  };
}

async function main() {
  const { shopId, series } = parseFilters();
  const db = openDb();

  const matches = (t: { scraper: { shopId: string }; series: string }) =>
    (!shopId || t.scraper.shopId === shopId) && (!series || t.series === series);

  const targets = scrapeTargets.filter(matches);
  const dynTargets = dynamicScrapeTargets.filter(matches);

  if (shopId || series) {
    console.log(
      `--shop=${shopId ?? "*"} --series=${series ?? "*"} 指定: ${targets.length + dynTargets.length} ターゲットのみ実行`
    );
  }

  for (const target of targets) {
    await processTarget(db, target);
  }

  for (const dynamicTarget of dynTargets) {
    console.log(`\n--- ${dynamicTarget.scraper.displayName}(${dynamicTarget.series}) のセット一覧を取得中 ---`);
    let pages: string[];
    try {
      pages = await dynamicTarget.discoverPages();
      console.log(`  ${pages.length} セット見つかりました`);
    } catch (err) {
      console.error(`  セット一覧の取得に失敗:`, err instanceof Error ? err.message : err);
      continue;
    }
    await processTarget(db, { ...dynamicTarget, pages });
  }

  db.close();
  console.log("\n完了");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
