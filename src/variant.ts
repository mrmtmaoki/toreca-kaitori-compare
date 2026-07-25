const PAREN_RE = /[（(]([^（）()]+)[）)]/g;
// Some shops (フルコンプ) also mark variants with a bare "※..." note that isn't
// wrapped in parens at all, e.g. "モンキー・D・ルフィ※未開封(OP07-109)" vs the
// plain "モンキー・D・ルフィ(OP07-109)" — same card_number+rarity either way.
const MARKER_RE = /※([^\s()（）※]+)/g;
// Some shops (駿河屋) use square brackets instead of round parens for the same
// kind of distinguishing tag, notably real promo-source attribution (e.g.
// "モンキー・D・ルフィ/[「週刊少年ジャンプ」2023年1月 付録]") — confirmed the two
// bracket styles are used for the literal same purpose by finding the same
// 遊戯王 token ("トークン[真崎杏子]" vs "トークン(真崎杏子)", card_number
// TK05-JP008) tagged both ways across different shops.
const BRACKET_RE = /\[([^[\]]+)\]/g;

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

// A handful of specific wording pairs confirmed (2026-07-25, via cross-shop
// same-card_number+rarity price proximity — see src/scratch_findSynonymCandidates.ts)
// to be different shops' phrasing for the identical real print. Deliberately
// a short, evidence-backed list rather than a general fuzzy-match — broader
// heuristics (e.g. "any two tags with a close price are the same") threw up
// far more false positives than true synonyms (e.g. "スペシャルカード" and
// "金箔パラレル" are both premium variants that just happen to be priced
// similarly — NOT the same real print; left unmerged per "missed match is
// safer than wrong match", see src/rarity.ts's doc comment).
const TAG_SYNONYMS: Record<string, string> = {
  パラレル版: "パラレル",
  原作イラスト: "原作絵",
  // 遊戯王: 3店舗がそれぞれ違う言い回しで同じ「新規に描き下ろされたイラスト」を
  // 表現している(x7ずつ相互に価格近接で確認、2026-07-25)。
  新規イラスト版: "新規イラスト",
  イラスト違い: "新規イラスト",
  // ポケモン: 「開封済み」と「開封済」は送り仮名の有無だけの表記ゆれ。
  開封済み: "開封済",
  // 遊戯王: 特定の大会ロゴ入りを指す具体名と、店舗独自の汎用的な言い回し
  // ("大会ロゴ有")が同じcard_numberに対して使われている(x3、価格近接で確認)。
  WCS2025ロゴ入り: "大会ロゴ有",
};

export function extractVariantTag(rawName: string): string | null {
  const tags: string[] = [];
  let match: RegExpExecArray | null;

  PAREN_RE.lastIndex = 0;
  while ((match = PAREN_RE.exec(rawName))) {
    tags.push(match[1].trim());
  }

  BRACKET_RE.lastIndex = 0;
  while ((match = BRACKET_RE.exec(rawName))) {
    tags.push(match[1].trim());
  }

  // Only scan outside the parens/brackets already captured above, so a
  // "(※★)"-style tag isn't counted twice. The leading "※" itself is dropped
  // rather than kept as part of the tag — it's just this shop's syntax for
  // "a note not wrapped in parens", not a distinguishing part of the note's
  // content, so e.g. "モンキー・D・ルフィ※未開封" should produce the same tag
  // ("未開封") as another shop's "モンキー・D・ルフィ(未開封)" — confirmed via
  // cross-shop price proximity, x9 occurrences (2026-07-25).
  const outsideTags = rawName.replace(PAREN_RE, "").replace(BRACKET_RE, "");
  MARKER_RE.lastIndex = 0;
  while ((match = MARKER_RE.exec(outsideTags))) {
    tags.push(match[1].trim());
  }

  const normalizedTags = tags
    .map((t) => t.normalize("NFKC"))
    // A glued "※★" prefix (no separator from the rest of the tag, e.g.
    // "(※★原作イラスト)") is the same decorative flag as the standalone
    // "(※★)" case below, just glued onto real content instead of being its
    // own tag — strip only this exact two-character "※★" prefix, NOT a bare
    // leading "★" (e.g. "★SP表記あり" keeps its ★, which does carry real
    // info here — see DECORATIVE_ONLY_TAGS note below).
    .map((t) => t.replace(/^※★/, ""))
    // "illust.XXX" (フルコンプ style) and a bare illustrator name (other
    // shops) are the same real print described two ways — confirmed by
    // identical prices on both sides (e.g. "illust.Sunohara" vs plain
    // "Sunohara").
    .map((t) => t.replace(/^illust\.\s*/i, ""))
    // "Ver."/"ver." casing is inconsistent shop-to-shop for otherwise
    // identical tags (e.g. "SPECIAL RED Ver." vs "SPECIAL RED ver.",
    // confirmed x11 via price proximity) — not meaningfully distinctive.
    .map((t) => t.replace(/ver\.$/i, "Ver."))
    .map((t) => TAG_SYNONYMS[t] ?? t);

  // The "※★" strip above can reduce a tag that was ONLY "※★" down to "" —
  // that's the same decorative-only case DECORATIVE_ONLY_TAGS filters below,
  // just already emptied out by the time we get here, so an empty string
  // needs filtering too (otherwise it survives as a spurious leading "／"
  // in the joined result, e.g. "／ZhiguangLiu" instead of "ZhiguangLiu").
  const meaningfulTags = normalizedTags.filter((t) => t !== "" && !DECORATIVE_ONLY_TAGS.has(t));
  return meaningfulTags.length ? meaningfulTags.join("／") : null;
}
