import type { Metadata } from "next";
import Link from "next/link";
import { InfoPage, InfoSection } from "../InfoPage";
import { SITE_NAME, SITE_URL } from "@/lib/site";

const title = "このサイトについて";
const description = `${SITE_NAME}がどんなサイトか、運営の目的や仕組みについて説明します。`;

export const metadata: Metadata = {
  title,
  description,
  alternates: { canonical: `${SITE_URL}/about` },
  openGraph: {
    title,
    description,
    url: `${SITE_URL}/about`,
    siteName: SITE_NAME,
    locale: "ja_JP",
    type: "article",
    images: [`${SITE_URL}/opengraph-image`],
  },
};

export default function AboutPage() {
  return (
    <InfoPage title={title} lead={description}>
      <InfoSection title="サイトの目的">
        <p>
          トレカ(トレーディングカード)を売りたいとき、「どの店舗が一番高く買い取ってくれるか」を調べるには、店舗ごとに1つずつ買取価格ページを見て回る必要があります。{SITE_NAME}
          は、複数の買取店のカード価格情報を毎日自動で収集し、一覧にまとめて横断比較できるようにした無料サービスです。
        </p>
        <p>対応ジャンルは遊戯王・ワンピースカード・ポケモンカードです。今後も対応店舗・ジャンルを拡大していく予定です。</p>
      </InfoSection>

      <InfoSection title="価格データについて">
        <p>
          掲載している価格は、各店舗が公開している買取価格ページから自動収集したものです。robots.txtや利用規約を確認したうえで、公開に問題がないと判断した店舗のみ掲載しています。
        </p>
        <p>
          価格は定期的に更新していますが、実際の買取価格は在庫状況・カードの状態(美品/傷ありなど)・キャンペーンの有無等により変動します。正式な金額は必ず各店舗のページでご確認ください。詳しくは
          <Link href="/terms" className="text-[var(--gold)] hover:underline">
            利用規約
          </Link>
          をご覧ください。
        </p>
      </InfoSection>

      <InfoSection title="運営者情報">
        <p>
          運営者：{SITE_NAME} 運営者
          <br />
          お問い合わせ：
          <Link href="/contact" className="text-[var(--gold)] hover:underline">
            お問い合わせページ
          </Link>
          よりご連絡ください。
        </p>
      </InfoSection>
    </InfoPage>
  );
}
