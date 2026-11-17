import { useLayoutEffect, useRef } from "react";
import { Chart } from "@/components/slide/chart";
import { useSlideEnv } from "@/components/slide/context";
import { Cards, Diagram, Logos, Stats } from "@/components/slide/visuals";
import type { Block, Deck, Inline, ListBlock, Slide as SlideData } from "@/lib/deck";
import { cn } from "@/lib/utils";

export function InlineContent({ content }: { content: Inline[] }) {
  return (
    <>
      {content.map((part, i) => {
        const key = `${part.type}${i}`;
        switch (part.type) {
          case "text":
            return part.text;
          case "br":
            return <br key={key} />;
          case "code":
            return (
              <code key={key} className="s-icode">
                {part.text}
              </code>
            );
          case "strong":
            return (
              <strong key={key}>
                <InlineContent content={part.children} />
              </strong>
            );
          case "em":
            return (
              <em key={key}>
                <InlineContent content={part.children} />
              </em>
            );
          case "del":
            return (
              <del key={key}>
                <InlineContent content={part.children} />
              </del>
            );
          case "link": {
            const safe = /^(https?:|mailto:)/i.test(part.href);
            return safe ? (
              <a key={key} href={part.href} target="_blank" rel="noreferrer">
                <InlineContent content={part.children} />
              </a>
            ) : (
              <InlineContent key={key} content={part.children} />
            );
          }
          default:
            return null;
        }
      })}
    </>
  );
}

function List({ list }: { list: ListBlock }) {
  const Tag = list.ordered ? "ol" : "ul";
  return (
    <Tag className="s-list" start={list.ordered ? list.start : undefined}>
      {list.items.map((item, i) => (
        <li key={i} className="s-li">
          <InlineContent content={item.content} />
          {item.children && <List list={item.children} />}
        </li>
      ))}
    </Tag>
  );
}

export function SlideImage({
  src,
  alt,
  grow,
  className,
}: {
  src: string;
  alt?: string;
  grow?: boolean;
  className?: string;
}) {
  const { resolve } = useSlideEnv();
  const url = resolve(src);
  if (url === null)
    return (
      <div className={cn("s-missing", grow && "s-grow", className)} style={grow ? undefined : { height: 200 }}>
        Image introuvable : {src}
      </div>
    );
  return (
    <div className={cn("s-image", grow && "s-grow", className)}>
      {url && <img src={url} alt={alt ?? ""} data-x="image" data-path={src} />}
    </div>
  );
}

const growing = (block: Block) =>
  block.type === "image" || (block.type === "spec" && (block.kind === "chart" || block.kind === "diagram"));

