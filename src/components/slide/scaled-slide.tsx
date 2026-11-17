import { useRef } from "react";
import { useSize } from "@/components/slide/context";
import { Slide } from "@/components/slide/slide";
import type { Deck, Slide as SlideData } from "@/lib/deck";
import { cn } from "@/lib/utils";

/** A slide shrunk (or enlarged) to the width of its frame, keeping the 16:9 ratio. */
export function ScaledSlide({
  slide,
  deck,
  className,
  fit = "width",
}: {
  slide: SlideData;
  deck: Deck;
  className?: string;
  /** `contain`: the largest 16:9 box that fits in the frame (presenter mode). */
  fit?: "width" | "contain";
}) {
  const ref = useRef<HTMLDivElement>(null);
  const { width, height } = useSize(ref);
  const scale = fit === "contain" ? Math.min(width / 1280, height / 720) : width / 1280;
  return (
    <div
      ref={ref}
      className={cn("relative overflow-hidden", fit === "width" && "aspect-video", className)}
      style={{ containerType: "size" }}
    >
      {scale > 0 && (
        <div
          className="absolute"
          style={{
            width: 1280,
            height: 720,
            left: fit === "contain" ? (width - 1280 * scale) / 2 : 0,
            top: fit === "contain" ? (height - 720 * scale) / 2 : 0,
            transform: `scale(${scale})`,
            transformOrigin: "top left",
          }}
        >
          <Slide slide={slide} deck={deck} />
        </div>
      )}
    </div>
  );
}
