/** Normalizes a card model number for cross-shop matching (hyphen/case/width variants). */
export function normalizeCardNumber(raw: string | null): string | null {
  if (!raw) return null;
  return raw
    .normalize("NFKC")
    .toUpperCase()
    .replace(/\s+/g, "")
    .replace(/[‐–—―]/g, "-");
}
