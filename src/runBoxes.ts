import { insertBoxPrice, logScrapeRun, openDb, upsertShop } from "./db.js";
import { boxScrapeTargets, type BoxScrapeTarget } from "./boxTargets.js";

const REQUEST_DELAY_MS = 3000;

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function processTarget(db: ReturnType<typeof openDb>, target: BoxScrapeTarget) {
  const shop = upsertShop(db, target.scraper.shopId, target.shopUrl);
  console.log(`\n=== [BOX] ${target.scraper.displayName}(${target.series}) ===`);

  let anyPageSucceeded = false;

  for (const pageUrl of target.pages) {
    try {
      const boxes = await target.scraper.scrape(pageUrl);
      console.log(`  ${pageUrl} -> ${boxes.length} 件`);
      anyPageSucceeded = true;

      for (const b of boxes) {
        insertBoxPrice(db, {
          shopId: shop.id,
          series: target.series,
          setCode: b.setCode,
          productName: b.productName,
          price: b.price,
          sourceUrl: b.sourceUrl,
        });
      }
    } catch (err) {
      console.error(`  失敗: ${pageUrl}`, err instanceof Error ? err.message : err);
    }

    await sleep(REQUEST_DELAY_MS);
  }

  logScrapeRun(db, { shopId: shop.id, series: `${target.series}(BOX)`, succeeded: anyPageSucceeded });
}

async function main() {
  const db = openDb();

  for (const target of boxScrapeTargets) {
    await processTarget(db, target);
  }

  db.close();
  console.log("\n完了");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
