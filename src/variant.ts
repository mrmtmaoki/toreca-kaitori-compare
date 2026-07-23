const PAREN_RE = /[（(]([^（）()]+)[）)]/g;
// Some shops (フルコンプ) also mark variants with a bare "※..." note that isn't
// wrapped in parens at all, e.g. "モンキー・D・ルフィ※未開封(OP07-109)" vs the
// plain "モンキー・D・ルフィ(OP07-109)" — same card_number+rarity either way.
const MARKER_RE = /※([^\s()（）※]+)/g;

/**
 * Some shops distinguish parallel/special-print variants of a card only via a
 * tag in the product name (e.g. 駿河屋's "(パラレル)モンキー・D・ルフィ" vs plain
 * "モンキー・D・ルフィ", both OP13-118[SEC]) — the card_number and rarity code
 * stay identical to the base print. Folding this tag into the DB matching key
 * (see findOrCreateCard) keeps genuinely different prints from being merged
 * into one card with a nonsensical price range.
 */
// A bare "★" (alone, e.g. "(※★)" or a standalone "※★") is おたちゅう/フルコンプ's
// own "featured item" flag, not a print/edition marker — confirmed by pairs
// like "illust.Sunohara" vs "※★／illust.Sunohara" pricing identically, i.e.
// the exact same real card, needlessly split by this flag being present on
// one shop's copy and not the other's. Longer tags that merely *start* with
// ★ (e.g. "★SP表記あり") still carry real info and are kept as-is.
const DECORATIVE_ONLY_TAGS = new Set(["★", "※★"]);

export function extractVariantTag(rawName: string): string | null {
  const tags: string[] = [];
  let match: RegExpExecArray | null;

  PAREN_RE.lastIndex = 0;
  while ((match = PAREN_RE.exec(rawName))) {
    tags.push(match[1].trim());
  }

  // Only scan outside the parens already captured above, so a "(※★)"-style
  // tag isn't counted twice.
  const outsideParens = rawName.replace(PAREN_RE, "");
  MARKER_RE.lastIndex = 0;
  while ((match = MARKER_RE.exec(outsideParens))) {
    tags.push(`※${match[1].trim()}`);
  }

  // "illust.XXX" (フルコンプ style) and a bare illustrator name (other shops)
  // are the same real print described two ways — confirmed by identical
  // prices on both sides (e.g. "illust.Sunohara" vs plain "Sunohara").
  const normalizedTags = tags.map((t) => t.replace(/^illust\.\s*/i, ""));

  const meaningfulTags = normalizedTags.filter((t) => !DECORATIVE_ONLY_TAGS.has(t));
  return meaningfulTags.length ? meaningfulTags.join("／") : null;
}
