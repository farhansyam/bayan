// Optional maintainer check. Not part of offline application or build.
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import assert from "node:assert/strict";
import crypto from "node:crypto";
const url =
  "https://tanzil.net/pub/download/index.php?quranType=uthmani&outType=txt-2&agree=true";
const source = execFileSync("curl", ["--retry", "3", "-LfsS", url], {
  maxBuffer: 10 * 1024 * 1024,
});
const rows = source
  .toString("utf8")
  .split(/\r?\n/)
  .filter((x) => /^\d+\|\d+\|/.test(x));
const map = new Map(
  rows.map((x) => {
    const [s, a, ...t] = x.split("|");
    return [`${s}:${a}`, t.join("|")];
  }),
);
assert.equal(map.size, 6236);
const data = JSON.parse(
  fs.readFileSync(new URL("../data/quran-uthmani.json", import.meta.url)),
);
let matched = 0;
for (const s of data)
  for (const v of s.verses) {
    assert.equal(
      v.text,
      map.get(`${s.id}:${v.id}`),
      `Source differs at ${s.id}:${v.id}`,
    );
    matched++;
  }
fs.writeFileSync(
  new URL("../data/tanzil-verification.json", import.meta.url),
  JSON.stringify(
    {
      verifiedAt: new Date().toISOString(),
      source: url,
      sourceSha256: crypto.createHash("sha256").update(source).digest("hex"),
      matchedVerses: matched,
      differences: 0,
      scope:
        "Exact automated comparison against Tanzil; does not replace printed mushaf/manual review.",
    },
    null,
    2,
  ) + "\n",
);
console.log(
  `PASS: ${matched} Arabic verses identical to direct Tanzil download.`,
);
