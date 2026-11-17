import { getFontEmbedCSS, toJpeg } from "html-to-image";
import PptxGenJS from "pptxgenjs";
import type { ChartExport } from "@/components/slide/chart";
import type { Point } from "@/lib/diagram-layout";

/** 1280 px = 13.33 in: 96 px per inch, 0.75 pt per px. */
const PX = 96;
const pt = (px: number) => Math.round(px * 0.75 * 100) / 100;
const inch = (px: number) => px / PX;

export type Rgba = { hex: string; alpha: number };

/** Reads `rgb(…)`, `rgba(…)` and `#rrggbb` computed colors. Transparent gives alpha 0. */
export function parseColor(value: string | null | undefined): Rgba | undefined {
  if (!value) return;
  const trimmed = value.trim();
  if (trimmed === "transparent") return { hex: "000000", alpha: 0 };
  const hex = /^#([0-9a-f]{6})$/i.exec(trimmed);
  if (hex) return { hex: (hex[1] as string).toUpperCase(), alpha: 1 };
  const match = /^rgba?\(([^)]+)\)$/i.exec(trimmed);
  if (!match) return;
  const parts = (match[1] as string)
    .split(/[\s,/]+/)
    .filter(Boolean)
    .map((part, i) =>
      part.endsWith("%") ? (Number.parseFloat(part) / 100) * (i < 3 ? 255 : 1) : Number.parseFloat(part),
    );
  const [r = 0, g = 0, b = 0, a = 1] = parts;
  const to = (n: number) =>
    Math.max(0, Math.min(255, Math.round(n)))
      .toString(16)
      .padStart(2, "0");
  return { hex: `${to(r)}${to(g)}${to(b)}`.toUpperCase(), alpha: a };
}

const transparency = (alpha: number) => Math.round((1 - alpha) * 100);

/** `"Inter Variable", system-ui` → `Inter`, the name of the installed font. */
export function fontFace(family: string) {
  const first = (family.split(",")[0] ?? "").trim().replace(/^["']|["']$/g, "");
  const name = first.replace(/\s+Variable$/i, "");
  if (/^(system-ui|sans-serif|ui-sans-serif)$/i.test(name)) return "Arial";
  if (/^(monospace|ui-monospace)$/i.test(name)) return "Consolas";
  if (/^serif$/i.test(name)) return "Georgia";
  return name;
}

type Box = { x: number; y: number; w: number; h: number };

type Run = { text: string; options: PptxGenJS.TextPropsOptions };

/** The text of an element as PowerPoint runs, one per styled piece. Nested lists are left out. */
export function textRuns(
  element: Element,
  scale: number,
  options: { pre?: boolean; skip?: (el: Element) => boolean } = {},
) {
  const runs: Run[] = [];
  const walk = (node: Node) => {
    if (node.nodeType === Node.TEXT_NODE) {
      const parent = node.parentElement;
      if (!parent) return;
      let text = node.textContent ?? "";
      if (!options.pre) text = text.replace(/\s+/g, " ");
      if (!text) return;
      const style = getComputedStyle(parent);
      const color = parseColor(style.color);
      const link = parent.closest("a");
      const runOptions: PptxGenJS.TextPropsOptions = {
        fontFace: fontFace(style.fontFamily),
        fontSize: pt(Number.parseFloat(style.fontSize) * scale),
        bold: Number.parseInt(style.fontWeight, 10) >= 600,
        italic: style.fontStyle === "italic",
        color: color?.hex,
      };
      if (color && color.alpha < 1) runOptions.transparency = transparency(color.alpha);
      if (style.textDecorationLine.includes("line-through")) runOptions.strike = "sngStrike";
      if (link?.href) runOptions.hyperlink = { url: link.href };
      if (options.pre) {
        text.split("\n").forEach((line, i, lines) => {
          runs.push({ text: line, options: { ...runOptions, breakLine: i < lines.length - 1 } });
        });
      } else runs.push({ text, options: runOptions });
      return;
    }
    if (!(node instanceof Element)) return;
    if (options.skip?.(node)) return;
    if (node.tagName === "BR") {
      const last = runs[runs.length - 1];
      if (last) last.options = { ...last.options, breakLine: true };
      return;
    }
    for (const child of node.childNodes) walk(child);
  };
  walk(element);
  if (!options.pre) {
    // Leading and trailing spaces, around line breaks too, are not shown by the browser.
    runs.forEach((run, i) => {
      const previous = runs[i - 1];
      if (!previous || previous.options.breakLine) run.text = run.text.replace(/^ +/, "");
      if (run.options.breakLine || i === runs.length - 1) run.text = run.text.replace(/ +$/, "");
    });
  }
  return runs.filter((run, i) => run.text || run.options.breakLine || i === 0);
}

const ALIGN: Record<string, PptxGenJS.HAlign> = { center: "center", right: "right", end: "right", justify: "justify" };

/** Slightly wider than in the browser, so that PowerPoint's own font metrics do not wrap a line earlier. */
function widen(box: Box, align: PptxGenJS.HAlign) {
  const extra = Math.min(24, box.w * 0.06);
  if (align === "center") return { ...box, x: box.x - extra / 2, w: box.w + extra };
  if (align === "right") return { ...box, x: box.x - extra, w: box.w + extra };
  return { ...box, w: box.w + extra };
}

const toInches = (box: Box) => ({ x: inch(box.x), y: inch(box.y), w: inch(box.w), h: inch(box.h) });

/** A picture as a PNG data URL, drawn at a given size (SVG pictures are rasterized). */
export async function rasterize(src: string, width: number, height: number, ratio = 2): Promise<string> {
  const image = new Image();
  image.decoding = "sync";
  image.src = src;
  await image.decode();
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(width * ratio));
  canvas.height = Math.max(1, Math.round(height * ratio));
  const context = canvas.getContext("2d");
  context?.drawImage(image, 0, 0, canvas.width, canvas.height);
  return canvas.toDataURL("image/png");
}

const blobToDataUrl = (blob: Blob) =>
  new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(blob);
  });

