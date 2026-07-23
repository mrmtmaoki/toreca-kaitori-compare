/**
 * Discovers current set-listing URLs on カードマックス for a given game by
 * fetching its category root page and extracting every `/shopbrand/<prefix>NNNN/`
 * link. Called fresh at scrape time (not a static list) so newly released
 * sets are picked up automatically without code changes.
 */
export async function discoverCardmaxSetUrls(
  categoryRootUrl: string,
  urlPrefix: string
): Promise<string[]> {
  const res = await fetch(categoryRootUrl, {
    headers: { "User-Agent": "Mozilla/5.0 (compatible; toreca-kaitori-compare/0.1)" },
  });
  if (!res.ok) {
    throw new Error(`cardmax-discovery: HTTP ${res.status} for ${categoryRootUrl}`);
  }
  const buffer = await res.arrayBuffer();
  const html = new TextDecoder("euc-jp").decode(buffer);

  const pattern = new RegExp(`href="(/shopbrand/${urlPrefix}[0-9]+/)"`, "g");
  const slugs = new Set<string>();
  for (const match of html.matchAll(pattern)) {
    slugs.add(match[1]);
  }

  const base = new URL(categoryRootUrl).origin;
  return [...slugs].sort().map((slug) => `${base}${slug}`);
}

/**
 * ワンピースカードの場合、YGO/ポケモン(discoverCardmaxSetUrls が読む
 * goods01/goods04 のようなジャンル根ページ)と違い、カテゴリページ(ct1403)の
 * ナビには現行弾(最新セット)しかリンクが載らない — 過去セットは実在するが
 * ナビツリーからは見えない(確認済み: op0001〜op0022全て生きていて欠番なし、
 * op0023以降は404)。ナビHTMLを読む代わりにop0001から連番でURLを直接probeし、
 * 404が一定回数連続したら終了する方式で、ナビの完全性に依存せず全セットを
 * 見つける。
 */
const PROBE_DELAY_MS = 500;

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function discoverCardmaxSequentialSetUrls(
  baseUrl: string,
  urlPrefix: string,
  maxConsecutiveMisses = 5
): Promise<string[]> {
  const urls: string[] = [];
  let misses = 0;
  for (let n = 1; misses < maxConsecutiveMisses; n++) {
    const slug = `${urlPrefix}${String(n).padStart(4, "0")}`;
    const url = `${baseUrl}/shopbrand/${slug}/`;
    const res = await fetch(url, {
      headers: { "User-Agent": "Mozilla/5.0 (compatible; toreca-kaitori-compare/0.1)" },
    });
    if (res.ok) {
      urls.push(url);
      misses = 0;
    } else {
      misses += 1;
    }
    await sleep(PROBE_DELAY_MS);
  }
  return urls;
}
