import { createContext, useContext, useLayoutEffect, useState } from "react";
import type { SlideTheme } from "@/lib/themes";

/** A picture of the working folder: its URL once read, `null` when missing, `undefined` while loading. */
export type Resolve = (path: string) => string | null | undefined;

export type SlideEnv = { theme: SlideTheme; resolve: Resolve };

export const SlideEnvContext = createContext<SlideEnv | null>(null);

export function useSlideEnv() {
  const env = useContext(SlideEnvContext);
  if (!env) throw new Error("SlideEnvContext missing");
  return env;
}

/** Layout size of an element (before any CSS transform of its ancestors). */
export function useSize(ref: React.RefObject<HTMLElement | null>) {
  const [size, setSize] = useState({ width: 0, height: 0 });
  useLayoutEffect(() => {
    const element = ref.current;
    if (!element) return;
    const update = () => {
      const next = { width: element.offsetWidth, height: element.offsetHeight };
      setSize((current) => (current.width === next.width && current.height === next.height ? current : next));
    };
    update();
    const observer = new ResizeObserver(update);
    observer.observe(element);
    return () => observer.disconnect();
  }, [ref]);
  return size;
}

export const formatValue = (value: number, unit?: string) => {
  const text = value.toLocaleString("fr-FR", { maximumFractionDigits: 1 });
  if (!unit) return text;
  return unit === "%" ? `${text} %` : `${text} ${unit}`;
};