/** pptxgenjs wants `image/png;base64,…`, without the `data:` scheme. */
const pptxData = (dataUrl: string) => dataUrl.replace(/^data:/, "");

export type ExportInput = {
  title: string;
  /** The rendered slides, each a `[data-slide]` element at 1280 × 720. */
  slides: HTMLElement[];
  notes: string[];
  background: string;
};

function chartOptions(data: ChartExport, box: Box): PptxGenJS.IChartOpts {
  const { chart, colors } = data;
  const hex = (color: string) => color.replace("#", "").toUpperCase();
  const muted = parseColor(data.muted)?.hex ?? "888888";
  const text = parseColor(data.text)?.hex ?? "333333";
  const grid = parseColor(data.grid);
  const font = fontFace(data.font);
  const round = chart.type === "pie" || chart.type === "donut";
  const unit = chart.unit ? (chart.unit === "%" ? '" %"' : `" ${chart.unit.replace(/"/g, "")}"`) : "";
  const format = `#,##0${unit}`;
  const options: PptxGenJS.IChartOpts = {
    ...toInches(box),
    chartColors: colors.map(hex),
    showLegend: chart.legend,
    legendPos: round ? "r" : "t",
    legendFontSize: round ? 14 : 13,
    legendColor: text,
    legendFontFace: font,
    catAxisLabelColor: text,
    catAxisLabelFontSize: 13,
    catAxisLabelFontFace: font,
    valAxisLabelColor: muted,
    valAxisLabelFontSize: 11,
    valAxisLabelFontFace: font,
    valAxisLabelFormatCode: format,
    catAxisLineShow: false,
    valAxisLineShow: false,
    valGridLine: grid ? { color: grid.hex, style: "dash", size: 1 } : { style: "none" },
    catGridLine: { style: "none" },
    dataLabelColor: text,
    dataLabelFontSize: 12,
    dataLabelFontFace: font,
    dataLabelFormatCode: format,
  };
  const valueCount = chart.labels.length * (chart.stacked ? 1 : chart.series.length);
  if (round) {
    Object.assign(options, {
      showPercent: true,
      showValue: false,
      dataLabelColor: "FFFFFF",
      dataLabelFontSize: 14,
      dataLabelFontBold: true,
      dataLabelFormatCode: "0%",
      holeSize: 58,
      dataBorder: { pt: 2, color: "FFFFFF" },
    });
  } else if (chart.type === "bar" || chart.type === "hbar") {
    Object.assign(options, {
      barDir: chart.type === "hbar" ? "bar" : "col",
      barGrouping: chart.stacked ? "stacked" : "clustered",
      barGapWidthPct: 70,
      showValue: valueCount <= 16 && !chart.stacked,
      dataLabelPosition: "outEnd",
    });
  } else {
    Object.assign(options, {
      lineSize: 3,
      chartColorsOpacity: chart.type === "area" ? 55 : undefined,
      lineDataSymbol: "circle",
      lineDataSymbolSize: 9,
      showValue: chart.series.length === 1 && valueCount <= 16,
      dataLabelPosition: "t",
    });
  }
  return options;
}

