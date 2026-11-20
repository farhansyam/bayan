import fs from "node:fs";
import crypto from "node:crypto";
import assert from "node:assert/strict";
const read = (name) =>
  JSON.parse(fs.readFileSync(new URL("../data/" + name, import.meta.url)));
const meta = read("surah-meta.json"),
  arabic = read("quran-uthmani.json"),
  translation = read("terjemahan-kemenag.json"),
  provenance = read("provenance.json");
// Standard Hafs/Kufi verse counts, independently fixed rather than derived from downloaded metadata.
const counts = [
  7, 286, 200, 176, 120, 165, 206, 75, 129, 109, 123, 111, 43, 52, 99, 128, 111,
  110, 98, 135, 112, 78, 118, 64, 77, 227, 93, 88, 69, 60, 34, 30, 73, 54, 45,
  83, 182, 88, 75, 85, 54, 53, 89, 59, 37, 35, 38, 29, 18, 45, 60, 49, 62, 55,
  78, 96, 29, 22, 24, 13, 14, 11, 11, 18, 12, 12, 30, 52, 52, 44, 28, 28, 20,
  56, 40, 31, 50, 40, 46, 42, 29, 19, 36, 25, 22, 17, 19, 26, 30, 20, 15, 21,
  11, 8, 8, 19, 5, 8, 8, 11, 11, 8, 3, 9, 5, 4, 7, 3, 6, 3, 5, 4, 5, 6,
];
assert.equal(meta.length, 114);
assert.equal(arabic.length, 114);
assert.equal(translation.length, 114);
let total = 0;
meta.forEach((s, i) => {
  assert.equal(s.id, i + 1);
  assert.equal(s.count, counts[i]);
  for (const data of [arabic, translation]) {
    assert.equal(data[i].id, i + 1);
    assert.equal(data[i].verses.length, counts[i]);
    data[i].verses.forEach((v, j) => {
      assert.equal(v.id, j + 1);
      assert.ok(typeof v.text === "string" && v.text.trim());
    });
  }
  total += s.count;
});
assert.equal(total, 6236);
for (const [name, hash] of Object.entries(provenance.sha256))
  assert.equal(
    crypto
      .createHash("sha256")
      .update(fs.readFileSync(new URL("../data/" + name, import.meta.url)))
      .digest("hex"),
    hash,
    `Snapshot changed: ${name}`,
  );
console.log(
  "PASS: 114 surah, 6.236 ayat, urutan, pasangan terjemahan, jumlah baku, dan SHA-256.",
);
console.log("PENDING: pemeriksaan manual isi dan izin distribusi terjemahan.");
