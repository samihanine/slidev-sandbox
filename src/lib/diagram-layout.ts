import type { DiagramSpec } from "@/lib/specs";

export const NODE_W = 260;
export const NODE_H = 92;
const GAP_MAIN = 96;
const GAP_CROSS = 36;

export type Point = { x: number; y: number };
export type PlacedNode = { id: string; x: number; y: number; w: number; h: number };
export type PlacedEdge = { from: string; to: string; points: Point[]; label?: string; dashed?: boolean; mid: Point };
export type DiagramLayout = { width: number; height: number; nodes: PlacedNode[]; edges: PlacedEdge[] };

/** Rank of each node: the longest path reaching it from a node without incoming edge. Back edges of cycles are ignored. */
export function ranks(spec: DiagramSpec) {
  const ids = spec.nodes.map((node) => node.id);
  const outgoing = new Map<string, string[]>(ids.map((id) => [id, []]));
  for (const edge of spec.edges) if (edge.from !== edge.to) outgoing.get(edge.from)?.push(edge.to);
  // Depth-first walk in the order of the nodes: an edge back to a node being walked closes a cycle.
  const kept: [string, string][] = [];
  const state = new Map<string, "open" | "done">();
  const walk = (id: string) => {
    state.set(id, "open");
    for (const to of outgoing.get(id) ?? []) {
      if (state.get(to) === "open") continue;
      kept.push([id, to]);
      if (!state.has(to)) walk(to);
    }
    state.set(id, "done");
  };
  for (const id of ids) if (!state.has(id)) walk(id);

  const incoming = new Map<string, string[]>(ids.map((id) => [id, []]));
  for (const [from, to] of kept) incoming.get(to)?.push(from);
  const rank = new Map<string, number>();
  const visit = (id: string): number => {
    const known = rank.get(id);
    if (known !== undefined) return known;
    rank.set(id, 0);
    let value = 0;
    for (const from of incoming.get(id) ?? []) value = Math.max(value, visit(from) + 1);
    rank.set(id, value);
    return value;
  };
  for (const id of ids) visit(id);
  return rank;
}

/** Places the nodes in columns (LR) or rows (TB) by rank, then routes each edge as a right-angled line. */
export function layoutDiagram(spec: DiagramSpec): DiagramLayout {
  const rank = ranks(spec);
  const layers: string[][] = [];
  for (const node of spec.nodes) {
    const r = rank.get(node.id) ?? 0;
    const layer = layers[r] ?? [];
    layer.push(node.id);
    layers[r] = layer;
  }
  const filled = layers.filter(Boolean);
  // Order each layer by the mean position of its predecessors, to limit crossings.
  const position = new Map<string, number>();
  filled.forEach((layer, index) => {
    if (index > 0) {
      const score = (id: string) => {
        const preds = spec.edges
          .filter((e) => e.to === id && position.has(e.from))
          .map((e) => position.get(e.from) ?? 0);
        return preds.length ? preds.reduce((a, b) => a + b, 0) / preds.length : Number.POSITIVE_INFINITY;
      };
      const original = new Map(layer.map((id, i) => [id, i]));
      layer.sort((a, b) => score(a) - score(b) || (original.get(a) ?? 0) - (original.get(b) ?? 0));
    }
    const span = layer.length - 1;
    for (const [i, id] of layer.entries()) position.set(id, i - span / 2);
  });

  const horizontal = spec.direction === "LR";
  const maxCount = Math.max(...filled.map((layer) => layer.length));
  const crossSize = horizontal ? NODE_H : NODE_W;
  const mainSize = horizontal ? NODE_W : NODE_H;
  const crossTotal = maxCount * crossSize + (maxCount - 1) * GAP_CROSS;
  const mainTotal = filled.length * mainSize + (filled.length - 1) * GAP_MAIN;

  const nodes: PlacedNode[] = [];
  const byId = new Map<string, PlacedNode>();
  filled.forEach((layer, layerIndex) => {
    const size = layer.length * crossSize + (layer.length - 1) * GAP_CROSS;
    const offset = (crossTotal - size) / 2;
    layer.forEach((id, i) => {
      const main = layerIndex * (mainSize + GAP_MAIN);
      const cross = offset + i * (crossSize + GAP_CROSS);
      const node = horizontal
        ? { id, x: main, y: cross, w: NODE_W, h: NODE_H }
        : { id, x: cross, y: main, w: NODE_W, h: NODE_H };
      nodes.push(node);
      byId.set(id, node);
    });
  });

  const edges: PlacedEdge[] = [];
  for (const edge of spec.edges) {
    const a = byId.get(edge.from);
    const b = byId.get(edge.to);
    if (!a || !b || a === b) continue;
    let points: Point[];
    if (horizontal) {
      const forward = b.x >= a.x + a.w;
      const start = { x: forward ? a.x + a.w : a.x, y: a.y + a.h / 2 };
      const end = { x: forward ? b.x : b.x + b.w, y: b.y + b.h / 2 };
      const midX = (start.x + end.x) / 2;
      points = start.y === end.y ? [start, end] : [start, { x: midX, y: start.y }, { x: midX, y: end.y }, end];
    } else {
      const forward = b.y >= a.y + a.h;
      const start = { x: a.x + a.w / 2, y: forward ? a.y + a.h : a.y };
      const end = { x: b.x + b.w / 2, y: forward ? b.y : b.y + b.h };
      const midY = (start.y + end.y) / 2;
      points = start.x === end.x ? [start, end] : [start, { x: start.x, y: midY }, { x: end.x, y: midY }, end];
    }
    const first = points[0] as Point;
    const last = points[points.length - 1] as Point;
    const mid =
      points.length === 4
        ? {
            x: ((points[1] as Point).x + (points[2] as Point).x) / 2,
            y: ((points[1] as Point).y + (points[2] as Point).y) / 2,
          }
        : { x: (first.x + last.x) / 2, y: (first.y + last.y) / 2 };
    edges.push({ from: edge.from, to: edge.to, points, label: edge.label, dashed: edge.dashed, mid });
  }

  return {
    width: horizontal ? mainTotal : crossTotal,
    height: horizontal ? crossTotal : mainTotal,
    nodes,
    edges,
  };
}
