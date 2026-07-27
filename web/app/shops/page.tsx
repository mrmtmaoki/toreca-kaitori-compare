import type { Metadata } from "next";
import { InfoPage } from "../InfoPage";
import { SHOPS } from "@/lib/shops";
import { SITE_NAME, SITE_URL } from "@/lib/site";

const title = "秋葉原・全国宅配 買取比較｜対応店舗一覧";
const description = `秋葉原のトレカ買取店と全国対応の宅配買取を横断比較できる${SITE_NAME}の対応店舗一覧です。`;

export const metadata: Metadata = {
  title,
  description,
  alternates: { canonical: `${SITE_URL}/shops` },
  openGraph: {
    title,
    description,
    url: `${SITE_URL}/shops`,
    siteName: SITE_NAME,
    locale: "ja_JP",
    type: "article",
    images: [`${SITE_URL}/opengraph-image`],
  },
};

function ShopGrid({ shops }: { shops: typeof SHOPS }) {
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
      {shops.map((shop) => (
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
  );
}

export default function ShopsPage() {
  const akihabaraShops = SHOPS.filter((s) => s.area === "秋葉原");
  const deliveryShops = SHOPS.filter((s) => s.area === "宅配");

  return (
    <InfoPage
      title={title}
      lead={`秋葉原の店舗と全国対応の宅配買取、現在${SHOPS.length}店舗のトレカ買取価格を一覧にまとめて比較しています。順次拡大予定です。`}
    >
      <div>
        <h2 className="mb-3 text-sm font-bold text-[var(--gold)]">秋葉原の店舗({akihabaraShops.length})</h2>
        <ShopGrid shops={akihabaraShops} />
      </div>
      <div>
        <h2 className="mb-3 text-sm font-bold text-[var(--gold)]">全国宅配買取({deliveryShops.length})</h2>
        <ShopGrid shops={deliveryShops} />
      </div>
      <p className="text-xs text-[var(--ink-soft)]">
        掲載は各店舗のrobots.txt・利用規約を確認したうえで、公開情報の範囲内で行っています。当サイトはいずれの店舗とも提携関係にありません。
      </p>
    </InfoPage>
  );
}
