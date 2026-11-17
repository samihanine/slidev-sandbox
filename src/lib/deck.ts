import { marked, type Token, type Tokens } from "marked";
import { parse as parseYaml } from "yaml";
import { type BlockSpec, parseSpec, SPEC_KINDS, type SpecKind } from "@/lib/specs";

/** Inline content of a heading, paragraph, list item or table cell. */
export type Inline =
  | { type: "text"; text: string }
  | { type: "strong" | "em" | "del"; children: Inline[] }
  | { type: "code"; text: string }
  | { type: "link"; href: string; children: Inline[] }
  | { type: "br" };

export type ListItem = { content: Inline[]; children?: ListBlock };
export type ListBlock = { type: "list"; ordered: boolean; start: number; items: ListItem[] };

export type Block =
  | { type: "heading"; depth: number; content: Inline[] }
  | { type: "paragraph"; content: Inline[] }
  | ListBlock
  | { type: "image"; src: string; alt: string }
  | { type: "quote"; content: Inline[] }
  | { type: "code"; lang: string; text: string }
  | { type: "table"; header: Inline[][]; rows: Inline[][][]; align: ("left" | "center" | "right" | null)[] }
  | { type: "spec"; kind: SpecKind; spec: BlockSpec }
  | { type: "error"; message: string };

export const LAYOUTS = [
  "cover",
  "default",
  "section",
  "center",
  "two-cols",
  "image-right",
  "image-left",
  "quote",
  "end",
] as const;
export type Layout = (typeof LAYOUTS)[number];

export type Slide = {
  index: number;
  /** First line of the slide in the source (0-based): its separator, or 0 for the first slide. */
  line: number;
  layout: Layout;
  frontmatter: Record<string, unknown>;
  /** Default slot, then the right column of `two-cols` after a `::right::` line. */
  blocks: Block[];
  right: Block[];
  notes: string;
};

export type Headmatter = {
  theme: string;
  title: string;
  logo?: string;
  footer?: string;
  /** Show the slide number on every slide but the cover. */
  numbers: boolean;
};

export type Deck = { headmatter: Headmatter; slides: Slide[] };

