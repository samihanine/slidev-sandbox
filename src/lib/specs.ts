import { parse as parseYaml } from "yaml";

/** Fenced code blocks drawn as a visual instead of code: ```chart, ```diagram… */
export const SPEC_KINDS = ["chart", "diagram", "stats", "cards", "logos"] as const;
export type SpecKind = (typeof SPEC_KINDS)[number];

export const CHART_TYPES = ["bar", "hbar", "line", "area", "pie", "donut"] as const;
export type ChartType = (typeof CHART_TYPES)[number];

export type ChartSpec = {
  type: ChartType;
  title?: string;
  labels: string[];
  series: { name: string; data: number[]; color?: string }[];
  unit?: string;
  stacked?: boolean;
  legend: boolean;
};

export type DiagramNode = { id: string; label: string; sub?: string; icon?: string; color?: string };
export type DiagramEdge = { from: string; to: string; label?: string; dashed?: boolean };
export type DiagramSpec = { direction: "LR" | "TB"; nodes: DiagramNode[]; edges: DiagramEdge[] };

export type StatItem = { value: string; label: string; icon?: string; trend?: string; color?: string };
export type CardItem = { title: string; text?: string; icon?: string; color?: string };
export type LogoItem = { icon: string; label?: string };

export type BlockSpec =
  | { kind: "chart"; chart: ChartSpec }
  | { kind: "diagram"; diagram: DiagramSpec }
  | { kind: "stats"; items: StatItem[] }
  | { kind: "cards"; items: CardItem[] }
  | { kind: "logos"; items: LogoItem[] };

type Result = { spec: BlockSpec } | { error: string };

const text = (value: unknown) =>
  typeof value === "string" ? value : typeof value === "number" || typeof value === "boolean" ? String(value) : "";
const optional = (value: unknown) => text(value) || undefined;
const isObject = (value: unknown): value is Record<string, unknown> =>
  !!value && typeof value === "object" && !Array.isArray(value);
const toNumber = (value: unknown) => {
  const n = typeof value === "number" ? value : Number.parseFloat(String(value).replace(",", "."));
  return Number.isFinite(n) ? n : 0;
};

function chart(raw: unknown): Result {
  if (!isObject(raw)) return { error: "attendu : type, labels et series" };
  const type = text(raw.type || "bar") as ChartType;
  if (!CHART_TYPES.includes(type)) return { error: `type « ${type} » inconnu (${CHART_TYPES.join(", ")})` };
  const labels = Array.isArray(raw.labels) ? raw.labels.map(text) : [];
  let series: ChartSpec["series"] = [];
  if (Array.isArray(raw.series))
    series = raw.series.filter(isObject).map((s, i) => ({
      name: text(s.name) || `Série ${i + 1}`,
      data: Array.isArray(s.data) ? s.data.map(toNumber) : [],
      color: optional(s.color),
    }));
  // `data: [1, 2, 3]` is a chart with a single series.
  else if (Array.isArray(raw.data)) series = [{ name: text(raw.title) || "Valeurs", data: raw.data.map(toNumber) }];
  if (!series.length) return { error: "aucune série (series ou data)" };
  const length = Math.max(labels.length, ...series.map((s) => s.data.length));
  while (labels.length < length) labels.push(String(labels.length + 1));
  return {
    spec: {
      kind: "chart",
      chart: {
        type,
        title: optional(raw.title),
        labels,
        series: series.map((s) => ({ ...s, data: labels.map((_, i) => s.data[i] ?? 0) })),
        unit: optional(raw.unit),
        stacked: raw.stacked === true,
        legend: raw.legend === undefined ? series.length > 1 || type === "pie" || type === "donut" : !!raw.legend,
      },
    },
  };
}

const EDGE = /^\s*(.+?)\s*(-->|->|\.\.>)\s*(.+?)\s*(?::\s*(.+))?$/;

