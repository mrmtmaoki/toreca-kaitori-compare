import { SITE_URL } from "@/lib/site";
import { totalSitemapIds } from "@/lib/sitemapChunks";

// generateSitemaps() (see app/sitemap.ts) produces /sitemap/0.xml..N.xml but
// Next.js doesn't generate an index referencing them — this is that index,
// pointed to from app/robots.ts instead of the usual bare /sitemap.xml.
export const dynamic = "force-dynamic";

export async function GET() {
  const ids = Array.from({ length: totalSitemapIds() }, (_, i) => i);
  const body = `<?xml version="1.0" encoding="UTF-8"?>
<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${ids.map((id) => `  <sitemap><loc>${SITE_URL}/sitemap/${id}.xml</loc></sitemap>`).join("\n")}
</sitemapindex>`;

  return new Response(body, {
    headers: { "Content-Type": "application/xml" },
  });
}
