import { defaultKeymap, history, historyKeymap, indentWithTab } from "@codemirror/commands";
import { markdown } from "@codemirror/lang-markdown";
import { HighlightStyle, syntaxHighlighting } from "@codemirror/language";
import { highlightSelectionMatches, searchKeymap } from "@codemirror/search";
import { Compartment, EditorState } from "@codemirror/state";
import {
  Decoration,
  type DecorationSet,
  drawSelection,
  EditorView,
  highlightActiveLine,
  highlightActiveLineGutter,
  keymap,
  lineNumbers,
  placeholder,
  ViewPlugin,
  type ViewUpdate,
} from "@codemirror/view";
import { tags } from "@lezer/highlight";
import { forwardRef, useEffect, useImperativeHandle, useRef } from "react";

export type EditorHandle = {
  /** Replaces the selection (or inserts at the cursor) and focuses the editor. */
  insert: (text: string) => void;
  /** Puts the cursor at the start of a line (0-based) and scrolls it to the top. */
  goToLine: (line: number) => void;
  focus: () => void;
};

const highlight = HighlightStyle.define([
  { tag: tags.heading1, fontWeight: "700", fontSize: "1.15em", color: "var(--cm-heading)" },
  { tag: [tags.heading2, tags.heading3, tags.heading4], fontWeight: "650", color: "var(--cm-heading)" },
  { tag: tags.strong, fontWeight: "700" },
  { tag: tags.emphasis, fontStyle: "italic" },
  { tag: tags.strikethrough, textDecoration: "line-through" },
  { tag: [tags.link, tags.url], color: "var(--cm-link)" },
  { tag: [tags.monospace], color: "var(--cm-code)" },
  { tag: [tags.processingInstruction, tags.contentSeparator, tags.list, tags.quote], color: "var(--cm-mark)" },
  { tag: [tags.comment, tags.meta], color: "var(--cm-comment)", fontStyle: "italic" },
]);

/** Slide separators get a full-width rule, so the slides stand out in the source. */
const separatorLine = Decoration.line({ class: "cm-slide-separator" });
const separators = ViewPlugin.fromClass(
  class {
    decorations: DecorationSet;
    constructor(view: EditorView) {
      this.decorations = this.build(view);
    }
    update(update: ViewUpdate) {
      if (update.docChanged || update.viewportChanged) this.decorations = this.build(update.view);
    }
    build(view: EditorView) {
      const ranges = [];
      let fence = false;
      for (let n = 1; n <= view.state.doc.lines; n++) {
        const line = view.state.doc.line(n);
        if (/^\s*(```|~~~)/.test(line.text)) fence = !fence;
        if (!fence && /^---\s*$/.test(line.text)) ranges.push(separatorLine.range(line.from));
      }
      return Decoration.set(ranges);
    }
  },
  { decorations: (plugin) => plugin.decorations },
);

const baseTheme = EditorView.theme({
  "&": { height: "100%", fontSize: "13.5px", backgroundColor: "transparent" },
  ".cm-scroller": {
    fontFamily: '"JetBrains Mono Variable", ui-monospace, monospace',
    lineHeight: "1.65",
    fontVariantLigatures: "none",
  },
  ".cm-content": { padding: "16px 0 50vh", caretColor: "var(--foreground)" },
  ".cm-line": { padding: "0 20px 0 12px" },
  ".cm-gutters": {
    backgroundColor: "transparent",
    border: "none",
    color: "var(--muted-foreground)",
    opacity: "0.55",
  },
  ".cm-activeLine": { backgroundColor: "color-mix(in oklch, var(--brand) 6%, transparent)" },
  ".cm-activeLineGutter": { backgroundColor: "transparent", color: "var(--foreground)" },
  ".cm-selectionBackground, &.cm-focused .cm-selectionBackground, ::selection": {
    backgroundColor: "color-mix(in oklch, var(--brand) 22%, transparent) !important",
  },
  ".cm-cursor": { borderLeftColor: "var(--foreground)" },
  "&.cm-focused": { outline: "none" },
  ".cm-slide-separator": {
    color: "var(--brand)",
    fontWeight: "700",
    backgroundImage: "linear-gradient(var(--brand), var(--brand))",
    backgroundSize: "100% 1px",
    backgroundPosition: "0 50%",
    backgroundRepeat: "no-repeat",
  },
  ".cm-placeholder": { color: "var(--muted-foreground)" },
  ".cm-panels": { backgroundColor: "var(--muted)", color: "var(--foreground)" },
});

type Props = {
  value: string;
  onChange: (value: string) => void;
  onCursorLine: (line: number) => void;
  /** Changes when another deck is opened: the undo history starts over. */
  docKey: string;
};

export const Editor = forwardRef<EditorHandle, Props>(function Editor({ value, onChange, onCursorLine, docKey }, ref) {
  const host = useRef<HTMLDivElement>(null);
  const view = useRef<EditorView>(null);
  const callbacks = useRef({ onChange, onCursorLine });
  callbacks.current = { onChange, onCursorLine };
  const wrap = useRef(new Compartment());

  // biome-ignore lint/correctness/useExhaustiveDependencies: a new editor state per opened deck
  useEffect(() => {
    if (!host.current) return;
    const state = EditorState.create({
      doc: value,
      extensions: [
        lineNumbers(),
        highlightActiveLine(),
        highlightActiveLineGutter(),
        history(),
        drawSelection(),
        highlightSelectionMatches(),
        markdown(),
        syntaxHighlighting(highlight),
        separators,
        placeholder("Écrivez votre présentation en markdown…"),
        wrap.current.of(EditorView.lineWrapping),
        keymap.of([...defaultKeymap, ...historyKeymap, ...searchKeymap, indentWithTab]),
        baseTheme,
        EditorView.updateListener.of((update) => {
          if (update.docChanged) callbacks.current.onChange(update.state.doc.toString());
          if (update.docChanged || update.selectionSet) {
            const line = update.state.doc.lineAt(update.state.selection.main.head).number - 1;
            callbacks.current.onCursorLine(line);
          }
        }),
      ],
    });
    view.current = new EditorView({ state, parent: host.current });
    return () => {
      view.current?.destroy();
      view.current = null;
    };
  }, [docKey]);

  // A change from outside (file reloaded from disk) replaces the text.
  useEffect(() => {
    const editor = view.current;
    if (!editor) return;
    const current = editor.state.doc.toString();
    if (current !== value) editor.dispatch({ changes: { from: 0, to: current.length, insert: value } });
  }, [value]);

  useImperativeHandle(ref, () => ({
    insert: (text) => {
      const editor = view.current;
      if (!editor) return;
      const { from, to } = editor.state.selection.main;
      editor.dispatch({
        changes: { from, to, insert: text },
        selection: { anchor: from + text.length },
        scrollIntoView: true,
      });
      editor.focus();
    },
    goToLine: (line) => {
      const editor = view.current;
      if (!editor) return;
      const target = editor.state.doc.line(Math.min(editor.state.doc.lines, Math.max(1, line + 1)));
      editor.dispatch({
        selection: { anchor: target.from },
        effects: EditorView.scrollIntoView(target.from, { y: "start", yMargin: 24 }),
      });
      editor.focus();
    },
    focus: () => view.current?.focus(),
  }));

  return <div ref={host} className="h-full min-h-0 overflow-hidden" />;
});
