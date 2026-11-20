import { _electron as electron } from "@playwright/test";
import fs from "node:fs/promises";
import path from "node:path";
import os from "node:os";
import assert from "node:assert/strict";
import { defaults } from "../src/core/formatter.js";
const previous = process.argv[2];
if (!previous) throw new Error("Supply the previous Sisip Ayat executable.");
const current = process.argv[3] || null;
const base = await fs.realpath(
    await fs.mkdtemp(path.join(os.tmpdir(), "bayan-upgrade-")),
  ),
  profile = path.join(base, "profile"),
  pdf = path.join(base, "Sirah lama.pdf");
await fs.writeFile(pdf, "%PDF-1.4\n% Migration fixture\n%%EOF");
const launch = (executablePath) =>
  electron.launch({
    ...(executablePath ? { executablePath } : {}),
    args: [...(executablePath ? [] : ["."]), `--user-data-dir=${profile}`],
    env: Object.fromEntries(
      Object.entries(process.env).filter(
        ([key]) => key.toUpperCase() !== "ELECTRON_RUN_AS_NODE",
      ),
    ),
  });
let application;
try {
  application = await launch(previous);
  let page = await application.firstWindow();
  await page.waitForSelector(".welcome");
  const oldVersion = await application.evaluate(({ app }) => app.getVersion());
  const oldPath = await application.evaluate(({ app }) =>
    app.getPath("userData"),
  );
  await page.evaluate(
    (options) => window.sisip.saveState({ options, history: ["2:255"] }),
    { ...defaults, wordArabic: 28, theme: "dark" },
  );
  await application.evaluate(({ dialog }, pdf) => {
    dialog.showOpenDialog = async () => ({ canceled: false, filePaths: [pdf] });
  }, pdf);
  const imported = await page.evaluate(() =>
    window.sisip.libraryImport("Sirah"),
  );
  assert.equal(imported.added.length, 1);
  await page.evaluate(
    (id) =>
      window.sisip.libraryUpdate(id, {
        title: "Warisan Sisip Ayat",
        author: "Penulis lama",
        notes: "Tetap tersimpan setelah menjadi Bayan",
        archived: true,
      }),
    imported.added[0].id,
  );
  const before = await page.evaluate(() => window.sisip.libraryList());
  await application.close();
  application = null;
  application = await launch(current);
  page = await application.firstWindow();
  await page.waitForSelector(".welcome");
  const info = await page.evaluate(() => window.sisip.appInfo());
  assert.equal(info.version, "0.3.0");
  assert.equal(info.dataPath, oldPath);
  assert.equal(await application.evaluate(({ app }) => app.name), "Bayan");
  const state = await page.evaluate(() => window.sisip.readState());
  assert.equal(state.options.wordArabic, 28);
  assert.equal(state.options.theme, "dark");
  assert.deepEqual(state.history, ["2:255"]);
  assert.deepEqual(
    await page.evaluate(() => window.sisip.libraryList()),
    before,
  );
  assert.equal(
    await fs.readFile(
      path.join(oldPath, "library", before[0].id + ".pdf"),
      "utf8",
    ),
    await fs.readFile(pdf, "utf8"),
  );
  await page
    .getByRole("button", { name: "Perpustakaan & Sirah", exact: true })
    .click();
  await page.getByRole("button", { name: "Arsip", exact: true }).click();
  await page
    .getByRole("heading", { name: "Warisan Sisip Ayat", exact: true })
    .waitFor();
  console.log(
    `PASS: Sisip Ayat ${oldVersion} → Bayan ${info.version}: same profile, preferences/history, PDF bytes, metadata, ID and archived state preserved.`,
  );
} finally {
  if (application) await application.close();
  await fs.rm(base, { recursive: true, force: true });
}
