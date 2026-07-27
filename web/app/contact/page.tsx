import type { Metadata } from "next";
import { InfoPage } from "../InfoPage";
import { SITE_NAME, SITE_URL } from "@/lib/site";
import ContactForm from "./ContactForm";

const title = "お問い合わせ";
const description = `${SITE_NAME}へのご質問・ご意見・店舗追加のご要望・不具合報告はこちらのフォームからお願いします。`;

export const metadata: Metadata = {
  title,
  description,
  alternates: { canonical: `${SITE_URL}/contact` },
  openGraph: {
    title,
    description,
    url: `${SITE_URL}/contact`,
    siteName: SITE_NAME,
    locale: "ja_JP",
    type: "article",
    images: [`${SITE_URL}/opengraph-image`],
  },
};

export default function ContactPage() {
  return (
    <InfoPage title={title} lead={description}>
      <ContactForm />
      <p className="text-xs text-[var(--ink-soft)]">
        送信いただいた内容によっては、返信までお時間をいただく場合や、返信できない場合があります。あらかじめご了承ください。
      </p>
    </InfoPage>
  );
}
