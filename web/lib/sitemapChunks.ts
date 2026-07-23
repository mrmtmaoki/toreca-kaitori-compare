import { listAllCardRefs } from "./db";

// Next.js's generateSitemaps() serves chunks at /sitemap/[id].xml but does
// NOT generate a sitemap index that references them — search engines need
// one entry point. See app/sitemap-index.xml/route.ts, which lists every
// chunk id computed here, and app/robots.ts, which points at that index
// instead of the usual bare /sitemap.xml.
export const CARDS_PER_CHUNK = 10000;

export function totalSitemapIds(): number {
  const totalCards = listAllCardRefs().length;
  const cardChunks = Math.ceil(totalCards / CARDS_PER_CHUNK);
  return cardChunks + 1; // +1 for id 0, the static/structural page chunk
}
