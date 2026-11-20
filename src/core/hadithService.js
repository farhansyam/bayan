import fs from "node:fs/promises";
const directory = new URL("../../data/hadith/", import.meta.url);
const manifest = JSON.parse(
  await fs.readFile(new URL("manifest.json", directory), "utf8"),
);
const cache = new Map();
export const hadithBooks = manifest.books.map(
  ({ id, name, count, first, last }) => ({ id, name, count, first, last }),
);
const normalize = (text) =>
  text
    .toLocaleLowerCase("id")
    .normalize("NFKD")
    .replace(/[\u0300-\u036f\u064b-\u065f\u0670]/g, "")
    .replace(/\s+/g, " ")
    .trim();
async function load(id) {
  if (!hadithBooks.some((b) => b.id === id))
    throw new Error("Kitab hadis tidak dikenal.");
  if (!cache.has(id)) {
    const data = JSON.parse(
      await fs.readFile(new URL(id + ".json", directory), "utf8"),
    );
    cache.set(
      id,
      data.map((v) => ({ ...v, search: normalize(v.id + " " + v.arab) })),
    );
  }
  return cache.get(id);
}
export async function searchHadith({
  book = "bukhari",
  query = "",
  page = 1,
} = {}) {
  if (typeof query !== "string" || query.length > 300)
    throw new Error("Pencarian maksimal 300 karakter.");
  if (!Number.isInteger(page) || page < 1)
    throw new Error("Halaman tidak valid.");
  const data = await load(book);
  const meta = hadithBooks.find((b) => b.id === book);
  const q = query.trim();
  let matched;
  const range = q.match(/^(\d+)(?:\s*[-–]\s*(\d+))?$/);
  if (range) {
    const from = +range[1],
      to = +(range[2] || range[1]);
    if (from < 1 || to < from || to > meta.last)
      throw new Error(
        `Nomor hadis ${meta.name}: ${meta.first}–${meta.last}. Akhir rentang harus ≥ awal.`,
      );
    matched = data.filter((v) => v.number >= from && v.number <= to);
  } else {
    const terms = normalize(q).split(" ").filter(Boolean);
    matched = terms.length
      ? data.filter((v) => terms.every((t) => v.search.includes(t)))
      : data;
  }
  return {
    book: meta,
    total: matched.length,
    page,
    pageSize: 20,
    items: matched
      .slice((page - 1) * 20, page * 20)
      .map(({ search, ...v }) => v),
  };
}
export async function getHadith(book, number) {
  const data = await load(book);
  const row = data.find((v) => v.number === number);
  if (!row) throw new Error("Hadis tidak ditemukan.");
  const { search, ...record } = row;
  return { book: hadithBooks.find((b) => b.id === book), ...record };
}
