import { expect, test } from "vitest";
import { layoutDiagram, NODE_W, ranks } from "@/lib/diagram-layout";
import { parseSpec } from "@/lib/specs";

test("chart: single data list, padded series and default legend", () => {
  const result = parseSpec("chart", "type: pie\nlabels: [A, B, C]\ndata: [1, '2,5']");
  expect(result).toEqual({
    spec: {
      kind: "chart",
      chart: {
        type: "pie",
        title: undefined,
        labels: ["A", "B", "C"],
        series: [{ name: "Valeurs", data: [1, 2.5, 0] }],
        unit: undefined,
        stacked: false,
        legend: true,
      },
    },
  });
});

test("chart: errors", () => {
  expect(parseSpec("chart", "type: radar")).toHaveProperty("error");
  expect(parseSpec("chart", "type: bar")).toHaveProperty("error");
  expect(parseSpec("chart", "type: [")).toHaveProperty("error");
});

test("diagram: edges as text, flow shorthand and implicit nodes", () => {
  const result = parseSpec("diagram", "flow: A -> B -> C\nedges:\n  - C ..> D: plus tard\n  - from: A\n    to: D");
  if (!("spec" in result) || result.spec.kind !== "diagram") throw new Error("expected a diagram");
  const { diagram } = result.spec;
  expect(diagram.nodes.map((n) => n.id)).toEqual(["A", "B", "C", "D"]);
  expect(diagram.edges).toContainEqual({ from: "C", to: "D", label: "plus tard", dashed: true });
  expect(diagram.edges).toHaveLength(4);
  const rank = ranks(diagram);
  expect(["A", "B", "C", "D"].map((id) => rank.get(id))).toEqual([0, 1, 2, 3]);
});

test("diagram layout: columns by rank, cycles do not loop", () => {
  const result = parseSpec("diagram", "edges:\n  - a -> b\n  - a -> c\n  - c -> a");
  if (!("spec" in result) || result.spec.kind !== "diagram") throw new Error("expected a diagram");
  const layout = layoutDiagram(result.spec.diagram);
  const a = layout.nodes.find((n) => n.id === "a");
  const b = layout.nodes.find((n) => n.id === "b");
  expect(a?.x).toBe(0);
  expect(b?.x).toBeGreaterThan(NODE_W);
  expect(layout.edges.every((e) => e.points.length >= 2)).toBe(true);
});

test("stats, cards and logos lists", () => {
  expect(parseSpec("stats", "- value: 3\n  label: x\n  icon: users")).toMatchObject({
    spec: { kind: "stats", items: [{ value: "3", label: "x", icon: "users" }] },
  });
  expect(parseSpec("cards", "items:\n  - title: T")).toMatchObject({
    spec: { kind: "cards", items: [{ title: "T" }] },
  });
  expect(parseSpec("logos", "- logo:github\n- icon: logo:figma\n  label: Figma")).toMatchObject({
    spec: { kind: "logos", items: [{ icon: "logo:github" }, { icon: "logo:figma", label: "Figma" }] },
  });
  expect(parseSpec("stats", "nope")).toHaveProperty("error");
});
