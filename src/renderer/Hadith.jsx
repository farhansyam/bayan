import React, { useEffect, useRef, useState } from "react";
import {
  Search,
  Copy,
  BookOpen,
  ArrowLeft,
  ArrowRight,
  Settings2,
  Info,
  FileText,
  Presentation,
} from "lucide-react";
export default function Hadith({ options, setOption, onSettings, notify }) {
  const [books, setBooks] = useState([]),
    [book, setBook] = useState("bukhari"),
    [query, setQuery] = useState(""),
    [page, setPage] = useState(1),
    [result, setResult] = useState(null),
    [selected, setSelected] = useState(null),
    [loading, setLoading] = useState(true),
    [error, setError] = useState("");
  const search = useRef();
  const request = useRef(0);
  useEffect(() => {
    if (!window.sisip) {
      setError(
        "Buka aplikasi desktop untuk menggunakan koleksi hadis offline.",
      );
      setLoading(false);
      return;
    }
    window.sisip
      .hadithBooks()
      .then(setBooks)
      .catch((e) => setError(e.message));
  }, []);
  useEffect(() => {
    if (!window.sisip) return;
    let alive = true;
    const number = ++request.current;
    setLoading(true);
    setError("");
    setSelected(null);
    const timer = setTimeout(() => {
      window.sisip
        .searchHadith({ book, query, page })
        .then((data) => {
          if (alive && number === request.current) {
            setResult(data);
            setSelected(data.items[0] || null);
          }
        })
        .catch((e) => {
          if (alive) {
            setError(e.message);
            setResult(null);
          }
        })
        .finally(() => {
          if (alive) setLoading(false);
        });
    }, 180);
    return () => {
      alive = false;
      clearTimeout(timer);
    };
  }, [book, query, page]);
  function excerpt(text) {
    const term = query.trim().toLocaleLowerCase("id").split(/\s+/)[0];
    const index =
      term && !/^\d/.test(term)
        ? text.toLocaleLowerCase("id").indexOf(term)
        : 0;
    const start = Math.max(0, index - 45);
    return (
      (start ? "…" : "") +
      text.slice(start, start + 180) +
      (text.length > start + 180 ? "…" : "")
    );
  }
  async function copy() {
    if (!selected || loading) return;
    try {
      await window.sisip.copyHadith(book, selected.number, options);
      notify("Hadis tersalin. Siap ditempel ke dokumen Anda.");
    } catch (e) {
      notify(e.message);
    }
  }
  useEffect(() => {
    const onKey = (e) => {
      if (document.querySelector("dialog[open]")) return;
      const mod = e.metaKey || e.ctrlKey;
      if (mod && e.key === "Enter") {
        e.preventDefault();
        copy();
      }
      if (
        (mod && e.key.toLowerCase() === "k") ||
        (e.key === "/" &&
          !/INPUT|SELECT|TEXTAREA/.test(document.activeElement.tagName))
      ) {
        e.preventDefault();
        search.current?.focus();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });
  const ar = options.target === "word" ? options.wordArabic : options.pptArabic,
    tr =
      options.target === "word"
        ? options.wordTranslation
        : options.pptTranslation;
  return (
    <section className="feature-workspace hadith-workspace">
      <div className="feature-heading">
        <div>
          <span className="eyebrow">KOLEKSI HADIS OFFLINE</span>
          <h2>
            Temukan hadis. <em>Lengkapi rujukan.</em>
          </h2>
          <p>38.102 riwayat tersedia dalam snapshot sembilan kitab.</p>
        </div>
        <BookOpen size={33} />
      </div>
      <div className="hadith-search">
        <label>
          Kitab
          <select
            aria-label="Kitab hadis"
            value={book}
            onChange={(e) => {
              setBook(e.target.value);
              setPage(1);
            }}
          >
            {books.map((b) => (
              <option key={b.id} value={b.id}>
                {b.name} · {b.count.toLocaleString("id-ID")} riwayat
              </option>
            ))}
          </select>
        </label>
        <div className="search-wrap">
          <Search size={20} />
          <input
            ref={search}
            aria-label="Cari hadis"
            placeholder="Nomor, rentang, atau kata terjemahan. Contoh: 1, 10–15, niat"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setPage(1);
            }}
          />
        </div>
      </div>
      <div className="feature-controls">
        <div className="segmented">
          {[
            ["both", "Arab + Terjemahan"],
            ["arabic", "Arab"],
            ["translation", "Terjemahan"],
          ].map(([value, label]) => (
            <button
              key={value}
              aria-pressed={options.content === value}
              className={options.content === value ? "selected" : ""}
              onClick={() => setOption("content", value)}
            >
              {label}
            </button>
          ))}
        </div>
        <div className="segmented">
          <button
            className={options.target === "word" ? "selected word" : ""}
            aria-pressed={options.target === "word"}
            onClick={() => setOption("target", "word")}
          >
            <FileText size={15} />
            Word
          </button>
          <button
            className={options.target === "ppt" ? "selected ppt" : ""}
            aria-pressed={options.target === "ppt"}
            onClick={() => setOption("target", "ppt")}
          >
            <Presentation size={15} />
            PowerPoint
          </button>
        </div>
        <button className="options-button" onClick={onSettings}>
          <Settings2 size={16} />
          Opsi format
        </button>
      </div>
      <div className="hadith-content">
        <aside className="hadith-results">
          <div className="result-count" role="status">
            {loading
              ? "Mencari di perangkat…"
              : result
                ? `${result.total.toLocaleString("id-ID")} hasil · ${result.book.name}`
                : "Hasil pencarian"}
          </div>
          <div className="result-items">
            {!loading &&
              result?.items.map((h) => (
                <button
                  key={h.number}
                  className={selected?.number === h.number ? "active" : ""}
                  onClick={() => setSelected(h)}
                >
                  <b>
                    HR. {result.book.name} · {h.number}
                  </b>
                  <p>{excerpt(h.id)}</p>
                </button>
              ))}
            {!loading && result?.total === 0 && (
              <div className="feature-empty">
                <Search size={26} />
                <h3>Hadis tidak ditemukan</h3>
                <p>
                  Coba kata lain atau nomor berbeda. Snapshot sumber memiliki
                  celah penomoran.
                </p>
              </div>
            )}
          </div>
          <div className="pagination">
            <button
              aria-label="Halaman hadis sebelumnya"
              disabled={loading || page === 1}
              onClick={() => setPage((p) => p - 1)}
            >
              <ArrowLeft size={17} />
            </button>
            <span>
              {page} / {Math.max(1, Math.ceil((result?.total || 0) / 20))}
            </span>
            <button
              aria-label="Halaman hadis berikutnya"
              disabled={loading || !result || page * 20 >= result.total}
              onClick={() => setPage((p) => p + 1)}
            >
              <ArrowRight size={17} />
            </button>
          </div>
        </aside>
        <div className="hadith-preview">
          <div className="preview-scroll">
            {error ? (
              <div className="error-state" role="alert">
                <Info size={27} />
                <p>{error}</p>
              </div>
            ) : loading ? (
              <div className="feature-empty">
                <BookOpen size={32} />
                <p>Menyiapkan koleksi lokal…</p>
              </div>
            ) : selected ? (
              <div className="document-preview">
                <div className="paper-heading">
                  <span>HADIS · {result.book.name.toUpperCase()}</span>
                  <span>NO. {selected.number}</span>
                </div>
                {options.content !== "translation" && (
                  <p
                    className="arabic hadith-arabic"
                    dir="rtl"
                    lang="ar"
                    style={{ fontSize: `${ar}pt` }}
                  >
                    {selected.arab}
                    {options.numbers && (
                      <span className="ayah-marker"> ({selected.number})</span>
                    )}
                  </p>
                )}
                {options.content !== "arabic" && (
                  <p className="translation" style={{ fontSize: `${tr}pt` }}>
                    {options.numbers && (
                      <span className="translation-number">
                        Hadis {selected.number}.{" "}
                      </span>
                    )}
                    {selected.id}
                  </p>
                )}
                {options.reference && (
                  <p className="reference" style={{ fontSize: `${tr}pt` }}>
                    (HR. {result.book.name}, no. {selected.number})
                  </p>
                )}
              </div>
            ) : (
              <div className="feature-empty">
                <BookOpen size={35} />
                <h3>Pilih hadis untuk dibaca</h3>
              </div>
            )}
          </div>
          <div className="hadith-source">
            <Info size={15} />
            <p>
              Snapshot gadingnst/hadith-api (sumber: tafsirq.com). Penomoran
              mengikuti sumber dan tidak selalu lengkap. Derajat hadis tidak
              disediakan; teks belum ditinjau secara ilmiah oleh aplikasi ini.
            </p>
          </div>
          <div className="copy-bar">
            <div>
              <div className="copy-caption">
                Arab & terjemahan · Teks yang dapat diedit
              </div>
              <small>Rujukan kitab dan nomor mengikuti sumber.</small>
            </div>
            <button
              className="copy-button"
              disabled={!selected || loading || !!error}
              onClick={copy}
            >
              <Copy size={18} />
              Salin hadis
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}
