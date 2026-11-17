import { type IconNode, icons } from "lucide";
import { LOGOS } from "@/lib/logos";

export type ResolvedIcon =
  /** An inline SVG (Lucide icon or brand logo), as a data URL. */
  | { kind: "svg"; src: string; title: string }
  /** A picture of the working folder, resolved later. */
  | { kind: "file"; path: string };

const pascal = (name: string) =>
  name
    .trim()
    .split(/[-_\s]+/)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join("");

const escapeAttr = (value: string) => value.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;");

function nodeToSvg(node: IconNode) {
  return node
    .map(
      ([tag, attrs]) =>
        `<${tag} ${Object.entries(attrs)
          .map(([key, value]) => `${key}="${escapeAttr(String(value))}"`)
          .join(" ")}/>`,
    )
    .join("");
}

export const svgDataUrl = (svg: string) => `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;

export const lucideSvg = (node: IconNode, color: string, strokeWidth = 2) =>
  `<svg xmlns="http://www.w3.org/2000/svg" width="96" height="96" viewBox="0 0 24 24" fill="none" stroke="${escapeAttr(color)}" stroke-width="${strokeWidth}" stroke-linecap="round" stroke-linejoin="round">${nodeToSvg(node)}</svg>`;

export const logoSvg = (path: string, color: string) =>
  `<svg xmlns="http://www.w3.org/2000/svg" width="96" height="96" viewBox="0 0 24 24" fill="${escapeAttr(color)}"><path d="${escapeAttr(path)}"/></svg>`;

export const isFilePath = (name: string) => /[/\\]|\.(png|jpe?g|gif|svg|webp|avif)$/i.test(name.trim());

/** Relative luminance of a #rrggbb color, 0 (black) to 1 (white). */
export function luminance(hex: string) {
  const match = /^#?([0-9a-f]{6})$/i.exec(hex.trim());
  if (!match) return 0.5;
  const n = Number.parseInt(match[1] as string, 16);
  const channel = (v: number) => {
    const c = v / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * channel((n >> 16) & 255) + 0.7152 * channel((n >> 8) & 255) + 0.0722 * channel(n & 255);
}

/**
 * `server` or `layout-dashboard`: a Lucide icon drawn in `color`.
 * `logo:github`: a brand logo in its own color (or `fallback` when it would not show on the background).
 * `assets/logo.png`: a picture of the working folder.
 */
export function resolveIcon(
  name: string | undefined,
  color: string,
  options: { background?: string; brand?: boolean } = {},
): ResolvedIcon | undefined {
  if (!name) return;
  const trimmed = name.trim();
  if (isFilePath(trimmed) && !trimmed.startsWith("logo:")) return { kind: "file", path: trimmed };
  if (trimmed.startsWith("logo:")) {
    const logo = LOGOS.get(
      trimmed
        .slice(5)
        .toLowerCase()
        .replace(/[^a-z0-9]/g, ""),
    );
    if (!logo) return;
    let fill = options.brand === false ? color : logo.hex;
    // A black logo on a dark slide (or a white one on a light slide) takes the text color.
    if (options.background && Math.abs(luminance(fill) - luminance(options.background)) < 0.12) fill = color;
    return { kind: "svg", src: svgDataUrl(logoSvg(logo.path, fill)), title: logo.title };
  }
  const node = icons[pascal(trimmed) as keyof typeof icons];
  if (!node) return;
  return { kind: "svg", src: svgDataUrl(lucideSvg(node, color)), title: trimmed };
}
