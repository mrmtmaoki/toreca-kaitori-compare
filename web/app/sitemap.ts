import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/site";
import { SERIES_LIST } from "@/lib/series";
import { listAllCardRefs } from "@/lib/db";
import { CARDS_PER_CHUNK, totalSitemapIds } from "@/lib/sitemapChunks";

// Individual card pages (/[series]/[cardId]) are real, valuable long-tail
// search landing pages (e.g. "青眼の白龍 買取 相場") — worth listing, unlike a
// typical "too many to enumerate" case. But there are tens of thousands of
// them (45k+ and growing daily), well past a single sitemap file's practical
// size, so this splits into chunks via generateSitemaps(): id 0 is the small
// set of static/structural pages, ids 1+ are card-page chunks. Next.js serves
// these at /sitemap/[id].xml — see app/sitemap-index.xml/route.ts for the
// index file that actually references all of them (generateSitemaps doesn't
// produce one on its own).
export async function generateSitemaps() {
  return Array.from({ length: totalSitemapIds() }, (_, id) => ({ id }));
}

const seriesSlugByName = new Map(SERIES_LIST.map((s) => [s.name, s.slug]));

export default async function sitemap(props: { id: Promise<string> }): Promise<MetadataRoute.Sitemap> {
  // As of Next.js 16, the id from generateSitemaps() arrives as a Promise
  // resolving to a string, not a plain number — awaiting/coercing this is
  // required or every id silently becomes NaN and every chunk renders empty
  // (confirmed: array.slice(NaN, NaN) evaluates to [], not an error).
  const id = await props.id;
  const lastModified = new Date();
  const numericId = Number(id);

  if (numericId === 0) {
    return [
      { url: SITE_URL, lastModified, changeFrequency: "daily", priority: 1 },
      { url: `${SITE_URL}/trending`, lastModified, changeFrequency: "daily", priority: 0.9 },
      ...SERIES_LIST.map((s) => ({
        url: `${SITE_URL}/${s.slug}`,
        lastModified,
        changeFrequency: "daily" as const,
        priority: 0.9,
      })),
      { url: `${SITE_URL}/shops`, lastModified, changeFrequency: "monthly", priority: 0.6 },
      { url: `${SITE_URL}/faq`, lastModified, changeFrequency: "monthly", priority: 0.6 },
      { url: `${SITE_URL}/about`, lastModified, changeFrequency: "yearly", priority: 0.5 },
      { url: `${SITE_URL}/contact`, lastModified, changeFrequency: "yearly", priority: 0.4 },
      { url: `${SITE_URL}/privacy`, lastModified, changeFrequency: "yearly", priority: 0.3 },
      { url: `${SITE_URL}/terms`, lastModified, changeFrequency: "yearly", priority: 0.3 },
    ];
  }

  const chunkIndex = numericId - 1;
  const refs = listAllCardRefs().slice(chunkIndex * CARDS_PER_CHUNK, (chunkIndex + 1) * CARDS_PER_CHUNK);

  return refs
    .map((ref) => {
      const slug = seriesSlugByName.get(ref.series);
      if (!slug) return null;
      return {
        url: `${SITE_URL}/${slug}/${ref.id}`,
        lastModified,
        changeFrequency: "daily" as const,
        priority: 0.5,
      };
    })
    .filter((entry): entry is NonNullable<typeof entry> => entry !== null);
}
