const {
  app,
  BrowserWindow,
  ipcMain,
  clipboard,
  ClipboardItem,
  session,
  Menu,
  dialog,
  shell,
} = require("electron");
const path = require("node:path");
const fs = require("node:fs/promises");
const { pathToFileURL } = require("node:url");
// Keep the exact pre-Bayan data directory across the rename, including on Windows.
// Test profiles and an explicit --user-data-dir still take precedence.
app.setName("Bayan");
const profileOverride = app.commandLine.getSwitchValue("user-data-dir");
app.setPath(
  "userData",
  profileOverride
    ? path.resolve(profileOverride)
    : path.join(app.getPath("appData"), "sisip-ayat"),
);
if (process.platform === "win32") app.setAppUserModelId("id.sisipayat.app");
let win;
let stateQueue = Promise.resolve();
const core = (name) =>
  import(pathToFileURL(path.join(__dirname, "../core", name)).href);
function verify(event) {
  if (
    event.sender !== win?.webContents ||
    event.senderFrame !== win.webContents.mainFrame
  )
    throw new Error("Untrusted sender");
}
if (!app.requestSingleInstanceLock()) {
  app.quit();
} else {
  app.on("second-instance", () => {
    if (win && !win.isDestroyed()) {
      if (win.isMinimized()) win.restore();
      win.show();
      win.focus();
    }
  });
  app.whenReady().then(() => {
    const library = require("./library.cjs").createLibrary(
      path.join(app.getPath("userData"), "library"),
    );
    const handle = (name, fn) =>
      ipcMain.handle(name, async (e, ...args) => {
        verify(e);
        return fn(...args);
      });
    const writeClipboard = (output) =>
      clipboard.write([
        new ClipboardItem({
          "text/html": new Blob([output.html], { type: "text/html" }),
          "text/plain": new Blob([output.text], { type: "text/plain" }),
          "text/rtf": new Blob([output.rtf], { type: "text/rtf" }),
        }),
      ]);
    handle(
      "hadith-books",
      async () => (await core("hadithService.js")).hadithBooks,
    );
    handle("hadith-search", async (request) =>
      (await core("hadithService.js")).searchHadith(request),
    );
    handle("hadith-copy", async (book, number, options) => {
      const record = await (
        await core("hadithService.js")
      ).getHadith(book, number);
      const { defaults, formatHadith } = await core("formatter.js");
      const clean = { ...defaults, ...options };
      for (const k of [
        "wordArabic",
        "wordTranslation",
        "pptArabic",
        "pptTranslation",
      ])
        if (!Number.isFinite(clean[k]) || clean[k] < 8 || clean[k] > 96)
          throw new Error("Ukuran font tidak valid.");
      await writeClipboard(formatHadith(record, clean));
      return true;
    });
    handle("library-list", () => library.list());
    handle("library-import", async (category) => {
      const choice = await dialog.showOpenDialog(win, {
        title: "Tambahkan PDF ke perpustakaan",
        properties: ["openFile", "multiSelections"],
        filters: [{ name: "Dokumen PDF", extensions: ["pdf"] }],
      });
      if (choice.canceled) return null;
      return library.importFiles(choice.filePaths, category);
    });
    handle("library-update", (id, patch) => library.update(id, patch));
    handle("library-open", async (id) => {
      const message = await shell.openPath(await library.resolve(id));
      if (message) throw new Error(message);
      return true;
    });
    handle("library-backup", async () => {
      const choice = await dialog.showOpenDialog(win, {
        title: "Pilih folder tujuan cadangan perpustakaan",
        properties: ["openDirectory", "createDirectory"],
      });
      if (choice.canceled) return null;
      return library.backup(choice.filePaths[0]);
    });
    handle("library-restore", async () => {
      const choice = await dialog.showOpenDialog(win, {
        title:
          "Pilih folder cadangan Bayan atau Sisip Ayat yang akan dipulihkan",
        properties: ["openDirectory"],
      });
      if (choice.canceled) return null;
      return library.restore(choice.filePaths[0]);
    });
    handle("app-info", () => ({
      version: app.getVersion(),
      dataPath: app.getPath("userData"),
    }));
    session.defaultSession.webRequest.onBeforeRequest((details, cb) =>
      cb({
        cancel:
          !details.url.startsWith("file:") &&
          !details.url.startsWith("devtools:"),
      }),
    );
    session.defaultSession.setPermissionRequestHandler((_wc, _p, cb) =>
      cb(false),
    );
    ipcMain.handle("copy-verses", async (e, query, options) => {
      verify(e);
      if (typeof query !== "string" || query.length > 200)
        throw new Error("Invalid query");
      const { parseQuery } = await core("dataService.js");
      const { formatOutput, defaults } = await core("formatter.js");
      const result = parseQuery(query);
      if (!result) throw new Error("Pilih ayat dahulu.");
      const clean = { ...defaults, ...options };
      for (const k of [
        "wordArabic",
        "wordTranslation",
        "pptArabic",
        "pptTranslation",
      ]) {
        if (!Number.isFinite(clean[k]) || clean[k] < 8 || clean[k] > 96)
          throw new Error("Ukuran font tidak valid.");
      }
      const output = formatOutput(result, clean);
      await clipboard.write([
        new ClipboardItem({
          "text/html": new Blob([output.html], { type: "text/html" }),
          "text/plain": new Blob([output.text], { type: "text/plain" }),
          "text/rtf": new Blob([output.rtf], { type: "text/rtf" }),
        }),
      ]);
      return true;
    });
    ipcMain.handle("read-state", async (e) => {
      verify(e);
      try {
        return JSON.parse(
          await fs.readFile(
            path.join(app.getPath("userData"), "preferences.json"),
            "utf8",
          ),
        );
      } catch {
        return {};
      }
    });
    ipcMain.handle("save-state", (e, state) => {
      verify(e);
      if (!state || JSON.stringify(state).length > 30000)
        throw new Error("Invalid preferences");
      const target = path.join(app.getPath("userData"), "preferences.json");
      stateQueue = stateQueue
        .catch(() => {})
        .then(async () => {
          await fs.mkdir(path.dirname(target), { recursive: true });
          await fs.writeFile(target + ".tmp", JSON.stringify(state));
          await fs.rename(target + ".tmp", target);
        });
      return stateQueue;
    });
    Menu.setApplicationMenu(
      Menu.buildFromTemplate(
        process.platform === "darwin"
          ? [
              {
                label: app.name,
                submenu: [
                  { role: "about" },
                  { type: "separator" },
                  { role: "quit" },
                ],
              },
              { role: "editMenu" },
              { role: "viewMenu" },
              { role: "windowMenu" },
            ]
          : [{ role: "editMenu" }, { role: "viewMenu" }],
      ),
    );
    const create = () => {
      win = new BrowserWindow({
        width: 1400,
        height: 940,
        minWidth: 900,
        minHeight: 680,
        title: "Bayan",
        backgroundColor: "#f7f8f5",
        webPreferences: {
          preload: path.join(__dirname, "preload.cjs"),
          contextIsolation: true,
          nodeIntegration: false,
          sandbox: true,
        },
      });
      win.webContents.setWindowOpenHandler(() => ({ action: "deny" }));
      win.webContents.on("will-navigate", (e) => e.preventDefault());
      win.loadFile(path.join(__dirname, "../../dist/index.html"));
    };
    create();
    app.on("activate", () => {
      if (BrowserWindow.getAllWindows().length === 0) create();
    });
  });
  app.on("window-all-closed", () => {
    if (process.platform !== "darwin") app.quit();
  });
}
