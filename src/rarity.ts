/**
 * Normalizes a shop's rarity label to a shared canonical name so the same
 * card printing can be matched across shops. Each shop uses a different
 * convention per game, so the mapping table is scoped by `series`
 * (cards.series) rather than being one flat table — the same abbreviation
 * can mean different things in different games (and even within a game,
 * abbreviations vary by shop).
 *
 * This intentionally only maps the common/high-confidence tiers. Anything
 * unmapped is returned unchanged (NFKC-normalized) rather than guessed at —
 * for a price-comparison tool, a missed match (two rows instead of one) is
 * far safer than a wrong match (showing two different rarities as if they
 * were the same card). Treat this as a starting point that may need spot
 * checks / additions as more shops or genres are added.
 */

const YUGIOH_TABLE: Record<string, string> = {
  // --- 駿河屋の略号 ---
  N: "ノーマル",
  R: "レア",
  SR: "スーパーレア",
  UR: "ウルトラレア",
  UL: "アルティメットレア",
  SE: "シークレットレア",
  PSE: "プリズマティックシークレットレア",
  QCSE: "クォーターセンチュリーシークレットレア",
  "20thSE": "20thシークレットレア",
  "10000SE": "10000シークレットレア",
  HR: "ホログラフィックレア",
  CR: "コレクターズレア",
  GMR: "グランドマスターレア",
  GSE: "ゴールドシークレットレア",
  EXSE: "エクストラシークレットレア",
  MSE: "ミレニアムシークレットレア",
  MGR: "ミレニアムゴールドレア",
  PGR: "プレミアムゴールドレア",
  NP: "ノーマルパラレルレア",
  SRP: "スーパーパラレルレア",
  URP: "ウルトラパラレルレア",
  SEP: "シークレットパラレルレア",
  HRP: "ホログラフィックパラレルレア",

  // --- フルコンプ(NFKCで全角化された後の表記) ---
  ノーマル: "ノーマル",
  レア: "レア",
  スーパーレア: "スーパーレア",
  ウルトラレア: "ウルトラレア",
  シークレットレア: "シークレットレア",
  アルティメットレア: "アルティメットレア",
  プリズマティックシークレットレア: "プリズマティックシークレットレア",
  オーバーフレームプリズマティックシークレットレア: "プリズマティックシークレットレア",
  ホログラフィックレア: "ホログラフィックレア",
  ノーマルパラレル: "ノーマルパラレルレア",
  ウルトラパラレルレア: "ウルトラパラレルレア",
  スーパーパラレルレア: "スーパーパラレルレア",
  シークレットパラレルレア: "シークレットパラレルレア",
  オーバーフレームウルトラレア: "ウルトラレア",
  オーバーフレームシークレットレア: "シークレットレア",
  // 「25th」と「クォーターセンチュリー」は同じ格付け(25周年=Quarter Century)の
  // 新旧呼称なので統合。20thは別の周年企画で別格付けなので統合しない。
  "25thシークレットレア": "クォーターセンチュリーシークレットレア",
  クォーターセンチュリーシークレット: "クォーターセンチュリーシークレットレア",
  QSC: "クォーターセンチュリーシークレットレア",
  "20thシークレットレア": "20thシークレットレア",
  "20thシークレット": "20thシークレットレア",
  "20thSecret": "20thシークレットレア",
  ミレニアムレア: "ミレニアムレア",
  ミレニアムウルトラレア: "ミレニアムウルトラレア",
  ウルトラシークレットレア: "ウルトラシークレットレア",
  ブルーシークレットレア: "ブルーシークレットレア",
  コレクターズレア: "コレクターズレア",
  ゴールドシークレットレア: "ゴールドシークレットレア",
  ゴールドレア: "ゴールドレア",
  プレミアムゴールドレア: "プレミアムゴールドレア",
  ゴールドミレニアムレア: "ゴールドミレニアムレア",
  エクストラシークレットレア: "エクストラシークレットレア",
  レッドシークレットレア: "レッドシークレットレア",

  // --- カードマックス ---
  PSR: "プリズマティックシークレットレア",

  // --- おたちゅう(「レア」なしの略称) ---
  シークレット: "シークレットレア",
  ウルトラ: "ウルトラレア",
  スーパー: "スーパーレア",
  プリズマティック: "プリズマティックシークレットレア",
  ノーパラ: "ノーマルパラレルレア",
  ウルパラ: "ウルトラパラレルレア",
  シクパラ: "シークレットパラレルレア",
  スーパラ: "スーパーパラレルレア",
  グランドマスター: "グランドマスターレア",
  ホログラフィック: "ホログラフィックレア",
  プレミアムゴールド: "プレミアムゴールドレア",
  ゴールド: "ゴールドレア",
  ミレニアム: "ミレニアムレア",
  ミレニアムシークレット: "ミレニアムシークレットレア",
  ミレニアムゴールド: "ミレニアムゴールドレア",
  ミレニアムウルトラ: "ミレニアムウルトラレア",
  コレクターズ: "コレクターズレア",

  // --- おたちゅう/カードラッシュ/イエローサブマリンの「OF」(オーバーフレーム)
  // 表記 — 既存の「オーバーフレームウルトラ→ウルトラレア」と同じ方針(オーバー
  // フレームは通常仕様と同じ基本レアリティ扱いに統合)を、新しい店舗の略号にも
  // 適用。駿河屋だけは「(オーバーフレーム版)」を variant タグ側で表現している
  // ため、そちらとはまだ揃わない(残課題)。
  OFウルトラ: "ウルトラレア",
  OFシークレット: "シークレットレア",
  OFプリズマティック: "プリズマティックシークレットレア",
  OFプリズマティックシークレット: "プリズマティックシークレットレア",
  URof: "ウルトラレア",
};

