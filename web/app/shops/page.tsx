import type { Metadata } from "next";
import { InfoPage } from "../InfoPage";
import { SHOPS } from "@/lib/shops";
import { SITE_NAME, SITE_URL } from "@/lib/site";

const title = "秋葉原 買取比較｜対応店舗一覧";
const description = `秋葉原のトレカ買取店を横断比較できる${SITE_NAME}の対応店舗一覧です。`;

export const metadata: Metadata = {
  title,
  description,
  alternates: { canonical: `${SITE_URL}/shops` },
  openGraph: { title, description, url: `${SITE_URL}/shops`, siteName: SITE_NAME, locale: "ja_JP", type: "article" },
};

export default function ShopsPage() {
  return (
    <InfoPage
      title={title}
      lead={`秋葉原を中心に、現在${SHOPS.length}店舗のトレカ買取価格を一覧にまとめて比較しています。順次拡大予定です。`}
    >
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {SHOPS.map((shop) => (
          <a
            key={shop.id}
            href={shop.url}
            target="_blank"
            rel="noopener noreferrer"
            className="rounded-2xl border border-[var(--line)] bg-[var(--bg-card)] p-4 transition-colors hover:border-[var(--gold)]/50"
          >
            <h2 className="text-sm font-bold text-[var(--ink)]">{shop.name}</h2>
            <p className="mt-1 text-xs leading-relaxed text-[var(--ink-soft)]">{shop.description}</p>
          </a>
        ))}
      </div>
      <p className="text-xs text-[var(--ink-soft)]">
        掲載は各店舗のrobots.txt・利用規約を確認したうえで、公開情報の範囲内で行っています。当サイトはいずれの店舗とも提携関係にありません。
      </p>
    </InfoPage>
  );
}
