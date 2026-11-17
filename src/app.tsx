import {
  ChevronDownIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  CircleHelpIcon,
  Columns2Icon,
  DownloadIcon,
  EyeIcon,
  FileTextIcon,
  ImageIcon,
  Loader2Icon,
  MoonIcon,
  PaletteIcon,
  PencilLineIcon,
  PlayIcon,
  PlusIcon,
  PresentationIcon,
  SunIcon,
} from "lucide-react";
import { useCallback, useDeferredValue, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { HelpDialog, NameDialog } from "@/components/dialogs";
import { Editor, type EditorHandle } from "@/components/editor";
import { ExportStage } from "@/components/export-stage";
import { Presenter } from "@/components/presenter";
import { Sidebar } from "@/components/sidebar";
import { SlideEnvContext } from "@/components/slide/context";
import { ScaledSlide } from "@/components/slide/scaled-slide";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Toaster } from "@/components/ui/sonner";
import { Loading, Missing, NeedsPermission, NoDeck, Welcome } from "@/components/welcome";
import { type Deck, parseDeck, setHeadmatter, slideAtLine } from "@/lib/deck";
import { exportPdf } from "@/lib/export-pdf";
import { exportPptx } from "@/lib/export-pptx";
import { SNIPPETS } from "@/lib/snippets";
import { useTheme } from "@/lib/theme";
import { THEMES, themeById } from "@/lib/themes";
import { useFolder } from "@/lib/use-folder";
import { cn, downloadBlob } from "@/lib/utils";

type Pane = "edit" | "split" | "preview";
const PANE_KEY = "markdown-slides:pane";
const SPLIT_KEY = "markdown-slides:split";

const readLocal = (key: string) => {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
};
const writeLocal = (key: string, value: string) => {
  try {
    localStorage.setItem(key, value);
  } catch {}
};

function Rail() {
  const { theme, toggle } = useTheme();
  return (
    <nav aria-label="Outils" className="flex w-12 shrink-0 flex-col items-center gap-3 py-2 max-sm:hidden">
      <div
        title="Markdown Slides"
        className="from-brand shadow-brand/30 ring-foreground/15 ring-offset-app grid size-10 place-items-center rounded-xl bg-linear-to-b to-[oklch(0.55_0.2_290)] text-white shadow-md ring-2 ring-offset-2"
      >
        <PresentationIcon className="size-5" />
      </div>
      <button
        type="button"
        onClick={toggle}
        aria-label={theme === "dark" ? "Passer au thème clair" : "Passer au thème sombre"}
        className="text-muted-foreground hover:bg-background hover:text-foreground focus-visible:ring-ring/50 mt-auto grid size-10 place-items-center rounded-xl transition-colors outline-none focus-visible:ring-3"
      >
        {theme === "dark" ? <SunIcon className="size-[18px]" /> : <MoonIcon className="size-[18px]" />}
      </button>
    </nav>
  );
}

export function App() {
  return (
    <div className="flex h-full gap-2 p-2">
      <Rail />
      <Workspace />
      <Toaster position="bottom-right" />
    </div>
  );
}

const PANES: { pane: Pane; label: string; icon: typeof EyeIcon }[] = [
  { pane: "edit", label: "Écrire", icon: PencilLineIcon },
  { pane: "split", label: "Les deux", icon: Columns2Icon },
  { pane: "preview", label: "Aperçu", icon: EyeIcon },
];

