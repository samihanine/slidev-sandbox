import { createStore, del, get, set } from "idb-keyval";

// Folder handles cannot be serialized to localStorage: the browser only lets them live in IndexedDB.
const store = createStore("markdown-slides", "handles");

export const saveHandle = (id: string, handle: FileSystemDirectoryHandle) => set(id, handle, store);
export const loadHandle = (id: string) => get<FileSystemDirectoryHandle>(id, store);
export const deleteHandle = (id: string) => del(id, store);

export const isSupported = () => typeof window !== "undefined" && "showDirectoryPicker" in window;

const isAbort = (error: unknown) => error instanceof DOMException && error.name === "AbortError";

/** Opens the folder picker with read and write access. Returns nothing when the user cancels. */
export async function pickFolder() {
  try {
    return await window.showDirectoryPicker({ id: "slides", mode: "readwrite" });
  } catch (error) {
    if (isAbort(error)) return;
    throw error;
  }
}

const READWRITE = { mode: "readwrite" } as const;

export const hasPermission = async (handle: FileSystemDirectoryHandle) =>
  (await handle.queryPermission(READWRITE)) === "granted";

/** Must be called from a click: the browser shows its permission prompt. */
export const requestPermission = async (handle: FileSystemDirectoryHandle) =>
  (await handle.requestPermission(READWRITE)) === "granted";

export type DeckFile = { name: string; lastModified: number; size: number };

export const isMarkdown = (name: string) => /\.(md|markdown)$/i.test(name);

/** The markdown files at the root of the folder, by name. */
export async function listDecks(folder: FileSystemDirectoryHandle): Promise<DeckFile[]> {
  const decks: DeckFile[] = [];
  for await (const entry of folder.values()) {
    if (entry.kind !== "file" || !isMarkdown(entry.name) || entry.name.startsWith(".")) continue;
    const file = await (entry as FileSystemFileHandle).getFile();
    decks.push({ name: entry.name, lastModified: file.lastModified, size: file.size });
  }
  return decks.sort((a, b) => a.name.localeCompare(b.name, "fr", { numeric: true }));
}

/** Splits `assets/img/a.png` into folders and file name, refusing to leave the working folder. */
export function splitPath(path: string) {
  const parts = path
    .replace(/\\/g, "/")
    .split("/")
    .filter((part) => part && part !== ".");
  if (parts.some((part) => part === "..") || !parts.length) return;
  return { dirs: parts.slice(0, -1), name: parts[parts.length - 1] as string };
}

async function directoryOf(folder: FileSystemDirectoryHandle, dirs: string[], create: boolean) {
  let current = folder;
  for (const dir of dirs) current = await current.getDirectoryHandle(dir, { create });
  return current;
}

export async function fileHandle(folder: FileSystemDirectoryHandle, path: string, create = false) {
  const parts = splitPath(path);
  if (!parts) throw new Error(`Chemin invalide : ${path}`);
  const dir = await directoryOf(folder, parts.dirs, create);
  return dir.getFileHandle(parts.name, { create });
}

export async function readFile(folder: FileSystemDirectoryHandle, path: string) {
  return (await fileHandle(folder, path)).getFile();
}

export async function exists(folder: FileSystemDirectoryHandle, path: string) {
  try {
    await fileHandle(folder, path);
    return true;
  } catch {
    return false;
  }
}

/** Writes through a swap file: the file on disk is replaced only once the new content is complete. */
export async function writeFile(folder: FileSystemDirectoryHandle, path: string, content: string | Blob) {
  const handle = await fileHandle(folder, path, true);
  const writable = await handle.createWritable();
  try {
    await writable.write(content);
    await writable.close();
  } catch (error) {
    await writable.abort().catch(() => {});
    throw error;
  }
  return (await handle.getFile()).lastModified;
}

export async function removeFile(folder: FileSystemDirectoryHandle, path: string) {
  const parts = splitPath(path);
  if (!parts) return;
  const dir = await directoryOf(folder, parts.dirs, false);
  await dir.removeEntry(parts.name);
}

/** A name that does not exist yet in the folder: `name.md`, `name-2.md`… */
export async function freeName(folder: FileSystemDirectoryHandle, base: string, extension: string, dir = "") {
  for (let i = 1; ; i++) {
    const name = `${base}${i > 1 ? `-${i}` : ""}${extension}`;
    if (!(await exists(folder, dir ? `${dir}/${name}` : name))) return name;
  }
}

/** Turns a title into a file name: `Plan 2026 !` → `plan-2026`. */
export const slugify = (title: string) =>
  title
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "") || "presentation";
