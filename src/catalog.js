import { loadSongCatalog } from "./data/song-catalog.js";
import { normalizeSearchText } from "./game/engine.js";

const PROJECT_LABELS = Object.freeze({
  album: "专辑",
  ep: "EP",
  ost: "OST",
  single: "单曲",
});

const LANGUAGE_LABELS = Object.freeze({ zh: "中文", en: "英文" });

export function mountCatalog() {
  const abortController = new AbortController();
  const { signal } = abortController;
  const elements = collectElements();
  let songs = [];
  let filters = {
    query: "",
    project: "all",
    language: "all",
    credit: "all",
  };

  bindControls();
  void initialize();

  return () => abortController.abort();

  async function initialize() {
    try {
      songs = await loadSongCatalog({ signal });
      if (signal.aborted) return;
      elements.total.forEach((element) => {
        element.textContent = String(songs.length).padStart(3, "0");
      });
      updateStats();
      render();
      elements.loading.hidden = true;
    } catch (error) {
      if (signal.aborted) return;
      elements.loading.textContent = `曲库读取失败：${error.message}`;
      elements.loading.classList.add("is-error");
    }
  }

  function bindControls() {
    elements.search.addEventListener("input", () => {
      filters = { ...filters, query: elements.search.value };
      render();
    }, { signal });
    elements.project.addEventListener("change", () => {
      filters = { ...filters, project: elements.project.value };
      render();
    }, { signal });
    elements.language.addEventListener("change", () => {
      filters = { ...filters, language: elements.language.value };
      render();
    }, { signal });
    elements.credit.addEventListener("change", () => {
      filters = { ...filters, credit: elements.credit.value };
      render();
    }, { signal });
    elements.clear.addEventListener("click", () => {
      filters = { query: "", project: "all", language: "all", credit: "all" };
      elements.search.value = "";
      elements.project.value = "all";
      elements.language.value = "all";
      elements.credit.value = "all";
      render();
      elements.search.focus();
    }, { signal });
  }

  function updateStats() {
    const stats = {
      ost: songs.filter((song) => song.project.type === "ost").length,
      created: songs.filter((song) => song.curleyCredits.lyrics || song.curleyCredits.composition).length,
      english: songs.filter((song) => song.language === "en").length,
    };
    elements.ost.textContent = String(stats.ost).padStart(3, "0");
    elements.created.textContent = String(stats.created).padStart(3, "0");
    elements.english.textContent = String(stats.english).padStart(3, "0");
  }

  function filteredSongs() {
    const query = normalizeSearchText(filters.query);
    return songs
      .filter((song) => {
        if (filters.project !== "all" && song.project.type !== filters.project) return false;
        if (filters.language !== "all" && song.language !== filters.language) return false;
        if (!matchesCredit(song, filters.credit)) return false;
        if (!query) return true;
        return [
          song.title,
          ...(song.aliases ?? []),
          song.project.title,
          ...(song.featuredArtists ?? []),
        ].some((value) => normalizeSearchText(value).includes(query));
      })
      .sort((left, right) => {
        const dateDifference = String(right.releaseDate ?? "").localeCompare(String(left.releaseDate ?? ""));
        return dateDifference || left.title.localeCompare(right.title, "zh");
      });
  }

  function matchesCredit(song, credit) {
    if (credit === "all") return true;
    if (credit === "writing") return song.curleyCredits.lyrics || song.curleyCredits.composition;
    if (credit === "both") return song.curleyCredits.lyrics && song.curleyCredits.composition;
    if (credit === "lyrics") return song.curleyCredits.lyrics;
    if (credit === "composition") return song.curleyCredits.composition;
    return !song.curleyCredits.lyrics && !song.curleyCredits.composition;
  }

  function render() {
    const visibleSongs = filteredSongs();
    elements.visible.textContent = String(visibleSongs.length).padStart(3, "0");
    elements.results.replaceChildren(...visibleSongs.map((song, index) => renderSong(song, index)));
    elements.empty.hidden = visibleSongs.length > 0;
    elements.results.hidden = visibleSongs.length === 0;
    elements.clear.hidden = !filters.query && filters.project === "all"
      && filters.language === "all" && filters.credit === "all";
  }

  function renderSong(song, index) {
    const article = document.createElement("article");
    article.className = "catalog-entry";

    const indexElement = document.createElement("span");
    indexElement.className = "entry-index";
    indexElement.textContent = String(index + 1).padStart(3, "0");

    const main = document.createElement("div");
    main.className = "entry-main";
    const titleRow = document.createElement("div");
    titleRow.className = "entry-title-row";
    const title = document.createElement("h2");
    title.textContent = song.title;
    const projectType = document.createElement("span");
    projectType.className = `entry-type entry-type--${song.project.type}`;
    projectType.textContent = PROJECT_LABELS[song.project.type] ?? song.project.type;
    titleRow.append(title, projectType);
    main.append(titleRow);

    const project = document.createElement("p");
    project.className = "entry-project";
    project.textContent = song.project.title;
    main.append(project);

    if (song.aliases?.length) {
      const aliases = document.createElement("p");
      aliases.className = "entry-aliases";
      aliases.textContent = `别名：${song.aliases.join(" / ")}`;
      main.append(aliases);
    }

    const meta = document.createElement("dl");
    meta.className = "entry-meta";
    addMeta(meta, "语言", LANGUAGE_LABELS[song.language] ?? song.language);
    addMeta(meta, "创作", creditLabel(song));
    addMeta(meta, "发行", song.releaseDate ?? "—");
    if (song.featuredArtists?.length) addMeta(meta, "合作", song.featuredArtists.join(" / "));

    const source = song.sources?.[0];
    if (source?.url) {
      const sourceWrapper = document.createElement("div");
      sourceWrapper.className = "entry-meta-source";
      const sourceLabel = document.createElement("dt");
      sourceLabel.textContent = "来源";
      const link = document.createElement("a");
      link.className = "entry-source";
      link.href = source.url;
      link.target = "_blank";
      link.rel = "noopener noreferrer";
      link.textContent = "QQ 音乐 ↗";
      const sourceValue = document.createElement("dd");
      sourceValue.append(link);
      sourceWrapper.append(sourceLabel, sourceValue);
      meta.append(sourceWrapper);
    }

    article.append(indexElement, main, meta);
    return article;
  }

  function addMeta(parent, label, value) {
    const wrapper = document.createElement("div");
    const term = document.createElement("dt");
    term.textContent = label;
    const description = document.createElement("dd");
    description.textContent = value;
    wrapper.append(term, description);
    parent.append(wrapper);
  }

  function creditLabel(song) {
    if (song.curleyCredits.lyrics && song.curleyCredits.composition) return "词·曲参与";
    if (song.curleyCredits.lyrics) return "词参与";
    if (song.curleyCredits.composition) return "曲参与";
    return "非创作";
  }
}

function collectElements() {
  const get = (selector) => {
    const element = document.querySelector(selector);
    if (!element) throw new Error(`Catalog page is missing ${selector}.`);
    return element;
  };
  return {
    search: get("#catalog-search"),
    project: get("#catalog-project"),
    language: get("#catalog-language"),
    credit: get("#catalog-credit"),
    clear: get("#catalog-clear"),
    total: [...document.querySelectorAll("[data-catalog-total]")],
    visible: get("[data-catalog-visible]"),
    ost: get("[data-catalog-ost]"),
    created: get("[data-catalog-created]"),
    english: get("[data-catalog-english]"),
    loading: get("[data-catalog-loading]"),
    results: get("[data-catalog-results]"),
    empty: get("[data-catalog-empty]"),
  };
}
