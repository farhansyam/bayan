const { contextBridge, ipcRenderer } = require("electron");
contextBridge.exposeInMainWorld("sisip", {
  copy: (query, options) => ipcRenderer.invoke("copy-verses", query, options),
  readState: () => ipcRenderer.invoke("read-state"),
  saveState: (state) => ipcRenderer.invoke("save-state", state),
  hadithBooks: () => ipcRenderer.invoke("hadith-books"),
  searchHadith: (request) => ipcRenderer.invoke("hadith-search", request),
  copyHadith: (book, number, options) =>
    ipcRenderer.invoke("hadith-copy", book, number, options),
  libraryList: () => ipcRenderer.invoke("library-list"),
  libraryImport: (category) => ipcRenderer.invoke("library-import", category),
  libraryUpdate: (id, patch) => ipcRenderer.invoke("library-update", id, patch),
  libraryOpen: (id) => ipcRenderer.invoke("library-open", id),
  libraryBackup: () => ipcRenderer.invoke("library-backup"),
  libraryRestore: () => ipcRenderer.invoke("library-restore"),
  appInfo: () => ipcRenderer.invoke("app-info"),
  platform: process.platform,
});