const CHART_TYPE = { bar: "bar", hbar: "bar", line: "line", area: "area", pie: "pie", donut: "doughnut" } as const;

/** Each slide becomes a PowerPoint slide: background picture, then native text boxes, shapes, pictures, tables and charts. */
export async function exportPptx({ title, slides, notes, background }: ExportInput): Promise<Blob> {
  const pptx = new PptxGenJS();
  pptx.layout = "LAYOUT_WIDE";
  pptx.title = title;
  pptx.company = "";
  const bgColor = parseColor(background)?.hex ?? "FFFFFF";
  const fontCss = slides[0] ? await getFontEmbedCSS(slides[0]).catch(() => "") : "";
  const backgrounds = new Map<string, string>();

  for (const [index, root] of slides.entries()) {
    const slide = pptx.addSlide();
    const origin = root.getBoundingClientRect();
    const rootScale = origin.width / 1280 || 1;
    const boxOf = (element: Element): Box => {
      const rect = element.getBoundingClientRect();
      return {
        x: (rect.left - origin.left) / rootScale,
        y: (rect.top - origin.top) / rootScale,
        w: rect.width / rootScale,
        h: rect.height / rootScale,
      };
    };
    /** Scale of the element's own CSS transforms (a diagram shrunk to fit), applied to font sizes. */
    const scaleOf = (element: Element) => {
      const html = element as HTMLElement;
      const layoutWidth = html.offsetWidth || (element as SVGGraphicsElement).getBBox?.().width || 0;
      return layoutWidth ? element.getBoundingClientRect().width / rootScale / layoutWidth : 1;
    };

    // Background: the decorative layer as one picture, identical slides share it.
    const layer = root.querySelector<HTMLElement>('[data-x="background"]');
    if (layer) {
      const key = layer.style.background;
      let data = backgrounds.get(key);
      if (!data) {
        data = await toJpeg(layer, {
          width: 1280,
          height: 720,
          pixelRatio: 1.5,
          quality: 0.9,
          fontEmbedCSS: fontCss,
          style: { position: "static", width: "1280px", height: "720px" },
        });
        backgrounds.set(key, data);
      }
      slide.background = { data: pptxData(data) };
    } else slide.background = { color: bgColor };

    for (const element of root.querySelectorAll<HTMLElement>("[data-x]")) {
      const kind = element.dataset.x;
      if (kind === "background") continue;
      const box = boxOf(element);
      if (box.w < 0.5 || box.h < 0.5) continue;
      const style = getComputedStyle(element);
      if (style.visibility === "hidden" || style.display === "none") continue;
      const k = scaleOf(element);

      if (kind === "box") {
        const fill = parseColor(style.backgroundColor);
        const borderWidth = Number.parseFloat(style.borderTopWidth) || 0;
        const border = borderWidth ? parseColor(style.borderTopColor) : undefined;
        if ((!fill || fill.alpha === 0) && (!border || border.alpha === 0)) continue;
        const radius = (Number.parseFloat(style.borderTopLeftRadius) || 0) * k;
        slide.addShape(radius ? pptx.ShapeType.roundRect : pptx.ShapeType.rect, {
          ...toInches(box),
          fill: fill && fill.alpha > 0 ? { color: fill.hex, transparency: transparency(fill.alpha) } : { type: "none" },
          line:
            border && border.alpha > 0
              ? { color: border.hex, width: pt(borderWidth * k), transparency: transparency(border.alpha) }
              : { type: "none" },
          rectRadius: radius ? inch(Math.min(radius, box.w / 2, box.h / 2)) : undefined,
        });
        continue;
      }

      if (kind === "text") {
        const pre = element.dataset.pre !== undefined;
        const runs = textRuns(element, k, { pre });
        if (!runs.some((run) => run.text.trim())) continue;
        const fontSize = Number.parseFloat(style.fontSize) || 16;
        const lineHeight = Number.parseFloat(style.lineHeight) || fontSize * 1.2;
        const fill = parseColor(style.backgroundColor);
        const pill = !!fill && fill.alpha > 0;
        const align = pill ? "center" : (ALIGN[style.textAlign] ?? "left");
        const radius = (Number.parseFloat(style.borderTopLeftRadius) || 0) * k;
        // A single line stays on one line, whatever the metrics of the font PowerPoint uses.
        const singleLine = box.h < lineHeight * k * 1.5 && !runs.some((run) => run.options.breakLine);
        slide.addText(runs, {
          ...toInches(pre ? box : widen(box, align)),
          align,
          valign: pill ? "middle" : "top",
          margin: 0,
          wrap: !pre && !singleLine,
          fit: "none",
          lineSpacingMultiple: Math.round((lineHeight / fontSize) * 100) / 100,
          paraSpaceBefore: 0,
          paraSpaceAfter: 0,
          ...(pill
            ? {
                fill: { color: fill.hex, transparency: transparency(fill.alpha) },
                rectRadius: radius ? inch(Math.min(radius, box.h / 2)) : undefined,
                shape: radius ? pptx.ShapeType.roundRect : undefined,
              }
            : {}),
        });
        continue;
      }

      if (kind === "list") {
        const paragraphs: Run[] = [];
        let firstLineHeight = 1.4;
        const walkList = (list: Element, depth: number) => {
          const ordered = list.tagName === "OL";
          const listStyle = getComputedStyle(list);
          const indent = pt(Number.parseFloat(listStyle.paddingLeft) || 24);
          const gap = pt(Number.parseFloat(listStyle.rowGap) || 0);
          for (const item of list.children) {
            if (item.tagName !== "LI") continue;
            const itemStyle = getComputedStyle(item);
            const size = Number.parseFloat(itemStyle.fontSize) || 24;
            firstLineHeight = (Number.parseFloat(itemStyle.lineHeight) || size * 1.4) / size;
            const runs = textRuns(item, k, { skip: (el) => el.tagName === "UL" || el.tagName === "OL" });
            const bullet: PptxGenJS.TextPropsOptions["bullet"] = ordered
              ? { type: "number", indent }
              : { characterCode: "25CF", indent };
            // Every run repeats the paragraph options (pptxgenjs writes them per run). With `align` set,
            // pptxgenjs only starts a new paragraph after a `breakLine`, not at each run with a bullet.
            runs.forEach((run, i) => {
              run.options = {
                ...run.options,
                bullet,
                align: "left",
                indentLevel: depth,
                paraSpaceAfter: gap,
                breakLine: i === runs.length - 1 ? true : run.options.breakLine,
              };
              paragraphs.push(run);
            });
            for (const nested of item.children)
              if (nested.tagName === "UL" || nested.tagName === "OL") walkList(nested, depth + 1);
          }
        };
        const list = element.querySelector("ul, ol");
        if (!list) continue;
        walkList(list, 0);
        const last = paragraphs[paragraphs.length - 1];
        if (last) last.options = { ...last.options, breakLine: false };
        slide.addText(paragraphs, {
          ...toInches(widen(box, "left")),
          valign: "top",
          margin: 0,
          fit: "none",
          lineSpacingMultiple: Math.round(firstLineHeight * 100) / 100,
        });
        continue;
      }

      if (kind === "image" && element instanceof HTMLImageElement) {
        if (!element.naturalWidth) continue;
        // `object-fit: contain`: the picture is placed in its box keeping its proportions.
        const ratio = element.naturalWidth / element.naturalHeight;
        let { x, y, w, h } = box;
        if (w / h > ratio) {
          const width = h * ratio;
          x += (w - width) / 2;
          w = width;
        } else {
          const height = w / ratio;
          y += (h - height) / 2;
          h = height;
        }
        const src = element.currentSrc || element.src;
        let data: string;
        if (src.startsWith("data:image/svg") || /\.svg$/i.test(element.dataset.path ?? ""))
          data = await rasterize(src, w, h, 3);
        else if (src.startsWith("data:")) data = src;
        else data = await blobToDataUrl(await (await fetch(src)).blob());
        slide.addImage({ data: pptxData(data), ...toInches({ x, y, w, h }) });
        continue;
      }

      if (kind === "table" && element instanceof HTMLTableElement) {
        const rows: PptxGenJS.TableRow[] = [];
        const colW: number[] = [];
        const rowH: number[] = [];
        for (const [r, row] of [...element.rows].entries()) {
          rowH.push(inch(row.getBoundingClientRect().height / rootScale));
          rows.push(
            [...row.cells].map((cell) => {
              if (r === 0) colW.push(inch(cell.getBoundingClientRect().width / rootScale));
              const cellStyle = getComputedStyle(cell);
              const fill = parseColor(cellStyle.backgroundColor);
              const borderBottom = Number.parseFloat(cellStyle.borderBottomWidth) || 0;
              const borderColor = parseColor(cellStyle.borderBottomColor);
              const none = { type: "none" } as const;
              const bottom =
                borderBottom && borderColor && borderColor.alpha > 0
                  ? { type: "solid" as const, pt: pt(borderBottom), color: borderColor.hex }
                  : none;
              return {
                text: textRuns(cell, 1),
                options: {
                  fill:
                    fill && fill.alpha > 0 ? { color: fill.hex, transparency: transparency(fill.alpha) } : undefined,
                  align: ALIGN[cellStyle.textAlign] ?? "left",
                  valign: "middle",
                  // Table cell margins are in inches (text box margins are in points).
                  margin: [
                    0,
                    inch(Number.parseFloat(cellStyle.paddingRight) || 0),
                    0,
                    inch(Number.parseFloat(cellStyle.paddingLeft) || 0),
                  ],
                  border: [none, none, bottom, none],
                },
              } as PptxGenJS.TableCell;
            }),
          );
        }
        slide.addTable(rows, { ...toInches(box), colW, rowH, autoPage: false });
        continue;
      }

      if (kind === "chart") {
        const data = JSON.parse(element.dataset.chart ?? "null") as ChartExport | null;
        if (!data) continue;
        const { chart } = data;
        const round = chart.type === "pie" || chart.type === "donut";
        const series = round
          ? [{ name: chart.series[0]?.name ?? "", labels: chart.labels, values: chart.series[0]?.data ?? [] }]
          : chart.series.map((s) => ({ name: s.name, labels: chart.labels, values: s.data }));
        slide.addChart(CHART_TYPE[chart.type] as PptxGenJS.CHART_NAME, series, chartOptions(data, box));
        continue;
      }

      if (kind === "edges") {
        const data = JSON.parse(element.dataset.edges ?? "null") as {
          width: number;
          color: string;
          edges: { points: Point[]; dashed?: boolean }[];
        } | null;
        if (!data) continue;
        const s = box.w / data.width;
        const color = parseColor(data.color);
        for (const edge of data.edges) {
          edge.points.slice(1).forEach((end, i) => {
            const start = edge.points[i] as Point;
            const x1 = box.x + start.x * s;
            const y1 = box.y + start.y * s;
            const x2 = box.x + end.x * s;
            const y2 = box.y + end.y * s;
            const last = i === edge.points.length - 2;
            slide.addShape(pptx.ShapeType.line, {
              x: inch(Math.min(x1, x2)),
              y: inch(Math.min(y1, y2)),
              w: inch(Math.abs(x2 - x1)),
              h: inch(Math.abs(y2 - y1)),
              flipH: x2 < x1,
              flipV: y2 < y1,
              line: {
                color: color?.hex ?? "888888",
                transparency: color ? transparency(color.alpha) : 0,
                width: pt(2.5 * s),
                dashType: edge.dashed ? "dash" : "solid",
                endArrowType: last ? "triangle" : undefined,
              },
            });
          });
        }
      }
    }

    const note = notes[index];
    if (note) slide.addNotes(note);
  }

  return (await pptx.write({ outputType: "blob" })) as Blob;
}
