import { useMemo, useRef } from "react";
import { useSize, useSlideEnv } from "@/components/slide/context";
import { layoutDiagram } from "@/lib/diagram-layout";
import { resolveIcon } from "@/lib/icons";
import type { CardItem, DiagramSpec, LogoItem, StatItem } from "@/lib/specs";
import { alpha, pickColor } from "@/lib/themes";

/** An icon of the deck: Lucide name, `logo:brand` or a picture of the folder. */
export function Icon({
  name,
  color,
  size,
  brand,
  className,
}: {
  name?: string;
  color: string;
  size?: number;
  brand?: boolean;
  className?: string;
}) {
  const { theme, resolve } = useSlideEnv();
  const icon = resolveIcon(name, color, { background: theme.bg, brand });
  if (!icon) return null;
  const src = icon.kind === "svg" ? icon.src : resolve(icon.path);
  if (!src) return null;
  return (
    <img
      src={src}
      alt=""
      data-x="image"
      data-path={icon.kind === "file" ? icon.path : undefined}
      className={className}
      style={size ? { width: size, height: size, objectFit: "contain" } : { objectFit: "contain" }}
    />
  );
}

/** A colored square holding an icon. Brand logos sit on a neutral tile to keep their colors. */
function Badge({ icon, color, size = 52 }: { icon?: string; color: string; size?: number }) {
  const { theme } = useSlideEnv();
  if (!icon) return null;
  const isLogo = icon.startsWith("logo:");
  const background = isLogo
    ? theme.dark
      ? "rgba(255,255,255,0.92)"
      : "#ffffff"
    : alpha(color, theme.dark ? 0.2 : 0.13);
  return (
    <div
      className="s-badge"
      data-x="box"
      style={{
        width: size,
        height: size,
        background,
        border: isLogo && !theme.dark ? `1px solid ${theme.border}` : undefined,
      }}
    >
      <Icon name={icon} color={color} size={Math.round(size * 0.54)} brand />
    </div>
  );
}

const columnsFor = (count: number) => (count <= 4 ? count : count <= 6 ? 3 : 4);

export function Stats({ items }: { items: StatItem[] }) {
  const { theme } = useSlideEnv();
  return (
    <div className="s-grid" style={{ gridTemplateColumns: `repeat(${columnsFor(items.length)}, minmax(0, 1fr))` }}>
      {items.map((item, i) => {
        const color = pickColor(theme, i, item.color);
        const down = item.trend?.trim().startsWith("-") || item.trend?.trim().startsWith("−");
        const trendColor = down ? "#ef4444" : "#10b981";
        return (
          <div key={`${item.label}${i}`} className="s-card" data-x="box">
            <Badge icon={item.icon} color={color} />
            {item.trend && (
              <span
                className="s-trend"
                data-x="text"
                style={{ background: alpha(trendColor, 0.14), color: trendColor }}
              >
                {item.trend}
              </span>
            )}
            <p className="s-stat-value" data-x="text" style={{ color }}>
              {item.value}
            </p>
            <p className="s-stat-label" data-x="text">
              {item.label}
            </p>
          </div>
        );
      })}
    </div>
  );
}

export function Cards({ items }: { items: CardItem[] }) {
  const { theme } = useSlideEnv();
  return (
    <div className="s-grid" style={{ gridTemplateColumns: `repeat(${columnsFor(items.length)}, minmax(0, 1fr))` }}>
      {items.map((item, i) => {
        const color = pickColor(theme, i, item.color);
        return (
          <div key={`${item.title}${i}`} className="s-card" data-x="box">
            <Badge icon={item.icon} color={color} />
            <p className="s-card-title" data-x="text">
              {item.title}
            </p>
            {item.text && (
              <p className="s-card-text" data-x="text">
                {item.text}
              </p>
            )}
          </div>
        );
      })}
    </div>
  );
}

export function Logos({ items }: { items: LogoItem[] }) {
  const { theme } = useSlideEnv();
  return (
    <div className="s-logos s-grow">
      {items.map((item, i) => (
        <div key={`${item.icon}${i}`} className="s-logo-item" data-x="box">
          <Icon name={item.icon} color={theme.text} size={56} brand />
          {item.label && (
            <p className="s-logo-label" data-x="text">
              {item.label}
            </p>
          )}
        </div>
      ))}
    </div>
  );
}

/** Draws a diagram at its natural size, then scales it down to fit its box. */
export function Diagram({ diagram }: { diagram: DiagramSpec }) {
  const { theme } = useSlideEnv();
  const ref = useRef<HTMLDivElement>(null);
  const box = useSize(ref);
  const layout = useMemo(() => layoutDiagram(diagram), [diagram]);
  const margin = 24;
  const scale =
    box.width && box.height
      ? Math.min(1.25, (box.width - margin) / layout.width, (box.height - margin) / layout.height)
      : 0;
  const byId = new Map(diagram.nodes.map((node, i) => [node.id, { node, i }]));
  const stroke = theme.dark ? "rgba(255,255,255,0.45)" : "rgba(15,23,42,0.35)";

  return (
    <div ref={ref} className="s-fit-box s-grow">
      {scale > 0 && (
        <div
          className="s-diagram"
          style={{ width: layout.width, height: layout.height, transform: `scale(${scale})` }}
          data-diagram
        >
          <svg
            width={layout.width}
            height={layout.height}
            style={{ position: "absolute", inset: 0, overflow: "visible" }}
            data-x="edges"
            data-edges={JSON.stringify({ width: layout.width, color: stroke, edges: layout.edges })}
            aria-hidden="true"
          >
            <defs>
              <marker id="s-arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto">
                <path d="M0,0 L10,5 L0,10 z" fill={stroke} />
              </marker>
            </defs>
            {layout.edges.map((edge) => (
              <polyline
                key={`${edge.from}-${edge.to}`}
                points={edge.points.map((p) => `${p.x},${p.y}`).join(" ")}
                fill="none"
                stroke={stroke}
                strokeWidth={2.5}
                strokeDasharray={edge.dashed ? "7 7" : undefined}
                markerEnd="url(#s-arrow)"
              />
            ))}
          </svg>
          {layout.nodes.map((placed) => {
            const entry = byId.get(placed.id);
            if (!entry) return null;
            const color = pickColor(theme, entry.i, entry.node.color);
            return (
              <div
                key={placed.id}
                className="s-node"
                data-x="box"
                style={{ left: placed.x, top: placed.y, width: placed.w, height: placed.h, borderTop: undefined }}
              >
                <Badge icon={entry.node.icon} color={color} size={50} />
                <div className="s-node-text">
                  <p className="s-node-label" data-x="text">
                    {entry.node.label}
                  </p>
                  {entry.node.sub && (
                    <p className="s-node-sub" data-x="text">
                      {entry.node.sub}
                    </p>
                  )}
                </div>
              </div>
            );
          })}
          {layout.edges.map(
            (edge) =>
              edge.label && (
                <span
                  key={`l${edge.from}-${edge.to}`}
                  className="s-edge-label"
                  data-x="text"
                  data-box
                  style={{ left: edge.mid.x, top: edge.mid.y }}
                >
                  {edge.label}
                </span>
              ),
          )}
        </div>
      )}
    </div>
  );
}
