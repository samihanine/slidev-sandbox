import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import {
  type DeckFile,
  deleteHandle,
  exists,
  fileHandle,
  freeName,
  hasPermission,
  listDecks,
  loadHandle,
  pickFolder,
  readFile,
  removeFile,
  requestPermission,
  saveHandle,
  slugify,
  splitPath,
  writeFile,
} from "@/lib/files";
import { TEMPLATE_ASSETS, templateMarkdown } from "@/lib/template";

export type FolderEntry = { id: string; name: string; lastDeck?: string };
type Registry = { folders: FolderEntry[]; activeId?: string };

const KEY = "markdown-slides:v1";

function loadRegistry(): Registry {
  try {
    const raw = JSON.parse(localStorage.getItem(KEY) ?? "null") as Registry | null;
    if (raw && Array.isArray(raw.folders)) {
      const folders = raw.folders.filter((f) => f && typeof f.id === "string" && typeof f.name === "string");
      return { folders, activeId: folders.some((f) => f.id === raw.activeId) ? raw.activeId : folders[0]?.id };
    }
  } catch {}
  return { folders: [] };
}

function saveRegistry(registry: Registry) {
  try {
    localStorage.setItem(KEY, JSON.stringify(registry));
  } catch {}
}

export type Status = "idle" | "loading" | "permission" | "missing" | "ready";

