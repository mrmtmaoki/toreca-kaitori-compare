import TrendCard from "../TrendCard";
import { DUMMY_TREND_CARDS, generateDummyEvents } from "@/lib/dummyTrendData";

export default function TrendDemoPage() {
  return (
    <main className="mx-auto max-w-3xl px-4 py-10">
      <h1 className="mb-1 text-xl font-bold text-[var(--ink)]">価格推移チャート(テストデータ)</h1>
      <p className="mb-8 text-sm text-[var(--ink-soft)]">
        実データが溜まるまでのプロトタイプ。「青眼の白龍」だけ履歴45日分(自動化直後を想定)、
        他は400日分のダミー価格変動イベントで生成。期間を切り替えると自動で日次/週次/月次に集計されます。
      </p>

      <div className="flex flex-col gap-8">
        {DUMMY_TREND_CARDS.map((card) => (
          <TrendCard
            key={card.name}
            name={card.name}
            sub={card.sub}
            events={generateDummyEvents(card.days, card.base, card.seed, card.direction)}
          />
        ))}
      </div>
    </main>
  );
}
