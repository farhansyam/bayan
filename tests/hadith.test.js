import { test } from "node:test";
import assert from "node:assert/strict";
import {
  hadithBooks,
  searchHadith,
  getHadith,
} from "../src/core/hadithService.js";
import { formatHadith, defaults } from "../src/core/formatter.js";
test("nine offline books, numeric lookup and source gaps are kept honest", async () => {
  assert.equal(hadithBooks.length, 9);
  assert.equal(
    hadithBooks.reduce((sum, b) => sum + b.count, 0),
    38102,
  );
  const first = await getHadith("bukhari", 1);
  const hit = await searchHadith({ book: "bukhari", query: "1" });
  assert.equal(hit.total, 1);
  assert.equal(hit.items[0].arab, first.arab);
  const range = await searchHadith({ book: "bukhari", query: "1-3" });
  assert.deepEqual(
    range.items.map((v) => v.number),
    [1, 2, 3],
  );
  const full = await searchHadith({ book: "bukhari" });
  assert.equal(full.total, 6638);
  assert.equal(full.items.length, 20);
  const page = await searchHadith({ book: "bukhari", page: 2 });
  assert.ok(page.items[0].number > full.items.at(-1).number);
});
test("search translation keywords, Arabic and invalid requests", async () => {
  const h = await getHadith("bukhari", 1);
  const result = await searchHadith({ book: "bukhari", query: "niat" });
  assert.ok(result.total > 0);
  assert.ok(result.items.every((h) => h.id.toLowerCase().includes("niat")));
  const ar = await searchHadith({
    book: "bukhari",
    query: h.arab.slice(0, 40),
  });
  assert.ok(ar.items.some((v) => v.number === 1));
  for (const request of [
    { book: "../../etc/passwd" },
    { book: "bukhari", query: "0" },
    { book: "bukhari", query: "4-1" },
    { book: "bukhari", query: "7009" },
    { book: "bukhari", page: 0 },
  ])
    await assert.rejects(() => searchHadith(request));
});
test("hadith clipboard never uses Quran reference or verse labels", async () => {
  const h = await getHadith("muslim", 1),
    out = formatHadith(h, defaults);
  assert.ok(out.text.includes(h.arab));
  assert.ok(out.text.includes(h.id));
  assert.ok(out.text.includes("(HR. Muslim, no. 1)"));
  assert.ok(!out.text.includes("QS."));
  assert.ok(!out.text.includes("Ayat"));
  assert.match(out.html, /dir="rtl"/);
  assert.match(out.rtf, /\\rtlpar/);
});
