import { test } from "node:test";
import assert from "node:assert/strict";
import { parseQuery, findSurahs, getVerses } from "../src/core/dataService.js";
import { formatOutput, defaults } from "../src/core/formatter.js";
test("numeric, named, aliases, full surah and Arabic numerals resolve consistently", () => {
  for (const q of [
    "2:255",
    "Al-Baqarah 255",
    "baqarah 255",
    "Albaqoroh 255",
    "Ayat Kursi",
    "٢:٢٥٥",
  ])
    assert.equal(
      parseQuery(q).verses[0].arabic,
      getVerses(2, 255, 255)[0].arabic,
    );
  for (const q of ["2:255-257", "Al-Baqarah 255–257"])
    assert.deepEqual(
      parseQuery(q).verses.map((v) => v.id),
      [255, 256, 257],
    );
  assert.equal(parseQuery("Al-Ikhlas").verses.length, 4);
  assert.equal(parseQuery("Yasin 1-12").surah.id, 36);
  assert.equal(parseQuery("1").verses.length, 7);
  assert.equal(parseQuery(""), null);
  assert.ok(findSurahs("baqoroh").some((s) => s.id === 2));
});
test("invalid and reversed ranges never yield copyable verses", () => {
  for (const q of [
    "0:1",
    "115:1",
    "2:0",
    "2:287",
    "1:1-8",
    "2:5-2",
    "2:1.5",
    "nonsense",
  ])
    assert.throws(() => parseQuery(q), Error, q);
  assert.throws(() => parseQuery("1:8"), /hanya memiliki 7 ayat/);
});
test("clipboard carries original Unicode, explicit RTL and editable HTML", () => {
  const result = parseQuery("2:255-257");
  const out = formatOutput(result, defaults);
  for (const v of result.verses) {
    assert.ok(out.text.includes(v.arabic));
    assert.ok(out.text.includes(v.translation));
    assert.ok(out.html.includes(v.arabic));
  }
  assert.match(out.html, /dir="rtl" lang="ar"/);
  assert.match(out.html, /mso-bidi-font-family/);
  assert.match(out.html, /font-size:20pt/);
  assert.match(out.html, /font-size:12pt/);
  assert.match(out.text, /QS. Al-Baqarah: 255–257/);
  assert.doesNotMatch(out.html, /<img/);
});
test("all content modes, block grouping, references and PPT preset affect output", () => {
  const r = parseQuery("112:1-4");
  const ar = formatOutput(r, {
    ...defaults,
    content: "arabic",
    reference: false,
    numbers: false,
  });
  assert.ok(!ar.text.includes(r.verses[0].translation));
  assert.ok(!ar.text.includes("QS."));
  assert.ok(!ar.text.includes("﴿"));
  const tr = formatOutput(r, {
    ...defaults,
    content: "translation",
    target: "ppt",
    referenceFormat: "number",
    group: "block",
  });
  assert.ok(!tr.text.includes(r.verses[0].arabic));
  assert.match(tr.html, /font-size:20pt/);
  assert.match(tr.text, /QS. 112: 1–4/);
  assert.equal((tr.html.match(/<p /g) || []).length, 2);
  const ppt = formatOutput(r, { ...defaults, target: "ppt" });
  assert.match(ppt.html, /font-size:36pt/);
});
test("every canonical surah name resolves to its own chapter", async () => {
  const { surahs } = await import("../src/core/dataService.js");
  for (const s of surahs) {
    const r = parseQuery(s.name);
    assert.equal(r.surah.id, s.id, s.name);
    assert.equal(r.verses.length, s.count);
  }
});
test("RTF preserves Unicode and explicitly separates paragraph directions", () => {
  const r = parseQuery("112:1");
  const out = formatOutput(r, defaults);
  assert.match(out.rtf, /^\{\\rtf1/);
  assert.match(out.rtf, /\\rtlpar\\qr/);
  assert.match(out.rtf, /\\ltrpar\\ql/);
  assert.match(out.rtf, /\\fs40/);
  assert.match(out.rtf, /\\fs24/);
  assert.match(out.text, /Ayat 1\./);
  const fake = {
    ...r,
    verses: [
      {
        id: 1,
        arabic: r.verses[0].arabic,
        translation: "Kurung {uji} dan \\ teks <aman>",
      },
    ],
  };
  const escaped = formatOutput(fake, defaults);
  assert.ok(escaped.rtf.includes("\\{uji\\}"));
  assert.ok(escaped.rtf.includes("\\\\ teks"));
  assert.ok(escaped.html.includes("&lt;aman&gt;"));
  // Decode the Unicode escapes and compare Arabic with the exact source, not a second formatter.
  const decoded = out.rtf.replace(/\\u(-?\d+)\?/g, (_, n) =>
    String.fromCharCode(+n < 0 ? +n + 65536 : +n),
  );
  assert.ok(decoded.includes(r.verses[0].arabic));
});
