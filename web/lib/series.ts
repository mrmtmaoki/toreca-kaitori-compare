export interface SeriesConfig {
  slug: string;
  /** Must match the value stored in cards.series in the DB. */
  name: string;
  label: string;
  tagline: string;
  searchPlaceholder: string;
  /** Accent color (hex) used to visually distinguish this genre. */
  accent: string;
}

export const SERIES_LIST: SeriesConfig[] = [
  {
    slug: "yugioh",
    name: "遊戯王",
    label: "遊戯王",
    tagline: "遊戯王OCGの買取価格を比較",
    searchPlaceholder: "カード名・型番で検索(例: 青眼の白龍、BETB-JP049)",
    accent: "#e8b84b",
  },
  {
    slug: "one-piece",
    name: "ワンピースカード",
    label: "ワンピースカード",
    tagline: "ONE PIECEカードゲームの買取価格を比較",
    searchPlaceholder: "カード名・型番で検索(例: モンキー・D・ルフィ、OP01-001)",
    accent: "#ef6a4c",
  },
  {
    slug: "pokemon",
    name: "ポケモンカード",
    label: "ポケモンカード",
    tagline: "ポケモンカードゲームの買取価格を比較",
    searchPlaceholder: "カード名・型番で検索(例: リザードンex、sv8-130/106)",
    accent: "#3b82f6",
  },
];

export function getSeriesBySlug(slug: string): SeriesConfig | undefined {
  return SERIES_LIST.find((s) => s.slug === slug);
}