/**
 * One Piece Card Game official rarities are short codes (C/UC/R/SR/SEC/L/P/SP)
 * shared fairly consistently across shops, plus a "◯◯P" parallel-print
 * convention. Compound/ambiguous codes seen in the wild (PR, SPSR, DSEC, ...)
 * are deliberately left unmapped — see note above.
 */
const ONE_PIECE_TABLE: Record<string, string> = {
  L: "リーダー",
  C: "コモン",
  UC: "アンコモン",
  R: "レア",
  SR: "スーパーレア",
  SEC: "シークレットレア",
  P: "プロモ",
  // "PR" (フルコンプ) and "P" (other shops) are the same プロモ tier under two
  // different abbreviations — safe now that BRACKET_RE (variant.ts) captures
  // shops' "[〜付録]" promo-source tags, so an unlabeled bare "PR" listing no
  // longer collides with a *different*, specifically-labeled promo release
  // of the same card_number (confirmed risk case: P-066 ボア・ハンコック had a
  // ¥18,000 unlabeled "PR" listing that, pre-fix, would have wrongly merged
  // with an unrelated ¥1,200 "[「最強ジャンプ」2024年4月付録]"-labeled one).
  PR: "プロモ",
  // Follows the same "base code + trailing P = (パラレル) of that tier" pattern
  // as LP/CP/UCP/RP/SRP/SECP above (PR="プロモ" + P suffix).
  PRP: "プロモ(パラレル)",
  SP: "スペシャルカード",
  LP: "リーダー(パラレル)",
  CP: "コモン(パラレル)",
  UCP: "アンコモン(パラレル)",
  RP: "レア(パラレル)",
  SRP: "スーパーレア(パラレル)",
  SECP: "シークレットレア(パラレル)",
  // おたちゅう2号店はリーダーのパラレル無地(特殊イラストなし)を、他店が
  // rarity="リーダー"+name側の「(パラレル)」タグで表現するのに対し、rarity欄
  // 自体に「リーダーパラレル」とスペルアウトして書く — variant側のタグ
  // ("パラレル版"、下のvariant.tsの正規化と対) と合わせて基本形に統一しないと
  // 同じ実カードが2行に分裂する(2026-07-25、OP10-001含む111件で確認)。
  リーダーパラレル: "リーダー",
};