function Workspace() {
  const folder = useFolder();
  const { status, deckName, content } = folder;
  const editor = useRef<EditorHandle>(null);
  const [current, setCurrent] = useState(0);
  const [presenting, setPresenting] = useState<number>();
  const [exporting, setExporting] = useState<"pptx" | "pdf">();
  const [dialog, setDialog] = useState<"new" | "rename" | "help">();
  const [renaming, setRenaming] = useState<string>();
  const [pane, setPane] = useState<Pane>(() => (readLocal(PANE_KEY) as Pane | null) ?? "split");
  const [split, setSplit] = useState(() => Number(readLocal(SPLIT_KEY)) || 44);
  const fileInput = useRef<HTMLInputElement>(null);

  const deferred = useDeferredValue(content);
  const deck = useMemo<Deck>(() => parseDeck(deferred), [deferred]);
  const theme = themeById(deck.headmatter.theme);
  const env = useMemo(() => ({ theme, resolve: folder.resolve }), [theme, folder.resolve]);
  const ready = status === "ready";
  const hasDeck = ready && !!deckName;
  const index = Math.min(current, deck.slides.length - 1);
  const slide = deck.slides[index];

  // biome-ignore lint/correctness/useExhaustiveDependencies: back to the first slide when another deck opens
  useEffect(() => setCurrent(0), [deckName]);

  const choosePane = (next: Pane) => {
    setPane(next);
    writeLocal(PANE_KEY, next);
  };

  // Ctrl+S saves now (it is also saved automatically).
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "s") {
        event.preventDefault();
        void folder.save();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [folder.save]);

  const goToSlide = (target: number) => {
    const next = deck.slides[Math.max(0, Math.min(deck.slides.length - 1, target))];
    if (!next) return;
    setCurrent(next.index);
    if (pane !== "preview") editor.current?.goToLine(next.line);
  };

  const insertImage = async (file: File) => {
    try {
      const path = await folder.addAsset(file);
      if (path) {
        editor.current?.insert(`![${file.name.replace(/\.[^.]+$/, "")}](${path})\n`);
        toast.success(`Image copiée dans ${path}`);
      }
    } catch (error) {
      toast.error(`Copie impossible : ${(error as Error).message}`);
    }
  };

  const runExport = useCallback(
    async (slides: HTMLElement[]) => {
      const kind = exporting;
      const base = (deckName ?? "presentation").replace(/\.(md|markdown)$/i, "");
      const title = deck.headmatter.title || base;
      const id = toast.loading(kind === "pptx" ? "Création du PowerPoint…" : "Création du PDF…");
      try {
        if (kind === "pptx") {
          const blob = await exportPptx({
            title,
            slides,
            notes: deck.slides.map((s) => s.notes),
            background: theme.bg,
          });
          downloadBlob(blob, `${base}.pptx`);
          toast.success("PowerPoint téléchargé", { id, description: "Textes, tableaux et graphiques modifiables." });
        } else {
          const blob = await exportPdf(title, slides, (done) =>
            toast.loading(`Création du PDF… ${done} / ${slides.length}`, { id }),
          );
          downloadBlob(blob, `${base}.pdf`);
          toast.success("PDF téléchargé", { id });
        }
      } catch (error) {
        console.error(error);
        toast.error(`Export impossible : ${(error as Error).message}`, { id });
      } finally {
        setExporting(undefined);
      }
    },
    [exporting, deckName, deck, theme.bg],
  );

  const startResize = (event: React.PointerEvent<HTMLDivElement>) => {
    const container = event.currentTarget.parentElement;
    if (!container) return;
    event.currentTarget.setPointerCapture(event.pointerId);
    const rect = container.getBoundingClientRect();
    const move = (e: PointerEvent) => {
      const value = Math.max(25, Math.min(70, ((e.clientX - rect.left) / rect.width) * 100));
      setSplit(value);
      writeLocal(SPLIT_KEY, String(Math.round(value)));
    };
    const up = () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
    };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
  };

  return (
    <SlideEnvContext.Provider value={env}>
      <div className="bg-background flex min-w-0 flex-1 flex-col overflow-hidden rounded-2xl border shadow-sm">
        <header className="flex h-14 shrink-0 items-center gap-3 border-b px-5 max-sm:px-3">
          <p className="flex min-w-0 items-center gap-2 text-[15px]">
            <span className="text-muted-foreground truncate max-sm:hidden">
              {folder.folder?.name ?? "Présentations"}
            </span>
            <span className="text-muted-foreground max-sm:hidden">/</span>
            <span className="truncate font-medium">{deckName ?? "Aucune présentation"}</span>
          </p>
          {hasDeck && (
            <span className="text-muted-foreground flex shrink-0 items-center gap-1.5 text-xs max-lg:hidden">
              {folder.saving || folder.dirty ? (
                <>
                  <Loader2Icon className="size-3 animate-spin" /> Enregistrement…
                </>
              ) : (
                <>
                  <span className="size-1.5 rounded-full bg-emerald-500" /> Enregistré
                </>
              )}
            </span>
          )}

          {hasDeck && (
            <div className="ml-auto flex shrink-0 items-center gap-1.5">
              <DropdownMenu>
                <DropdownMenuTrigger render={<Button variant="ghost" size="sm" className="h-8 text-[13px]" />}>
                  <PaletteIcon /> <span className="max-xl:hidden">{theme.name}</span>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="min-w-52">
                  <DropdownMenuLabel>Thème</DropdownMenuLabel>
                  {THEMES.map((option) => (
                    <DropdownMenuItem
                      key={option.id}
                      onClick={() => folder.setContent(setHeadmatter(content, "theme", option.id))}
                    >
                      <span
                        className="size-4 rounded-full border"
                        style={{ background: `linear-gradient(135deg, ${option.accent}, ${option.accent2})` }}
                      />
                      <span className="flex-1">{option.name}</span>
                      <span className="text-muted-foreground text-xs">{option.dark ? "sombre" : "clair"}</span>
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>

              <DropdownMenu>
                <DropdownMenuTrigger
                  disabled={pane === "preview"}
                  render={<Button variant="ghost" size="sm" className="h-8 text-[13px]" />}
                >
                  <PlusIcon /> <span className="max-lg:hidden">Insérer</span>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="max-h-[70vh] min-w-64 overflow-y-auto">
                  {SNIPPETS.map((snippet, i) => (
                    <div key={snippet.id}>
                      {(i === 4 || i === 7) && <DropdownMenuSeparator />}
                      <DropdownMenuItem onClick={() => editor.current?.insert(snippet.text)}>
                        <span className="flex-1">{snippet.label}</span>
                        <span className="text-muted-foreground font-mono text-[11px]">{snippet.hint}</span>
                      </DropdownMenuItem>
                    </div>
                  ))}
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => fileInput.current?.click()}>
                    <ImageIcon /> Image depuis l'ordinateur…
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>

              <Button
                variant="ghost"
                size="icon-sm"
                className="size-8"
                title="Syntaxe"
                aria-label="Syntaxe"
                onClick={() => setDialog("help")}
              >
                <CircleHelpIcon />
              </Button>

              <span className="bg-border mx-1 h-5 w-px" />

              <DropdownMenu>
                <DropdownMenuTrigger
                  disabled={!!exporting}
                  render={<Button variant="outline" size="sm" className="h-8 px-3 text-[13px]" />}
                >
                  {exporting ? <Loader2Icon className="animate-spin" /> : <DownloadIcon />}
                  <span className="max-sm:hidden">Exporter</span>
                  <ChevronDownIcon className="text-muted-foreground" />
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="min-w-64">
                  <DropdownMenuItem onClick={() => setExporting("pptx")}>
                    <PresentationIcon className="text-orange-500" />
                    <span className="flex flex-col">
                      <span>PowerPoint (.pptx)</span>
                      <span className="text-muted-foreground text-xs">Texte et graphiques modifiables</span>
                    </span>
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setExporting("pdf")}>
                    <FileTextIcon className="text-red-500" />
                    <span className="flex flex-col">
                      <span>PDF</span>
                      <span className="text-muted-foreground text-xs">Une page par slide, haute définition</span>
                    </span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
              <Button
                size="sm"
                className="h-8 px-3 text-[13px]"
                onClick={() => {
                  // Asked during the click: the browser only allows full screen from a user gesture.
                  document.documentElement.requestFullscreen?.().catch(() => {});
                  setPresenting(index);
                }}
              >
                <PlayIcon /> Présenter
              </Button>
            </div>
          )}
        </header>

        <div className="flex min-h-0 flex-1">
          {status !== "idle" && (
            <Sidebar
              folders={folder.folders}
              activeId={folder.folder?.id}
              onSelect={(id) => void folder.selectFolder(id)}
              onOpen={() => void folder.openFolder()}
              onRemove={(id) => void folder.removeFolder(id)}
              ready={ready}
              decks={folder.decks}
              deckName={deckName}
              onNewDeck={() => setDialog("new")}
              onOpenDeck={(name) => void folder.openDeck(name)}
              onRenameDeck={(name) => {
                setRenaming(name);
                setDialog("rename");
              }}
              onDuplicateDeck={(name) =>
                void folder.duplicateDeck(name).then(() => toast.success("Présentation dupliquée"))
              }
              onDeleteDeck={(name) =>
                void folder.deleteDeck(name).then((text) => {
                  if (text === undefined) return;
                  toast(`« ${name} » supprimé`, {
                    action: { label: "Annuler", onClick: () => void folder.restoreDeck(name, text) },
                  });
                })
              }
              onRefresh={() => void folder.refresh()}
            />
          )}

          <main className="flex min-w-0 flex-1 flex-col">
            {status === "idle" && <Welcome onOpen={() => void folder.openFolder()} />}
            {status === "loading" && <Loading />}
            {status === "permission" && folder.folder && (
              <NeedsPermission name={folder.folder.name} onGrant={folder.grantAccess} />
            )}
            {status === "missing" && folder.folder && (
              <Missing
                name={folder.folder.name}
                onOpen={() => void folder.openFolder()}
                onRemove={() => folder.folder && void folder.removeFolder(folder.folder.id)}
              />
            )}
            {ready && !deckName && <NoDeck onCreate={() => setDialog("new")} />}
            {hasDeck && (
              <>
                <div className="flex h-11 shrink-0 items-center gap-4 border-b px-4">
                  <div role="tablist" aria-label="Affichage" className="bg-muted/70 flex rounded-lg p-0.5">
                    {PANES.map(({ pane: value, label, icon: Icon }) => (
                      <button
                        key={value}
                        type="button"
                        role="tab"
                        aria-selected={pane === value}
                        onClick={() => choosePane(value)}
                        className={cn(
                          "text-muted-foreground hover:text-foreground flex h-7 items-center gap-1.5 rounded-md px-2.5 text-[13px] font-medium transition-colors",
                          pane === value && "bg-background text-foreground shadow-xs",
                        )}
                      >
                        <Icon className="size-3.5" /> {label}
                      </button>
                    ))}
                  </div>
                  <p className="text-muted-foreground ml-auto text-[13px] tabular-nums">
                    {deck.slides.length} slide{deck.slides.length > 1 ? "s" : ""}
                  </p>
                </div>
                <div className="relative flex min-h-0 flex-1">
                  {pane !== "preview" && (
                    <section
                      aria-label="Markdown"
                      className="min-w-0"
                      style={{ width: pane === "edit" ? "100%" : `${split}%` }}
                      onDragOver={(event) => {
                        if (event.dataTransfer.types.includes("Files")) event.preventDefault();
                      }}
                      onDrop={(event) => {
                        const file = [...event.dataTransfer.files].find((f) => f.type.startsWith("image/"));
                        if (!file) return;
                        event.preventDefault();
                        void insertImage(file);
                      }}
                    >
                      <Editor
                        ref={editor}
                        docKey={`${folder.folder?.id}/${deckName}`}
                        value={content}
                        onChange={folder.setContent}
                        onCursorLine={(line) => setCurrent(slideAtLine(deck, line))}
                      />
                    </section>
                  )}
                  {pane === "split" && (
                    <div
                      onPointerDown={startResize}
                      className="hover:bg-brand/40 active:bg-brand/60 relative z-10 -mx-1 w-2 shrink-0 cursor-col-resize bg-transparent transition-colors after:absolute after:inset-y-0 after:left-1/2 after:w-px after:bg-(--border)"
                    />
                  )}
                  {pane !== "edit" && slide && (
                    <Preview deck={deck} index={index} onSelect={goToSlide} wide={pane === "preview"} />
                  )}
                </div>
              </>
            )}
          </main>
        </div>
      </div>

      <input
        ref={fileInput}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(event) => {
          const file = event.target.files?.[0];
          if (file) void insertImage(file);
          event.target.value = "";
        }}
      />

      {presenting !== undefined && (
        <Presenter
          deck={deck}
          start={presenting}
          onClose={(last) => {
            setPresenting(undefined);
            setCurrent(last);
          }}
        />
      )}
      {exporting && <ExportStage deck={deck} onReady={(slides) => void runExport(slides)} />}

      <NameDialog
        open={dialog === "new"}
        onOpenChange={(open) => setDialog(open ? "new" : undefined)}
        title="Nouvelle présentation"
        description="Elle part d'un modèle complet (thème, logo, graphiques, diagrammes) à adapter."
        label="Titre"
        initial="Ma présentation"
        submit="Créer"
        onSubmit={(title) =>
          void folder
            .createDeck(title)
            .then((name) => name && toast.success(`${name} créé`))
            .catch((error: Error) => toast.error(`Création impossible : ${error.message}`))
        }
      />
      <NameDialog
        open={dialog === "rename"}
        onOpenChange={(open) => setDialog(open ? "rename" : undefined)}
        title="Renommer la présentation"
        description="Le fichier est renommé dans le dossier de travail."
        label="Nom du fichier"
        initial={(renaming ?? "").replace(/\.(md|markdown)$/i, "")}
        submit="Renommer"
        onSubmit={(name) =>
          renaming &&
          void folder
            .renameDeck(renaming, name)
            .catch((error: Error) => toast.error(`Renommage impossible : ${error.message}`))
        }
      />
      <HelpDialog open={dialog === "help"} onOpenChange={(open) => setDialog(open ? "help" : undefined)} />
    </SlideEnvContext.Provider>
  );
}

