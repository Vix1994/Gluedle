import { loadSongCatalog } from "./data/song-catalog.ts";
import { PROJECT_CATEGORY_LABELS } from "./data/project-categories.ts";
import { normalizeSearchText } from "./game/engine.ts";
import type { ProjectCategory, Song, SongLanguage } from "./types.ts";

const LANGUAGE_LABELS: Readonly<Record<SongLanguage, string>> = Object.freeze({ zh: "中文", en: "英文" });

interface CatalogFilters {
  query: string;
  project: string;
  language: string;
  credit: string;
}

export function mountCatalog() {
  const abortController = new AbortController();
  const { signal } = abortController;
  const elements = collectElements();
  let songs: Song[] = [];
  let filters: CatalogFilters = {
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
    } catch (error: unknown) {
      if (signal.aborted) return;
      const message = error instanceof Error ? error.message : "未知错误";
      elements.loading.textContent = `曲库读取失败：${message}`;
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
      ost: songs.filter((song) => ["film", "game"].includes(song.project.category)).length,
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
        if (filters.project !== "all" && song.project.category !== filters.project) return false;
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

  function matchesCredit(song: Song, credit: string): boolean {
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

  function renderSong(song: Song, index: number): HTMLElement {
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
    projectType.className = `entry-type entry-type--${song.project.category}`;
    projectType.textContent = (PROJECT_CATEGORY_LABELS as Readonly<Record<ProjectCategory, string>>)[song.project.category]
      ?? song.project.category;
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

  function addMeta(parent: HTMLDListElement, label: string, value: string): void {
    const wrapper = document.createElement("div");
    const term = document.createElement("dt");
    term.textContent = label;
    const description = document.createElement("dd");
    description.textContent = value;
    wrapper.append(term, description);
    parent.append(wrapper);
  }

  function creditLabel(song: Song): string {
    if (song.curleyCredits.lyrics && song.curleyCredits.composition) return "词·曲参与";
    if (song.curleyCredits.lyrics) return "词参与";
    if (song.curleyCredits.composition) return "曲参与";
    return "非创作";
  }
}

function collectElements() {
  const get = <T extends Element>(selector: string): T => {
    const element = document.querySelector<T>(selector);
    if (!element) throw new Error(`Catalog page is missing ${selector}.`);
    return element;
  };
  return {
    search: get<HTMLInputElement>("#catalog-search"),
    project: get<HTMLSelectElement>("#catalog-project"),
    language: get<HTMLSelectElement>("#catalog-language"),
    credit: get<HTMLSelectElement>("#catalog-credit"),
    clear: get<HTMLButtonElement>("#catalog-clear"),
    total: [...document.querySelectorAll<HTMLElement>("[data-catalog-total]")],
    visible: get<HTMLElement>("[data-catalog-visible]"),
    ost: get<HTMLElement>("[data-catalog-ost]"),
    created: get<HTMLElement>("[data-catalog-created]"),
    english: get<HTMLElement>("[data-catalog-english]"),
    loading: get<HTMLElement>("[data-catalog-loading]"),
    results: get<HTMLElement>("[data-catalog-results]"),
    empty: get<HTMLElement>("[data-catalog-empty]"),
  };
}