function parseEdge(value: unknown): DiagramEdge | undefined {
  if (isObject(value)) {
    // YAML reads `- a -> b: label` as the map { "a -> b": "label" }.
    const keys = Object.keys(value);
    if (keys.length === 1 && !("from" in value)) {
      const edge = parseEdge(keys[0]);
      return edge ? { ...edge, label: optional(value[keys[0] as string]) } : undefined;
    }
    const from = text(value.from);
    const to = text(value.to);
    return from && to ? { from, to, label: optional(value.label), dashed: value.dashed === true } : undefined;
  }
  const match = EDGE.exec(text(value));
  if (!match) return;
  return { from: match[1] ?? "", to: match[3] ?? "", label: match[4], dashed: match[2] === "..>" };
}

function diagram(raw: unknown): Result {
  if (!isObject(raw)) return { error: "attendu : nodes et edges (ou flow)" };
  const nodes: DiagramNode[] = [];
  const byId = new Map<string, DiagramNode>();
  const add = (node: DiagramNode) => {
    if (byId.has(node.id)) return;
    byId.set(node.id, node);
    nodes.push(node);
  };
  for (const item of Array.isArray(raw.nodes) ? raw.nodes : []) {
    if (isObject(item)) {
      const id = text(item.id || item.label);
      if (id)
        add({
          id,
          label: text(item.label) || id,
          sub: optional(item.sub),
          icon: optional(item.icon),
          color: optional(item.color),
        });
    } else if (text(item)) add({ id: text(item), label: text(item) });
  }
  const edges: DiagramEdge[] = [];
  // `flow: a -> b -> c` chains the nodes in order.
  const flows = Array.isArray(raw.flow) ? raw.flow : raw.flow ? [raw.flow] : [];
  for (const flow of flows) {
    const steps = text(flow)
      .split(/\s*->\s*/)
      .map((s) => s.trim())
      .filter(Boolean);
    for (let i = 1; i < steps.length; i++) edges.push({ from: steps[i - 1] as string, to: steps[i] as string });
  }
  for (const item of Array.isArray(raw.edges) ? raw.edges : []) {
    const edge = parseEdge(item);
    if (edge) edges.push(edge);
  }
  for (const edge of edges) {
    add({ id: edge.from, label: edge.from });
    add({ id: edge.to, label: edge.to });
  }
  if (!nodes.length) return { error: "aucun nœud" };
  const direction = text(raw.direction).toUpperCase() === "TB" ? "TB" : "LR";
  return { spec: { kind: "diagram", diagram: { direction, nodes, edges } } };
}

const listOf = (raw: unknown) =>
  Array.isArray(raw) ? raw : isObject(raw) && Array.isArray(raw.items) ? raw.items : [];

export function parseSpec(kind: SpecKind, source: string): Result {
  let raw: unknown;
  try {
    raw = parseYaml(source);
  } catch (error) {
    return { error: `YAML invalide (${(error as Error).message.split("\n")[0]})` };
  }
  switch (kind) {
    case "chart":
      return chart(raw);
    case "diagram":
      return diagram(raw);
    case "stats": {
      const items = listOf(raw)
        .filter(isObject)
        .map((item) => ({
          value: text(item.value),
          label: text(item.label),
          icon: optional(item.icon),
          trend: optional(item.trend),
          color: optional(item.color),
        }));
      return items.length ? { spec: { kind, items } } : { error: "attendu : une liste de value / label" };
    }
    case "cards": {
      const items = listOf(raw)
        .filter(isObject)
        .map((item) => ({
          title: text(item.title),
          text: optional(item.text),
          icon: optional(item.icon),
          color: optional(item.color),
        }));
      return items.length ? { spec: { kind, items } } : { error: "attendu : une liste de title / text" };
    }
    case "logos": {
      const items = listOf(raw)
        .map((item): LogoItem | undefined =>
          isObject(item) ? { icon: text(item.icon), label: optional(item.label) } : { icon: text(item) },
        )
        .filter((item): item is LogoItem => !!item?.icon);
      return items.length ? { spec: { kind, items } } : { error: "attendu : une liste de logos" };
    }
  }
}
