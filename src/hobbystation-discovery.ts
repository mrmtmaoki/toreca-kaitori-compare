/**
 * Discovers every current set-listing URL for a ホビーステーション genre by
 * fetching its top page (`/<genre>/top?kaitori_page=true`) and reading every
 * `/<genre>/kaitori/product/list?...` banner link off it. Unlike 遊々亭
 * (which has a dedicated full-history search filter, see
 * yuyutei-discovery.ts), no such archive page was found here — this only
 * covers the sets currently promoted on the top page (confirmed ~40-90 per
 * genre), not necessarily the shop's entire historical catalog. Some banner
 * links return zero results (a set announced but not yet stocked) — that's
 * normal, not an error, and the scraper just returns an empty array for
 * those.
 */
export async function discoverHobbystationSetUrls(
  genre: "yg" | "pk" | "op",
  baseUrl = "https://www.hobbystation-single.jp"
): Promise<string[]> {
  const topUrl = `${baseUrl}/${genre}/top?kaitori_page=true`;
  const res = await fetch(topUrl, {
    headers: { "User-Agent": "Mozilla/5.0 (compatible; toreca-kaitori-compare/0.1)" },
  });
  if (!res.ok) {
    throw new Error(`hobbystation-discovery: HTTP ${res.status} for ${topUrl}`);
  }
  const html = await res.text();

  const pattern = new RegExp(
    `href="(${baseUrl.replace(/\./g, "\\.")}/${genre}/kaitori/product/list\\?[^"]*)"`,
    "g"
  );
  const urls = new Set<string>();
  for (const match of html.matchAll(pattern)) {
    urls.add(match[1].replace(/&amp;/g, "&"));
  }

  return [...urls];
}
