/**
 * Some shops don't natively expose a Pokémon set's real alphanumeric code
 * (e.g. "SV8") — 駿河屋 only shows the Japanese set name, カードマックス only
 * shows its own internal URL slug ("pk0103"). Both are needed *identically*
 * across shops for the "NNN/NNN" number/total format (see src/scrapers/
 * cardmax.ts) to disambiguate consistently — otherwise the same real card
 * gets a different card_number string per shop and can never cross-match.
 *
 * These tables were built by cross-referencing 駿河屋/カードマックス's own
 * (label, number/total) pairs against フルコンプ/晴れる屋2's data (which
 * *does* natively carry the real set code) — for each label, taking the code
 * that co-occurred with its cards' numbers far more often than any other
 * candidate (>=15 matches and >=2.5x the runner-up). This intentionally only
 * covers labels with enough trading volume to be confident about — a missed
 * mapping falls back to the shop's own label text (safe, just doesn't cross-
 * match), which is preferable to guessing wrong. Re-run the cross-reference
 * (see project memory) after adding shops/rescraping to catch more sets.
 */
export const SURUGAYA_POKEMON_SET_CODE: Record<string, string> = {
  "BW拡張パック「ダークラッシュ」": "S6A",
  "BW拡張パック「メガロキャノン」": "S3A",
  "MEGAハイクラスパックMEGAドリームEX": "M2A",
  PCG拡張パックさいはての攻防: "S11A",
  "SCARLET&VIOLET-151": "SV2A",
  XYBREAKコンセプトパックポケットモンスターカードゲーム拡張パック20TH: "CP6",
  XYBREAKコンセプトパックポケットモンスターカードゲーム拡張パック20THANN: "CP6",
  "XYコンセプトパック「伝説キラコレクション」": "CP2",
  "XY拡張パック「バンデットリング」": "XY7",
  "XY拡張パック「ファントムゲート」": "XY4",
  "サン&ムーンハイクラスパックウルトラシャイニー": "SM8B",
  "サン&ムーンハイクラスパックタッグオールスターズ": "SM12A",
  "サン&ムーンムービースペシャルパック名探偵ピカチュウ": "SMP2",
  "サン&ムーン強化拡張パックダークオーダー": "SM8A",
  "サン&ムーン強化拡張パックドラゴンストーム": "SM6A",
  "サン&ムーン強化拡張パックドリームリーグ": "SM11B",
  "サン&ムーン強化拡張パックナイトユニゾン": "SM9A",
  "シリーズ:サン&ムーンハイクラスパックウルトラシャイニー": "SM8B",
  "スカーレット&バイオレットハイクラスパックテラスタルフェスEX": "SV8A",
  "スカーレット&バイオレット拡張パックステラミラクル": "SV7",
  "スカーレット&バイオレット拡張パック黒炎の支配者": "SV3",
  "スカーレット&バイオレット拡張パック超電ブレイカー": "SV8",
  "スカーレット&バイオレット拡張パック変幻の仮面": "SV6",
  "スカーレット&バイオレット強化拡張パックトリプレットビート": "SV1A",
  "スカーレット&バイオレット強化拡張パックポケモンカード151": "SV2A",
  "スカーレット&バイオレット強化拡張パックレイジングサーフ": "SV3A",
  "スカーレット&バイオレット強化拡張パック熱風のアリーナ": "SV9A",
  "ソード&シールドハイクラスパックVMAXクライマックス": "S8B",
  "ソード&シールドハイクラスパックVSTARユニバース": "S12A",
  "ソード&シールド強化拡張パック伝説の鼓動": "S3A",
  "ソード&シールド強化拡張パック白熱のアルカナ": "S11A",
  "ポケモンカードE「拡張パック第3弾海からの風」": "CP6",
  強化拡張パックイーブイヒーローズ: "S6A",
};

export const CARDMAX_POKEMON_SET_CODE: Record<string, string> = {
  pk0029: "S6A",
  pk0036: "S8A",
  pk0038: "S8B",
  pk0039: "SI",
  pk0055: "S11A",
  pk0058: "S12A",
  pk0065: "SV1A",
  pk0070: "SV2A",
  pk0079: "SV3",
  pk0080: "SV3A",
  pk0094: "SV6",
  pk0098: "SV7",
  pk0103: "SV8",
  pk0104: "SV8A",
  pk0108: "SV9A",
  pk0112: "SV9A",
  pk0113: "SV9A",
  pk0115: "M2A",
  pk0116: "MC",
  pk0118: "M4",
  pk0119: "XY7",
};
