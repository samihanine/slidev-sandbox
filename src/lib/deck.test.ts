import { describe, expect, test } from "vitest";
import { parseDeck, plainText, setHeadmatter, slideAtLine } from "@/lib/deck";
import { templateMarkdown } from "@/lib/template";

describe("parseDeck", () => {
  test("reads the headmatter and splits slides on ---", () => {
    const deck = parseDeck("---\ntheme: paper\ntitle: Démo\nlogo: assets/logo.svg\n---\n\n# Un\n\n---\n\n# Deux\n");
    expect(deck.headmatter).toMatchObject({ theme: "paper", title: "Démo", logo: "assets/logo.svg", numbers: true });
    expect(deck.slides).toHaveLength(2);
    expect(deck.slides[0]?.layout).toBe("cover");
    expect(deck.slides[1]?.layout).toBe("default");
    expect(deck.slides[1]?.line).toBe(8);
  });

  test("a frontmatter after a separator belongs to the next slide", () => {
    const deck = parseDeck("# A\n\n---\nlayout: section\nimage: x.png\n---\n\n# B\n");
    expect(deck.slides).toHaveLength(2);
    expect(deck.slides[1]?.layout).toBe("section");
    expect(deck.slides[1]?.frontmatter.image).toBe("x.png");
    expect(deck.slides[1]?.line).toBe(2);
    expect(deck.headmatter.theme).toBe("aurora");
  });

  test("separators inside code fences do not split", () => {
    const deck = parseDeck("# A\n\n```\n---\n```\n");
    expect(deck.slides).toHaveLength(1);
    expect(deck.slides[0]?.blocks[1]).toMatchObject({ type: "code", text: "---" });
  });

  test("reads blocks, inline styles, notes and the right column", () => {
    const deck = parseDeck(
      "---\nlayout: two-cols\n---\n# Titre\n\n- **gras** et *ital* `code`\n  - sous-point\n\n::right::\n\n![Logo](assets/a.png)\n\n<!-- note -->",
    );
    const slide = deck.slides[0];
    expect(slide?.layout).toBe("two-cols");
    expect(slide?.notes).toBe("note");
    const list = slide?.blocks[1];
    expect(list?.type).toBe("list");
    if (list?.type !== "list") return;
    expect(list.items[0]?.content.map((c) => c.type)).toEqual(["strong", "text", "em", "text", "code"]);
    expect(plainText(list.items[0]?.content ?? [])).toBe("gras et ital code");
    expect(list.items[0]?.children?.items).toHaveLength(1);
    expect(slide?.right[0]).toEqual({ type: "image", src: "assets/a.png", alt: "Logo" });
  });

  test("decodes HTML entities in text", () => {
    const deck = parseDeck('Q&A <ok> "quote"');
    const block = deck.slides[0]?.blocks[0];
    expect(block?.type === "paragraph" && plainText(block.content)).toBe('Q&A  "quote"');
  });

  test("spec blocks are parsed, errors are reported", () => {
    const deck = parseDeck("```chart\ntype: bar\ndata: [1, 2]\n```\n\n```chart\ntype: radar\n```\n");
    expect(deck.slides[0]?.blocks[0]).toMatchObject({ type: "spec", kind: "chart" });
    expect(deck.slides[0]?.blocks[1]).toMatchObject({ type: "error" });
  });

  test("the template parses without any error block", () => {
    const deck = parseDeck(templateMarkdown("Test"));
    expect(deck.slides.length).toBeGreaterThan(10);
    const blocks = deck.slides.flatMap((s) => [...s.blocks, ...s.right]);
    expect(blocks.filter((b) => b.type === "error")).toEqual([]);
    expect(blocks.filter((b) => b.type === "spec").map((b) => b.type === "spec" && b.kind)).toEqual(
      expect.arrayContaining(["chart", "diagram", "stats", "cards", "logos"]),
    );
  });
});

test("slideAtLine finds the slide holding a line", () => {
  const deck = parseDeck("# A\n\n---\n\n# B\n\n---\nlayout: end\n---\n# C");
  expect([0, 1, 2, 4, 6, 7, 9].map((line) => slideAtLine(deck, line))).toEqual([0, 0, 1, 1, 2, 2, 2]);
});

describe("setHeadmatter", () => {
  test("replaces an existing key", () => {
    expect(setHeadmatter("---\ntheme: aurora\n---\n# A", "theme", "paper")).toBe("---\ntheme: paper\n---\n# A");
  });
  test("adds a missing key", () => {
    expect(setHeadmatter("---\ntitle: T\n---\n# A", "theme", "paper")).toBe("---\ntitle: T\ntheme: paper\n---\n# A");
  });
  test("creates the headmatter", () => {
    expect(setHeadmatter("# A", "theme", "paper")).toBe("---\ntheme: paper\n---\n\n# A");
  });
});
