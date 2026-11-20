export const defaults = {
  content: "both",
  target: "word",
  numbers: true,
  reference: true,
  referenceFormat: "name",
  group: "verse",
  font: "Traditional Arabic",
  wordArabic: 20,
  wordTranslation: 12,
  pptArabic: 36,
  pptTranslation: 20,
  theme: "system",
  scale: 100,
};
export const escapeHTML = (s) =>
  String(s).replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        c
      ],
  );
export function reference(result, options) {
  if (result.kind === "hadith")
    return `(HR. ${result.book.name}, no. ${result.start})`;
  return `(QS. ${options.referenceFormat === "number" ? result.surah.id : result.surah.name}: ${result.start}${result.end === result.start ? "" : `–${result.end}`})`;
}
export function formatOutput(result, options) {
  const o = { ...defaults, ...options };
  const ar = o.target === "word" ? o.wordArabic : o.pptArabic;
  const tr = o.target === "word" ? o.wordTranslation : o.pptTranslation;
  const font = ["Traditional Arabic", "Amiri", "Scheherazade New"].includes(
    o.font,
  )
    ? o.font
    : "Traditional Arabic";
  const arabic = (v) =>
    (v.arabicBody ?? v.arabic) +
    (o.numbers
      ? result.kind === "hadith"
        ? ` (${v.id})`
        : ` ﴿${String(v.id).replace(/\d/g, (d) => "٠١٢٣٤٥٦٧٨٩"[d])}﴾`
      : "");
  const translation = (v) =>
    (o.numbers
      ? `${result.kind === "hadith" ? "Hadis" : "Ayat"} ${v.id}. `
      : "") + v.translation;
  const pAr = (text, alignment = "right") =>
    `<p dir="rtl" lang="ar" style="direction:rtl;unicode-bidi:embed;text-align:${alignment};font-family:'${font}','Amiri',serif;mso-bidi-font-family:'${font}';font-size:${ar}pt;line-height:1.9;margin:0 0 12pt">${escapeHTML(text)}</p>`;
  const pTr = (text) =>
    `<p dir="ltr" lang="id" style="direction:ltr;text-align:left;font-family:'Segoe UI',Arial,sans-serif;font-size:${tr}pt;line-height:1.6;margin:0 0 12pt">${escapeHTML(text)}</p>`;
  const groups =
    o.group === "block" ? [result.verses] : result.verses.map((v) => [v]);
  let plain = [];
  let blocks = [];
  let rich = [];
  const rtfEscape = (text) =>
    Array.from(text)
      .map((c) => {
        if (c === "\\" || c === "{" || c === "}") return "\\" + c;
        return [...Array(c.length)]
          .map((_, i) => {
            const n = c.charCodeAt(i);
            return n > 127 ? "\\u" + (n > 32767 ? n - 65536 : n) + "?" : c[i];
          })
          .join("");
      })
      .join("");
  const rAr = (text, alignment = "right") =>
    `\\pard\\rtlpar${alignment === "center" ? "\\qc" : "\\qr"}\\sa240\\sl${Math.round(ar * 20 * 1.9)}\\slmult0\\f0\\fs${ar * 2}\\lang1025\\rtlch ${rtfEscape(text)}\\par`;
  const rTr = (text) =>
    `\\pard\\ltrpar\\ql\\sa240\\sl${Math.round(tr * 20 * 1.6)}\\slmult0\\f1\\fs${tr * 2}\\lang1057\\ltrch ${rtfEscape(text)}\\par`;
  const basmalah = result.verses[0]?.basmalah;
  if (basmalah && o.content !== "translation") {
    blocks.push(pAr(basmalah, "center"));
    rich.push(rAr(basmalah, "center"));
    plain.push(basmalah);
  }
  for (const group of groups) {
    if (o.content !== "translation") {
      const text = group.map(arabic).join(" ");
      blocks.push(pAr(text));
      rich.push(rAr(text));
      plain.push(text);
    }
    if (o.content !== "arabic") {
      const text = group.map(translation).join(" ");
      blocks.push(pTr(text));
      rich.push(rTr(text));
      plain.push(text);
    }
  }
  if (o.reference) {
    blocks.push(pTr(reference(result, o)));
    rich.push(rTr(reference(result, o)));
    plain.push(reference(result, o));
  }
  return {
    html: `<html><head><meta charset="utf-8"></head><body><!--StartFragment-->${blocks.join("")}<!--EndFragment--></body></html>`,
    text: plain.join("\n\n"),
    rtf: `{\\rtf1\\ansi\\ansicpg1252\\deff0{\\fonttbl{\\f0 ${font};}{\\f1 Segoe UI;}}\\uc1 ${rich.join("")}}`,
  };
}

export function formatHadith(record, options) {
  return formatOutput(
    {
      kind: "hadith",
      book: record.book,
      start: record.number,
      end: record.number,
      verses: [
        { id: record.number, arabic: record.arab, translation: record.id },
      ],
    },
    options,
  );
}
