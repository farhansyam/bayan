import { _electron as electron } from "@playwright/test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
const profile = await fs.mkdtemp(path.join(os.tmpdir(), "sisip-smoke-"));
const executablePath = process.argv[2];
const app = await electron.launch({
  ...(executablePath ? { executablePath } : {}),
  args: [...(executablePath ? [] : ["."]), `--user-data-dir=${profile}`],
  env: { ...process.env, ELECTRON_RUN_AS_NODE: "" },
});
try {
  const page = await app.firstWindow();
  let errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.waitForSelector(".welcome");
  await page.screenshot({ path: "tests/welcome.png" });
  const input = page.getByRole("textbox", { name: "Cari ayat", exact: true });
  await input.fill("Albaqoroh 255");
  await page.getByRole("button", { name: /Salin ayat/ }).click();
  assert.ok(await app.evaluate(({ clipboard }) => clipboard.has("text/rtf")));
  const clip = await app.evaluate(async ({ clipboard }) => ({
    text: await clipboard.readText(),
    html: await (await (await clipboard.read())[0].getType("text/html")).text(),
  }));
  assert.match(clip.text, /QS. Al-Baqarah: 255/);
  assert.match(clip.html, /dir="rtl"/);
  assert.match(clip.html, /font-size:20pt/);
  await input.fill("2:255-257");
  assert.equal(await page.locator(".verse").count(), 3);
  await page.screenshot({ path: "tests/preview.png" });
  await page.getByRole("button", { name: "PowerPoint", exact: true }).click();
  await page.keyboard.press(
    process.platform === "darwin" ? "Meta+Enter" : "Control+Enter",
  );
  await page.waitForTimeout(300);
  assert.match(
    await app.evaluate(
      async ({ clipboard }) =>
        await (await (await clipboard.read())[0].getType("text/html")).text(),
    ),
    /font-size:36pt/,
  );
  await page.getByLabel("Sampai ayat", { exact: true }).fill("254");
  await page.getByRole("alert").waitFor();
  await page.getByLabel("Sampai ayat", { exact: true }).fill("257");
  await page.getByRole("alert").waitFor({ state: "hidden" });
  await input.fill("1:8");
  await page.getByRole("alert").waitFor();
  assert.ok(
    await page
      .getByRole("button", { name: /Salin ayat|Tersalin/ })
      .isDisabled(),
  );
  await input.fill("Al-Ikhlas");
  await page.getByRole("button", { name: "Buka setelan" }).click();
  await page.getByLabel("Susunan ayat").selectOption("block");
  await page.getByLabel("Tema", { exact: true }).selectOption("dark");
  await page.getByRole("button", { name: "Selesai" }).click();
  assert.equal(await page.locator(".verse").count(), 1);
  await page.waitForTimeout(250);
  await page.screenshot({ path: "tests/dark.png" });
  await page.waitForTimeout(500);
  await page.reload();
  await page.waitForSelector(".welcome");
  assert.equal(await page.locator("html").getAttribute("data-theme"), "dark");
  await page.getByRole("button", { name: "Buka setelan" }).click();
  assert.equal(await page.getByLabel("Susunan ayat").inputValue(), "block");
  await page.getByRole("button", { name: "Selesai" }).click();
  await page.getByRole("button", { name: "Ayat Kursi", exact: true }).click();
  await page.getByRole("button", { name: /Salin ayat/ }).click();
  assert.match(
    await app.evaluate(({ clipboard }) => clipboard.readText()),
    /QS. Al-Baqarah: 255/,
  );
  await input.fill("112:1");
  await page.getByRole("button", { name: /Salin ayat|Tersalin/ }).click();
  await page.waitForTimeout(300);
  assert.deepEqual(errors, []);
  console.log(
    "PASS: Electron offline UI, aliases, ranges, clipboard HTML/RTF/plain, presets, invalid queries, settings persistence and dark theme.",
  );
} finally {
  await app.close();
  await fs.rm(profile, { recursive: true, force: true });
}
