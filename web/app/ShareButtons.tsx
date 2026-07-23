function buildTweetText(cardName: string, maxPrice: number): string {
  return `『${cardName}』の買取価格、最高¥${maxPrice.toLocaleString()}！\n買取レーダーで店舗ごとの価格を一括比較👇`;
}

export default function ShareButtons({ cardName, maxPrice, url }: { cardName: string; maxPrice: number; url: string }) {
  const text = buildTweetText(cardName, maxPrice);
  const tweetUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}&hashtags=${encodeURIComponent("買取レーダー")}`;
  const lineUrl = `https://social-plugins.line.me/lineit/share?url=${encodeURIComponent(url)}&text=${encodeURIComponent(text)}`;

  return (
    <div className="flex gap-2">
      <a
        href={tweetUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="flex items-center gap-1.5 rounded-full border border-[var(--line)] bg-[var(--bg-card)] px-3.5 py-2 text-xs font-bold text-[var(--ink)] transition-colors hover:border-[var(--gold)]/50"
      >
        <svg width="13" height="13" viewBox="0 0 24 24" fill="#1DA1F2">
          <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
        </svg>
        Xでシェア
      </a>
      <a
        href={lineUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="flex items-center gap-1.5 rounded-full border border-[var(--line)] bg-[var(--bg-card)] px-3.5 py-2 text-xs font-bold text-[var(--ink)] transition-colors hover:border-[var(--gold)]/50"
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="#06C755">
          <path d="M12 2C6.477 2 2 5.63 2 10.09c0 4 3.55 7.35 8.35 7.98.325.07.766.216.878.497.101.254.066.653.033.91l-.142.85c-.043.253-.2.99.867.54 1.067-.45 5.76-3.39 7.858-5.807C21.11 13.42 22 11.83 22 10.09 22 5.63 17.523 2 12 2z" />
        </svg>
        LINEでシェア
      </a>
    </div>
  );
}
