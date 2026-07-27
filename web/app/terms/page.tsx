import type { Metadata } from "next";
import Link from "next/link";
import { InfoPage, InfoSection } from "../InfoPage";
import { SITE_NAME, SITE_URL } from "@/lib/site";

const title = "利用規約";
const description = `${SITE_NAME}のご利用にあたっての規約です。`;

export const metadata: Metadata = {
  title,
  description,
  alternates: { canonical: `${SITE_URL}/terms` },
  openGraph: {
    title,
    description,
    url: `${SITE_URL}/terms`,
    siteName: SITE_NAME,
    locale: "ja_JP",
    type: "article",
    images: [`${SITE_URL}/opengraph-image`],
  },
};

export default function TermsPage() {
  return (
    <InfoPage title={title} lead={`本規約は、${SITE_NAME}(以下「当サイト」)が提供するサービスの利用条件を定めるものです。`}>
      <InfoSection title="第1条(適用)">
        <p>
          本規約は、当サイトが提供するすべてのサービス(以下「本サービス」)の利用に関わる一切の関係に適用されるものとします。ユーザーは、本サービスを利用することで、本規約に同意したものとみなします。
        </p>
      </InfoSection>

      <InfoSection title="第2条(サービスの内容)">
        <p>
          本サービスは、複数のトレーディングカード買取店が公開している買取価格情報を収集し、同一カードの価格を横断比較して表示する無料サービスです。当サイトは商品の売買・買取を直接仲介するものではなく、掲載している価格は目安であり、実際の買取金額を保証するものではありません。
        </p>
      </InfoSection>

      <InfoSection title="第3条(店舗との関係)">
        <p>
          当サイトは、掲載しているいずれの店舗とも資本関係・提携関係になく、独自に収集した公開情報をもとに運営しています。店舗名・カード名・商標等は各権利者に帰属します。
        </p>
      </InfoSection>

      <InfoSection title="第4条(禁止事項)">
        <p>ユーザーは、本サービスの利用にあたり、以下の行為をしてはならないものとします。</p>
        <ul className="list-disc space-y-1 pl-5">
          <li>法令または公序良俗に違反する行為</li>
          <li>当サイトのサーバーやネットワークの機能を妨害する行為</li>
          <li>本サービスのソースコードやコンテンツを不正に複製・改変・転用する行為</li>
          <li>その他、当サイトが不適切と判断する行為</li>
        </ul>
      </InfoSection>

      <InfoSection title="第5条(免責事項)">
        <p>
          当サイトは、掲載する価格情報の正確性、完全性、最新性、有用性等について、いかなる保証も行いません。本サービスの利用によって生じたいかなる損害(買取価格の相違、店舗とのトラブル、その他の損害を含みますがこれらに限りません)についても、当サイトは一切の責任を負いません。
        </p>
        <p>当サイトは、本サービスの内容を予告なく変更、中断、終了することがあり、これによってユーザーに生じた損害について責任を負いません。</p>
      </InfoSection>

      <InfoSection title="第6条(知的財産権)">
        <p>
          本サービスに関する著作権その他の知的財産権は、当サイトまたは正当な権利を有する第三者に帰属します。無断での複製・転載・改変等を禁止します。
        </p>
      </InfoSection>

      <InfoSection title="第7条(本規約の変更)">
        <p>
          当サイトは、必要と判断した場合には、ユーザーへの事前の通知なく本規約を変更できるものとします。変更後の規約は、当ページに掲載した時点から効力を生じるものとします。
        </p>
      </InfoSection>

      <InfoSection title="第8条(準拠法・管轄)">
        <p>
          本規約の解釈にあたっては、日本法を準拠法とします。本サービスに関して紛争が生じた場合には、当サイト運営者の所在地を管轄する裁判所を専属的合意管轄とします。
        </p>
      </InfoSection>

      <p className="text-xs text-[var(--ink-soft)]">
        個人情報の取り扱いについては
        <Link href="/privacy" className="text-[var(--gold)] hover:underline">
          プライバシーポリシー
        </Link>
        をご覧ください。
      </p>
      <p className="text-xs text-[var(--ink-soft)]">制定日：2026年7月23日</p>
    </InfoPage>
  );
}
