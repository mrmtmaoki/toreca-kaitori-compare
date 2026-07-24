// Wraps a shop's outbound product URL with its affiliate redirect at render
// time (not baked into the scraper/DB) — keeps price_records.source_url as
// the plain shop URL so switching/adding an affiliate ID, or dropping one,
// never needs a rescrape.
const SURUGAYA_AFFILIATE_USER_ID = "5359";

export function toAffiliateUrl(shopId: string, url: string): string {
  if (shopId === "surugaya") {
    return `https://affiliate.suruga-ya.jp/modules/af/af_jump.php?user_id=${SURUGAYA_AFFILIATE_USER_ID}&goods_url=${encodeURIComponent(url)}`;
  }
  return url;
}
