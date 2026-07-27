import type { Metadata } from "next";
import Link from "next/link";
import { Noto_Sans_JP, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import ThemeToggle from "./ThemeToggle";
import { SITE_NAME, SITE_URL } from "@/lib/site";

// Applies the saved theme before first paint so switching to light mode
// doesn't flash dark on the next page load.
const THEME_INIT_SCRIPT = `
  try {
    var t = localStorage.getItem('theme');
    if (t === 'light') document.documentElement.setAttribute('data-theme', 'light');
  } catch (e) {}
`;

const notoSansJP = Noto_Sans_JP({
  variable: "--font-noto-sans-jp",
  subsets: ["latin"],
  weight: ["400", "500", "700", "900"],
});

const jetBrainsMono = JetBrains_Mono({
  variable: "--font-jetbrains-mono",
  subsets: ["latin"],
  weight: ["500", "700"],
});

const siteLinks = [
  { href: "/shops", label: "対応店舗一覧" },
  { href: "/trending", label: "急上昇/急降下" },
  { href: "/faq", label: "よくある質問" },
  { href: "/about", label: "このサイトについて" },
  { href: "/contact", label: "お問い合わせ" },
  { href: "/privacy", label: "プライバシーポリシー" },
  { href: "/terms", label: "利用規約" },
];

const DEFAULT_TITLE = `トレカ買取価格 一覧比較・チャート｜${SITE_NAME}`;
const DEFAULT_DESCRIPTION =
  "秋葉原のトレカ(とれか)買取店と全国対応の宅配買取の価格を一覧にまとめて比較。複数サイトを見て回らなくても、同じカードの買取価格を1画面でチェックできます。価格推移チャートで急上昇/急降下カードもひと目で分かります。";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: DEFAULT_TITLE,
    template: `%s｜${SITE_NAME}`,
  },
  description: DEFAULT_DESCRIPTION,
  alternates: { canonical: SITE_URL },
  openGraph: {
    title: DEFAULT_TITLE,
    description: DEFAULT_DESCRIPTION,
    url: SITE_URL,
    siteName: SITE_NAME,
    locale: "ja_JP",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: DEFAULT_TITLE,
    description: DEFAULT_DESCRIPTION,
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="ja"
      className={`${notoSansJP.variable} ${jetBrainsMono.variable} h-full antialiased`}
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }} />
      </head>
      <body className="min-h-full flex flex-col">
        <ThemeToggle />
        {children}
        <nav className="mx-auto w-full max-w-6xl border-t border-[var(--line)] px-5 py-8">
          <ul className="flex flex-wrap gap-x-5 gap-y-2 text-xs text-[var(--ink-soft)]">
            {siteLinks.map((link) => (
              <li key={link.href}>
                <Link href={link.href} className="hover:text-[var(--gold)] hover:underline">
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>
          <p className="mt-4 text-[10px] text-[var(--ink-soft)]">
            <span className="mono tracking-wider">PR</span>{" "}
            <a
              href="https://px.a8.net/svt/ejp?a8mat=4B8810+67V08I+5PLE+5YRHE"
              rel="nofollow noopener"
              target="_blank"
              className="hover:text-[var(--gold)] hover:underline"
            >
              【どっかん！トレカ】
            </a>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              width={1}
              height={1}
              src="https://www12.a8.net/0.gif?a8mat=4B8810+67V08I+5PLE+5YRHE"
              alt=""
              style={{ position: "absolute" }}
            />
          </p>
          <p className="mono mt-2 text-[10px] text-[var(--ink-soft)]">
            © {new Date().getFullYear()} {SITE_NAME}
          </p>
        </nav>
      </body>
    </html>
  );
}
