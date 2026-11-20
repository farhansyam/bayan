const fs = require("node:fs/promises");
const path = require("node:path");
const crypto = require("node:crypto");
const { createReadStream } = require("node:fs");
const { pipeline } = require("node:stream/promises");
const categories = ["Sirah", "Hadis", "Tafsir", "Fikih", "Umum"];
const validId = (id) => typeof id === "string" && /^[a-f0-9-]{36}$/.test(id);
const hash = async (file) => {
  const digest = crypto.createHash("sha256");
  await pipeline(createReadStream(file), digest);
  return digest.digest("hex");
};
function validateIndex(data) {
  if (data?.schemaVersion !== 1 || !Array.isArray(data.documents))
    throw new Error(
      "Indeks perpustakaan tidak dapat dibaca. Pulihkan dari cadangan.",
    );
  const ids = new Set();
  for (const d of data.documents) {
    if (
      !validId(d.id) ||
      ids.has(d.id) ||
      typeof d.title !== "string" ||
      !d.title.trim() ||
      d.title.length > 200 ||
      typeof d.author !== "string" ||
      d.author.length > 200 ||
      typeof d.notes !== "string" ||
      d.notes.length > 5000 ||
      typeof d.archived !== "boolean" ||
      !Number.isFinite(d.size) ||
      d.size < 0 ||
      d.size > 200 * 1024 * 1024 ||
      !categories.includes(d.category) ||
      !/^[a-f0-9]{64}$/.test(d.sha256)
    )
      throw new Error("Indeks perpustakaan tidak valid.");
    ids.add(d.id);
  }
  return data;
}
async function validatePDF(file) {
  const stat = await fs.stat(file);
  if (!stat.isFile() || stat.size > 200 * 1024 * 1024)
    throw new Error("PDF harus berupa berkas dan maksimal 200 MB.");
  const fd = await fs.open(file, "r");
  try {
    const buffer = Buffer.alloc(1024);
    await fd.read(buffer, 0, 1024, 0);
    if (!buffer.includes(Buffer.from("%PDF-")))
      throw new Error("Berkas bukan PDF yang valid.");
  } finally {
    await fd.close();
  }
  return stat;
}
function createLibrary(directory) {
  let queue = Promise.resolve();
  const serial = (fn) => {
    const task = queue.catch(() => {}).then(fn);
    queue = task;
    return task;
  };
  const index = path.join(directory, "index.json");
  const filePath = (id) => {
    if (!validId(id)) throw new Error("ID buku tidak valid.");
    return path.join(directory, id + ".pdf");
  };
  async function read() {
    try {
      return validateIndex(JSON.parse(await fs.readFile(index, "utf8")));
    } catch (e) {
      if (e.code === "ENOENT") return { schemaVersion: 1, documents: [] };
      throw e;
    }
  }
  async function write(data) {
    await fs.mkdir(directory, { recursive: true });
    await fs.writeFile(index + ".tmp", JSON.stringify(data, null, 2));
    await fs.rename(index + ".tmp", index);
  }
  return {
    list: async () => {
      await queue.catch(() => {});
      return (await read()).documents;
    },
    importFiles: (files, category = "Sirah") =>
      serial(async () => {
        if (
          !categories.includes(category) ||
          !Array.isArray(files) ||
          files.length > 20
        )
          throw new Error(
            "Pilihan impor tidak valid. Maksimal 20 PDF sekaligus.",
          );
        const data = await read();
        const added = [],
          duplicates = [],
          errors = [];
        await fs.mkdir(directory, { recursive: true });
        for (const file of files) {
          try {
            const stat = await validatePDF(file);
            const sha256 = await hash(file);
            const existing = data.documents.find((d) => d.sha256 === sha256);
            if (existing) {
              duplicates.push(existing.title);
              continue;
            }
            const id = crypto.randomUUID();
            await fs.copyFile(
              file,
              filePath(id),
              require("node:fs").constants.COPYFILE_EXCL,
            );
            const record = {
              id,
              title: path.basename(file, path.extname(file)),
              author: "",
              category,
              notes: "",
              sha256,
              size: stat.size,
              createdAt: new Date().toISOString(),
              archived: false,
            };
            data.documents.unshift(record);
            added.push(record);
          } catch (e) {
            errors.push({ file: path.basename(file), message: e.message });
          }
        }
        await write(data);
        return { added, duplicates, errors };
      }),
    update: (id, patch) =>
      serial(async () => {
        const data = await read();
        const record = data.documents.find((d) => d.id === id);
        if (!record) throw new Error("Buku tidak ditemukan.");
        for (const key of Object.keys(patch)) {
          if (
            !["title", "author", "category", "notes", "archived"].includes(key)
          )
            throw new Error("Metadata tidak dikenal.");
          const value = patch[key];
          if (key === "archived") {
            if (typeof value !== "boolean")
              throw new Error("Status arsip tidak valid.");
          } else if (
            typeof value !== "string" ||
            value.length > (key === "notes" ? 5000 : 200)
          )
            throw new Error("Metadata terlalu panjang.");
          if (key === "title" && !value.trim())
            throw new Error("Judul tidak boleh kosong.");
          if (key === "category" && !categories.includes(value))
            throw new Error("Kategori tidak valid.");
        }
        Object.assign(record, patch, { updatedAt: new Date().toISOString() });
        await write(data);
        return record;
      }),
    resolve: async (id) => {
      await queue.catch(() => {});
      if (!(await read()).documents.some((d) => d.id === id))
        throw new Error("Buku tidak ditemukan.");
      const file = filePath(id);
      await fs.access(file);
      return file;
    },
    backup: (base) =>
      serial(async () => {
        const relative = path.relative(directory, path.resolve(base));
        if (
          relative === "" ||
          (!relative.startsWith("..") && !path.isAbsolute(relative))
        )
          throw new Error("Pilih folder di luar perpustakaan untuk cadangan.");
        const data = await read();
        const destination = path.join(
          base,
          "Bayan-Cadangan-" +
            new Date().toISOString().replace(/[:.]/g, "-") +
            "-" +
            crypto.randomBytes(2).toString("hex"),
        );
        await fs.mkdir(destination);
        for (const d of data.documents)
          await fs.copyFile(
            filePath(d.id),
            path.join(destination, d.id + ".pdf"),
          );
        await fs.writeFile(
          path.join(destination, "index.json"),
          JSON.stringify(data, null, 2),
        );
        return destination;
      }),
    restore: (base) =>
      serial(async () => {
        const incoming = validateIndex(
          JSON.parse(await fs.readFile(path.join(base, "index.json"), "utf8")),
        );
        const current = await read();
        const additions = [];
        // Validate every source before touching the current index or existing documents.
        for (const d of incoming.documents) {
          const file = path.join(base, d.id + ".pdf");
          await validatePDF(file);
          if ((await hash(file)) !== d.sha256)
            throw new Error(
              "Isi cadangan tidak cocok dengan checksum: " + d.title,
            );
        }
        await fs.mkdir(directory, { recursive: true });
        for (const d of incoming.documents) {
          if (current.documents.some((v) => v.sha256 === d.sha256)) continue;
          const record = { ...d, id: crypto.randomUUID() };
          await fs.copyFile(
            path.join(base, d.id + ".pdf"),
            filePath(record.id),
          );
          current.documents.push(record);
          additions.push(record);
        }
        await write(current);
        return {
          added: additions.length,
          skipped: incoming.documents.length - additions.length,
        };
      }),
  };
}
module.exports = { createLibrary, validatePDF, validateIndex };