function BlockView({ block }: { block: Block }) {
  switch (block.type) {
    case "heading": {
      const className = block.depth <= 1 ? "s-h1" : block.depth === 2 ? "s-h2" : "s-h3";
      const Tag = block.depth <= 1 ? "h1" : block.depth === 2 ? "h2" : "h3";
      return (
        <Tag className={className} data-x="text">
          <InlineContent content={block.content} />
        </Tag>
      );
    }
    case "paragraph":
      return (
        <p className="s-p" data-x="text">
          <InlineContent content={block.content} />
        </p>
      );
    case "list":
      return (
        <div data-x="list">
          <List list={block} />
        </div>
      );
    case "image":
      return <SlideImage src={block.src} alt={block.alt} grow />;
    case "quote":
      return (
        <div className="s-quote">
          <span className="s-quote-bar" data-x="box" />
          <p className="s-quote-text" data-x="text">
            <InlineContent content={block.content} />
          </p>
        </div>
      );
    case "code":
      return (
        <div className="s-code" data-x="box">
          <pre className="s-code-text" data-x="text" data-pre>
            {block.text}
          </pre>
        </div>
      );
    case "table":
      return (
        <table className="s-table" data-x="table">
          <thead>
            <tr>
              {block.header.map((cell, i) => (
                <th key={i} style={{ textAlign: block.align[i] ?? "left" }}>
                  <InlineContent content={cell} />
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {block.rows.map((row, r) => (
              <tr key={r}>
                {row.map((cell, i) => (
                  <td key={i} style={{ textAlign: block.align[i] ?? "left" }}>
                    <InlineContent content={cell} />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      );
    case "error":
      return <div className="s-error">{block.message}</div>;
    case "spec": {
      const spec = block.spec;
      switch (spec.kind) {
        case "chart":
          return (
            <div className="s-grow" style={{ display: "flex", flexDirection: "column", minHeight: 0 }}>
              {spec.chart.title && (
                <p className="s-chart-title" data-x="text">
                  {spec.chart.title}
                </p>
              )}
              <Chart chart={spec.chart} className="s-grow" />
            </div>
          );
        case "diagram":
          return <Diagram diagram={spec.diagram} />;
        case "stats":
          return <Stats items={spec.items} />;
        case "cards":
          return <Cards items={spec.items} />;
        case "logos":
          return <Logos items={spec.items} />;
      }
    }
  }
}

function Blocks({ blocks, className }: { blocks: Block[]; className?: string }) {
  return (
    <div className={cn("s-content", className)}>
      {blocks.map((block, i) =>
        growing(block) ? (
          <BlockView key={i} block={block} />
        ) : (
          <div key={i} style={{ flex: "none", minWidth: 0 }}>
            <BlockView block={block} />
          </div>
        ),
      )}
    </div>
  );
}

/** A leading level-1 or level-2 heading becomes the slide title. */
function splitTitle(blocks: Block[]) {
  const [first, ...rest] = blocks;
  if (first?.type === "heading" && first.depth <= 2) return { title: first, rest };
  return { title: undefined, rest: blocks };
}

function Title({ block }: { block: Extract<Block, { type: "heading" }> }) {
  return (
    <h1 className="s-title" data-x="text">
      <InlineContent content={block.content} />
    </h1>
  );
}

const HERO_LAYOUTS = new Set(["cover", "section", "end"]);

function SlideBody({ slide, deck }: { slide: SlideData; deck: Deck }) {
  const { resolve } = useSlideEnv();
  const image = typeof slide.frontmatter.image === "string" ? slide.frontmatter.image : undefined;
  const logo = deck.headmatter.logo;
  const logoUrl = logo ? resolve(logo) : undefined;

  switch (slide.layout) {
    case "cover":
      return (
        <div className="s-main">
          <div className="s-cover-text">
            {logoUrl && <img className="s-cover-logo" src={logoUrl} alt="" data-x="image" data-path={logo} />}
            {slide.blocks.map((block, i) => (
              <div key={i} style={{ minWidth: 0 }}>
                <BlockView block={block} />
              </div>
            ))}
          </div>
          {image && <SlideImage src={image} className="s-cover-image" />}
        </div>
      );
    case "section": {
      const number = deck.slides.filter((s) => s.layout === "section" && s.index <= slide.index).length;
      return (
        <div className="s-main">
          <p className="s-eyebrow" data-x="text">
            {String(number).padStart(2, "0")}
          </p>
          <Blocks blocks={slide.blocks} className="s-content-none" />
        </div>
      );
    }
    case "end":
      return (
        <div className="s-main">
          <div className="s-content">
            {logoUrl && <img className="s-end-logo" src={logoUrl} alt="" data-x="image" data-path={logo} />}
            {slide.blocks.map((block, i) => (
              <div key={i}>
                <BlockView block={block} />
              </div>
            ))}
          </div>
        </div>
      );
    case "quote":
      return (
        <div className="s-main">
          <p className="s-big-quote" data-x="text">
            “
          </p>
          <Blocks blocks={slide.blocks} className="s-content-none" />
        </div>
      );
    case "two-cols": {
      const { title, rest } = splitTitle(slide.blocks);
      return (
        <div className="s-main">
          {title && <Title block={title} />}
          <div className="s-cols">
            <Blocks blocks={rest} />
            <Blocks blocks={slide.right} />
          </div>
        </div>
      );
    }
    case "image-left":
    case "image-right": {
      const { title, rest } = splitTitle(slide.blocks);
      return (
        <>
          <div className="s-side-image" data-x="box">
            {image && <SlideImage src={image} className="s-grow" />}
          </div>
          <div className="s-main">
            {title && <Title block={title} />}
            <Blocks blocks={rest} />
          </div>
        </>
      );
    }
    case "center":
      return (
        <div className="s-main">
          <Blocks blocks={slide.blocks} />
        </div>
      );
    default: {
      const { title, rest } = splitTitle(slide.blocks);
      return (
        <div className="s-main">
          {title && <Title block={title} />}
          <Blocks blocks={rest} />
        </div>
      );
    }
  }
}

/**
 * One slide at 1280 × 720. Every element the PowerPoint export recreates carries a `data-x` attribute:
 * text, list, box, image, table, chart or edges. The `.s-bg` layer becomes the slide background picture.
 */
export function Slide({ slide, deck }: { slide: SlideData; deck: Deck }) {
  const { theme, resolve } = useSlideEnv();
  const ref = useRef<HTMLDivElement>(null);
  const hero = HERO_LAYOUTS.has(slide.layout);
  const logo = deck.headmatter.logo;
  const logoUrl = logo && !hero ? resolve(logo) : undefined;
  const footer = deck.headmatter.footer;

  // Shrinks the text of a slide whose content overflows, down to 60 %.
  // biome-ignore lint/correctness/useExhaustiveDependencies: refit when the content changes
  useLayoutEffect(() => {
    const element = ref.current;
    if (!element) return;
    const overflows = () =>
      [...element.querySelectorAll<HTMLElement>(".s-content, .s-cover-text")].some(
        (content) => content.scrollHeight > content.clientHeight + 2,
      ) ||
      [...element.querySelectorAll<HTMLElement>(".s-main")].some((main) => main.scrollHeight > main.clientHeight + 2);
    let fit = 1;
    element.style.setProperty("--fit", "1");
    while (fit > 0.6 && overflows()) {
      fit = Math.round((fit - 0.05) * 100) / 100;
      element.style.setProperty("--fit", String(fit));
    }
  }, [slide, deck.headmatter, theme]);

  const style = {
    "--bg": theme.bg,
    // Cover, section and end slides sit on the strong hero background.
    "--text": hero ? theme.heroText : theme.text,
    "--muted": hero ? theme.heroMuted : theme.muted,
    "--accent": hero ? theme.heroText : theme.accent,
    "--accent2": theme.accent2,
    "--surface": hero ? "rgba(255,255,255,0.12)" : theme.surface,
    "--border": hero ? "rgba(255,255,255,0.22)" : theme.border,
    "--hero-text": theme.heroText,
    "--hero-muted": theme.heroMuted,
    "--font-h": theme.headingFont,
    "--font-b": theme.bodyFont,
  } as React.CSSProperties;

  return (
    <div ref={ref} className={cn("s-slide", `s-layout-${slide.layout}`, hero && "s-hero")} style={style} data-slide>
      <div className="s-bg" data-x="background" style={{ background: hero ? theme.hero : theme.background }} />
      <SlideBody slide={slide} deck={deck} />
      {logoUrl && <img className="s-logo" src={logoUrl} alt="" data-x="image" data-path={logo} />}
      {!hero && (footer || deck.headmatter.numbers) && (
        <div className="s-footer">
          <span data-x="text">{footer ?? ""}</span>
          {deck.headmatter.numbers && (
            <span data-x="text">
              {slide.index + 1} / {deck.slides.length}
            </span>
          )}
        </div>
      )}
    </div>
  );
}
