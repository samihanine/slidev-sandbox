/// <reference types="vite/client" />

// File System Access API (Chromium), not yet in TypeScript's DOM types.
type FilePermission = { mode?: "read" | "readwrite" };

interface FileSystemHandle {
  queryPermission(descriptor?: FilePermission): Promise<PermissionState>;
  requestPermission(descriptor?: FilePermission): Promise<PermissionState>;
}

interface FileSystemDirectoryHandle {
  values(): AsyncIterableIterator<FileSystemHandle>;
}

interface Window {
  showDirectoryPicker(options?: { id?: string; mode?: "read" | "readwrite" }): Promise<FileSystemDirectoryHandle>;
}
