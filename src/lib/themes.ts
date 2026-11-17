/**
 * Slide themes. Colors are hex or rgba only: the PowerPoint export reads the computed styles of the slides
 * and must be able to turn every color into a solid fill with a transparency.
 */
export type SlideTheme = {
  id: string;
  name: string;
  dark: boolean;
  /** Plain background color, also used by PowerPoint behind the background picture. */
  bg: string;
  /** CSS background of the decorative layer, per kind of slide. */
  background: string;
  /** Strong background of the cover and section slides. */
  hero: string;
  heroText: string;
  heroMuted: string;
  text: string;
  muted: string;
  accent: string;
  accent2: string;
  surface: string;
  border: string;
  palette: string[];
  headingFont: string;
  bodyFont: string;
};

const SPACE = '"Space Grotesk Variable", "Space Grotesk", "Inter Variable", sans-serif';
const INTER = '"Inter Variable", "Inter", system-ui, sans-serif';

export const THEMES: SlideTheme[] = [
  {
    id: "aurora",
    name: "Aurora",
    dark: true,
    bg: "#0b1020",
    background:
      "radial-gradient(circle at 92% 0%, rgba(124,156,255,0.32), rgba(124,156,255,0) 42%), radial-gradient(circle at 0% 100%, rgba(192,132,252,0.26), rgba(192,132,252,0) 46%), #0b1020",
    hero: "radial-gradient(circle at 80% 20%, rgba(124,156,255,0.55), rgba(124,156,255,0) 50%), radial-gradient(circle at 10% 90%, rgba(192,132,252,0.5), rgba(192,132,252,0) 55%), linear-gradient(135deg, #0b1020, #141a3a)",
    heroText: "#ffffff",
    heroMuted: "#b9c2e6",
    text: "#f4f6ff",
    muted: "#9aa5c4",
    accent: "#7c9cff",
    accent2: "#c084fc",
    surface: "rgba(255,255,255,0.06)",
    border: "rgba(255,255,255,0.13)",
    palette: ["#7c9cff", "#c084fc", "#34d399", "#fbbf24", "#f472b6", "#22d3ee"],
    headingFont: SPACE,
    bodyFont: INTER,
  },
  {
    id: "paper",
    name: "Paper",
    dark: false,
    bg: "#ffffff",
    background:
      "radial-gradient(circle at 100% 0%, rgba(37,99,235,0.10), rgba(37,99,235,0) 38%), radial-gradient(circle at 0% 100%, rgba(124,58,237,0.07), rgba(124,58,237,0) 40%), #ffffff",
    hero: "radial-gradient(circle at 85% 15%, rgba(255,255,255,0.22), rgba(255,255,255,0) 45%), linear-gradient(135deg, #1d4ed8, #6d28d9)",
    heroText: "#ffffff",
    heroMuted: "#dbe4ff",
    text: "#0f172a",
    muted: "#64748b",
    accent: "#2563eb",
    accent2: "#7c3aed",
    surface: "#f8fafc",
    border: "#e2e8f0",
    palette: ["#2563eb", "#7c3aed", "#10b981", "#f59e0b", "#f43f5e", "#06b6d4"],
    headingFont: INTER,
    bodyFont: INTER,
  },
  {
    id: "sunset",
    name: "Sunset",
    dark: false,
    bg: "#fff7f0",
    background:
      "radial-gradient(circle at 100% 0%, rgba(244,93,44,0.16), rgba(244,93,44,0) 40%), radial-gradient(circle at 0% 100%, rgba(224,51,110,0.12), rgba(224,51,110,0) 42%), #fff7f0",
    hero: "radial-gradient(circle at 80% 10%, rgba(255,214,102,0.55), rgba(255,214,102,0) 45%), linear-gradient(135deg, #f45d2c, #e0336e)",
    heroText: "#ffffff",
    heroMuted: "#ffe1d3",
    text: "#2a1a12",
    muted: "#8a6f60",
    accent: "#f45d2c",
    accent2: "#e0336e",
    surface: "#ffffff",
    border: "#f3dccf",
    palette: ["#f45d2c", "#e0336e", "#f5a524", "#7c3aed", "#0ea5e9", "#10b981"],
    headingFont: SPACE,
    bodyFont: INTER,
  },
  {
    id: "forest",
    name: "Forest",
    dark: true,
    bg: "#0b1a14",
    background:
      "radial-gradient(circle at 100% 0%, rgba(52,211,153,0.22), rgba(52,211,153,0) 42%), radial-gradient(circle at 0% 100%, rgba(163,230,53,0.14), rgba(163,230,53,0) 45%), #0b1a14",
    hero: "radial-gradient(circle at 85% 15%, rgba(52,211,153,0.5), rgba(52,211,153,0) 50%), linear-gradient(135deg, #0b1a14, #12352a)",
    heroText: "#ffffff",
    heroMuted: "#b5dccb",
    text: "#ecfdf5",
    muted: "#9cc5b2",
    accent: "#34d399",
    accent2: "#a3e635",
    surface: "rgba(255,255,255,0.06)",
    border: "rgba(255,255,255,0.12)",
    palette: ["#34d399", "#a3e635", "#38bdf8", "#fbbf24", "#f472b6", "#a78bfa"],
    headingFont: SPACE,
    bodyFont: INTER,
  },
];

export const themeById = (id: string) => THEMES.find((theme) => theme.id === id) ?? (THEMES[0] as SlideTheme);

/** The color of a chart series, a diagram node or a card: a palette index, a palette name or a CSS color. */
export function pickColor(theme: SlideTheme, index: number, requested?: string) {
  if (requested) {
    if (/^#[0-9a-f]{3,8}$/i.test(requested)) return requested;
    if (requested === "accent") return theme.accent;
    if (requested === "accent2") return theme.accent2;
    const n = Number.parseInt(requested, 10);
    if (Number.isInteger(n) && n > 0) return theme.palette[(n - 1) % theme.palette.length] as string;
  }
  return theme.palette[index % theme.palette.length] as string;
}

/** `#rrggbb` with an alpha, as `rgba()`. */
export function alpha(hex: string, value: number) {
  const match = /^#([0-9a-f]{6})$/i.exec(hex);
  if (!match) return hex;
  const n = Number.parseInt(match[1] as string, 16);
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${value})`;
}