/**
 * Pokémon Card Game rarity codes, surveyed from フルコンプ/カードマックス/おたちゅう's
 * actual data. Several codes seen in the wild (SSR, A, MA, MUR, BWR, TR, ACE, the
 * "_"/"_RR" placeholders some shops use for "no rarity marked") are deliberately
 * left unmapped — not confident enough in their exact meaning to risk a wrong merge.
 */
const POKEMON_TABLE: Record<string, string> = {
  C: "コモン",
  U: "アンコモン",
  R: "レア",
  RR: "ダブルレア",
  RRR: "トリプルレア",
  AR: "アートレア",
  SAR: "スペシャルアートレア",
  SR: "スーパーレア",
  UR: "ウルトラレア",
  HR: "ハイパーレア",
  CHR: "キャラクターレア",
  CSR: "キャラクタースーパーレア",
  S: "シャイニー",
  K: "キラ",
  P: "プロモ",
  PR: "プロモ",
  M: "マスターボールミラー",
};

const TABLES_BY_SERIES: Record<string, Record<string, string>> = {
  遊戯王: YUGIOH_TABLE,
  ワンピースカード: ONE_PIECE_TABLE,
  ポケモンカード: POKEMON_TABLE,
};

// Some shops write an ASCII rarity code in a different case than the table's
// own key (confirmed: おたちゅう's ポケモンカード promo rows use bare lowercase
// "p" where every other shop, and this table, use "P" — the two never
// matched, so おたちゅう's promo cards silently never cross-shop-matched
// anyone else's). NFKC normalization doesn't touch letter case, so a
// case-insensitive index (built once here) is layered on top, same fix
// shape as SURUGAYA_POKEMON_SET_CODE_CI in src/scrapers/surugaya.ts. Case
// isn't meaningfully distinctive in any of these short rarity codes.
const CI_TABLES_BY_SERIES: Record<string, Map<string, string>> = Object.fromEntries(
  Object.entries(TABLES_BY_SERIES).map(([series, table]) => [
    series,
    new Map(Object.entries(table).map(([key, value]) => [key.toLowerCase(), value])),
  ])
);

export function canonicalizeRarity(raw: string | null, series: string): string | null {
  if (!raw) return null;
  // Some shops write the same rarity with extra internal spacing (e.g. "20th
  // Secret" vs "20thシークレット") — stripped before lookup (and in the
  // unmapped fallback too, so the two forms end up identical either way).
  const normalized = raw.normalize("NFKC").trim().replace(/\s+/g, "");
  return CI_TABLES_BY_SERIES[series]?.get(normalized.toLowerCase()) ?? normalized;
}

/**
 * ワンピースカードのみ: おたちゅうは「無地パラレル」(特殊イラスト等の追加情報が
 * 名前タグに一切ない、ただのパラレル)を rarity 欄だけで丸ごと表現する(例:
 * "リーダー(パラレル)"、variant側のタグは付けない)。駿河屋/メルカード/カード
 * マックス等の他店は同じ「無地パラレル」を rarity="リーダー"(括弧なし)+
 * variant="パラレル" の組で表現する — 意味は同じなのに表現が2通りあり、その
 * ままだと同じ実カードが2行に分裂する(2026-07-25、OP02-002 モンキー・D・ガープ
 * 等で519件確認、各ペアは店舗が重複せず価格帯も近い)。名前タグに何か追加情報が
 * 付いている場合(variantがnull以外)は本当に別の印刷([例: OP02-002の「(※ﾌﾚｰﾑﾚｽ)
 * (原作イラスト)」付き]なので、この統一の対象外(variant IS NULLの時だけ適用)。
 */
export function normalizeParallelEncoding(
  series: string,
  rarity: string | null,
  variant: string | null
): { rarity: string | null; variant: string | null } {
  const SUFFIX = "(パラレル)";
  if (series === "ワンピースカード" && rarity?.endsWith(SUFFIX) && variant === null) {
    return { rarity: rarity.slice(0, -SUFFIX.length), variant: "パラレル" };
  }
  return { rarity, variant };
}
