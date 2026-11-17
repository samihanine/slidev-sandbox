import { useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { Slide } from "@/components/slide/slide";
import type { Deck } from "@/lib/deck";

const frame = () => new Promise((resolve) => requestAnimationFrame(resolve));
const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/** Waits until fonts, pictures, charts and diagrams of the slides are drawn. */
export async function settle(root: HTMLElement) {
  await document.fonts.ready;
  for (let i = 0; i < 40; i++) {
    await frame();
    const pending =
      root.querySelector(".s-image:not(:has(img))") ||
      [...root.querySelectorAll("img")].some((img) => !img.complete) ||
      root.querySelector(".s-chart:empty") ||
      root.querySelector(".s-fit-box:empty");
    if (!pending && i >= 2) break;
    await wait(50);
  }
  await Promise.all([...root.querySelectorAll("img")].map((img) => img.decode().catch(() => {})));
}

/**
 * Every slide of the deck at full size, out of sight, for the exports: they read the layout of the real DOM.
 * `onReady` receives the slide elements once everything is drawn.
 */
export function ExportStage({ deck, onReady }: { deck: Deck; onReady: (slides: HTMLElement[]) => void }) {
  const ref = useRef<HTMLDivElement>(null);
  const callback = useRef(onReady);
  callback.current = onReady;

  useEffect(() => {
    const root = ref.current;
    if (!root) return;
    let cancelled = false;
    void settle(root).then(() => {
      if (!cancelled) callback.current([...root.querySelectorAll<HTMLElement>("[data-slide]")]);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  return createPortal(
    <div
      ref={ref}
      aria-hidden="true"
      style={{ position: "fixed", left: -20000, top: 0, width: 1280, pointerEvents: "none", contain: "layout" }}
    >
      {deck.slides.map((slide) => (
        <div key={slide.index} style={{ width: 1280, height: 720, position: "relative", overflow: "hidden" }}>
          <Slide slide={slide} deck={deck} />
        </div>
      ))}
    </div>,
    document.body,
  );
}
