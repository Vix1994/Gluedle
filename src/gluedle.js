import { siteContent } from "./data/catalog.js";
import { loadSongCatalog } from "./data/song-catalog.js";
import {
  MAX_ATTEMPTS,
  createInitialState,
  findSongMatches,
  normalizeSearchText,
  selectRandomAnswer,
  submitGuess,
} from "./game/engine.js";
import { canonicalGameUrl } from "./share/qr-code.js";
import { buildShareCardModel, canvasToBlob, renderShareCard } from "./share/share-card.js";

export function mountGluedle() {
  const abortController = new AbortController();
  const { signal } = abortController;
  const elements = collectElements();
  const noResultsMessage = "没有找到可选歌曲，请换一个关键词。";
  let songs = [];
  let answer = null;
  let state = null;
  let selectedSong = null;
  let suggestionSongs = [];
  let activeSuggestion = -1;
  let roundNumber = 0;
  let toastTimer = 0;
  let lastDialogTrigger = null;
  let isSharing = false;

  void initialize();

  async function initialize() {
    try {
      const catalog = await loadSongCatalog({ signal });
      if (signal.aborted) return;
      songs = catalog.filter((song) => song.guessable !== false);
      bindSearch();
      bindGameActions();
      bindDialogs();
      startRound();
      finishBoot();
    } catch (error) {
      if (signal.aborted) return;
      showLoadError(error);
    }
  }

  function startRound() {
    const choices = answer && songs.length > 1
      ? songs.filter((song) => song.id !== answer.id)
      : songs;
    answer = selectRandomAnswer(choices);
    state = createInitialState(answer.id);
    roundNumber += 1;
    selectedSong = null;
    elements.input.value = "";
    closeSuggestions();
    hydrateContent();
    renderGame();
    setFeedback("输入歌名并从候选中选择，推理记录会一直保留在中间。 ");
  }

  function hydrateContent() {
    elements.gameSongCount.textContent = String(songs.length).padStart(2, "0");
    elements.gameRound.textContent = `ROUND / ${String(roundNumber).padStart(2, "0")}`;
  }

  function bindSearch() {
    elements.input.addEventListener("input", () => {
      selectedSong = null;
      activeSuggestion = -1;
      elements.submit.disabled = true;
      showSuggestions(elements.input.value);
    }, { signal });
    elements.input.addEventListener("focus", () => showSuggestions(elements.input.value), { signal });
    elements.input.addEventListener("blur", () => {
      window.setTimeout(closeSuggestions, 120);
    }, { signal });
    elements.input.addEventListener("keydown", handleSearchKeys, { signal });
  }

  function handleSearchKeys(event) {
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
      const query = normalizeSearchText(elements.input.value);
      const exactMatch = [song.title, ...(song.aliases ?? [])]
        .some((candidate) => normalizeSearchText(candidate) === query);
      selectSuggestion(song);
      if (exactMatch) elements.form.requestSubmit();
    }
  }

  function showSuggestions(query) {
    if (!state || state.status !== "playing" || elements.input.disabled) {
      closeSuggestions();
      return;
    }
    const guessedIds = new Set(state.attempts.map((attempt) => attempt.songId));
    const availableSongs = songs.filter((song) => !guessedIds.has(song.id));
    suggestionSongs = query.trim()
      ? findSongMatches(query, availableSongs, 6)
      : availableSongs.slice(0, 6);
    activeSuggestion = -1;
    elements.suggestions.replaceChildren();

    if (!suggestionSongs.length) {
      closeSuggestions();
      if (query.trim()) setFeedback(noResultsMessage, true);
      return;
    }
    if (elements.feedback.textContent === noResultsMessage) {
      setFeedback("输入歌名并从候选中选择。");
    }
    suggestionSongs.forEach((song, index) => {
      const option = document.createElement("li");
      option.id = `song-option-${song.id}`;
      option.className = "suggestion-option";
      option.role = "option";
      option.ariaSelected = "false";
      option.dataset.index = String(index);
      option.textContent = song.title;
      option.addEventListener("pointerdown", (event) => event.preventDefault(), { signal });
      option.addEventListener("click", () => selectSuggestion(song), { signal });
      elements.suggestions.append(option);
    });
    elements.suggestions.hidden = false;
    elements.input.setAttribute("aria-expanded", "true");
    activeSuggestion = 0;
    updateActiveSuggestion();
  }

  function updateActiveSuggestion() {
    const options = [...elements.suggestions.querySelectorAll("[role='option']")];
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

  function selectSuggestion(song) {
    selectedSong = song;
    elements.input.value = song.title;
    elements.submit.disabled = false;
    closeSuggestions();
    setFeedback(`已选择「${song.title}」，可以提交。`);
  }

  function closeSuggestions() {
    elements.suggestions.hidden = true;
    elements.input.setAttribute("aria-expanded", "false");
    elements.input.removeAttribute("aria-activedescendant");
    activeSuggestion = -1;
  }

  function bindGameActions() {
    elements.form.addEventListener("submit", (event) => {
      event.preventDefault();
      if (!selectedSong) {
        setFeedback("请先从候选列表中选择一首歌曲。", true);
        elements.input.focus();
        return;
      }
      try {
        state = submitGuess(state, selectedSong.id, songs);
        selectedSong = null;
        elements.input.value = "";
        renderGame();
        if (state.status === "playing") {
          setFeedback(`第 ${state.attempts.length} 条推理已记录。`);
          elements.input.focus();
        } else openResultDialog();
      } catch (error) {
        const messages = {
          DUPLICATE_GUESS: "这首歌已经猜过了，请换一首。",
          GAME_OVER: "本轮已经结束，请换一题。",
          UNKNOWN_SONG: "这首歌不在当前曲库中。",
        };
        setFeedback(messages[error.code] ?? "提交失败，请稍后再试。", true);
      }
    }, { signal });
    elements.share.addEventListener("click", shareResultImage, { signal });
    elements.resultShare.addEventListener("click", shareResultImage, { signal });
    elements.reset.addEventListener("click", () => {
      closeDialog(elements.resultDialog);
      startRound();
      elements.input.focus();
      showToast("已随机生成新答案");
    }, { signal });
  }

  function renderGame() {
    const finished = state.status !== "playing";
    const attemptTotal = state.attempts.length;
    document.body.dataset.gameState = state.status;
    document.body.dataset.attempts = String(attemptTotal);
    document.body.style.setProperty("--attempt-progress", String(attemptTotal / MAX_ATTEMPTS));
    updateAttemptMarkers(attemptTotal);
    elements.attemptCount.textContent = String(attemptTotal);
    elements.input.disabled = finished;
    elements.submit.disabled = finished || !selectedSong;
    elements.share.disabled = attemptTotal === 0 || isSharing;
    elements.reset.disabled = isSharing;
    elements.resultShare.disabled = isSharing;
    if (finished) closeSuggestions();

    if (state.status === "won") {
      elements.gameStatus.textContent = `连接成功 · ${answer.title}`;
      setFeedback("本轮完成，可以分享结果或立即换一题。");
    } else if (state.status === "lost") {
      elements.gameStatus.textContent = `答案揭晓 · ${answer.title}`;
      setFeedback(`答案是「${answer.title}」，可以立即换一题。`);
    } else if (attemptTotal) {
      elements.gameStatus.textContent = `已记录 ${attemptTotal} 条推理`;
    } else elements.gameStatus.textContent = "等待第一条推理";

    elements.board.replaceChildren();
    if (!attemptTotal) {
      const row = document.createElement("tr");
      const cell = document.createElement("td");
      row.className = "empty-row";
      cell.colSpan = 7;
      cell.textContent = "输入歌名，第一条推理会出现在这里";
      row.append(cell);
      elements.board.append(row);
      return;
    }

    state.attempts.forEach((attempt, attemptIndex) => {
      const song = songs.find((item) => item.id === attempt.songId);
      if (!song) return;
      const row = document.createElement("tr");
      row.className = "guess-row";
      row.dataset.attemptIndex = String(attemptIndex + 1);
      row.style.setProperty("--row-index", String(attemptIndex));
      if (attemptIndex === attemptTotal - 1) row.classList.add("is-new");
      appendComparisonCell(row, {
        value: song.title,
        status: song.id === answer.id ? "match" : "miss",
        direction: null,
      }, "song", "歌曲");
      appendComparisonCell(row, attempt.comparison.year, "year", "发行日");
      appendComparisonCell(row, attempt.comparison.duration, "duration", "时长");
      appendComparisonCell(row, attempt.comparison.project, "project", "所属项目");
      appendComparisonCell(row, attempt.comparison.live, "live", "Live");
      appendComparisonCell(row, attempt.comparison.performance, "performance", "演唱");
      appendComparisonCell(row, attempt.comparison.credits, "credits", "创作");
      elements.board.append(row);
    });
  }

  function updateAttemptMarkers(attemptTotal) {
    document.querySelectorAll("[data-attempt-marker]").forEach((marker, index) => {
      const complete = index < attemptTotal;
      const current = state.status === "playing" && index === attemptTotal;
      marker.classList.toggle("is-complete", complete);
      marker.classList.toggle("is-current", current);
      marker.textContent = String(index + 1).padStart(2, "0");
      marker.setAttribute("aria-label", `第 ${index + 1} 次，${complete ? "已使用" : current ? "当前" : "未使用"}`);
      if (current) marker.setAttribute("aria-current", "step");
      else marker.removeAttribute("aria-current");
    });
  }

  function appendComparisonCell(row, comparison, field, label) {
    const cell = document.createElement("td");
    const value = document.createElement("span");
    const helper = document.createElement("span");
    const formattedValue = formatCellValue(comparison.value, field);
    const directionMark = comparison.direction === "up"
      ? "↑"
      : comparison.direction === "down" ? "↓" : "";
    const displayValue = directionMark ? `${formattedValue} ${directionMark}` : formattedValue;
    const helperText = comparisonHelper(comparison, field);
    cell.className = "comparison-cell";
    cell.dataset.field = field;
    cell.dataset.label = label;
    cell.dataset.status = comparison.status;
    cell.setAttribute("aria-label", `${label}：${displayValue}，${helperText}`);
    value.className = "cell-value";
    helper.className = "cell-direction";
    value.textContent = displayValue;
    helper.textContent = helperText;
    cell.append(value, helper);
    row.append(cell);
  }

  function openResultDialog() {
    elements.resultTitle.textContent = state.status === "won"
      ? siteContent.game.successTitle
      : siteContent.game.failureTitle;
    elements.resultSummary.replaceChildren();
    const outcome = document.createElement("p");
    outcome.textContent = state.status === "won"
      ? `你用 ${state.attempts.length} / ${MAX_ATTEMPTS} 次找到了「${answer.title}」。`
      : `本轮答案是「${answer.title}」。`;
    elements.resultSummary.append(outcome);
    openDialog(elements.resultDialog);
  }

  async function shareResultImage() {
    if (!state.attempts.length || isSharing) return;
    isSharing = true;
    setShareButtonsBusy(true);
    try {
      const model = buildShareCardModel({
        roundLabel: `ROUND ${String(roundNumber).padStart(2, "0")}`,
        state,
        canonicalUrl: canonicalGameUrl(window.location),
      });
      renderShareCard(elements.shareCanvas, model);
      const blob = await canvasToBlob(elements.shareCanvas);
      const filename = `gluedle-round-${roundNumber}.png`;
      const file = typeof File === "function"
        ? new File([blob], filename, { type: "image/png" })
        : null;
      if (file && typeof navigator.share === "function" && typeof navigator.canShare === "function"
        && navigator.canShare({ files: [file] })) {
        await navigator.share({ files: [file], title: "GLUEDLE 随机歌曲推理" });
        showToast("分享面板已打开");
      } else {
        downloadBlob(blob, filename);
        showToast("结果图片已下载");
      }
    } catch (error) {
      if (error?.name !== "AbortError") {
        setFeedback("结果图片生成失败，请稍后再试。", true);
        showToast("分享失败，请稍后再试");
      }
    } finally {
      isSharing = false;
      setShareButtonsBusy(false);
    }
  }

  function setShareButtonsBusy(busy) {
    elements.share.disabled = busy || !state.attempts.length;
    elements.resultShare.disabled = busy;
    elements.reset.disabled = busy;
    elements.share.textContent = busy ? "正在生成…" : "分享结果";
    elements.resultShare.textContent = busy ? "正在生成…" : "分享结果";
  }

  function bindDialogs() {
    document.addEventListener("glue:open-help", () => openDialog(elements.helpDialog), { signal });
    document.querySelectorAll("[data-open-dialog]").forEach((button) => {
      button.addEventListener("click", () => openDialog(document.getElementById(button.dataset.openDialog)), { signal });
    });
    document.querySelectorAll("[data-close-dialog]").forEach((button) => {
      button.addEventListener("click", () => closeDialog(button.closest("dialog")), { signal });
    });
    document.querySelectorAll("dialog").forEach((dialog) => {
      dialog.addEventListener("click", (event) => {
        if (event.target === dialog) closeDialog(dialog);
      }, { signal });
    });
  }

  function openDialog(dialog) {
    if (!dialog) return;
    lastDialogTrigger = document.activeElement;
    document.body.classList.add("dialog-open");
    if (typeof dialog.showModal === "function") dialog.showModal();
    else dialog.setAttribute("open", "");
  }

  function closeDialog(dialog) {
    if (!dialog) return;
    if (typeof dialog.close === "function" && dialog.open) dialog.close();
    else dialog.removeAttribute("open");
    document.body.classList.remove("dialog-open");
    if (lastDialogTrigger instanceof HTMLElement && lastDialogTrigger.isConnected) {
      lastDialogTrigger.focus({ preventScroll: true });
    }
    lastDialogTrigger = null;
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

  function setFeedback(message, isError = false) {
    elements.feedback.textContent = message;
    elements.feedback.classList.toggle("is-error", isError);
  }

  function showToast(message) {
    window.clearTimeout(toastTimer);
    elements.toast.textContent = message;
    elements.toast.classList.add("is-visible");
    toastTimer = window.setTimeout(() => elements.toast.classList.remove("is-visible"), 2400);
  }

  return () => {
    abortController.abort();
    window.clearTimeout(toastTimer);
    document.body.classList.remove("dialog-open", "is-booting");
    document.body.style.removeProperty("--attempt-progress");
  };
}

function collectElements() {
  return {
    gameSongCount: document.querySelector("[data-game-song-count]"),
    gameRound: document.querySelector("#game-round"),
    gameStatus: document.querySelector("#game-status"),
    form: document.querySelector("#guess-form"),
    input: document.querySelector("#song-input"),
    suggestions: document.querySelector("#song-suggestions"),
    submit: document.querySelector("#guess-submit"),
    feedback: document.querySelector("#guess-feedback"),
    board: document.querySelector("[data-guess-rows]"),
    attemptCount: document.querySelector("#attempt-count"),
    share: document.querySelector("#share-button"),
    reset: document.querySelector("#reset-button"),
    helpDialog: document.querySelector("#help-dialog"),
    resultDialog: document.querySelector("#result-dialog"),
    resultTitle: document.querySelector("#result-title"),
    resultSummary: document.querySelector("[data-result-summary]"),
    resultShare: document.querySelector("[data-result-share]"),
    shareCanvas: document.querySelector("[data-share-canvas]"),
    toast: document.querySelector("[data-toast]"),
    appBoot: document.querySelector("[data-app-boot]"),
  };
}

function formatCellValue(value, field) {
  if (field === "live") {
    if (value === true) return "是";
    if (value === false) return "否";
    return "待核验";
  }
  if (field === "performance") {
    return { solo: "独唱", collaboration: "合作", duet: "合唱" }[value] ?? value ?? "待核验";
  }
  if (field === "credits" && value && typeof value === "object") {
    return `词 ${creditValue(value.lyrics)} · 曲 ${creditValue(value.composition)}`;
  }
  return String(value ?? "待核验");
}

function creditValue(value) {
  if (value === true) return "参与";
  if (value === false) return "未参与";
  return value ?? "待核验";
}

function comparisonHelper(comparison, field) {
  const statusLabel = {
    match: "✓ 匹配",
    near: "≈ 接近",
    partial: "≈ 部分匹配",
    miss: "× 不匹配",
    unknown: "— 待核验",
  }[comparison.status] ?? "";
  if (comparison.direction === "up") {
    return `${statusLabel} · ${field === "year" ? "答案更晚" : "答案更长"}`;
  }
  if (comparison.direction === "down") {
    return `${statusLabel} · ${field === "year" ? "答案更早" : "答案更短"}`;
  }
  return statusLabel;
}

function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.hidden = true;
  document.body.append(anchor);
  anchor.click();
  anchor.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}
