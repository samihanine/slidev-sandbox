import { useId, useRef } from "react";
import { formatValue, useSize, useSlideEnv } from "@/components/slide/context";
import type { ChartSpec } from "@/lib/specs";
import { pickColor } from "@/lib/themes";

/** Round axis bounds: 0 to a "nice" maximum with 4 or 5 steps. */
export function niceScale(max: number) {
  if (max <= 0) return { max: 1, step: 0.25 };
  const raw = max / 4;
  const power = 10 ** Math.floor(Math.log10(raw));
  const step = ([1, 2, 2.5, 5, 10].find((m) => m * power >= raw) ?? 10) * power;
  return { max: Math.ceil(max / step) * step, step };
}

/** Everything the PowerPoint export needs to draw the same chart natively. */
export type ChartExport = {
  chart: ChartSpec;
  colors: string[];
  text: string;
  muted: string;
  grid: string;
  font: string;
};

const FONT = 15;

function Legend({ items }: { items: { name: string; color: string }[] }) {
  return (
    <>
      {items.map((item) => (
        <span key={item.name} style={{ display: "inline-flex", alignItems: "center", gap: 8, marginRight: 22 }}>
          <span style={{ width: 12, height: 12, borderRadius: 3, background: item.color }} />
          {item.name}
        </span>
      ))}
    </>
  );
}

