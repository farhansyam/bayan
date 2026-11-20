import React, { useEffect, useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import {
  BookOpen,
  Search,
  Settings2,
  Sun,
  Moon,
  Copy,
  Check,
  ChevronRight,
  ChevronDown,
  ArrowRight,
  PanelLeftClose,
  PanelLeftOpen,
  WifiOff,
  Command,
  Clock,
  Type,
  FileText,
  Presentation,
  X,
  Info,
  RotateCcw,
  SlidersHorizontal,
} from "lucide-react";
import { surahs, findSurahs, parseQuery } from "../core/dataService";
import { defaults, formatOutput, reference } from "../core/formatter";
import Hadith from "./Hadith";
import Library from "./Library";
import bayanLogo from "../../assets/bayan-logo.png";
import "./style.css";
const mac =
  window.sisip?.platform === "darwin" || navigator.platform.includes("Mac");
const modifier = mac ? "⌘" : "Ctrl";
const initial = { options: defaults, history: [] };
function App() {
  const [section, setSection] = useState("quran"),
    [appInfo, setAppInfo] = useState({ version: "0.3.0", dataPath: "" });
  useEffect(() => {
    window.sisip
      ?.appInfo()
      .then(setAppInfo)
      .catch(() => {});
  }, []);
  const [options, setOptions] = useState(defaults),
    [history, setHistory] = useState([]),
    [ready, setReady] = useState(false),
    [query, setQuery] = useState(""),
    [filter, setFilter] = useState(""),
    [suggest, setSuggest] = useState(false),
    [activeSuggestion, setActiveSuggestion] = useState(0),
    [sidebar, setSidebar] = useState(true),
    [settings, setSettings] = useState(false),
    [toast, setToast] = useState(""),
    [copied, setCopied] = useState(false),
    [systemDark, setSystemDark] = useState(
      matchMedia("(prefers-color-scheme: dark)").matches,
    );
  const lastResult = useRef(null);
  const search = useRef(),
    dialog = useRef(),
    settingsButton = useRef(),
    timer = useRef();
  let result = null,
    error = "";
  try {
    result = parseQuery(query);
  } catch (e) {
    error = e.message;
  }
  if (result) lastResult.current = result;
  const rangeResult =
    result ||
    (error &&
    lastResult.current &&
    query.startsWith(`${lastResult.current.surah.id}:`)
      ? lastResult.current
      : null);
  const matches = findSurahs(query.replace(/\s+\d.*$/, "")).slice(0, 6);
  const set = (key, value) => setOptions((o) => ({ ...o, [key]: value }));
  useEffect(() => {
    (async () => {
      try {
        const s = window.sisip
          ? await window.sisip.readState()
          : JSON.parse(localStorage.getItem("sisip-state") || "{}");
        setOptions({ ...defaults, ...s.options });
        setHistory(
          Array.isArray(s.history)
            ? s.history.filter((x) => typeof x === "string").slice(0, 6)
            : [],
        );
      } catch {}
      setReady(true);
    })();
    const m = matchMedia("(prefers-color-scheme: dark)");
    const listen = () => setSystemDark(m.matches);
    m.addEventListener("change", listen);
    return () => m.removeEventListener("change", listen);
  }, []);
  useEffect(() => {
    if (!ready) return;
    const state = { options, history };
    const id = setTimeout(() => {
      if (window.sisip)
        window.sisip
          .saveState(state)
          .catch(() => notify("Pengaturan belum tersimpan."));
      else localStorage.setItem("sisip-state", JSON.stringify(state));
    }, 200);
    return () => clearTimeout(id);
  }, [options, history, ready]);
  useEffect(() => {
    document.documentElement.dataset.theme =
      options.theme === "system"
        ? systemDark
          ? "dark"
          : "light"
        : options.theme;
    document.documentElement.style.fontSize = `${options.scale}%`;
  }, [options.theme, options.scale, systemDark]);
  useEffect(() => {
    if (settings) dialog.current?.showModal();
    else if (dialog.current?.open) dialog.current.close();
  }, [settings]);
  function notify(message) {
    setToast(message);
    clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      setToast("");
      setCopied(false);
    }, 2200);
  }
  async function copy() {
    if (!result) return;
    try {
      if (window.sisip) await window.sisip.copy(query, options);
      else {
        const out = formatOutput(result, options);
        await navigator.clipboard.write([
          new ClipboardItem({
            "text/html": new Blob([out.html], { type: "text/html" }),
            "text/plain": new Blob([out.text], { type: "text/plain" }),
          }),
        ]);
      }
      setCopied(true);
      setHistory((h) =>
        [
          `${result.surah.id}:${result.start}${result.start === result.end ? "" : `-${result.end}`}`,
          ...h.filter(
            (x) =>
              x !==
              `${result.surah.id}:${result.start}${result.start === result.end ? "" : `-${result.end}`}`,
          ),
        ].slice(0, 6),
      );
      notify("Ayat tersalin. Siap ditempel ke dokumen Anda.");
    } catch {
      notify("Belum berhasil menyalin. Coba tombol Salin kembali.");
    }
  }
  useEffect(() => {
    const key = (e) => {
      if (settings || section !== "quran") return;
      const mod = e.ctrlKey || e.metaKey;
      if (
        (mod && e.key.toLowerCase() === "k") ||
        (e.key === "/" &&
          !/INPUT|SELECT|TEXTAREA/.test(document.activeElement.tagName))
      ) {
        e.preventDefault();
        search.current?.focus();
      }
      if (mod && e.key === "Enter") {
        e.preventDefault();
        copy();
      }
      if (mod && ["1", "2"].includes(e.key)) {
        e.preventDefault();
        set("target", e.key === "1" ? "word" : "ppt");
      }
      if (mod && e.key.toLowerCase() === "d") {
        e.preventDefault();
        set(
          "theme",
          document.documentElement.dataset.theme === "dark" ? "light" : "dark",
        );
      }
      if (e.key === "Escape") {
        setSuggest(false);
        setQuery("");
      }
    };
    window.addEventListener("keydown", key);
    return () => window.removeEventListener("keydown", key);
  });
  function select(s) {
    setQuery(`${s.id}:1-${s.count}`);
    setSuggest(false);
  }
  function range(key, value) {
    if (!rangeResult) return;
    const match = query.match(/^(\d+):(\d*)-(\d*)$/);
    const start = match ? match[2] : rangeResult.start;
    const end = match ? match[3] : rangeResult.end;
    setQuery(
      `${rangeResult.surah.id}:${key === "start" ? value : start}-${key === "end" ? value : end}`,
    );
  }
  const arabicSize =
    options.target === "word" ? options.wordArabic : options.pptArabic;
  const trSize =
    options.target === "word"
      ? options.wordTranslation
      : options.pptTranslation;
  const displayGroups = result
    ? options.group === "block"
      ? [result.verses]
      : result.verses.map((v) => [v])
    : [];
  return (
    <div className="app">
      <header className="header">
        <div className="brand">
          <div className="brandmark bayan-brandmark">
            <img src={bayanLogo} alt="Logo Bayan" />
          </div>
          <div>
            <h1>
              Bayan<span>DESKTOP</span>
            </h1>
            <p>Al-Qur’an, hadis & perpustakaan pribadi.</p>
          </div>
        </div>
        <div className="header-right">
          <span className="offline">
            <i />
            Sepenuhnya offline
          </span>
          <div className="header-divider" />
          <button
            className="icon-button"
            aria-label="Ganti tema"
            title={`${modifier}+D`}
            onClick={() =>
              set(
                "theme",
                document.documentElement.dataset.theme === "dark"
                  ? "light"
                  : "dark",
              )
            }
          >
            <Sun size={19} />
          </button>
          <button
            ref={settingsButton}
            className="icon-button"
            aria-label="Buka setelan"
            onClick={() => setSettings(true)}
          >
            <Settings2 size={20} />
          </button>
        </div>
      </header>
      <nav className="section-nav" aria-label="Bagian aplikasi">
        {[
          ["quran", "Al-Qur’an"],
          ["hadith", "Hadis"],
          ["library", "Perpustakaan & Sirah"],
        ].map(([id, label]) => (
          <button
            key={id}
            aria-current={section === id ? "page" : undefined}
            className={section === id ? "active" : ""}
            onClick={() => setSection(id)}
          >
            {label}
          </button>
        ))}
        <span>Ruang baca & kutipan · Offline</span>
      </nav>
      {section === "quran" ? (
        <>
          <section className="workspace-top">
            <div className="eyebrow">RUANG KUTIPAN ANDA</div>
            <div className="heading-line">
              <h2>
                Temukan ayat. <em>Sisipkan makna.</em>
              </h2>
              <span className="collection-label">
                114 surah <span>·</span> 6.236 ayat
              </span>
            </div>
            <div className="search-wrap">
              <Search size={22} />
              <input
                ref={search}
                autoFocus
                aria-label="Cari ayat"
                placeholder="Cari surah atau ayat, mis. Al-Baqarah 255 atau 2:255–257"
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value);
                  setSuggest(true);
                  setActiveSuggestion(0);
                }}
                onFocus={() => setSuggest(true)}
                onBlur={() => setTimeout(() => setSuggest(false), 150)}
                onKeyDown={(e) => {
                  if (e.key === "ArrowDown") {
                    e.preventDefault();
                    setSuggest(true);
                    setActiveSuggestion(
                      (i) => (i + 1) % Math.max(1, matches.length),
                    );
                  }
                  if (e.key === "ArrowUp") {
                    e.preventDefault();
                    setActiveSuggestion(
                      (i) =>
                        (i - 1 + matches.length) % Math.max(1, matches.length),
                    );
                  }
                  if (
                    e.key === "Enter" &&
                    suggest &&
                    matches.length &&
                    !result
                  ) {
                    e.preventDefault();
                    select(matches[activeSuggestion] || matches[0]);
                  }
                }}
              />
              {query ? (
                <button
                  className="icon-button"
                  aria-label="Hapus pencarian"
                  onClick={() => {
                    setQuery("");
                    search.current.focus();
                  }}
                >
                  <X size={17} />
                </button>
              ) : (
                <kbd>{modifier} K</kbd>
              )}
              {suggest && query && !result && matches.length > 0 && (
                <div
                  className="suggestions"
                  role="listbox"
                  aria-label="Saran surah"
                >
                  {matches.map((s, i) => (
                    <button
                      key={s.id}
                      className={i === activeSuggestion ? "active" : ""}
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={() => select(s)}
                    >
                      <span>
                        {s.id}. {s.name}
                      </span>
                      <small>{s.count} ayat</small>
                    </button>
                  ))}
                </div>
              )}
            </div>
            <div className="toolbar">
              <div className="tool-group">
                <span className="tool-label">Tampilkan</span>
                <div className="segmented">
                  {[
                    ["both", "Arab + Terjemahan"],
                    ["arabic", "Arab"],
                    ["translation", "Terjemahan"],
                  ].map(([v, t]) => (
                    <button
                      key={v}
                      aria-pressed={options.content === v}
                      className={options.content === v ? "selected" : ""}
                      onClick={() => set("content", v)}
                    >
                      {t}
                    </button>
                  ))}
                </div>
              </div>
              <div className="tool-group">
                <span className="tool-label">Untuk</span>
                <div className="segmented target">
                  <button
                    aria-pressed={options.target === "word"}
                    className={options.target === "word" ? "selected word" : ""}
                    onClick={() => set("target", "word")}
                  >
                    <FileText size={15} />
                    Word
                  </button>
                  <button
                    aria-pressed={options.target === "ppt"}
                    className={options.target === "ppt" ? "selected ppt" : ""}
                    onClick={() => set("target", "ppt")}
                  >
                    <Presentation size={15} />
                    PowerPoint
                  </button>
                </div>
              </div>
              <button
                className="options-button"
                onClick={() => setSettings(true)}
              >
                <SlidersHorizontal size={16} />
                Opsi format
              </button>
            </div>
          </section>
          <main className={`main ${!sidebar ? "collapsed" : ""}`}>
            {sidebar && (
              <aside className="sidebar">
                <div className="side-title">
                  <h3>
                    Daftar surah <span>114</span>
                  </h3>
                  <button
                    className="icon-button"
                    aria-label="Sembunyikan daftar surah"
                    onClick={() => setSidebar(false)}
                  >
                    <PanelLeftClose size={17} />
                  </button>
                </div>
                <div className="filter">
                  <Search size={16} />
                  <input
                    aria-label="Filter surah"
                    placeholder="Cari nama surah…"
                    value={filter}
                    onChange={(e) => setFilter(e.target.value)}
                  />
                </div>
                <div className="surah-list">
                  {findSurahs(filter).map((s) => (
                    <button
                      key={s.id}
                      className={`surah ${result?.surah.id === s.id ? "active" : ""}`}
                      onClick={() => select(s)}
                    >
                      <span className="surah-number">
                        {String(s.id).padStart(2, "0")}
                      </span>
                      <span className="surah-info">
                        <b>{s.name}</b>
                        <small>
                          {s.count} ayat <span>·</span> {s.place}
                        </small>
                      </span>
                      <span className="surah-arabic" lang="ar">
                        {s.arabic}
                      </span>
                    </button>
                  ))}
                  {!findSurahs(filter).length && (
                    <p className="muted empty-filter">
                      Tidak ada surah yang cocok.
                    </p>
                  )}
                </div>
                <div className="side-footer">
                  <BookOpen size={15} />
                  <span>Al-Qur’an · Rasm Uthmani</span>
                </div>
              </aside>
            )}
            <section className="preview-area">
              <div className="preview-bar">
                <div className="preview-title">
                  {!sidebar && (
                    <button
                      className="icon-button"
                      aria-label="Tampilkan daftar surah"
                      onClick={() => setSidebar(true)}
                    >
                      <PanelLeftOpen size={17} />
                    </button>
                  )}
                  <span className="eyebrow">PRATINJAU KUTIPAN</span>
                  {result && (
                    <span className="count-tag">
                      {result.verses.length} ayat
                    </span>
                  )}
                </div>
                <span className="preview-size">
                  <Type size={14} />
                  {arabicSize} pt <span>·</span>{" "}
                  {options.target === "word"
                    ? "Dokumen Word"
                    : "Slide PowerPoint"}
                </span>
              </div>
              {rangeResult && (
                <div className="range-bar">
                  <div>
                    <strong>{rangeResult.surah.name}</strong>
                    <span>
                      Surah {rangeResult.surah.id} · {rangeResult.surah.meaning}
                    </span>
                  </div>
                  <div className="range-inputs">
                    <label>
                      Dari ayat
                      <input
                        aria-label="Dari ayat"
                        type="number"
                        min="1"
                        max={rangeResult.surah.count}
                        value={
                          query.match(/^\d+:(\d*)-/)?.[1] ?? rangeResult.start
                        }
                        onChange={(e) => range("start", e.target.value)}
                      />
                    </label>
                    <ArrowRight size={15} />
                    <label>
                      Sampai ayat
                      <input
                        aria-label="Sampai ayat"
                        type="number"
                        min={rangeResult.start}
                        max={rangeResult.surah.count}
                        value={
                          query.match(/^\d+:\d*-(\d*)$/)?.[1] ?? rangeResult.end
                        }
                        onChange={(e) => range("end", e.target.value)}
                      />
                    </label>
                  </div>
                </div>
              )}
              <div className="preview-scroll">
                {error ? (
                  <div className="error-state" role="alert">
                    <Info size={30} />
                    <h3>Periksa pencarian Anda</h3>
                    <p>{error}</p>
                    <button onClick={() => setQuery("2:255")}>
                      Coba Ayat Kursi <ArrowRight size={16} />
                    </button>
                  </div>
                ) : !result ? (
                  <div className="welcome">
                    <div className="welcome-art">
                      <span className="art-orbit" />
                      <BookOpen size={48} />
                      <span className="sparkle">✦</span>
                    </div>
                    <span className="eyebrow">MULAI DENGAN SATU AYAT</span>
                    <h2>
                      Kutipan yang indah.
                      <br />
                      <em>Tanpa mengetik ulang.</em>
                    </h2>
                    <p>
                      Temukan ayat, sesuaikan tampilannya, lalu salin
                      <br />
                      ke Word atau PowerPoint sebagai teks yang bisa diedit.
                    </p>
                    <div className="examples">
                      <button onClick={() => setQuery("2:255")}>
                        Ayat Kursi <ArrowRight size={14} />
                      </button>
                      <button onClick={() => setQuery("Al-Ikhlas")}>
                        Al-Ikhlas <ArrowRight size={14} />
                      </button>
                      <button onClick={() => setQuery("36:1-12")}>
                        Yasin 1–12 <ArrowRight size={14} />
                      </button>
                    </div>
                    <div className="welcome-tip">
                      <Command size={14} />
                      <span>
                        Tekan <kbd>{modifier} K</kbd> untuk mulai mencari
                      </span>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="document-preview">
                      <div className="paper-heading">
                        <span>BAYAN</span>
                        <span>
                          {options.content === "arabic"
                            ? "TEKS ARAB"
                            : options.content === "translation"
                              ? "TERJEMAHAN INDONESIA"
                              : "AL-QUR’AN & TERJEMAHAN"}
                        </span>
                      </div>
                      {displayGroups.map((group, i) => (
                        <article className="verse" key={i}>
                          {options.content !== "translation" && (
                            <p
                              className="arabic"
                              dir="rtl"
                              lang="ar"
                              style={{ fontSize: `${arabicSize}pt` }}
                            >
                              {group.map((v) => (
                                <React.Fragment key={v.id}>
                                  {v.arabic}
                                  {options.numbers && (
                                    <span className="ayah-marker">
                                      {" "}
                                      ﴿
                                      {String(v.id).replace(
                                        /\d/g,
                                        (d) => "٠١٢٣٤٥٦٧٨٩"[d],
                                      )}
                                      ﴾{" "}
                                    </span>
                                  )}{" "}
                                </React.Fragment>
                              ))}
                            </p>
                          )}
                          {options.content !== "arabic" && (
                            <p
                              className="translation"
                              style={{ fontSize: `${trSize}pt` }}
                            >
                              {group.map((v) => (
                                <React.Fragment key={v.id}>
                                  {options.numbers && (
                                    <span className="translation-number">
                                      Ayat {v.id}.{" "}
                                    </span>
                                  )}
                                  {v.translation}{" "}
                                </React.Fragment>
                              ))}
                            </p>
                          )}
                        </article>
                      ))}
                      {options.reference && (
                        <p
                          className="reference"
                          style={{ fontSize: `${trSize}pt` }}
                        >
                          {reference(result, options)}
                        </p>
                      )}
                      <div className="paper-bottom">
                        <span />✦<span />
                      </div>
                    </div>
                    {options.target === "ppt" && result.verses.length > 10 && (
                      <div className="warning" role="status">
                        <Info size={17} />
                        Lebih dari 10 ayat. Teks mungkin perlu dibagi ke
                        beberapa slide.
                      </div>
                    )}
                    <p className="preview-note">
                      Pratinjau memakai font Amiri yang dibundel. Font hasil
                      salin: {options.font}.
                    </p>
                  </>
                )}
              </div>
              <div className="copy-bar">
                <div>
                  <div className="copy-caption">
                    <Check size={15} />
                    Teks asli, bisa diedit
                  </div>
                  <small>Arab RTL · Terjemahan Indonesia · Tanpa gambar</small>
                </div>
                <button
                  className={`copy-button ${copied ? "copied" : ""}`}
                  disabled={!result}
                  onClick={copy}
                >
                  {copied ? <Check size={19} /> : <Copy size={19} />}
                  <span>{copied ? "Tersalin" : "Salin ayat"}</span>
                  <kbd>{modifier} ↵</kbd>
                </button>
              </div>
            </section>
          </main>
          <footer className="footer">
            <div className="history">
              <Clock size={14} />
              <span>Terakhir disalin</span>
              {history.length ? (
                history.slice(0, 4).map((h) => (
                  <button key={h} onClick={() => setQuery(h)}>
                    {h}
                  </button>
                ))
              ) : (
                <span className="history-empty">
                  Kutipan Anda akan muncul di sini
                </span>
              )}
            </div>
            <button onClick={() => setSettings(true)}>
              Tentang & sumber data <Info size={13} />
            </button>
          </footer>
        </>
      ) : section === "hadith" ? (
        <Hadith
          options={options}
          setOption={set}
          onSettings={() => setSettings(true)}
          notify={notify}
        />
      ) : (
        <Library notify={notify} />
      )}
      <dialog
        ref={dialog}
        className="settings-dialog"
        onCancel={() => setSettings(false)}
        onClose={() => {
          setSettings(false);
          settingsButton.current?.focus();
        }}
      >
        <div className="dialog-heading">
          <div>
            <span className="eyebrow">SESUAIKAN RUANG ANDA</span>
            <h2>Setelan & format</h2>
          </div>
          <button
            className="icon-button"
            aria-label="Tutup setelan"
            onClick={() => setSettings(false)}
          >
            <X size={22} />
          </button>
        </div>
        <div className="settings-body">
          <h3>Tampilan aplikasi</h3>
          <div className="settings-grid">
            <label>
              Tema
              <select
                aria-label="Tema"
                value={options.theme}
                onChange={(e) => set("theme", e.target.value)}
              >
                <option value="system">Ikuti sistem</option>
                <option value="light">Terang</option>
                <option value="dark">Gelap</option>
              </select>
            </label>
            <label>
              Skala antarmuka
              <select
                value={options.scale}
                onChange={(e) => set("scale", +e.target.value)}
              >
                {[90, 100, 110, 125, 150].map((n) => (
                  <option key={n} value={n}>
                    {n}%
                  </option>
                ))}
              </select>
            </label>
          </div>
          <h3>Format kutipan</h3>
          <div className="settings-grid">
            <label>
              Font Arab hasil salin
              <select
                value={options.font}
                onChange={(e) => set("font", e.target.value)}
              >
                {["Traditional Arabic", "Amiri", "Scheherazade New"].map(
                  (f) => (
                    <option key={f}>{f}</option>
                  ),
                )}
              </select>
            </label>
            <label>
              Susunan ayat
              <select
                value={options.group}
                onChange={(e) => set("group", e.target.value)}
              >
                <option value="verse">Dipisah per ayat</option>
                <option value="block">Satu blok bersambung</option>
              </select>
            </label>
            <label>
              Format rujukan
              <select
                value={options.referenceFormat}
                onChange={(e) => set("referenceFormat", e.target.value)}
              >
                <option value="name">Nama surah</option>
                <option value="number">Nomor surah</option>
              </select>
            </label>
            <div className="checks">
              <label>
                <input
                  type="checkbox"
                  checked={options.numbers}
                  onChange={(e) => set("numbers", e.target.checked)}
                />
                Nomor ayat
              </label>
              <label>
                <input
                  type="checkbox"
                  checked={options.reference}
                  onChange={(e) => set("reference", e.target.checked)}
                />
                Rujukan di akhir
              </label>
            </div>
          </div>
          <p className="setting-note">
            Font hasil salin perlu terpasang di komputer tujuan. Amiri
            disertakan untuk pratinjau; berkas font tersedia di folder
            assets/fonts.
          </p>
          <h3>Ukuran font (pt)</h3>
          <div className="settings-grid">
            {[
              ["wordArabic", "Word · Arab"],
              ["wordTranslation", "Word · Terjemahan"],
              ["pptArabic", "PowerPoint · Arab"],
              ["pptTranslation", "PowerPoint · Terjemahan"],
            ].map(([k, label]) => (
              <label key={k}>
                {label}
                <input
                  type="number"
                  min="8"
                  max="96"
                  value={options[k]}
                  onChange={(e) =>
                    set(k, Math.max(8, Math.min(96, +e.target.value || 8)))
                  }
                />
              </label>
            ))}
          </div>
          <div className="about">
            <h3>
              Tentang Bayan <span>v{appInfo.version} · Prarilis</span>
            </h3>
            <p>
              114 surah dan 6.236 ayat tersimpan di perangkat. Tanpa akun,
              telemetri, atau koneksi keluar.
            </p>
            <p>
              Arab: Tanzil Project, Uthmani, melalui Quran JSON. © 2007–2021
              Tanzil Project · CC BY 3.0. Teks disertakan tanpa perubahan.
              Sumber dan pembaruan: tanzil.net.
            </p>
            <p>
              Terjemahan: Kemenag melalui EQuran.id. Edisi, izin distribusi, dan
              pemeriksaan manual terhadap sumber resmi masih perlu dikonfirmasi
              sebelum rilis publik.
            </p>
            <p>
              Pratinjau: Amiri · SIL Open Font License. Perilaku tempel perlu
              diuji di Word dan PowerPoint pada perangkat tujuan.
            </p>
            <p>
              Hadis: 38.102 riwayat dalam snapshot sembilan kitab dari
              gadingnst/hadith-api (MIT; sumber tafsirq.com). Sebagian nomor
              tidak tersedia dalam snapshot. Derajat hadis dan verifikasi ilmiah
              belum disediakan.
            </p>
            <h3>Pembaruan & data pribadi</h3>
            <p>
              Tutup Bayan, lalu jalankan installer versi baru tanpa menghapus
              versi lama. Setelan, riwayat, dan PDF pribadi disimpan terpisah
              dari aplikasi. Versi ini memakai installer pengganti, belum
              menyediakan patch kecil atau pembaruan otomatis.
            </p>
            <p>
              Cadangkan dan pulihkan PDF beserta metadata melalui tab
              Perpustakaan. Simpan cadangan di luar folder aplikasi sebelum
              pindah komputer.
            </p>
            {appInfo.dataPath && (
              <p className="data-path">
                Lokasi data pribadi: {appInfo.dataPath}
              </p>
            )}
            <p className="shortcuts">
              {modifier}+K Cari · {modifier}+Enter Salin · {modifier}+1/2 Preset
              · {modifier}+D Tema
            </p>
          </div>
        </div>
        <div className="dialog-footer">
          <button
            className="reset"
            onClick={() => {
              setOptions({ ...defaults });
              notify("Setelan dikembalikan ke bawaan.");
            }}
          >
            <RotateCcw size={15} />
            Atur ulang ke bawaan
          </button>
          <button className="done" onClick={() => setSettings(false)}>
            Selesai <Check size={16} />
          </button>
        </div>
      </dialog>
      {toast && (
        <div className="toast" role="status">
          <Check size={17} />
          {toast}
        </div>
      )}
    </div>
  );
}
createRoot(document.getElementById("root")).render(<App />);
