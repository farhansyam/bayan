import React, { useEffect, useRef, useState } from "react";
import {
  Plus,
  Search,
  BookOpen,
  FileText,
  ExternalLink,
  Archive,
  ArchiveRestore,
  Settings2,
  Download,
  FolderOpen,
  X,
  Check,
  Info,
} from "lucide-react";
const categories = ["Sirah", "Hadis", "Tafsir", "Fikih", "Umum"];
export default function Library({ notify }) {
  const [documents, setDocuments] = useState([]),
    [query, setQuery] = useState(""),
    [category, setCategory] = useState("Semua"),
    [archived, setArchived] = useState(false),
    [busy, setBusy] = useState(false),
    [activity, setActivity] = useState(""),
    [edit, setEdit] = useState(null);
  const dialog = useRef();
  const refresh = async () => setDocuments(await window.sisip.libraryList());
  useEffect(() => {
    if (window.sisip) refresh().catch((e) => setActivity(e.message));
    else setActivity("Impor PDF tersedia di aplikasi desktop.");
  }, []);
  useEffect(() => {
    if (edit) dialog.current?.showModal();
    else if (dialog.current?.open) dialog.current.close();
  }, [!!edit]);
  async function action(fn) {
    if (busy) return;
    setBusy(true);
    try {
      await fn();
    } catch (e) {
      setActivity(e.message);
    } finally {
      setBusy(false);
    }
  }
  async function importPDF() {
    await action(async () => {
      const response = await window.sisip.libraryImport(
        category === "Semua" ? "Sirah" : category,
      );
      if (!response) return;
      await refresh();
      setActivity(
        [
          `${response.added.length} PDF ditambahkan.`,
          response.duplicates.length
            ? `${response.duplicates.length} duplikat dilewati (termasuk buku dalam arsip).`
            : "",
          ...response.errors.map((e) => `${e.file}: ${e.message}`),
        ]
          .filter(Boolean)
          .join(" "),
      );
    });
  }
  async function backup() {
    await action(async () => {
      const destination = await window.sisip.libraryBackup();
      if (destination)
        setActivity(`Cadangan perpustakaan disimpan di ${destination}.`);
    });
  }
  async function restore() {
    await action(async () => {
      const response = await window.sisip.libraryRestore();
      if (response) {
        await refresh();
        setActivity(
          `${response.added} buku dipulihkan, ${response.skipped} duplikat dilewati. Buku yang sudah ada tetap tersimpan.`,
        );
      }
    });
  }
  async function archive(d) {
    await action(async () => {
      await window.sisip.libraryUpdate(d.id, { archived: !d.archived });
      await refresh();
      notify(
        d.archived
          ? "Buku dikembalikan ke koleksi."
          : "Buku dipindah ke arsip. Dapat dipulihkan kapan saja.",
      );
    });
  }
  const shown = documents.filter(
    (d) =>
      !!d.archived === archived &&
      (category === "Semua" || d.category === category) &&
      `${d.title} ${d.author} ${d.notes}`
        .toLocaleLowerCase("id")
        .includes(query.toLocaleLowerCase("id")),
  );
  return (
    <section className="feature-workspace library-workspace">
      <div className="feature-heading">
        <div>
          <span className="eyebrow">PERPUSTAKAAN PRIBADI</span>
          <h2>
            Buku pilihan. <em>Dekat di perangkat.</em>
          </h2>
          <p>
            Kumpulkan PDF sirah dan referensi Anda. Tetap bisa dibaca tanpa
            internet.
          </p>
        </div>
        <button
          className="primary-action"
          disabled={busy || !window.sisip}
          onClick={importPDF}
        >
          <Plus size={19} />
          Tambahkan PDF
        </button>
      </div>
      <div className="library-tools">
        <div className="search-wrap">
          <Search size={19} />
          <input
            aria-label="Cari buku pribadi"
            placeholder="Cari judul, penulis, atau catatan…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
        <select
          aria-label="Kategori perpustakaan"
          value={category}
          onChange={(e) => setCategory(e.target.value)}
        >
          {["Semua", ...categories].map((c) => (
            <option key={c}>{c}</option>
          ))}
        </select>
        <button
          className={archived ? "active" : ""}
          aria-pressed={archived}
          onClick={() => setArchived((v) => !v)}
        >
          <Archive size={17} />
          {archived ? "Tampilkan koleksi" : "Arsip"}
        </button>
        <button disabled={busy || !window.sisip} onClick={backup}>
          <Download size={17} />
          Cadangkan
        </button>
        <button disabled={busy || !window.sisip} onClick={restore}>
          <FolderOpen size={17} />
          Pulihkan cadangan
        </button>
      </div>
      {activity && (
        <div className="library-activity" role="status">
          <Info size={17} />
          <p>{activity}</p>
          <button
            aria-label="Tutup informasi perpustakaan"
            onClick={() => setActivity("")}
          >
            <X size={16} />
          </button>
        </div>
      )}
      <div className="library-status">
        <span>
          {shown.length} buku {archived ? "di arsip" : "dalam koleksi"}
          {category !== "Semua" ? ` · ${category}` : ""}
        </span>
        <span>
          {busy ? "Memproses…" : "PDF disalin ke penyimpanan pribadi aplikasi"}
        </span>
      </div>
      <div className="library-scroll">
        {shown.length ? (
          <div className="book-grid">
            {shown.map((d) => (
              <article className="book-card" key={d.id}>
                <div className="book-cover">
                  <FileText size={43} />
                  <span>PDF</span>
                  <b>{d.category}</b>
                </div>
                <div className="book-detail">
                  <span className="eyebrow">
                    {d.category} · {(d.size / 1024 / 1024).toFixed(1)} MB
                  </span>
                  <h3>{d.title}</h3>
                  <p>{d.author || "Penulis belum ditambahkan"}</p>
                  {d.notes && <p className="book-notes">{d.notes}</p>}
                  <div className="book-actions">
                    <button
                      disabled={busy}
                      onClick={() =>
                        action(async () => {
                          await window.sisip.libraryOpen(d.id);
                        })
                      }
                    >
                      <ExternalLink size={15} />
                      Buka PDF
                    </button>
                    <button
                      aria-label={`Edit ${d.title}`}
                      disabled={busy}
                      onClick={() => setEdit({ ...d })}
                    >
                      <Settings2 size={16} />
                    </button>
                    <button
                      aria-label={`${d.archived ? "Pulihkan" : "Arsipkan"} ${d.title}`}
                      disabled={busy}
                      onClick={() => archive(d)}
                    >
                      {d.archived ? (
                        <ArchiveRestore size={16} />
                      ) : (
                        <Archive size={16} />
                      )}
                    </button>
                  </div>
                </div>
              </article>
            ))}
          </div>
        ) : (
          <div className="library-empty">
            <div className="welcome-art">
              <span className="art-orbit" />
              <BookOpen size={44} />
              <span className="sparkle">✦</span>
            </div>
            <h2>
              {query
                ? "Buku belum ditemukan"
                : archived
                  ? "Arsip masih kosong"
                  : "Rak pertama untuk bacaan Anda"}
            </h2>
            <p>
              {query
                ? "Coba judul, penulis, atau kategori lain."
                : archived
                  ? "Buku yang diarsipkan dapat dikembalikan ke koleksi kapan saja."
                  : "Tambahkan PDF sirah, hadis, tafsir, atau buku lainnya. Isi judul, penulis, dan catatan agar mudah ditemukan."}
            </p>
            {!archived && !query && (
              <button
                className="primary-action"
                disabled={busy || !window.sisip}
                onClick={importPDF}
              >
                <Plus size={18} />
                Tambahkan PDF pertama
              </button>
            )}
          </div>
        )}
      </div>
      <div className="library-footnote">
        <Info size={16} />
        <p>
          PDF tersimpan di perangkat, tanpa unggahan ke server. Dibuka di
          pembaca PDF perangkat Anda. Pencarian mencakup metadata buku; belum
          mencari isi PDF atau melakukan OCR. Pembaruan aplikasi mempertahankan
          koleksi; gunakan cadangan sebelum pindah komputer.
        </p>
      </div>
      <dialog
        ref={dialog}
        className="settings-dialog book-dialog"
        onCancel={() => setEdit(null)}
        onClose={() => setEdit(null)}
      >
        <form
          onSubmit={(e) => {
            e.preventDefault();
            action(async () => {
              await window.sisip.libraryUpdate(edit.id, {
                title: edit.title,
                author: edit.author,
                category: edit.category,
                notes: edit.notes,
              });
              await refresh();
              setEdit(null);
              notify("Informasi buku disimpan.");
            });
          }}
        >
          <div className="dialog-heading">
            <h2>Informasi buku</h2>
            <button
              type="button"
              className="icon-button"
              aria-label="Tutup informasi buku"
              onClick={() => setEdit(null)}
            >
              <X size={20} />
            </button>
          </div>
          {edit && (
            <div className="book-form">
              <label>
                Judul buku
                <input
                  aria-label="Judul buku"
                  required
                  maxLength={200}
                  value={edit.title}
                  onChange={(e) =>
                    setEdit((d) => ({ ...d, title: e.target.value }))
                  }
                />
              </label>
              <label>
                Penulis
                <input
                  aria-label="Penulis buku"
                  maxLength={200}
                  value={edit.author}
                  onChange={(e) =>
                    setEdit((d) => ({ ...d, author: e.target.value }))
                  }
                />
              </label>
              <label>
                Kategori
                <select
                  aria-label="Kategori buku"
                  value={edit.category}
                  onChange={(e) =>
                    setEdit((d) => ({ ...d, category: e.target.value }))
                  }
                >
                  {categories.map((c) => (
                    <option key={c}>{c}</option>
                  ))}
                </select>
              </label>
              <label>
                Catatan
                <textarea
                  aria-label="Catatan buku"
                  maxLength={5000}
                  rows={4}
                  value={edit.notes}
                  onChange={(e) =>
                    setEdit((d) => ({ ...d, notes: e.target.value }))
                  }
                />
              </label>
            </div>
          )}
          <div className="dialog-footer">
            <span />
            <button className="done" type="submit" disabled={busy}>
              <Check size={16} />
              Simpan informasi
            </button>
          </div>
        </form>
      </dialog>
    </section>
  );
}
