import { siteContent } from "./data/catalog.ts";
import { loadSongCatalog } from "./data/song-catalog.ts";
import {
  MAX_ATTEMPTS,
  createInitialState,
  selectRandomAnswer,
  submitGuess,
  GameEngineError,
} from "./game/engine.ts";
import { createDialogController } from "./game/dialog-controller.ts";
import { renderGameBoard } from "./game/game-board-view.ts";
import { collectGluedleElements } from "./game/gluedle-elements.ts";
import { createHintController } from "./game/hint-controller.ts";
import { shuffleHints } from "./game/presentation.ts";
import { createSongSearchController } from "./game/song-search-controller.ts";
import { createResultShareController } from "./share/result-share-controller.ts";
import type {
  GameState,
  Song,
} from "./types.ts";

export function mountGluedle() {
  const abortController = new AbortController();
  const { signal } = abortController;
  const elements = collectGluedleElements();
  const dialogs = createDialogController({ signal, helpDialog: elements.helpDialog });
  let songs: Song[] = [];
  let answer: Song | null = null;
  let state: GameState | null = null;
  let roundNumber = 0;
  let toastTimer = 0;
  const hints = createHintController({
    signal,
    elements,
    getState: () => state,
    getAnswer: () => answer,
  });
  const search = createSongSearchController({
    signal,
    elements,
    getSongs: () => songs,
    getState: () => state,
    setFeedback,
  });
  const shares = createResultShareController({
    signal,
    elements,
    getState: () => state,
    getAnswer: () => answer,
    getRoundNumber: () => roundNumber,
    openResult: openResultDialog,
    setFeedback,
    showToast,
  });

  void initialize();

  async function initialize() {
    try {
      const catalog = await loadSongCatalog({ signal });
      if (signal.aborted) return;
      songs = catalog.filter((song) => song.guessable !== false);
      bindMobileComposer();
      bindGameActions();
      startRound();
      finishBoot();
    } catch (error) {
      if (signal.aborted) return;
      showLoadError();
    }
  }

  function startRound() {
    const previousAnswer = answer;
    const choices = previousAnswer && songs.length > 1
      ? songs.filter((song) => song.id !== previousAnswer.id)
      : songs;
    const nextAnswer = selectRandomAnswer(choices) as Song;
    answer = nextAnswer;
    state = createInitialState(nextAnswer.id);
    hints.reset(shuffleHints(nextAnswer.hintLyrics));
    roundNumber += 1;
    shares.reset();
    search.reset();
    hydrateContent();
    renderGame();
    setFeedback("输入歌名并从候选中选择，推理记录会一直保留在中间。 ");
  }

  function hydrateContent() {
    elements.gameSongCount.textContent = String(songs.length).padStart(2, "0");
    elements.gameRound.textContent = `ROUND / ${String(roundNumber).padStart(2, "0")}`;
  }

  function bindMobileComposer() {
    const viewport = window.visualViewport;
    if (!viewport) return;
    const updateKeyboardOffset = () => {
      const offset = Math.max(0, window.innerHeight - viewport.height - viewport.offsetTop);
      document.documentElement.style.setProperty("--mobile-keyboard-offset", `${offset}px`);
    };
    viewport.addEventListener("resize", updateKeyboardOffset, { signal });
    viewport.addEventListener("scroll", updateKeyboardOffset, { signal });
    updateKeyboardOffset();
  }

  function bindGameActions() {
    elements.form.addEventListener("submit", (event) => {
      event.preventDefault();
      const selectedSong = search.selectedSong;
      if (!selectedSong || !state) {
        setFeedback("请先从候选列表中选择一首歌曲。", true);
        elements.input.focus();
        return;
      }
      try {
        state = submitGuess(state, selectedSong.id, songs);
        shares.reset();
        search.reset();
        renderGame();
        if (state.status === "playing") {
          setFeedback(`第 ${state.attempts.length} 条推理已记录。`);
          if (!window.matchMedia("(max-width: 720px)").matches) elements.input.focus();
        } else {
          openResultDialog();
          void shares.prepare();
        }
      } catch (error: unknown) {
        const messages: Record<string, string> = {
          DUPLICATE_GUESS: "这首歌已经猜过了，请换一首。",
          GAME_OVER: "本轮已经结束，请换一题。",
          UNKNOWN_SONG: "这首歌不在当前曲库中。",
        };
        const code = error instanceof GameEngineError ? error.code : "";
        setFeedback(messages[code] ?? "提交失败，请稍后再试。", true);
      }
    }, { signal });
    const resetRound = () => {
      dialogs.close(elements.resultDialog);
      startRound();
      elements.input.focus();
      showToast("已随机生成新答案");
    };
    elements.reset.addEventListener("click", resetRound, { signal });
    elements.resultReset.addEventListener("click", resetRound, { signal });
  }

  function renderGame() {
    if (!state || !answer) return;
    const finished = state.status !== "playing";
    const attemptTotal = state.attempts.length;
    document.body.dataset.gameState = state.status;
    document.body.dataset.attempts = String(attemptTotal);
    document.body.style.setProperty("--attempt-progress", String(attemptTotal / MAX_ATTEMPTS));
    updateAttemptMarkers(attemptTotal);
    elements.attemptCount.textContent = String(attemptTotal);
    elements.input.disabled = finished;
    elements.submit.disabled = finished || !search.selectedSong;
    elements.share.disabled = attemptTotal === 0 || shares.isBusy;
    elements.reset.disabled = shares.isBusy;
    if (finished) search.close();
    hints.render();

    if (state.status === "won") {
      elements.gameStatus.textContent = `连接成功 · ${answer.title}`;
      setFeedback("本轮完成，可以分享结果或立即换一题。");
    } else if (state.status === "lost") {
      elements.gameStatus.textContent = `答案揭晓 · ${answer.title}`;
      setFeedback(`答案是「${answer.title}」，可以立即换一题。`);
    } else if (attemptTotal) {
      elements.gameStatus.textContent = `已记录 ${attemptTotal} 条推理`;
    } else elements.gameStatus.textContent = "等待第一条推理";

    renderGameBoard({ board: elements.board, attempts: state.attempts, songs, answerId: answer.id });
  }

  function updateAttemptMarkers(attemptTotal: number): void {
    document.querySelectorAll("[data-attempt-marker]").forEach((marker, index) => {
      const complete = index < attemptTotal;
      const current = state?.status === "playing" && index === attemptTotal;
      marker.classList.toggle("is-complete", complete);
      marker.classList.toggle("is-current", current);
      marker.textContent = String(index + 1).padStart(2, "0");
      marker.setAttribute("aria-label", `第 ${index + 1} 次，${complete ? "已使用" : current ? "当前" : "未使用"}`);
      if (current) marker.setAttribute("aria-current", "step");
      else marker.removeAttribute("aria-current");
    });
  }

  function openResultDialog() {
    if (!state || !answer) return;
    shares.reset();
    const outcomeState = state.status === "won"
      ? "won"
      : state.status === "lost" ? "lost" : "playing";
    elements.resultOutcome.dataset.state = outcomeState;
    elements.resultOutcome.textContent = outcomeState === "won"
      ? "答对了"
      : outcomeState === "lost" ? "这次没答对" : "推理进行中";
    elements.resultTitle.textContent = state.status === "won"
      ? siteContent.game.successTitle
      : state.status === "lost" ? siteContent.game.failureTitle : "当前推理";
    elements.resultSummary.replaceChildren();
    const outcome = document.createElement("p");
    outcome.textContent = state.status === "won"
      ? `你用 ${state.attempts.length} / ${MAX_ATTEMPTS} 次找到了「${answer.title}」。`
      : state.status === "lost"
        ? `本轮答案是「${answer.title}」。`
        : `已记录 ${state.attempts.length} 条推理，继续寻找答案。`;
    elements.resultSummary.append(outcome);
    dialogs.open(elements.resultDialog);
  }

  function showLoadError() {
    document.body.dataset.gameState = "error";
    elements.appBoot?.classList.add("is-error");
    const title = elements.appBoot?.querySelector("strong");
    const copy = elements.appBoot?.querySelector("p");
    if (title) title.textContent = "歌曲数据读取失败";
    if (copy) copy.textContent = "请确认 /data/gluedle-songs.json 存在且格式正确，然后刷新页面。";
  }

  function finishBoot() {
    document.documentElement.classList.remove("is-booting");
    document.body.classList.remove("is-booting");
    elements.appBoot?.remove();
  }

  function setFeedback(message: string, isError = false): void {
    elements.feedback.textContent = message;
    elements.feedback.classList.toggle("is-error", isError);
  }

  function showToast(message: string): void {
    window.clearTimeout(toastTimer);
    elements.toast.textContent = message;
    elements.toast.classList.add("is-visible");
    toastTimer = window.setTimeout(() => elements.toast.classList.remove("is-visible"), 2400);
  }

  return () => {
    abortController.abort();
    dialogs.destroy();
    window.clearTimeout(toastTimer);
    document.body.classList.remove("dialog-open", "is-booting");
    document.body.style.removeProperty("--attempt-progress");
  };
}