const normalize = (path: string) => path.trim().replace(/^\.\//, "").replace(/\\/g, "/");
const AUTOSAVE_MS = 600;

/** The working folder: its markdown decks, the open deck (saved automatically) and its pictures. */
export function useFolder() {
  const [registry, setRegistry] = useState(loadRegistry);
  const [status, setStatus] = useState<Status>(() => (loadRegistry().activeId ? "loading" : "idle"));
  const [handle, setHandle] = useState<FileSystemDirectoryHandle>();
  const [decks, setDecks] = useState<DeckFile[]>([]);
  const [deckName, setDeckName] = useState<string>();
  const [content, setContentState] = useState("");
  const [saved, setSaved] = useState("");
  const [saving, setSaving] = useState(false);
  const [assetVersion, setAssetVersion] = useState(0);
  const assets = useRef(new Map<string, { url: string | null; pending?: boolean }>());
  const lastModified = useRef(0);
  const contentRef = useRef("");
  const savedRef = useRef("");

  const folder = registry.folders.find((f) => f.id === registry.activeId);
  const dirty = content !== saved;

  const update = useCallback((change: (registry: Registry) => Registry) => {
    setRegistry((current) => {
      const next = change(current);
      saveRegistry(next);
      return next;
    });
  }, []);

  const resetAssets = useCallback(() => {
    for (const asset of assets.current.values()) if (asset.url) URL.revokeObjectURL(asset.url);
    assets.current = new Map();
    setAssetVersion((v) => v + 1);
  }, []);

  const loadDeck = useCallback(async (dir: FileSystemDirectoryHandle, name: string | undefined) => {
    if (!name) {
      setDeckName(undefined);
      contentRef.current = savedRef.current = "";
      setContentState("");
      setSaved("");
      return;
    }
    const file = await readFile(dir, name);
    const text = await file.text();
    lastModified.current = file.lastModified;
    contentRef.current = savedRef.current = text;
    setDeckName(name);
    setContentState(text);
    setSaved(text);
  }, []);

  const open = useCallback(
    async (entry: FolderEntry, ask: boolean) => {
      setStatus("loading");
      const dir = await loadHandle(entry.id);
      if (!dir) return setStatus("missing");
      const granted = (await hasPermission(dir)) || (ask && (await requestPermission(dir)));
      if (!granted) return setStatus("permission");
      try {
        const list = await listDecks(dir);
        setHandle(dir);
        setDecks(list);
        resetAssets();
        const name = list.some((d) => d.name === entry.lastDeck) ? entry.lastDeck : list[0]?.name;
        await loadDeck(dir, name);
        setStatus("ready");
      } catch (error) {
        console.error(error);
        setStatus("missing");
      }
    },
    [loadDeck, resetAssets],
  );

  // Reopens the last folder at start, and whenever another one is chosen.
  // biome-ignore lint/correctness/useExhaustiveDependencies: only when the active folder changes
  useEffect(() => {
    if (folder) void open(folder, false);
    else setStatus("idle");
  }, [folder?.id]);

  const writeNow = useCallback(async () => {
    if (!handle || !deckName) return;
    const text = contentRef.current;
    if (text === savedRef.current) return;
    setSaving(true);
    try {
      lastModified.current = await writeFile(handle, deckName, text);
      savedRef.current = text;
      setSaved(text);
    } catch (error) {
      toast.error(`Enregistrement impossible : ${(error as Error).message}`);
    } finally {
      setSaving(false);
    }
  }, [handle, deckName]);

  // Saves shortly after the last keystroke.
  useEffect(() => {
    if (!dirty) return;
    const timer = setTimeout(() => void writeNow(), AUTOSAVE_MS);
    return () => clearTimeout(timer);
  }, [dirty, writeNow]);

  // Flushes on page hide, so closing the tab right after typing loses nothing.
  useEffect(() => {
    const flush = () => void writeNow();
    window.addEventListener("pagehide", flush);
    return () => window.removeEventListener("pagehide", flush);
  }, [writeNow]);

  const refresh = useCallback(async () => {
    if (!handle) return;
    setDecks(await listDecks(handle));
    resetAssets();
    if (deckName && contentRef.current === savedRef.current) {
      try {
        const file = await readFile(handle, deckName);
        if (file.lastModified !== lastModified.current) await loadDeck(handle, deckName);
      } catch {
        await loadDeck(handle, undefined);
      }
    }
  }, [handle, deckName, loadDeck, resetAssets]);

  // A change made by another program (an editor, git…) shows up when coming back to the tab.
  useEffect(() => {
    const onFocus = () => {
      if (status === "ready") void refresh();
    };
    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
  }, [status, refresh]);

  const remember = useCallback(
    (name: string | undefined) =>
      update((r) => ({
        ...r,
        folders: r.folders.map((f) => (f.id === r.activeId ? { ...f, lastDeck: name } : f)),
      })),
    [update],
  );

  const actions = {
    openFolder: async () => {
      const dir = await pickFolder();
      if (!dir) return;
      // The same folder chosen again keeps its entry.
      for (const known of registry.folders) {
        const existing = await loadHandle(known.id);
        if (existing && (await existing.isSameEntry(dir))) {
          await saveHandle(known.id, dir);
          if (known.id === registry.activeId) void open(known, true);
          else update((r) => ({ ...r, activeId: known.id }));
          return;
        }
      }
      const id = crypto.randomUUID();
      await saveHandle(id, dir);
      update((r) => ({ folders: [...r.folders, { id, name: dir.name }], activeId: id }));
    },
    selectFolder: async (id: string) => {
      await writeNow();
      update((r) => ({ ...r, activeId: id }));
    },
    removeFolder: async (id: string) => {
      await deleteHandle(id);
      update((r) => {
        const folders = r.folders.filter((f) => f.id !== id);
        return { folders, activeId: r.activeId === id ? folders[0]?.id : r.activeId };
      });
    },
    grantAccess: () => folder && void open(folder, true),
    openDeck: async (name: string) => {
      if (!handle || name === deckName) return;
      await writeNow();
      await loadDeck(handle, name);
      remember(name);
    },
    setContent: (text: string) => {
      contentRef.current = text;
      setContentState(text);
    },
    save: writeNow,
    refresh,
    /** Creates `title.md` from the template, with the template pictures when they are not there yet. */
    createDeck: async (title: string) => {
      if (!handle) return;
      await writeNow();
      const name = await freeName(handle, slugify(title), ".md");
      for (const [path, svg] of Object.entries(TEMPLATE_ASSETS))
        if (!(await exists(handle, path))) await writeFile(handle, path, new Blob([svg], { type: "image/svg+xml" }));
      await writeFile(handle, name, templateMarkdown(title.trim() || "Nouvelle présentation"));
      setDecks(await listDecks(handle));
      resetAssets();
      await loadDeck(handle, name);
      remember(name);
      return name;
    },
    renameDeck: async (from: string, title: string) => {
      if (!handle) return;
      await writeNow();
      const base = slugify(title.replace(/\.(md|markdown)$/i, ""));
      if (`${base}.md` === from) return;
      const name = await freeName(handle, base, ".md");
      const text = await (await readFile(handle, from)).text();
      await writeFile(handle, name, text);
      await removeFile(handle, from);
      setDecks(await listDecks(handle));
      if (from === deckName) {
        await loadDeck(handle, name);
        remember(name);
      }
    },
    duplicateDeck: async (from: string) => {
      if (!handle) return;
      await writeNow();
      const name = await freeName(handle, `${from.replace(/\.(md|markdown)$/i, "")}-copie`, ".md");
      await writeFile(handle, name, await (await readFile(handle, from)).text());
      setDecks(await listDecks(handle));
      await loadDeck(handle, name);
      remember(name);
    },
    deleteDeck: async (name: string) => {
      if (!handle) return;
      const text = await (await readFile(handle, name)).text();
      await removeFile(handle, name);
      const list = await listDecks(handle);
      setDecks(list);
      if (name === deckName) {
        const next = list[0]?.name;
        await loadDeck(handle, next);
        remember(next);
      }
      return text;
    },
    restoreDeck: async (name: string, text: string) => {
      if (!handle) return;
      await writeFile(handle, name, text);
      setDecks(await listDecks(handle));
    },
    /** Copies a picture into `assets/` and returns its path, relative to the folder. */
    addAsset: async (file: File) => {
      if (!handle) return;
      const dot = file.name.lastIndexOf(".");
      const extension = dot > 0 ? file.name.slice(dot).toLowerCase() : ".png";
      const base = slugify(dot > 0 ? file.name.slice(0, dot) : file.name);
      const name = await freeName(handle, base, extension, "assets");
      const path = `assets/${name}`;
      await writeFile(handle, path, file);
      assets.current.delete(path);
      setAssetVersion((v) => v + 1);
      return path;
    },
  };

  /** URL of a picture of the folder, read on first use. */
  // biome-ignore lint/correctness/useExhaustiveDependencies: a new function when a picture is read, to re-render
  const resolve = useCallback(
    (raw: string): string | null | undefined => {
      const path = normalize(raw);
      if (/^(data:|blob:)/.test(path)) return path;
      if (/^https?:/i.test(path)) return null;
      const known = assets.current.get(path);
      if (known) return known.pending ? undefined : known.url;
      if (!handle || !splitPath(path)) return null;
      assets.current.set(path, { url: null, pending: true });
      void (async () => {
        let url: string | null = null;
        try {
          const file = await (await fileHandle(handle, path)).getFile();
          url = URL.createObjectURL(file);
        } catch {}
        assets.current.set(path, { url });
        setAssetVersion((v) => v + 1);
      })();
      return undefined;
    },
    [handle, assetVersion],
  );

  return {
    status,
    folders: registry.folders,
    folder,
    decks,
    deckName,
    content,
    dirty,
    saving,
    resolve,
    ...actions,
  };
}

export type FolderState = ReturnType<typeof useFolder>;
