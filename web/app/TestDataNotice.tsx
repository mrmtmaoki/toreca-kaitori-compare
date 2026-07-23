/**
 * TEMPORARY — remove once web/lib/dummyTrendData.ts is no longer used
 * anywhere (see that file's own header comment). Shown alongside every
 * trend-chart section while it's still running on placeholder data.
 */
export default function TestDataNotice() {
  return (
    <p className="mb-4 flex items-start gap-1.5 rounded-lg bg-[var(--gold-soft)] px-3 py-2 text-xs text-[var(--gold)]">
      <span className="mono font-bold">⚠ テストデータ表示中</span>
      <span className="text-[var(--ink-soft)]">
        ここに表示されている価格推移はサンプルです。実際のデータは自動収集を開始したばかりで、近日中に実データへ切り替え予定です。
      </span>
    </p>
  );
}
