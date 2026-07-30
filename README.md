# toreca-kaitori-compare

トレカ買取価格比較サイト用のデータ収集ツール。

## セットアップ

```bash
npm install
npx playwright install chromium   # 現状は未使用だが将来のため
```

## 実行

```bash
npm run scrape
```

`data/kaitori.db` (SQLite) に `shops` / `cards` / `price_records` として保存される。
`price_records` は上書きせず毎回追記するため、価格推移の履歴として蓄積される。

## 対応店舗 (`src/targets.ts`)

| 店舗 | 状態 | 備考 |
|---|---|---|
| フルコンプ秋葉原店 | ✅ | HTML内埋め込みJS配列を直接パース |
| 駿河屋 | ✅ | 通常のサーバーサイドHTML |
| カードマックス秋葉原店 | ✅ | EUC-JPエンコーディング、通常のHTML |
| おたちゅう。秋葉原店 | ✅ | WordPress記事内の価格表 |

## 対応を見送った店舗

- **カードラボ** (`src/scrapers/cardlabo.ts`、未使用): 価格グリッドの描画がクライアント側で
  `navigator.webdriver` 等の自動化シグナルを見て出し分けられている(Playwrightでは常に空、
  手動ブラウザでのみ表示)。これは能動的な自動アクセス検知と判断し、回避実装はしていない。
- **ドラゴンスター** (`buy.dorasuta.jp`): Cloudflareのボット防御(JSチャレンジ)が有効。
- **BIGMAGIC/BIGWEB** (`mtg.bigweb.co.jp`): 同上、Cloudflare防御が有効。
- **カードラッシュ・ブックオフ**: 規約で明確に無断使用/営利利用を禁止しているため対象外。
- **遊々亭** (`src/scrapers/yuyutei.ts`・`src/yuyutei-discovery.ts`、自動スクレイプ対象からは除外): 2026-07-28〜30の3日連続で、GitHub Actions実行時のみdiscoverページ取得が403で失敗(同一User-Agentでのローカル/手動実行では毎回成功)。GitHub ActionsランナーのIPレンジに対するブロックと判断し、他店と同じ方針で自動化は行わない。スクレイパー本体は残してあるので、ローカル環境からの手動更新は今後も可能。

いずれも技術的な検知回避(ステルスプラグイン、ヘッダー偽装など)は行わない方針。
店舗に直接問い合わせて許可を得られた場合は対応を検討する。

## カバレッジを広げるには

`src/targets.ts` の各店舗の `pages` 配列に、他ジャンル/他セットのURLを追加するだけでよい。
各スクレイパーは1URL=1回のスクレイプという単純なインターフェースになっている。

## 名寄せ

`src/db.ts` の `findOrCreateCard` が型番(正規化後)+レアリティで同一カード判定を行う。
型番が取れない店舗(おたちゅうのJANコードなど)は現状カード名+レアリティでのマッチングに
フォールバックするため、店舗をまたいだ突き合わせ精度は型番のある店舗ほど高くない。
