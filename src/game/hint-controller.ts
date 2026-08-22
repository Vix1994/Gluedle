import type { GameState, Song } from "../types.ts";
import { formatSongTitleLength, getHintStatus } from "./engine.ts";
import type { GluedleElements } from "./gluedle-elements.ts";

type HintElements = Pick<GluedleElements, "hintButton" | "hintStack">;

export function createHintController({
  signal,
  elements,
  getState,
  getAnswer,
}: {
  signal: AbortSignal;
  elements: HintElements;
  getState: () => GameState | null;
  getAnswer: () => Song | null;
}) {
  let hints: string[] = [];
  let revealedCount = 0;

  elements.hintButton.addEventListener("click", revealNext, { signal });

  function reset(nextHints: string[]): void {
    hints = nextHints;
    revealedCount = 0;
    elements.hintStack.replaceChildren();
    elements.hintStack.hidden = true;
  }

  function render(): void {
    const state = getState();
    renderTitleLengthHint(state, getAnswer());
    const status = getHintStatus({
      attemptCount: state?.attempts.length ?? 0,
      revealedHintCount: revealedCount,
      hintCount: hints.length,
    });
    const unavailable = hints.length === 0;
    const disabled = unavailable || state?.status !== "playing" || !status.hasAvailableHint;

    elements.hintButton.disabled = disabled;
    elements.hintButton.classList.toggle("is-available", !disabled && status.hasAvailableHint);
    if (unavailable) {
      elements.hintButton.textContent = "本题暂无歌词提示";
    } else if (status.hasAvailableHint) {
      elements.hintButton.textContent = `解锁歌词提示 ${String(status.nextHintIndex + 1).padStart(2, "0")}`;
    } else if (status.hasMoreHints) {
      const nextNumber = String(revealedCount + 1).padStart(2, "0");
      elements.hintButton.textContent = status.attemptsUntilNext > 0
        ? `歌词提示 ${nextNumber} · 还需 ${status.attemptsUntilNext} 次`
        : `歌词提示 ${nextNumber} · 已解锁`;
    } else {
      elements.hintButton.textContent = "歌词提示 · 已查看";
    }
  }

  function renderTitleLengthHint(state: GameState | null, answer: Song | null): void {
    const wrongGuessCount = state && answer
      ? state.attempts.filter((attempt) => attempt.songId !== answer.id).length
      : 0;
    const existingHint = elements.hintStack.querySelector("[data-title-length-hint]");

    if (wrongGuessCount >= 2 && answer && !existingHint) {
      const card = document.createElement("article");
      const value = document.createElement("p");
      card.className = "hint-card title-length-hint";
      card.dataset.titleLengthHint = "";
      value.className = "hint-card-quote";
      value.textContent = formatSongTitleLength(answer.title);
      card.append(value);
      elements.hintStack.prepend(card);
    } else if (wrongGuessCount < 2) {
      existingHint?.remove();
    }

    elements.hintStack.hidden = elements.hintStack.childElementCount === 0;
  }

  function revealNext(): void {
    const state = getState();
    if (!state || state.status !== "playing") return;
    const status = getHintStatus({
      attemptCount: state.attempts.length,
      revealedHintCount: revealedCount,
      hintCount: hints.length,
    });
    const hint = status.hasAvailableHint ? hints[status.nextHintIndex] : "";
    if (!hint) return;

    const card = document.createElement("article");
    const label = document.createElement("p");
    const quote = document.createElement("p");
    card.className = "hint-card";
    card.dataset.hintIndex = String(status.nextHintIndex + 1);
    label.className = "hint-card-label";
    label.textContent = `LYRIC CLUE ${String(status.nextHintIndex + 1).padStart(2, "0")}`;
    quote.className = "hint-card-quote";
    quote.textContent = `“${hint}”`;
    card.append(label, quote);
    elements.hintStack.append(card);
    elements.hintStack.hidden = false;
    revealedCount += 1;
    render();
  }

  return { reset, render };
}
