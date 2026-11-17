import { expect, test } from "vitest";
import { fontFace, parseColor } from "@/lib/export-pptx";
import { slugify, splitPath } from "@/lib/files";
import { luminance, resolveIcon } from "@/lib/icons";

test("resolveIcon: Lucide names, brand logos and files", () => {
  expect(resolveIcon("layout-dashboard", "#fff")).toMatchObject({ kind: "svg" });
  expect(resolveIcon("LayoutDashboard", "#fff")).toMatchObject({ kind: "svg" });
  expect(resolveIcon("logo:github", "#fff")).toMatchObject({ kind: "svg", title: "GitHub" });
  expect(resolveIcon("logo:Node.js", "#fff")).toMatchObject({ kind: "svg", title: "Node.js" });
  expect(resolveIcon("assets/x.png", "#fff")).toEqual({ kind: "file", path: "assets/x.png" });
  expect(resolveIcon("no-such-icon", "#fff")).toBeUndefined();
  expect(resolveIcon("logo:nope", "#fff")).toBeUndefined();
});

test("a dark logo on a dark slide takes the text color", () => {
  const icon = resolveIcon("logo:github", "#ffffff", { background: "#0b1020" });
  expect(icon?.kind === "svg" && decodeURIComponent(icon.src)).toContain('fill="#ffffff"');
  expect(luminance("#000000")).toBe(0);
  expect(luminance("#ffffff")).toBeCloseTo(1);
});

test("parseColor reads computed colors", () => {
  expect(parseColor("rgb(255, 0, 16)")).toEqual({ hex: "FF0010", alpha: 1 });
  expect(parseColor("rgba(255, 255, 255, 0.06)")).toEqual({ hex: "FFFFFF", alpha: 0.06 });
  expect(parseColor("rgb(10 20 30 / 50%)")).toEqual({ hex: "0A141E", alpha: 0.5 });
  expect(parseColor("#7c9cff")).toEqual({ hex: "7C9CFF", alpha: 1 });
  expect(parseColor("transparent")?.alpha).toBe(0);
  expect(parseColor("oklch(0.5 0.1 200)")).toBeUndefined();
});

test("fontFace gives the installed font name", () => {
  expect(fontFace('"Space Grotesk Variable", "Inter Variable", sans-serif')).toBe("Space Grotesk");
  expect(fontFace("system-ui")).toBe("Arial");
  expect(fontFace("monospace")).toBe("Consolas");
});

test("file names and paths", () => {
  expect(slugify("Plan stratégique 2026 !")).toBe("plan-strategique-2026");
  expect(slugify("???")).toBe("presentation");
  expect(splitPath("./assets/img/a.png")).toEqual({ dirs: ["assets", "img"], name: "a.png" });
  expect(splitPath("../secret.md")).toBeUndefined();
});
