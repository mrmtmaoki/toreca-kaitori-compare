import type { Metadata } from "next";
import Link from "next/link";
import { InfoPage, InfoSection } from "../InfoPage";
import { SITE_NAME, SITE_URL } from "@/lib/site";

const title = "よくある質問";
const description = `${SITE_NAME}の使い方や価格データの精度、対応店舗などについて、よくいただく質問にお答えします。`;

export const metadata: Metadata = {
  title,
  description,
  alternates: { canonical: `${SITE_URL}/faq` },
  openGraph: { title, description, url: `${SITE_URL}/faq`, siteName: SITE_NAME, locale: "ja_JP", type: "article" },
};

const faqs: { q: string; a: React.ReactNode }[] = [
  {
    q: "表示されている価格は本当に今の価格ですか？",
    a: "各店舗の買取価格ページを定期的に自動取得して掲載しています。取得のタイミングによっては、実際の店舗ページと数時間〜1日程度のズレが生じる場合があります。正式な金額は必ず価格をクリックして各店舗のページでご確認ください。",
  },
  {
    q: "同じカードなのに価格が複数表示されているのはなぜですか？",
    a: "状態(美品/傷ありなど)、サイン入り・大会記念版などの印刷違い、パラレル仕様の違いにより、同じ店舗・同じカードでも複数の買取価格が存在する場合があります。表示は代表的な1件です。",
  },
  {
    q: "対応している店舗はどこですか？",
    a: (
      <>
        現在9店舗に対応しています。詳しくは
        <Link href="/shops" className="text-[var(--gold)] hover:underline">
          対応店舗一覧
        </Link>
        をご覧ください。
      </>
    ),
  },
  {
    q: "対応しているカードゲームは何ですか？",
    a: "遊戯王・ワンピースカード・ポケモンカードの3ジャンルに対応しています。今後も拡大予定です。",
  },
  {
    q: "「急上昇/急降下ピックアップ」は何を基準に選ばれていますか？",
    a: "直近の買取価格の変動が大きいカードをピックアップして表示する機能です。現在は実データの蓄積を開始したばかりのため、一部サンプルデータを表示している場合があります。",
  },
  {
    q: "掲載されていない店舗を追加してほしいのですが",
    a: (
      <>
        <Link href="/contact" className="text-[var(--gold)] hover:underline">
          お問い合わせフォーム
        </Link>
        からご要望をお送りください。robots.txtや利用規約を確認したうえで、掲載可能か検討します。
      </>
    ),
  },
  {
    q: "利用料金はかかりますか？",
    a: "無料でご利用いただけます。",
  },
  {
    q: "このサイトは各店舗の公式サイトですか？",
    a: "いいえ、当サイトはいずれの掲載店舗とも提携・協力関係にない、非公式の価格比較サイトです。詳しくはこのサイトについてをご覧ください。",
  },
];

export default function FaqPage() {
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqs.map((item) => ({
      "@type": "Question",
      name: item.q,
      acceptedAnswer: {
        "@type": "Answer",
        text: typeof item.a === "string" ? item.a : "",
      },
    })),
  };

  return (
    <InfoPage title={title} lead={description}>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      {faqs.map((item) => (
        <InfoSection key={item.q} title={`Q. ${item.q}`}>
          <p>A. {item.a}</p>
        </InfoSection>
      ))}
    </InfoPage>
  );
}
