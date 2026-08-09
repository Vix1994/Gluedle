import type { GameState, Song } from "../types.ts";
import { findSongMatches, formatDuration, formatReleaseDate } from "./engine.ts";
import type { GluedleElements } from "./gluedle-elements.ts";

type SearchElements = Pick<
  GluedleElements,
  "feedback" | "form" | "input" | "submit" | "suggestions"
>;

const NO_RESULTS_MESSAGE = "没有找到可选歌曲，请换一个关键词。";

export function createSongSearchController({
  signal,
  elements,
  getSongs,
  getState,
  setFeedback,
}: {
  signal: AbortSignal;
  elements: SearchElements;
  getSongs: () => Song[];
  getState: () => GameState | null;
  setFeedback: (message: string, isError?: boolean) => void;
}) {
  let selectedSong: Song | null = null;
  let suggestionSongs: Song[] = [];
  let activeSuggestion = -1;

  elements.input.addEventListener("input", () => {
    clearSelection();
    if (elements.input.value.trim()) document.body.dataset.mobileBanner = "closed";
    showSuggestions(elements.input.value);
  }, { signal });
  elements.input.addEventListener("focus", () => showSuggestions(elements.input.value), { signal });
  elements.input.addEventListener("blur", () => window.setTimeout(closeSuggestions, 120), { signal });
  elements.input.addEventListener("keydown", handleSearchKeys, { signal });

  function handleSearchKeys(event: KeyboardEvent): void {
    if (event.key === "Escape") {
      closeSuggestions();
      return;
    }
    if (!suggestionSongs.length || elements.suggestions.hidden) return;
    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      event.preventDefault();
      if (activeSuggestion === -1) {
        activeSuggestion = event.key === "ArrowDown" ? 0 : suggestionSongs.length - 1;
      } else {
        const delta = event.key === "ArrowDown" ? 1 : -1;
        activeSuggestion = (activeSuggestion + delta + suggestionSongs.length)
          % suggestionSongs.length;
      }
      updateActiveSuggestion();
      return;
    }
    if (event.key === "Enter" && activeSuggestion >= 0) {
      event.preventDefault();
      const song = suggestionSongs[activeSuggestion];
      if (song) selectSuggestion(song, { submit: true });
    }
  }

  function showSuggestions(query: string): void {
    const state = getState();
    if (!state || state.status !== "playing" || elements.input.disabled) {
      closeSuggestions();
      return;
    }
    if (!query.trim()) {
      closeSuggestions();
      return;
    }

    const guessedIds = new Set(state.attempts.map((attempt) => attempt.songId));
    const availableSongs = getSongs().filter((song) => !guessedIds.has(song.id));
    suggestionSongs = findSongMatches(query, availableSongs, 6) as Song[];
    activeSuggestion = -1;
    elements.suggestions.replaceChildren();

    if (!suggestionSongs.length) {
      closeSuggestions();
      setFeedback(NO_RESULTS_MESSAGE, true);
      return;
    }
    if (elements.feedback.textContent === NO_RESULTS_MESSAGE) {
      setFeedback("输入歌名并从候选中选择。");
    }
    suggestionSongs.forEach((song, index) => {
      const option = document.createElement("li");
      option.id = `song-option-${song.id}`;
      option.className = "suggestion-option";
      option.role = "option";
      option.ariaSelected = "false";
      option.dataset.index = String(index);
      const title = document.createElement("span");
      const metadata = document.createElement("span");
      title.className = "suggestion-title";
      metadata.className = "suggestion-meta";
      title.textContent = song.title;
      metadata.textContent = `${formatDuration(song.durationSec)} · ${formatReleaseDate(song.releaseDate)}`;
      option.addEventListener("pointerdown", (event) => event.preventDefault(), { signal });
      option.addEventListener("click", () => selectSuggestion(song, { submit: true }), { signal });
      option.append(title, metadata);
      elements.suggestions.append(option);
    });
    elements.suggestions.hidden = false;
    elements.input.setAttribute("aria-expanded", "true");
    activeSuggestion = 0;
    updateActiveSuggestion();
  }

  function updateActiveSuggestion(): void {
    const options = [...elements.suggestions.querySelectorAll<HTMLElement>("[role='option']")];
    options.forEach((option, index) => {
      const isActive = index === activeSuggestion;
      option.classList.toggle("is-active", isActive);
      option.ariaSelected = String(isActive);
      if (!isActive) return;
      elements.input.setAttribute("aria-activedescendant", option.id);
      const optionTop = option.offsetTop;
      const optionBottom = optionTop + option.offsetHeight;
      const visibleTop = elements.suggestions.scrollTop;
      const visibleBottom = visibleTop + elements.suggestions.clientHeight;
      if (optionTop < visibleTop) elements.suggestions.scrollTop = optionTop;
      else if (optionBottom > visibleBottom) {
        elements.suggestions.scrollTop = optionBottom - elements.suggestions.clientHeight;
      }
    });
  }

  function selectSuggestion(song: Song, { submit = false }: { submit?: boolean } = {}): void {
    selectedSong = song;
    elements.input.value = song.title;
    elements.submit.disabled = false;
    closeSuggestions();
    if (submit) {
      elements.input.blur();
      elements.form.requestSubmit();
      return;
    }
    setFeedback(`已选择「${song.title}」，可以提交。`);
  }

  function clearSelection(): void {
    selectedSong = null;
    activeSuggestion = -1;
    elements.submit.disabled = true;
  }

  function closeSuggestions(): void {
    elements.suggestions.hidden = true;
    elements.input.setAttribute("aria-expanded", "false");
    elements.input.removeAttribute("aria-activedescendant");
    activeSuggestion = -1;
  }

  function reset(): void {
    clearSelection();
    elements.input.value = "";
    closeSuggestions();
  }

  return {
    get selectedSong() { return selectedSong; },
    clearSelection,
    close: closeSuggestions,
    reset,
  };
}