const SEPARATOR = /^---\s*$/;
const FENCE = /^\s*(```|~~~)/;
const YAML_KEY = /^[A-Za-z_][\w-]*\s*:(\s|$)/;

type Chunk = { line: number; lines: string[] };

/** Splits the source on `---` lines, ignoring those inside code fences. */
function splitChunks(lines: string[]): { chunks: Chunk[]; separators: number[] } {
  const chunks: Chunk[] = [];
  const separators: number[] = [];
  let current: Chunk = { line: 0, lines: [] };
  let fence: string | undefined;
  lines.forEach((line, index) => {
    const match = FENCE.exec(line);
    if (match) fence = fence ? (line.trim().startsWith(fence) ? undefined : fence) : match[1];
    if (!fence && SEPARATOR.test(line)) {
      chunks.push(current);
      separators.push(index);
      current = { line: index + 1, lines: [] };
    } else current.lines.push(line);
  });
  chunks.push(current);
  return { chunks, separators };
}

/** A chunk only made of `key: value` lines (and their indented continuations) is a frontmatter. */
function asFrontmatter(chunk: Chunk | undefined): Record<string, unknown> | undefined {
  if (!chunk) return;
  const filled = chunk.lines.filter((line) => line.trim());
  if (!filled.length || !YAML_KEY.test(filled[0] ?? "")) return;
  if (!filled.every((line) => YAML_KEY.test(line) || /^\s/.test(line) || line.trim().startsWith("#"))) return;
  try {
    const value: unknown = parseYaml(chunk.lines.join("\n"));
    if (value && typeof value === "object" && !Array.isArray(value)) return value as Record<string, unknown>;
  } catch {}
}

const str = (value: unknown) => (typeof value === "string" || typeof value === "number" ? String(value) : undefined);

function readHeadmatter(raw: Record<string, unknown>): Headmatter {
  return {
    theme: str(raw.theme) ?? "aurora",
    title: str(raw.title) ?? "",
    logo: str(raw.logo),
    footer: str(raw.footer),
    numbers: raw.numbers !== false,
  };
}

export function toInline(tokens: Token[] | undefined): Inline[] {
  const out: Inline[] = [];
  for (const token of tokens ?? []) {
    switch (token.type) {
      case "strong":
      case "em":
      case "del":
        out.push({ type: token.type, children: toInline((token as Tokens.Strong).tokens) });
        break;
      case "codespan":
        out.push({ type: "code", text: decode((token as Tokens.Codespan).text) });
        break;
      case "link":
        out.push({
          type: "link",
          href: (token as Tokens.Link).href,
          children: toInline((token as Tokens.Link).tokens),
        });
        break;
      case "br":
        out.push({ type: "br" });
        break;
      case "image":
        out.push({ type: "text", text: (token as Tokens.Image).text });
        break;
      case "html":
        break;
      case "text": {
        const text = token as Tokens.Text;
        if (text.tokens?.length) out.push(...toInline(text.tokens));
        else out.push({ type: "text", text: decode(text.text) });
        break;
      }
      default:
        if ("text" in token && typeof token.text === "string") out.push({ type: "text", text: decode(token.text) });
    }
  }
  // A soft line break inside a paragraph is a space, as in HTML.
  return out.map((part) => (part.type === "text" ? { ...part, text: part.text.replace(/\s*\n\s*/g, " ") } : part));
}

const ENTITIES: Record<string, string> = { amp: "&", lt: "<", gt: ">", quot: '"', "#39": "'", nbsp: " " };
const decode = (text: string) =>
  text.replace(/&(amp|lt|gt|quot|#39|nbsp);/g, (_, name: string) => ENTITIES[name] ?? "");

export const plainText = (content: Inline[]): string =>
  content
    .map((part) => {
      if (part.type === "text" || part.type === "code") return part.text;
      if (part.type === "br") return "\n";
      return plainText(part.children);
    })
    .join("");

function toList(token: Tokens.List): ListBlock {
  return {
    type: "list",
    ordered: token.ordered,
    start: typeof token.start === "number" ? token.start : 1,
    items: token.items.map((item) => {
      const content: Inline[] = [];
      let children: ListBlock | undefined;
      for (const child of item.tokens) {
        if (child.type === "list") children = toList(child as Tokens.List);
        else if (child.type === "text" || child.type === "paragraph") {
          if (content.length) content.push({ type: "br" });
          content.push(...toInline((child as Tokens.Text).tokens ?? [child]));
        }
      }
      return children ? { content, children } : { content };
    }),
  };
}

function toBlocks(markdown: string): Block[] {
  const blocks: Block[] = [];
  for (const token of marked.lexer(markdown)) {
    switch (token.type) {
      case "heading":
        blocks.push({ type: "heading", depth: token.depth, content: toInline(token.tokens) });
        break;
      case "paragraph": {
        const parts = (token.tokens ?? []).filter((part) => !(part.type === "text" && !part.raw.trim()));
        // A paragraph made only of images gives one image block each.
        if (parts.length && parts.every((part) => part.type === "image")) {
          for (const part of parts as Tokens.Image[]) blocks.push({ type: "image", src: part.href, alt: part.text });
        } else blocks.push({ type: "paragraph", content: toInline(token.tokens) });
        break;
      }
      case "list":
        blocks.push(toList(token as Tokens.List));
        break;
      case "blockquote": {
        const content: Inline[] = [];
        for (const child of (token as Tokens.Blockquote).tokens) {
          if (content.length) content.push({ type: "br" });
          content.push(...toInline((child as Tokens.Paragraph).tokens ?? []));
        }
        blocks.push({ type: "quote", content });
        break;
      }
      case "code": {
        const lang = (token.lang ?? "").trim().toLowerCase();
        if ((SPEC_KINDS as readonly string[]).includes(lang)) {
          const result = parseSpec(lang as SpecKind, token.text);
          blocks.push(
            "error" in result
              ? { type: "error", message: `Bloc « ${lang} » : ${result.error}` }
              : { type: "spec", kind: lang as SpecKind, spec: result.spec },
          );
        } else blocks.push({ type: "code", lang, text: token.text });
        break;
      }
      case "table": {
        const table = token as Tokens.Table;
        blocks.push({
          type: "table",
          header: table.header.map((cell) => toInline(cell.tokens)),
          rows: table.rows.map((row) => row.map((cell) => toInline(cell.tokens))),
          align: table.align,
        });
        break;
      }
    }
  }
  return blocks;
}

const COMMENT = /<!--([\s\S]*?)-->/g;

function readSlide(index: number, line: number, frontmatter: Record<string, unknown>, body: string): Slide {
  const notes = [...body.matchAll(COMMENT)].map((match) => (match[1] ?? "").trim()).filter(Boolean);
  const clean = body.replace(COMMENT, "");
  const [left = "", ...rest] = clean.split(/^::right::\s*$/m);
  const requested = str(frontmatter.layout);
  const layout = (LAYOUTS as readonly string[]).includes(requested ?? "")
    ? (requested as Layout)
    : index === 0
      ? "cover"
      : "default";
  return {
    index,
    line,
    layout,
    frontmatter,
    blocks: toBlocks(left),
    right: toBlocks(rest.join("\n")),
    notes: notes.join("\n\n"),
  };
}

/** Reads a Slidev-style markdown deck: `---` between slides, an optional YAML frontmatter after each separator. */
export function parseDeck(source: string): Deck {
  const lines = source.split(/\r?\n/);
  const { chunks, separators } = splitChunks(lines);
  let headRaw: Record<string, unknown> = {};
  let start = 0;
  // A file starting with `---` opens with its headmatter, which is also the first slide's frontmatter.
  const first = chunks[0];
  if (first && !first.lines.some((l) => l.trim()) && chunks.length > 2) {
    const head = asFrontmatter(chunks[1]);
    if (head) {
      headRaw = head;
      start = 2;
    }
  }
  const slides: Slide[] = [];
  let pendingFrontmatter: Record<string, unknown> = start ? headRaw : {};
  let slideLine = 0;
  for (let i = start; i < chunks.length; i++) {
    const chunk = chunks[i] as Chunk;
    const frontmatter = i > start ? asFrontmatter(chunk) : undefined;
    // A frontmatter is always followed by a separator, then the slide content.
    if (frontmatter && i + 1 < chunks.length) {
      pendingFrontmatter = frontmatter;
      continue;
    }
    const body = chunk.lines.join("\n");
    const isEmptyTail = i === chunks.length - 1 && !body.trim() && slides.length > 0;
    if (!isEmptyTail) slides.push(readSlide(slides.length, slideLine, pendingFrontmatter, body));
    pendingFrontmatter = {};
    slideLine = separators[i] ?? lines.length;
  }
  if (!slides.length) slides.push(readSlide(0, 0, headRaw, ""));
  return { headmatter: readHeadmatter(headRaw), slides };
}

/** Index of the slide holding a given source line. */
export function slideAtLine(deck: Deck, line: number) {
  let found = 0;
  for (const slide of deck.slides) if (slide.line <= line) found = slide.index;
  return found;
}

/** Sets one key of the headmatter (`theme: paper`), creating the headmatter when the file has none. */
export function setHeadmatter(source: string, key: string, value: string) {
  const lines = source.split("\n");
  const line = `${key}: ${value}`;
  if (SEPARATOR.test(lines[0] ?? "")) {
    const end = lines.findIndex((l, i) => i > 0 && SEPARATOR.test(l));
    if (end > 0 && asFrontmatter({ line: 1, lines: lines.slice(1, end) })) {
      const existing = lines.findIndex((l, i) => i > 0 && i < end && new RegExp(`^${key}\\s*:`).test(l));
      if (existing > 0) lines[existing] = line;
      else lines.splice(end, 0, line);
      return lines.join("\n");
    }
  }
  return `---\n${line}\n---\n\n${source}`;
}
