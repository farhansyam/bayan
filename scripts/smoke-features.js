import { _electron as electron } from "@playwright/test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { defaults } from "../src/core/formatter.js";
const base = await fs.realpath(
  await fs.mkdtemp(path.join(os.tmpdir(), "sisip-v2-smoke-")),
);
const profile = path.join(base, "profile");
const source = path.join(base, "Sirah uji.pdf");
await fs.writeFile(source, "%PDF-1.4\n%Local fixture only\n%%EOF");
const oldExecutable = process.argv[2] || null,
  currentExecutable = process.argv[3] || null;
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
let app;
try {
  // Seed preferences with the v0.1 shape, using an actual previous executable when supplied.
  app = await launch(oldExecutable);
  let page = await app.firstWindow();
  await page.waitForSelector(".welcome");
  const oldPath = await app.evaluate(({ app }) => app.getPath("userData"));
  assert.equal(
    path.resolve(oldPath),
    path.resolve(profile),
    "Test must use isolated user data.",
  );
  await page.evaluate((state) => window.sisip.saveState(state), {
    options: { ...defaults, wordArabic: 24 },
    history: ["2:255"],
  });
  const oldVersion = await app.evaluate(({ app }) => app.getVersion());
  await app.close();
  app = null;
  app = await launch(currentExecutable);
  page = await app.firstWindow();
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.waitForSelector(".welcome");
  assert.equal(
    await app.evaluate(({ app }) => app.getPath("userData")),
    oldPath,
  );
  const state = await page.evaluate(() => window.sisip.readState());
  assert.equal(state.options.wordArabic, 24);
  assert.deepEqual(state.history, ["2:255"]);
  await page.getByRole("button", { name: "Hadis", exact: true }).click();
  await page
    .getByRole("button", { name: "Salin hadis", exact: true })
    .waitFor();
  await page.waitForFunction(
    () => !document.querySelector(".hadith-preview .copy-button")?.disabled,
  );
  await page
    .getByRole("textbox", { name: "Cari hadis", exact: true })
    .fill("1");
  await page.waitForFunction(() =>
    document.querySelector(".result-count")?.textContent.startsWith("1 hasil"),
  );
  await page.getByRole("button", { name: "Salin hadis", exact: true }).click();
  const text = await app.evaluate(({ clipboard }) => clipboard.readText());
  assert.match(text, /HR. Bukhari, no. 1/);
  assert.match(text, /Hadis 1\./);
  assert.doesNotMatch(text, /QS\./);
  assert.ok(await app.evaluate(({ clipboard }) => clipboard.has("text/rtf")));
  await page.screenshot({ path: "tests/hadith.png" });
  await page
    .getByRole("textbox", { name: "Cari hadis", exact: true })
    .fill("niat");
  await page.waitForFunction(
    () => document.querySelectorAll(".result-items>button").length > 1,
  );
  assert.ok(
    (await page.locator(".result-items>button").first().textContent())
      .toLowerCase()
      .includes("niat"),
  );
  await page
    .getByRole("textbox", { name: "Cari hadis", exact: true })
    .fill("7009");
  await page.getByRole("alert").waitFor();
  assert.ok(
    await page
      .getByRole("button", { name: "Salin hadis", exact: true })
      .isDisabled(),
  );
  await page
    .getByRole("button", { name: "Perpustakaan & Sirah", exact: true })
    .click();
  await app.evaluate(({ dialog, shell }) => {
    globalThis.__choices = [];
    dialog.showOpenDialog = async () => ({
      canceled: false,
      filePaths: globalThis.__choices.shift() || [],
    });
    shell.openPath = async (target) => {
      globalThis.__openedPDF = target;
      return "";
    };
  });
  const choose = (paths) =>
    app.evaluate((_, paths) => {
      globalThis.__choices.push(paths);
    }, paths);
  await choose([source]);
  await page
    .getByRole("button", { name: "Tambahkan PDF", exact: true })
    .click();
  await page.getByRole("heading", { name: "Sirah uji", exact: true }).waitFor();
  assert.match(
    await page.locator(".library-activity").textContent(),
    /1 PDF ditambahkan/,
  );
  await page
    .getByRole("button", { name: "Edit Sirah uji", exact: true })
    .click();
  await page
    .getByLabel("Judul buku", { exact: true })
    .fill("Sirah Nabi — koleksi pribadi");
  await page.getByLabel("Penulis buku", { exact: true }).fill("Penulis uji");
  await page
    .getByLabel("Catatan buku", { exact: true })
    .fill("Bab tentang perjalanan hijrah");
  await page
    .getByRole("button", { name: "Simpan informasi", exact: true })
    .click();
  await page
    .getByRole("heading", { name: "Sirah Nabi — koleksi pribadi", exact: true })
    .waitFor();
  await fs.rm(source);
  await page.getByRole("button", { name: "Buka PDF", exact: true }).click();
  await page.waitForTimeout(100);
  const opened = await app.evaluate(() => globalThis.__openedPDF);
  assert.ok(opened.startsWith(profile));
  assert.match(await fs.readFile(opened, "utf8"), /%PDF/);
  await page
    .getByRole("textbox", { name: "Cari buku pribadi", exact: true })
    .fill("hijrah");
  assert.equal(await page.locator(".book-card").count(), 1);
  await page
    .getByRole("textbox", { name: "Cari buku pribadi", exact: true })
    .fill("");
  await page.screenshot({ path: "tests/library.png" });
  await page
    .getByRole("button", {
      name: "Arsipkan Sirah Nabi — koleksi pribadi",
      exact: true,
    })
    .click();
  await page.waitForFunction(
    () => document.querySelectorAll(".book-card").length === 0,
  );
  await page.getByRole("button", { name: "Arsip", exact: true }).click();
  await page
    .getByRole("heading", { name: "Sirah Nabi — koleksi pribadi", exact: true })
    .waitFor();
  await page
    .getByRole("button", {
      name: "Pulihkan Sirah Nabi — koleksi pribadi",
      exact: true,
    })
    .click();
  await page
    .getByRole("button", { name: "Tampilkan koleksi", exact: true })
    .click();
  await page
    .getByRole("heading", { name: "Sirah Nabi — koleksi pribadi", exact: true })
    .waitFor();
  await choose([base]);
  await page.getByRole("button", { name: "Cadangkan", exact: true }).click();
  await page.waitForFunction(() =>
    document
      .querySelector(".library-activity")
      ?.textContent.includes("Cadangan perpustakaan disimpan"),
  );
  const backup = path.join(
    base,
    (await fs.readdir(base)).find((x) => x.startsWith("Bayan-Cadangan-")),
  );
  assert.ok(backup);
  await fs.access(path.join(backup, "index.json"));
  await choose([backup]);
  await page
    .getByRole("button", { name: "Pulihkan cadangan", exact: true })
    .click();
  await page.waitForFunction(() =>
    document
      .querySelector(".library-activity")
      ?.textContent.includes("1 duplikat dilewati"),
  );
  assert.equal(await page.locator(".book-card").count(), 1);
  assert.deepEqual(errors, []);
  await app.close();
  app = null;
  app = await launch(currentExecutable);
  page = await app.firstWindow();
  await page.waitForSelector(".welcome");
  await page
    .getByRole("button", { name: "Perpustakaan & Sirah", exact: true })
    .click();
  await page
    .getByRole("heading", { name: "Sirah Nabi — koleksi pribadi", exact: true })
    .waitFor();
  const reopened = await page.evaluate(() => window.sisip.libraryList());
  assert.equal(reopened[0].author, "Penulis uji");
  assert.equal(reopened[0].notes, "Bab tentang perjalanan hijrah");
  assert.equal(reopened[0].archived, false);
  console.log(
    `PASS: v${oldVersion} preference compatibility, offline hadith search/copy, PDF import, metadata search/edit, source-independent copy, archive/restore, backup/deduplication and persistence after full restart.`,
  );
} finally {
  if (app) await app.close();
  await fs.rm(base, { recursive: true, force: true });
}
