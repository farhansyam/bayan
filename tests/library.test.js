import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { createRequire } from "node:module";
const { createLibrary } = createRequire(import.meta.url)(
  "../src/main/library.cjs",
);
async function setup(t) {
  const base = await fs.mkdtemp(path.join(os.tmpdir(), "sisip-library-test-"));
  t.after(() => fs.rm(base, { recursive: true, force: true }));
  const source = path.join(base, "Sirah pribadi.pdf");
  await fs.writeFile(source, "%PDF-1.4\n% Local test fixture\n%%EOF");
  return { base, source, library: createLibrary(path.join(base, "library")) };
}
test("PDF imports are copied locally, deduplicated, edited, archived and persistent", async (t) => {
  const { source, base, library } = await setup(t);
  const result = await library.importFiles([source]);
  assert.equal(result.added.length, 1);
  const id = result.added[0].id;
  assert.equal((await library.importFiles([source])).duplicates.length, 1);
  await Promise.all([
    library.update(id, { title: "Sirah Nabi", author: "Penulis" }),
    library.update(id, { notes: "Catatan pribadi", category: "Sirah" }),
  ]);
  await library.update(id, { archived: true });
  const reopened = createLibrary(path.join(base, "library"));
  const [row] = await reopened.list();
  assert.equal(row.title, "Sirah Nabi");
  assert.equal(row.notes, "Catatan pribadi");
  assert.equal(row.archived, true);
  await reopened.update(id, { archived: false });
  assert.equal(
    await fs.readFile(await reopened.resolve(id), "utf8"),
    await fs.readFile(source, "utf8"),
  );
  await fs.access(source);
  await assert.rejects(() => reopened.resolve("../secret"));
  await assert.rejects(() => reopened.update(id, { title: "" }));
});
test("bad files report failure; backup restores without replacing existing books", async (t) => {
  const { source, base, library } = await setup(t);
  const bad = path.join(base, "bad.pdf");
  await fs.writeFile(bad, "not a PDF");
  const imported = await library.importFiles([bad, source]);
  assert.equal(imported.errors.length, 1);
  assert.equal(imported.added.length, 1);
  const backup = await library.backup(base);
  const second = createLibrary(path.join(base, "new-library"));
  assert.equal((await second.restore(backup)).added, 1);
  assert.equal((await second.restore(backup)).skipped, 1);
  const [row] = await second.list();
  await fs.writeFile(
    path.join(backup, imported.added[0].id + ".pdf"),
    "%PDF-1.4\nchanged",
  );
  await assert.rejects(() => second.restore(backup), /checksum/);
  assert.equal((await second.list()).length, 1);
  assert.equal((await second.list())[0].id, row.id);
  await assert.rejects(
    () => library.backup(path.join(base, "library")),
    /di luar/,
  );
});
test("corrupt index is reported without silently overwriting the library", async (t) => {
  const { source, base, library } = await setup(t);
  await library.importFiles([source]);
  const index = path.join(base, "library", "index.json");
  await fs.writeFile(index, "corrupt index");
  await assert.rejects(() => library.list());
  await assert.rejects(() => library.importFiles([source]));
  assert.equal(await fs.readFile(index, "utf8"), "corrupt index");
});
