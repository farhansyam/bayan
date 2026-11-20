import meta from "../../data/surah-meta.json" with { type: "json" };
import arabic from "../../data/quran-uthmani.json" with { type: "json" };
import translation from "../../data/terjemahan-kemenag.json" with { type: "json" };
export const surahs = meta;
export function getVerses(surah, start = 1, end = meta[surah - 1]?.count) {
  const s = meta[surah - 1];
  if (!s) throw new Error("Nomor surah harus antara 1 dan 114.");
  if (
    !Number.isInteger(start) ||
    !Number.isInteger(end) ||
    start < 1 ||
    end < 1
  )
    throw new Error("Nomor ayat harus bilangan bulat mulai dari 1.");
  if (start > s.count || end > s.count)
    throw new Error(`${s.name} hanya memiliki ${s.count} ayat.`);
  if (end < start)
    throw new Error("Sampai ayat tidak boleh lebih kecil dari Dari ayat.");
  return arabic[surah - 1].verses
    .slice(start - 1, end)
    .map((v) => ({
      id: v.id,
      arabic: v.text,
      translation: translation[surah - 1].verses[v.id - 1].text,
    }));
}
export const normalize = (text) =>
  text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]/g, "")
    .replace(/^(al|an|as|at|ar|az|ad)/, "")
    .replace(/aa/g, "a")
    .replace(/ee/g, "i")
    .replace(/oo/g, "u")
    .replace(/q/g, "k")
    .replace(/o/g, "a")
    .replace(/h$/, "");
const aliases = {
  2: ["baqoroh", "albaqoroh", "baqarah"],
  3: ["ali imran", "aliimron"],
  36: ["yasin", "yaasiin"],
  112: ["ikhlas", "ikhlas"],
  1: ["fatihah", "fatehah"],
};
export function findSurahs(query) {
  const raw = query.trim().toLowerCase();
  const n = normalize(raw);
  if (!raw) return meta;
  return meta.filter(
    (s) =>
      String(s.id) === raw ||
      s.arabic.includes(raw) ||
      [s.name, ...(aliases[s.id] || [])].some((a) => normalize(a).includes(n)),
  );
}
export function parseQuery(input) {
  let q = input
    .trim()
    .replace(/[–—]/g, "-")
    .replace(/[٠-٩]/g, (c) => String("٠١٢٣٤٥٦٧٨٩".indexOf(c)));
  if (!q) return null;
  if (/^(ayat\s*kursi|kursi)$/i.test(q)) q = "2:255";
  const numeric = q.match(/^(\d+)\s*[: ]\s*(\d+)(?:\s*-\s*(\d+))?$/);
  const named = q.match(/^(.+?)\s+(\d+)(?:\s*-\s*(\d+))?$/);
  let surah, start, end;
  if (numeric) {
    surah = meta[+numeric[1] - 1];
    start = +numeric[2];
    end = +(numeric[3] || numeric[2]);
  } else if (/^\d+$/.test(q)) {
    surah = meta[+q - 1];
  } else {
    const name = named ? named[1] : q;
    const matches = findSurahs(name);
    surah =
      matches.find((s) => normalize(s.name) === normalize(name)) ||
      (matches.length === 1 ? matches[0] : null);
    if (named) {
      start = +named[2];
      end = +(named[3] || named[2]);
    }
  }
  if (!surah)
    throw new Error(
      "Surah atau ayat tidak ditemukan. Coba: 2:255 atau Al-Baqarah 255.",
    );
  start ??= 1;
  end ??= surah.count;
  return { surah, start, end, verses: getVerses(surah.id, start, end) };
}