function Preview({
  deck,
  index,
  onSelect,
  wide,
}: {
  deck: Deck;
  index: number;
  onSelect: (index: number) => void;
  wide: boolean;
}) {
  const slide = deck.slides[index];
  const strip = useRef<HTMLDivElement>(null);

  // Keeps the current thumbnail in view.
  // biome-ignore lint/correctness/useExhaustiveDependencies: when the current slide changes
  useEffect(() => {
    strip.current?.querySelector('[aria-current="true"]')?.scrollIntoView({ block: "nearest" });
  }, [index]);

  if (!slide) return null;
  return (
    <section aria-label="Aperçu" className="bg-muted/40 flex min-w-0 flex-1 flex-col">
      <div className="flex shrink-0 flex-col gap-3 p-5 pb-3">
        <div className={cn("mx-auto w-full", wide && "max-w-5xl")}>
          <ScaledSlide slide={slide} deck={deck} className="ring-foreground/10 rounded-xl shadow-lg ring-1" />
        </div>
        <div className={cn("mx-auto flex w-full items-center gap-2", wide && "max-w-5xl")}>
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label="Slide précédente"
            disabled={index === 0}
            onClick={() => onSelect(index - 1)}
          >
            <ChevronLeftIcon />
          </Button>
          <span className="text-[13px] tabular-nums">
            {index + 1} / {deck.slides.length}
          </span>
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label="Slide suivante"
            disabled={index === deck.slides.length - 1}
            onClick={() => onSelect(index + 1)}
          >
            <ChevronRightIcon />
          </Button>
          <span className="text-muted-foreground ml-auto font-mono text-xs">layout: {slide.layout}</span>
        </div>
      </div>
      <div ref={strip} className="min-h-0 flex-1 overflow-y-auto px-5 pb-5">
        <div
          className={cn(
            "mx-auto grid gap-3",
            wide
              ? "max-w-5xl grid-cols-[repeat(auto-fill,minmax(200px,1fr))]"
              : "grid-cols-[repeat(auto-fill,minmax(150px,1fr))]",
          )}
        >
          {deck.slides.map((item) => (
            <button
              key={item.index}
              type="button"
              aria-current={item.index === index ? "true" : undefined}
              aria-label={`Slide ${item.index + 1}`}
              onClick={() => onSelect(item.index)}
              className={cn(
                "group focus-visible:ring-ring/50 relative rounded-lg text-left outline-none focus-visible:ring-3",
              )}
            >
              <ScaledSlide
                slide={item}
                deck={deck}
                className={cn(
                  "pointer-events-none rounded-lg ring-1 transition-shadow",
                  item.index === index ? "ring-brand ring-2" : "ring-foreground/10 group-hover:ring-foreground/30",
                )}
              />
              <span className="text-muted-foreground mt-1 block text-[11px] tabular-nums">{item.index + 1}</span>
            </button>
          ))}
        </div>
      </div>
    </section>
  );
}
