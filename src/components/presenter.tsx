import { ChevronLeftIcon, ChevronRightIcon, MessageSquareTextIcon, XIcon } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { ScaledSlide } from "@/components/slide/scaled-slide";
import type { Deck } from "@/lib/deck";
import { cn } from "@/lib/utils";

/** Full screen slideshow: arrows, space or a click to move, Échap to leave, N for the speaker notes. */
export function Presenter({ deck, start, onClose }: { deck: Deck; start: number; onClose: (index: number) => void }) {
  const ref = useRef<HTMLDivElement>(null);
  const [index, setIndex] = useState(Math.min(start, deck.slides.length - 1));
  const [controls, setControls] = useState(true);
  const [notes, setNotes] = useState(false);
  const hideTimer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const indexRef = useRef(index);
  indexRef.current = index;
  const count = deck.slides.length;

  const go = useCallback((next: number) => setIndex(Math.max(0, Math.min(count - 1, next))), [count]);
  const close = useCallback(() => {
    if (document.fullscreenElement) void document.exitFullscreen();
    onClose(indexRef.current);
  }, [onClose]);

  useEffect(() => {
    const element = ref.current;
    element?.focus();
    const onFullscreen = () => {
      if (!document.fullscreenElement) onClose(indexRef.current);
    };
    document.addEventListener("fullscreenchange", onFullscreen);
    return () => document.removeEventListener("fullscreenchange", onFullscreen);
  }, [onClose]);

  const poke = useCallback(() => {
    setControls(true);
    clearTimeout(hideTimer.current);
    hideTimer.current = setTimeout(() => setControls(false), 2200);
  }, []);
  useEffect(() => {
    poke();
    return () => clearTimeout(hideTimer.current);
  }, [poke]);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.metaKey || event.ctrlKey || event.altKey) return;
      const key = event.key;
      if (["ArrowRight", "ArrowDown", "PageDown", " ", "Enter"].includes(key)) go(indexRef.current + 1);
      else if (["ArrowLeft", "ArrowUp", "PageUp", "Backspace"].includes(key)) go(indexRef.current - 1);
      else if (key === "Home") go(0);
      else if (key === "End") go(count - 1);
      else if (key === "Escape") close();
      else if (key.toLowerCase() === "n") setNotes((v) => !v);
      else return;
      event.preventDefault();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [go, close, count]);

  const slide = deck.slides[index];
  if (!slide) return null;

  return (
    <div
      ref={ref}
      tabIndex={-1}
      role="dialog"
      aria-label="Présentation plein écran"
      onMouseMove={poke}
      className={cn("fixed inset-0 z-50 flex flex-col bg-black outline-none", !controls && "cursor-none")}
    >
      <button
        type="button"
        aria-label="Slide suivante"
        className="relative min-h-0 flex-1 cursor-[inherit]"
        onClick={(event) => {
          const rect = event.currentTarget.getBoundingClientRect();
          go(event.clientX - rect.left < rect.width / 4 ? index - 1 : index + 1);
        }}
      >
        <ScaledSlide
          key={slide.index}
          slide={slide}
          deck={deck}
          fit="contain"
          className="animate-in fade-in absolute inset-0 duration-300"
        />
      </button>

      {notes && (
        <div className="max-h-[30vh] shrink-0 overflow-y-auto border-t border-white/10 bg-neutral-950 px-8 py-4 text-[15px] leading-relaxed whitespace-pre-wrap text-white/85">
          {slide.notes || <span className="text-white/40">Pas de notes pour cette slide.</span>}
        </div>
      )}

      <div className="absolute inset-x-0 top-0 h-1 bg-white/10">
        <div
          className="bg-brand h-full transition-all duration-300"
          style={{ width: `${((index + 1) / count) * 100}%` }}
        />
      </div>

      <div
        className={cn(
          "absolute bottom-5 left-1/2 flex -translate-x-1/2 items-center gap-1 rounded-2xl border border-white/10 bg-neutral-900/85 p-1.5 text-white shadow-2xl backdrop-blur transition-opacity duration-300",
          controls ? "opacity-100" : "pointer-events-none opacity-0",
          notes && "bottom-[calc(30vh+20px)]",
        )}
      >
        <PresenterButton label="Slide précédente" onClick={() => go(index - 1)} disabled={index === 0}>
          <ChevronLeftIcon className="size-5" />
        </PresenterButton>
        <span className="min-w-20 text-center text-sm tabular-nums">
          {index + 1} / {count}
        </span>
        <PresenterButton label="Slide suivante" onClick={() => go(index + 1)} disabled={index === count - 1}>
          <ChevronRightIcon className="size-5" />
        </PresenterButton>
        <span className="mx-1 h-5 w-px bg-white/15" />
        <PresenterButton label="Notes de l'orateur (N)" onClick={() => setNotes((v) => !v)} active={notes}>
          <MessageSquareTextIcon className="size-[18px]" />
        </PresenterButton>
        <PresenterButton label="Quitter (Échap)" onClick={close}>
          <XIcon className="size-5" />
        </PresenterButton>
      </div>
    </div>
  );
}

function PresenterButton({
  label,
  onClick,
  disabled,
  active,
  children,
}: {
  label: string;
  onClick: () => void;
  disabled?: boolean;
  active?: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      disabled={disabled}
      onClick={onClick}
      className={cn(
        "grid size-9 place-items-center rounded-xl transition-colors hover:bg-white/10 disabled:opacity-30",
        active && "bg-white/15",
      )}
    >
      {children}
    </button>
  );
}