export function Chart({ chart, className }: { chart: ChartSpec; className?: string }) {
  const { theme } = useSlideEnv();
  const ref = useRef<HTMLDivElement>(null);
  const { width, height } = useSize(ref);
  const gradientId = useId().replace(/:/g, "");
  const round = chart.type === "pie" || chart.type === "donut";
  const colors = round
    ? chart.labels.map((_, i) => pickColor(theme, i))
    : chart.series.map((s, i) => pickColor(theme, i, s.color));
  const grid = theme.dark ? "rgba(255,255,255,0.12)" : "rgba(15,23,42,0.10)";
  const exported: ChartExport = { chart, colors, text: theme.text, muted: theme.muted, grid, font: theme.bodyFont };
  const legendItems = round
    ? chart.labels.map((name, i) => ({ name, color: colors[i] as string }))
    : chart.series.map((s, i) => ({ name: s.name, color: colors[i] as string }));

  let body: React.ReactNode = null;
  if (width > 0 && height > 0) {
    if (round) {
      const total = chart.series[0]?.data.reduce((a, b) => a + Math.max(0, b), 0) || 1;
      const legendW = chart.legend ? Math.min(300, width * 0.42) : 0;
      const size = Math.min(height, width - legendW - 24);
      const r = size / 2;
      const cx = (width - legendW - (chart.legend ? 24 : 0)) / 2;
      const cy = height / 2;
      const inner = chart.type === "donut" ? r * 0.58 : 0;
      let angle = -Math.PI / 2;
      const slices = (chart.series[0]?.data ?? []).map((value, i) => {
        const share = Math.max(0, value) / total;
        const start = angle;
        const end = angle + share * Math.PI * 2;
        angle = end;
        const large = end - start > Math.PI ? 1 : 0;
        const p = (rad: number, radius: number) => `${cx + Math.cos(rad) * radius},${cy + Math.sin(rad) * radius}`;
        const path =
          share >= 0.9999
            ? `M${cx - r},${cy}a${r},${r} 0 1,0 ${r * 2},0a${r},${r} 0 1,0 ${-r * 2},0${inner ? `M${cx - inner},${cy}a${inner},${inner} 0 1,1 ${inner * 2},0a${inner},${inner} 0 1,1 ${-inner * 2},0` : ""}`
            : inner
              ? `M${p(start, r)}A${r},${r} 0 ${large} 1 ${p(end, r)}L${p(end, inner)}A${inner},${inner} 0 ${large} 0 ${p(start, inner)}Z`
              : `M${cx},${cy}L${p(start, r)}A${r},${r} 0 ${large} 1 ${p(end, r)}Z`;
        const mid = (start + end) / 2;
        const labelR = inner ? (r + inner) / 2 : r * 0.64;
        return {
          path,
          share,
          color: colors[i] as string,
          lx: cx + Math.cos(mid) * labelR,
          ly: cy + Math.sin(mid) * labelR,
        };
      });
      body = (
        <>
          <svg width={width} height={height} role="img" aria-label={chart.title ?? "Graphique"}>
            {slices.map((slice, i) => (
              <path key={chart.labels[i]} d={slice.path} fill={slice.color} stroke={theme.bg} strokeWidth={3} />
            ))}
            {slices.map(
              (slice, i) =>
                slice.share >= 0.05 && (
                  <text
                    key={chart.labels[i]}
                    x={slice.lx}
                    y={slice.ly}
                    textAnchor="middle"
                    dominantBaseline="central"
                    fill="#ffffff"
                    fontSize={17}
                    fontWeight={700}
                  >
                    {Math.round(slice.share * 100)} %
                  </text>
                ),
            )}
          </svg>
          {chart.legend && (
            <div
              style={{
                position: "absolute",
                right: 0,
                top: 0,
                bottom: 0,
                width: legendW,
                display: "flex",
                flexDirection: "column",
                justifyContent: "center",
                gap: 14,
                fontSize: 19,
                color: theme.text,
              }}
            >
              {legendItems.map((item, i) => (
                <span key={item.name} style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <span style={{ width: 14, height: 14, borderRadius: 4, background: item.color, flex: "none" }} />
                  <span style={{ flex: 1 }}>{item.name}</span>
                  <span style={{ color: theme.muted, fontWeight: 600 }}>
                    {formatValue(chart.series[0]?.data[i] ?? 0, chart.unit)}
                  </span>
                </span>
              ))}
            </div>
          )}
        </>
      );
    } else {
      const horizontal = chart.type === "hbar";
      const legendH = chart.legend ? 34 : 0;
      const n = chart.labels.length;
      const totals = chart.labels.map((_, i) =>
        chart.stacked ? chart.series.reduce((sum, s) => sum + Math.max(0, s.data[i] ?? 0), 0) : 0,
      );
      const maxValue = chart.stacked ? Math.max(...totals) : Math.max(...chart.series.flatMap((s) => s.data));
      const scale = niceScale(maxValue);
      const ticks: number[] = [];
      for (let v = 0; v <= scale.max + 1e-9; v += scale.step) ticks.push(v);
      const tickLabel = (v: number) => formatValue(v, chart.unit);
      const labelW = horizontal ? Math.min(220, Math.max(...chart.labels.map((l) => l.length)) * 10 + 16) : 0;
      const axisW = horizontal ? 0 : Math.max(...ticks.map((t) => tickLabel(t).length)) * 8.6 + 14;
      const left = horizontal ? labelW : axisW;
      const top = legendH + 26;
      const bottom = 34;
      const right = horizontal ? 70 : 12;
      const plotW = Math.max(10, width - left - right);
      const plotH = Math.max(10, height - top - bottom);
      const showValues = n * (chart.stacked ? 1 : chart.series.length) <= 16;
      const elements: React.ReactNode[] = [];

      if (horizontal) {
        ticks.forEach((t) => {
          const x = left + (t / scale.max) * plotW;
          elements.push(
            <line key={`g${t}`} x1={x} x2={x} y1={top} y2={top + plotH} stroke={grid} strokeWidth={1} />,
            <text key={`t${t}`} x={x} y={top + plotH + 24} textAnchor="middle" fill={theme.muted} fontSize={FONT}>
              {tickLabel(t)}
            </text>,
          );
        });
        const band = plotH / n;
        const groups = chart.stacked ? 1 : chart.series.length;
        const barH = Math.min(46, (band * 0.68) / groups);
        chart.labels.forEach((label, i) => {
          const cy = top + band * i + band / 2;
          elements.push(
            <text
              key={`l${label}${i}`}
              x={left - 14}
              y={cy}
              textAnchor="end"
              dominantBaseline="central"
              fill={theme.text}
              fontSize={17}
            >
              {label}
            </text>,
          );
          let offset = 0;
          chart.series.forEach((s, si) => {
            const value = Math.max(0, s.data[i] ?? 0);
            const w = (value / scale.max) * plotW;
            const y = chart.stacked ? cy - barH / 2 : cy - (barH * groups) / 2 + si * barH;
            const x = left + (chart.stacked ? offset : 0);
            offset += chart.stacked ? w : 0;
            elements.push(
              <rect
                key={`b${si}-${i}`}
                x={x}
                y={y + 2}
                width={w}
                height={barH - 4}
                rx={Math.min(6, (barH - 4) / 2)}
                fill={colors[si]}
              />,
            );
            if (showValues && !chart.stacked)
              elements.push(
                <text
                  key={`v${si}-${i}`}
                  x={x + w + 8}
                  y={y + barH / 2}
                  dominantBaseline="central"
                  fill={theme.text}
                  fontSize={FONT}
                  fontWeight={600}
                >
                  {formatValue(value, chart.unit)}
                </text>,
              );
          });
        });
      } else {
        ticks.forEach((t) => {
          const y = top + plotH - (t / scale.max) * plotH;
          elements.push(
            <line
              key={`g${t}`}
              x1={left}
              x2={left + plotW}
              y1={y}
              y2={y}
              stroke={grid}
              strokeWidth={1}
              strokeDasharray={t ? "4 6" : undefined}
            />,
            <text
              key={`t${t}`}
              x={left - 12}
              y={y}
              textAnchor="end"
              dominantBaseline="central"
              fill={theme.muted}
              fontSize={FONT}
            >
              {tickLabel(t)}
            </text>,
          );
        });
        const band = plotW / n;
        chart.labels.forEach((label, i) => {
          elements.push(
            <text
              key={`l${label}${i}`}
              x={left + band * i + band / 2}
              y={top + plotH + 26}
              textAnchor="middle"
              fill={theme.text}
              fontSize={17}
            >
              {label}
            </text>,
          );
        });
        const yOf = (v: number) => top + plotH - (Math.max(0, v) / scale.max) * plotH;
        if (chart.type === "bar") {
          const groups = chart.stacked ? 1 : chart.series.length;
          const barW = Math.min(64, (band * 0.66) / groups);
          chart.labels.forEach((_, i) => {
            let stack = 0;
            chart.series.forEach((s, si) => {
              const value = Math.max(0, s.data[i] ?? 0);
              const h = (value / scale.max) * plotH;
              const x = chart.stacked
                ? left + band * i + band / 2 - barW / 2
                : left + band * i + band / 2 - (barW * groups) / 2 + si * barW;
              const y = top + plotH - h - stack;
              stack += chart.stacked ? h : 0;
              elements.push(
                <rect
                  key={`b${si}-${i}`}
                  x={x + 3}
                  y={y}
                  width={barW - 6}
                  height={h}
                  rx={Math.min(7, (barW - 6) / 2)}
                  fill={colors[si]}
                />,
              );
              if (showValues && !chart.stacked)
                elements.push(
                  <text
                    key={`v${si}-${i}`}
                    x={x + barW / 2}
                    y={y - 9}
                    textAnchor="middle"
                    fill={theme.text}
                    fontSize={FONT}
                    fontWeight={600}
                  >
                    {formatValue(value, chart.unit)}
                  </text>,
                );
            });
          });
        } else {
          chart.series.forEach((s, si) => {
            const color = colors[si] as string;
            const points = s.data.map((v, i) => ({ x: left + band * i + band / 2, y: yOf(v) }));
            const line = points.map((p, i) => `${i ? "L" : "M"}${p.x},${p.y}`).join("");
            if (chart.type === "area" && points.length) {
              const first = points[0] as { x: number };
              const last = points[points.length - 1] as { x: number };
              elements.push(
                <defs key={`d${si}`}>
                  <linearGradient id={`${gradientId}${si}`} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0" stopColor={color} stopOpacity={0.42} />
                    <stop offset="1" stopColor={color} stopOpacity={0.02} />
                  </linearGradient>
                </defs>,
                <path
                  key={`a${si}`}
                  d={`${line}L${last.x},${top + plotH}L${first.x},${top + plotH}Z`}
                  fill={`url(#${gradientId}${si})`}
                />,
              );
            }
            elements.push(
              <path
                key={`p${si}`}
                d={line}
                fill="none"
                stroke={color}
                strokeWidth={4}
                strokeLinecap="round"
                strokeLinejoin="round"
              />,
            );
            points.forEach((p, i) => {
              elements.push(
                <circle key={`c${si}-${i}`} cx={p.x} cy={p.y} r={6} fill={theme.bg} stroke={color} strokeWidth={3.5} />,
              );
            });
            if (showValues && chart.series.length === 1)
              points.forEach((p, i) => {
                elements.push(
                  <text
                    key={`v${si}-${i}`}
                    x={p.x}
                    y={p.y - 16}
                    textAnchor="middle"
                    fill={theme.text}
                    fontSize={FONT}
                    fontWeight={600}
                  >
                    {formatValue(s.data[i] ?? 0, chart.unit)}
                  </text>,
                );
              });
          });
        }
      }

      body = (
        <>
          {chart.legend && (
            <div
              style={{
                position: "absolute",
                top: 0,
                left: left,
                right: 0,
                fontSize: 17,
                color: theme.text,
                lineHeight: "24px",
              }}
            >
              <Legend items={legendItems} />
            </div>
          )}
          <svg width={width} height={height} role="img" aria-label={chart.title ?? "Graphique"}>
            {elements}
          </svg>
        </>
      );
    }
  }

  return (
    <div
      ref={ref}
      className={className ? `s-chart ${className}` : "s-chart"}
      data-x="chart"
      data-chart={JSON.stringify(exported)}
    >
      {body}
    </div>
  );
}
