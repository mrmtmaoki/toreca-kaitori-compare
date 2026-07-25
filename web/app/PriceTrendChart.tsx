"use client";

import { useId, useMemo, useState } from "react";

export interface PriceTrendPoint {
  date: string; // "YYYY-MM-DD"
  maxPrice: number;
  medianPrice: number;
  confirmed?: boolean;
}

const WIDTH = 800;
const HEIGHT = 300;
const PAD_LEFT = 56;
const PAD_RIGHT = 16;
const PAD_TOP = 16;
const PAD_BOTTOM = 32;

function formatYen(n: number) {
  return `¥${Math.round(n).toLocaleString()}`;
}

function formatDateLabel(iso: string) {
  const [, m, d] = iso.split("-");
  return `${Number(m)}/${Number(d)}`;
}

export default function PriceTrendChart({
  data,
  onHover,
}: {
  data: PriceTrendPoint[];
  onHover?: (point: PriceTrendPoint | null) => void;
}) {
  const [hoverIdx, setHoverIdx] = useState<number | null>(null);
  const gradientId = useId();

  const trendUp = data.length > 1 ? data[data.length - 1].maxPrice >= data[0].maxPrice : true;
  const lineColor = trendUp ? "var(--best)" : "var(--down)";

  const { xFor, yFor, maxSegments, medianPath, areaPath, yTicks, xTickIdx } = useMemo(() => {
    const allValues = data.flatMap((d) => [d.maxPrice, d.medianPrice]);
    const rawMin = Math.min(...allValues);
    const rawMax = Math.max(...allValues);
    const spread = rawMax - rawMin || rawMax * 0.1 || 1;
    const minY = Math.max(0, rawMin - spread * 0.1);
    const maxY = rawMax + spread * 0.1;

    const innerW = WIDTH - PAD_LEFT - PAD_RIGHT;
    const innerH = HEIGHT - PAD_TOP - PAD_BOTTOM;
    const baseY = PAD_TOP + innerH;

    const xFor = (i: number) =>
      PAD_LEFT + (data.length <= 1 ? 0 : (i / (data.length - 1)) * innerW);
    const yFor = (v: number) => PAD_TOP + innerH - ((v - minY) / (maxY - minY)) * innerH;

    const buildPath = (key: "maxPrice" | "medianPrice") =>
      data.map((d, i) => `${i === 0 ? "M" : "L"}${xFor(i)},${yFor(d[key])}`).join(" ");

    // The max-price line is split into per-segment paths, not one continuous
    // path, so a segment can render dashed when it ends on an unconfirmed
    // point (see PriceEvent.confirmed in web/lib/priceTrend.ts). Only the
    // *destination* point's confirmed status matters here, not the starting
    // point — a segment represents "the line moved to this new value", and
    // that move is trustworthy exactly when the new value is; whether the
    // earlier point was itself independently reconfirmed that day is a
    // separate fact already reflected in the *previous* segment's styling.
    // (Requiring both endpoints confirmed was a real bug: it dashed a
    // segment showing a genuine, confirmed price rise just because the
    // pre-rise starting point happened to be an unconfirmed carry-forward —
    // confirmed 2026-07-25 via a real card.)
    const maxSegments = data.slice(1).map((d, i) => ({
      d: `M${xFor(i)},${yFor(data[i].maxPrice)} L${xFor(i + 1)},${yFor(d.maxPrice)}`,
      dashed: d.confirmed === false,
    }));

    const maxPath = buildPath("maxPrice");
    const areaPath =
      data.length > 0
        ? `${maxPath} L${xFor(data.length - 1)},${baseY} L${xFor(0)},${baseY} Z`
        : "";

    const yTickCount = 4;
    const yTicks = Array.from({ length: yTickCount + 1 }, (_, i) => minY + ((maxY - minY) * i) / yTickCount);

    const xTickCount = Math.min(6, data.length);
    const xTickIdx = Array.from({ length: xTickCount }, (_, i) =>
      Math.round((i / (xTickCount - 1 || 1)) * (data.length - 1))
    );

    return { xFor, yFor, maxSegments, medianPath: buildPath("medianPrice"), areaPath, yTicks, xTickIdx };
  }, [data]);

  if (data.length === 0) return null;

  function setHover(idx: number | null) {
    setHoverIdx(idx);
    onHover?.(idx === null ? null : data[idx]);
  }

  function handleMove(e: React.PointerEvent<SVGSVGElement>) {
    const svg = e.currentTarget;
    const rect = svg.getBoundingClientRect();
    const relX = ((e.clientX - rect.left) / rect.width) * WIDTH;
    const innerW = WIDTH - PAD_LEFT - PAD_RIGHT;
    const ratio = (relX - PAD_LEFT) / innerW;
    const idx = Math.round(ratio * (data.length - 1));
    setHover(Math.min(data.length - 1, Math.max(0, idx)));
  }

  const lastIdx = data.length - 1;

  return (
    <div className="relative w-full">
      <div className="mb-2 flex items-center gap-4 text-xs">
        <span className="flex items-center gap-1.5">
          <span className="inline-block h-0.5 w-4 rounded-full" style={{ background: lineColor }} />
          <span className="text-[var(--ink-soft)]">最高価格</span>
        </span>
        <span className="flex items-center gap-1.5">
          <span className="inline-block h-0.5 w-4 rounded-full bg-[var(--gold)] opacity-70" />
          <span className="text-[var(--ink-soft)]">中央値</span>
        </span>
        {maxSegments.some((s) => s.dashed) && (
          <span className="flex items-center gap-1.5">
            <svg width="16" height="2" className="shrink-0">
              <line x1="0" y1="1" x2="16" y2="1" stroke={lineColor} strokeWidth={2} strokeDasharray="4 3" opacity={0.65} />
            </svg>
            <span className="text-[var(--ink-soft)]">未確認期間(推定)</span>
          </span>
        )}
      </div>

      <svg
        viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
        className="w-full touch-none"
        onPointerMove={handleMove}
        onPointerLeave={() => setHover(null)}
      >
        <defs>
          <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={lineColor} stopOpacity={0.28} />
            <stop offset="100%" stopColor={lineColor} stopOpacity={0} />
          </linearGradient>
        </defs>

        {yTicks.map((v, i) => (
          <g key={i}>
            <line
              x1={PAD_LEFT}
              x2={WIDTH - PAD_RIGHT}
              y1={yFor(v)}
              y2={yFor(v)}
              stroke="var(--line)"
              strokeWidth={1}
            />
            <text
              x={PAD_LEFT - 8}
              y={yFor(v)}
              textAnchor="end"
              dominantBaseline="middle"
              className="mono"
              fontSize={10}
              fill="var(--ink-soft)"
            >
              {formatYen(v)}
            </text>
          </g>
        ))}

        {xTickIdx.map((idx) => (
          <text
            key={idx}
            x={xFor(idx)}
            y={HEIGHT - PAD_BOTTOM + 18}
            textAnchor="middle"
            className="mono"
            fontSize={10}
            fill="var(--ink-soft)"
          >
            {formatDateLabel(data[idx].date)}
          </text>
        ))}

        <path d={areaPath} fill={`url(#${gradientId})`} stroke="none" />
        <path d={medianPath} fill="none" stroke="var(--gold)" strokeWidth={1.5} strokeOpacity={0.7} strokeDasharray="4 3" />
        {maxSegments.map((seg, i) => (
          <path
            key={i}
            d={seg.d}
            fill="none"
            stroke={lineColor}
            strokeWidth={2.5}
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeDasharray={seg.dashed ? "6 4" : undefined}
            opacity={seg.dashed ? 0.65 : 1}
          />
        ))}

        {/* Pinned marker at the latest point, stock-app style, hidden while hovering elsewhere */}
        {hoverIdx === null && (
          <circle cx={xFor(lastIdx)} cy={yFor(data[lastIdx].maxPrice)} r={4} fill={lineColor}>
            <animate attributeName="r" values="4;6;4" dur="1.8s" repeatCount="indefinite" />
          </circle>
        )}

        {hoverIdx !== null && (
          <>
            <line
              x1={xFor(hoverIdx)}
              x2={xFor(hoverIdx)}
              y1={PAD_TOP}
              y2={HEIGHT - PAD_BOTTOM}
              stroke="var(--ink-soft)"
              strokeWidth={1}
              strokeDasharray="3 3"
            />
            <circle cx={xFor(hoverIdx)} cy={yFor(data[hoverIdx].maxPrice)} r={4} fill={lineColor} />
            <circle cx={xFor(hoverIdx)} cy={yFor(data[hoverIdx].medianPrice)} r={3.5} fill="var(--gold)" />
          </>
        )}
      </svg>
    </div>
  );
}
