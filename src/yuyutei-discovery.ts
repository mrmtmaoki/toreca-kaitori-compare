/**
 * Discovers every set-listing URL for a 遊々亭 genre by fetching its
 * genre-scoped search page (`/sell/<genre>/s/search`) and reading the
 * `vers[]` checkbox filter values off it — this is the site's own complete
 * historical set-code list (confirmed 440 codes for 遊戯王 alone), not just
 * the handful of recent sets linked from the genre top page nav. Called
 * fresh at scrape time so newly released sets are picked up automatically.
 */
export async function discoverYuyuteiSetUrls(
  genre: string,
  baseUrl = "https://yuyu-tei.jp"
): Promise<string[]> {
  const searchUrl = `${baseUrl}/sell/${genre}/s/search`;
  const res = await fetch(searchUrl, {
    headers: { "User-Agent": "Mozilla/5.0 (compatible; toreca-kaitori-compare/0.1)" },
  });
  if (!res.ok) {
    throw new Error(`yuyutei-discovery: HTTP ${res.status} for ${searchUrl}`);
  }
  const html = await res.text();

  const pattern = /name="vers\[\]"\s+value="([a-z0-9]+)"/gi;
  const codes = new Set<string>();
  for (const match of html.matchAll(pattern)) {
    codes.add(match[1]);
  }

  return [...codes].sort().map((code) => `${baseUrl}/sell/${genre}/s/${code}`);
}
