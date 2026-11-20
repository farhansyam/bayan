import fs from "node:fs";
import crypto from "node:crypto";
import assert from "node:assert/strict";
const base = new URL("../data/hadith/", import.meta.url),
  manifest = JSON.parse(fs.readFileSync(new URL("manifest.json", base)));
assert.equal(manifest.books.length, 9);
let total = 0;
for (const book of manifest.books) {
  const raw = fs.readFileSync(new URL(book.id + ".json", base));
  assert.equal(
    crypto.createHash("sha256").update(raw).digest("hex"),
    book.sha256,
  );
  const rows = JSON.parse(raw);
  assert.equal(rows.length, book.count);
  let previous = 0;
  for (const row of rows) {
    assert.ok(
      Number.isInteger(row.number) && row.number > previous,
      book.id + ": duplicate or unordered number",
    );
    assert.ok(typeof row.arab === "string" && row.arab.trim());
    assert.ok(typeof row.id === "string" && row.id.trim());
    previous = row.number;
  }
  assert.equal(rows[0].number, book.first);
  assert.equal(previous, book.last);
  total += rows.length;
}
assert.equal(total, 38102);
console.log(
  "PASS: 9 snapshot kitab, 38.102 riwayat, ID unik/berurutan, teks Arab/Indonesia, dan SHA-256.",
);
console.log(
  "CATATAN: nomor sumber memiliki celah; kelengkapan kitab dan penilaian derajat tidak diklaim.",
);
