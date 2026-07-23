import type { Metadata } from "next";
import Link from "next/link";
import { InfoPage, InfoSection } from "../InfoPage";
import { SITE_NAME, SITE_URL } from "@/lib/site";

const title = "プライバシーポリシー";
const description = `${SITE_NAME}における、個人情報およびCookie等の取り扱いについて説明するプライバシーポリシーです。`;

export const metadata: Metadata = {
  title,
  description,
  alternates: { canonical: `${SITE_URL}/privacy` },
  openGraph: { title, description, url: `${SITE_URL}/privacy`, siteName: SITE_NAME, locale: "ja_JP", type: "article" },
};

export default function PrivacyPage() {
  return (
    <InfoPage title={title} lead={`${SITE_NAME}(以下「当サイト」)における、個人情報およびCookie等の取り扱いについて説明します。`}>
      <InfoSection title="掲載している価格データについて">
        <p>
          当サイトに掲載している買取価格は、各店舗が公開しているページから自動収集したものであり、ユーザーの個人情報を含みません。カード名・型番・買取価格・店舗名など、公開されている商品情報のみを収集しています。
        </p>
      </InfoSection>

      <InfoSection title="アクセス解析ツールについて">
        <p>
          当サイトでは、サイトの利用状況を把握するために、Googleアナリティクス等のアクセス解析ツールを利用する場合があります。これらのツールはトラフィックデータの収集のためにCookieを使用することがありますが、このデータは匿名で収集されており、個人を特定するものではありません。
        </p>
        <p>
          この機能はCookieを無効にすることで収集を拒否することが可能ですので、お使いのブラウザの設定をご確認ください。Googleアナリティクスの規約に関しては、
          <a
            href="https://marketingplatform.google.com/about/analytics/terms/jp/"
            target="_blank"
            rel="noopener noreferrer"
            className="text-[var(--gold)] hover:underline"
          >
            Googleアナリティクスサービス利用規約
          </a>
          をご覧ください。
        </p>
      </InfoSection>

      <InfoSection title="広告配信について(Cookieの利用)">
        <p>
          当サイトは、第三者配信の広告サービス(Google AdSenseを含みます)を利用する場合があります。このような広告配信事業者は、ユーザーの興味に応じた広告を表示するために、当サイトや他サイトへのアクセス情報をもとにしたCookieを使用することがあります。
        </p>
        <p>
          Googleを含む第三者配信事業者は、Cookieを使用してユーザーが当サイトや他のサイトに過去にアクセスした情報に基づいて広告を配信します。ユーザーは
          <a
            href="https://adssettings.google.com/"
            target="_blank"
            rel="noopener noreferrer"
            className="text-[var(--gold)] hover:underline"
          >
            広告設定
          </a>
          でパーソナライズ広告を無効にすることができます。Googleの広告に関するポリシーの詳細は
          <a
            href="https://policies.google.com/technologies/ads"
            target="_blank"
            rel="noopener noreferrer"
            className="text-[var(--gold)] hover:underline"
          >
            Googleの広告と検索に関するポリシー
          </a>
          をご確認ください。
        </p>
      </InfoSection>

      <InfoSection title="アフィリエイトプログラムについて">
        <p>
          当サイトは、掲載店舗が提供するアフィリエイトプログラムを利用する場合があります。ユーザーが当サイト経由で店舗ページへ移動し、買取等が成立した場合、当サイトが各店舗から紹介料を受け取ることがあります。掲載する価格情報や店舗の並び順は、アフィリエイト提携の有無によって意図的に操作することはありません。
        </p>
      </InfoSection>

      <InfoSection title="お問い合わせフォームについて">
        <p>
          お問い合わせフォームに入力いただいた内容は、お問い合わせへの回答以外の目的では利用しません。フォームの送信・管理には、当サイトのホスティング事業者であるNetlify,
          Inc.が提供する機能を利用しています。取り扱いの詳細は
          <a
            href="https://www.netlify.com/privacy/"
            target="_blank"
            rel="noopener noreferrer"
            className="text-[var(--gold)] hover:underline"
          >
            Netlifyのプライバシーポリシー
          </a>
          をご覧ください。
        </p>
      </InfoSection>

      <InfoSection title="商標・著作権について">
        <p>
          当サイトに掲載しているカード名・カード画像・作品名等の著作権・商標権は、各権利者(コナミデジタルエンタテインメント、バンダイ、株式会社ポケモン等)に帰属します。買取価格情報は各掲載店舗に帰属します。当サイトはいずれの権利者・掲載店舗とも提携・協力関係になく、公式サイトでもありません。
        </p>
      </InfoSection>

      <InfoSection title="免責事項">
        <p>
          当サイトのコンテンツ・価格情報について、できる限り正確な情報を掲載するよう努めておりますが、正確性・最新性・完全性を保証するものではありません。当サイトの情報を利用したことによって生じた損害等について、一切の責任を負いかねますのでご了承ください。
        </p>
        <p>当サイトからリンクによって他サイトに移動された場合、移動先サイトで提供される情報・サービス等について当サイトは一切の責任を負いません。</p>
      </InfoSection>

      <InfoSection title="プライバシーポリシーの変更について">
        <p>
          当サイトは、法令等の変更やサービス内容の変更に伴い、本ポリシーの内容を予告なく変更することがあります。変更後のプライバシーポリシーは、当ページに掲載した時点から効力を生じるものとします。
        </p>
        <p>
          お問い合わせは
          <Link href="/contact" className="text-[var(--gold)] hover:underline">
            こちら
          </Link>
          からお願いいたします。
        </p>
      </InfoSection>

      <p className="text-xs text-[var(--ink-soft)]">制定日：2026年7月23日</p>
    </InfoPage>
  );
}
