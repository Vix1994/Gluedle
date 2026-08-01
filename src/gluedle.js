import { siteContent, songs } from "./data/catalog.js";
import {
  MAX_ATTEMPTS,
  findSongMatches,
  selectDailyAnswer,
  createInitialState,
  submitGuess,
  serializeGameState,
  restoreGameState,
} from "./game/engine.js";
import { canonicalGameUrl } from "./share/qr-code.js";
import { buildShareCardModel, canvasToBlob, renderShareCard } from "./share/share-card.js";

export function mountGluedle() {
const abortController = new AbortController();
let dayCheckTimer = 0;

const NO_RESULTS_MESSAGE = "没有找到可选歌曲，请换一个关键词。";
const DAY_CHECK_INTERVAL_MS = 60_000;

const elements = {
  gameSongCount: document.querySelector("[data-game-song-count]"),
  gameDate: document.querySelector("#game-date"),
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
  resultDialog: document.querySelector("#result-dialog"),
  resultTitle: document.querySelector("#result-title"),
  resultSummary: document.querySelector("[data-result-summary]"),
  resultShare: document.querySelector("[data-result-share]"),
  shareCanvas: document.querySelector("[data-share-canvas]"),
  toast: document.querySelector("[data-toast]"),
  appBoot: document.querySelector("[data-app-boot]"),
};

const guessableSongs = songs.filter((song) => song.guessable !== false);
const dayKey = createLocalDayKey(new Date());
const displayDate = dateFromLocalDayKey(dayKey);
const answer = selectDailyAnswer(guessableSongs, dayKey);
const storageKey = `gluedle:daily:${dayKey}:${answer.id}`;

let state = restoreGameState(readStoredState(), answer.id, guessableSongs);
let selectedSong = null;
let suggestionSongs = [];
let activeSuggestion = -1;
let toastTimer;
let lastDialogTrigger = null;
let isSharing = false;
let lastDayCheck = Date.now();
let dayReloadScheduled = false;

hydrateContent();
renderGame();
bindSearch();
bindGameActions();
bindDialogs();
bindDailyRollover();
finishBoot();

function hydrateContent() {
  elements.gameSongCount.textContent = String(guessableSongs.length).padStart(2, "0");
  elements.gameDate.textContent = `TODAY / ${new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(displayDate).toUpperCase()}`;
}

function bindSearch() {
  elements.input.addEventListener("input", () => {
    selectedSong = null;
    activeSuggestion = -1;
    elements.submit.disabled = true;
    showSuggestions(elements.input.value);
  });

  elements.input.addEventListener("focus", () => showSuggestions(elements.input.value));
  elements.input.addEventListener("blur", () => window.setTimeout(closeSuggestions, 120));

  elements.input.addEventListener("keydown", (event) => {
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
        activeSuggestion = (
          activeSuggestion + delta + suggestionSongs.length
        ) % suggestionSongs.length;
      }
      updateActiveSuggestion();
      return;
    }
    if (event.key === "Enter" && activeSuggestion >= 0) {
      event.preventDefault();
      selectSuggestion(suggestionSongs[activeSuggestion]);
    }
  });
}

function showSuggestions(query) {
  if (state.status !== "playing" || elements.input.disabled) {
    closeSuggestions();
    return;
  }
  const guessedIds = new Set(state.attempts.map((attempt) => attempt.songId));
  const matches = query.trim()
    ? findSongMatches(query, guessableSongs, 8)
    : guessableSongs.filter((song) => !guessedIds.has(song.id)).slice(0, 8);
  suggestionSongs = query.trim()
    ? matches.filter((song) => !guessedIds.has(song.id))
    : matches;
  activeSuggestion = -1;
  elements.suggestions.replaceChildren();

  if (!suggestionSongs.length) {
    closeSuggestions();
    if (query.trim()) setFeedback(NO_RESULTS_MESSAGE, true);
    return;
  }

  if (elements.feedback.textContent === NO_RESULTS_MESSAGE) {
    setFeedback("搜索并选择一首歌；列表只显示歌名。");
  }

  suggestionSongs.forEach((song, index) => {
    const option = document.createElement("li");
    option.id = `song-option-${song.id}`;
    option.className = "suggestion-option";
    option.role = "option";
    option.ariaSelected = "false";
    option.dataset.index = String(index);
    option.textContent = song.title;
    option.addEventListener("pointerdown", (event) => event.preventDefault());
    option.addEventListener("click", () => selectSuggestion(song));
    elements.suggestions.append(option);
  });
  elements.suggestions.hidden = false;
  elements.input.setAttribute("aria-expanded", "true");
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
      setFeedback("请先从搜索建议中选择一首歌曲。", true);
      elements.input.focus();
      return;
    }

    try {
      state = submitGuess(state, selectedSong.id, guessableSongs);
      storeState();
      selectedSong = null;
      elements.input.value = "";
      renderGame();
      if (state.status === "playing") {
        setFeedback(`已记录第 ${state.attempts.length} 次选择，继续缩小范围。`);
        elements.input.focus();
      } else openResultDialog();
    } catch (error) {
      const messages = {
        DUPLICATE_GUESS: "这首歌已经选择过了，请换一首。",
        GAME_OVER: "今日题目已经结束。",
        UNKNOWN_SONG: "这首歌不在当前曲库中。",
      };
      setFeedback(messages[error.code] ?? "提交失败，请稍后再试。", true);
    }
  });

  elements.share.addEventListener("click", shareResultImage);
  elements.resultShare.addEventListener("click", shareResultImage);
  elements.reset.addEventListener("click", () => {
    const storageCleared = removeStoredState();
    state = createInitialState(answer.id);
    selectedSong = null;
    elements.input.value = "";
    closeSuggestions();
    renderGame();
    if (storageCleared) {
      setFeedback("已清除今天这一题的进度，可以重新开始。");
      showToast("今日进度已清除");
    } else {
      setFeedback("本页进度已重置，但浏览器存储未能清除。", true);
      showToast("无法清除浏览器存储");
    }
  });
}

function renderGame() {
  const finished = state.status !== "playing";
  const attemptTotal = state.attempts.length;
  document.body.dataset.gameState = state.status;
  document.body.dataset.attempts = String(attemptTotal);
  document.body.style.setProperty("--attempt-progress", String(attemptTotal / MAX_ATTEMPTS));
  updateAttemptMarkers(attemptTotal);
  elements.attemptCount.textContent = String(state.attempts.length);
  elements.input.disabled = finished;
  elements.submit.disabled = finished || !selectedSong;
  elements.share.disabled = state.attempts.length === 0 || isSharing;
  elements.reset.disabled = state.attempts.length === 0 || isSharing;
  elements.resultShare.disabled = isSharing;
  if (finished) closeSuggestions();

  if (state.status === "won") {
    elements.gameStatus.textContent = `连接成功 · ${answer.title}`;
    setFeedback("今日连接完成，可以分享结果图片或重新开始。");
  } else if (state.status === "lost") {
    elements.gameStatus.textContent = `本轮结束 · ${answer.title}`;
    setFeedback(`今日答案是「${answer.title}」，可以分享结果图片或重新开始。`);
  } else if (state.attempts.length) {
    elements.gameStatus.textContent = `已连接 ${state.attempts.length} 次，继续推理`;
  } else elements.gameStatus.textContent = `等待第一条选择 · 最多 ${MAX_ATTEMPTS} 次`;

  elements.board.replaceChildren();
  if (!state.attempts.length) {
    const row = document.createElement("tr");
    const cell = document.createElement("td");
    row.className = "empty-row";
    cell.colSpan = 8;
    cell.textContent = "尚未提交选择";
    row.append(cell);
    elements.board.append(row);
    return;
  }

  state.attempts.forEach((attempt, attemptIndex) => {
    const song = guessableSongs.find((item) => item.id === attempt.songId);
    if (!song) return;
    const row = document.createElement("tr");
    row.className = "guess-row";
    row.dataset.attemptIndex = String(attemptIndex + 1);
    row.style.setProperty("--row-index", String(attemptIndex));
    if (attemptIndex === state.attempts.length - 1) row.classList.add("is-new");
    appendComparisonCell(
      row,
      { value: song.title, status: song.id === answer.id ? "match" : "miss", direction: null },
      "song",
    );
    appendComparisonCell(row, attempt.comparison.year, "year");
    appendComparisonCell(row, attempt.comparison.duration, "duration");
    appendComparisonCell(row, attempt.comparison.project, "project");
    appendComparisonCell(row, attempt.comparison.language, "language");
    appendComparisonCell(row, attempt.comparison.live, "live");
    appendComparisonCell(row, attempt.comparison.performance, "performance");
    appendComparisonCell(row, attempt.comparison.credits, "credits");
    elements.board.append(row);
  });
}

function updateAttemptMarkers(attemptTotal) {
  document.querySelectorAll("[data-attempt-marker]").forEach((marker, index) => {
    const complete = index < attemptTotal;
    const current = state.status === "playing" && index === attemptTotal;
    const markerState = complete ? "complete" : current ? "current" : "pending";
    const stateLabel = complete ? "已完成" : current ? "当前机会" : "未使用";
    marker.classList.toggle("is-complete", complete);
    marker.classList.toggle("is-current", current);
    marker.dataset.markerState = markerState;
    marker.setAttribute("aria-label", `第 ${index + 1} 次机会，${stateLabel}`);
    if (current) marker.setAttribute("aria-current", "step");
    else marker.removeAttribute("aria-current");
  });
}

function appendComparisonCell(row, comparison, field) {
  const cell = document.createElement("td");
  const value = document.createElement("span");
  const helper = document.createElement("span");
  const formattedValue = formatCellValue(comparison.value, field);
  const helperText = comparisonHelper(comparison, field);
  cell.className = "comparison-cell";
  cell.dataset.status = comparison.status;
  cell.setAttribute("aria-label", `${formattedValue}，${helperText}`);
  value.className = "cell-value";
  helper.className = "cell-direction";
  value.textContent = formattedValue;
  helper.textContent = helperText;
  cell.append(value, helper);
  row.append(cell);
}

function formatCellValue(value, field) {
  if (Array.isArray(value)) return value.length ? value.join(" / ") : "待核验";
  if (field === "live") {
    if (value === true) return "是";
    if (value === false) return "否";
    return "待核验";
  }
  if (field === "performance") {
    return { solo: "独唱", collaboration: "合作", "live solo": "现场独唱" }[value]
      ?? value
      ?? "待核验";
  }
  if (field === "credits" && value && typeof value === "object") {
    return `词：${creditValue(value.lyrics)} / 曲：${creditValue(value.composition)}`;
  }
  return String(value ?? "待核验");
}

function creditValue(value) {
  if (value === true) return "参与";
  if (value === false) return "未参与";
  return value ?? "待核验";
}

function comparisonHelper(comparison, field) {
  const labels = {
    match: "✓ 匹配",
    near: "≈ 接近",
    partial: "≈ 部分匹配",
    miss: "× 不匹配",
    unknown: "? 待核验",
  };
  if (comparison.direction === "up") {
    return field === "year" ? "↑ 答案年份更晚" : "↑ 答案时长更长";
  }
  if (comparison.direction === "down") {
    return field === "year" ? "↓ 答案年份更早" : "↓ 答案时长更短";
  }
  return labels[comparison.status] ?? "";
}

function openResultDialog() {
  elements.resultTitle.textContent = state.status === "won"
    ? siteContent.game.successTitle
    : siteContent.game.failureTitle;
  elements.resultSummary.replaceChildren();
  const outcome = document.createElement("p");
  outcome.textContent = state.status === "won"
    ? `你用 ${state.attempts.length} / ${MAX_ATTEMPTS} 次选择找到了「${answer.title}」。`
    : `今日答案是「${answer.title}」。`;
  elements.resultSummary.append(outcome);
  openDialog(elements.resultDialog);
}

async function shareResultImage() {
  if (!state.attempts.length || isSharing) return;
  isSharing = true;
  setShareButtonsBusy(true);
  try {
    const canonicalUrl = canonicalGameUrl(window.location);
    const model = buildShareCardModel({ dayKey, state, canonicalUrl });
    renderShareCard(elements.shareCanvas, model);
    const blob = await canvasToBlob(elements.shareCanvas);
    const filename = `gluedle-${dayKey}.png`;
    const file = typeof File === "function"
      ? new File([blob], filename, { type: "image/png" })
      : null;

    if (
      file
      && typeof navigator.share === "function"
      && typeof navigator.canShare === "function"
      && navigator.canShare({ files: [file] })
    ) {
      await navigator.share({ files: [file], title: `GLUEDLE ${dayKey}` });
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
  const buttons = [elements.share, elements.resultShare];
  buttons.forEach((button) => {
    button.disabled = busy || (!elements.resultDialog.contains(button) && !state.attempts.length);
    button.textContent = busy ? "正在生成图片…" : "分享结果图片";
  });
  elements.reset.disabled = busy || state.attempts.length === 0;
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

function bindDialogs() {
  document.addEventListener("glue:open-help", () => {
    const dialog = document.querySelector("[data-route-view] #help-dialog");
    if (dialog) openDialog(dialog);
  }, { signal: abortController.signal });

  document.querySelectorAll("[data-open-dialog]").forEach((button) => {
    button.addEventListener("click", () => {
      const dialog = document.getElementById(button.dataset.openDialog);
      if (dialog) openDialog(dialog);
    });
  });
  document.querySelectorAll("[data-close-dialog]").forEach((button) => {
    button.addEventListener("click", () => closeDialog(button.closest("dialog")));
  });
  document.querySelectorAll("dialog").forEach((dialog) => {
    dialog.addEventListener("click", (event) => {
      if (event.target === dialog) closeDialog(dialog);
    });
    dialog.addEventListener("close", () => document.body.classList.remove("dialog-open"));
  });
  document.addEventListener("keydown", (event) => {
    if (event.key !== "Escape") return;
    const dialog = document.querySelector("dialog[open]");
    if (!dialog) return;
    event.preventDefault();
    closeDialog(dialog);
  }, { signal: abortController.signal });
}

function bindDailyRollover() {
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible") checkForNewDay();
  }, { signal: abortController.signal });
  dayCheckTimer = window.setInterval(checkForNewDay, DAY_CHECK_INTERVAL_MS);
}

function checkForNewDay() {
  const now = Date.now();
  if (document.visibilityState === "hidden" || now - lastDayCheck < DAY_CHECK_INTERVAL_MS) return;
  lastDayCheck = now;
  if (createLocalDayKey(new Date(now)) === dayKey || dayReloadScheduled) return;
  dayReloadScheduled = true;
  showToast("新的一天已经开始，正在载入今日题目");
  window.setTimeout(() => window.location.reload(), 500);
}

function finishBoot() {
  document.documentElement.classList.remove("is-booting");
  document.body.classList.remove("is-booting");
  elements.appBoot?.remove();
}

function openDialog(dialog) {
  lastDialogTrigger = document.activeElement;
  document.body.classList.add("dialog-open");
  if (typeof dialog.showModal === "function") {
    if (!dialog.open) dialog.showModal();
  } else {
    dialog.setAttribute("open", "");
    dialog.querySelector("button")?.focus();
  }
}

function closeDialog(dialog) {
  if (!dialog) return;
  const trigger = lastDialogTrigger;
  lastDialogTrigger = null;
  if (typeof dialog.close === "function") dialog.close();
  else dialog.removeAttribute("open");
  document.body.classList.remove("dialog-open");
  const focusTarget = canReceiveFocus(trigger)
    ? trigger
    : [elements.share, elements.reset].find(canReceiveFocus);
  focusTarget?.focus({ preventScroll: true });
}

function canReceiveFocus(element) {
  return element instanceof HTMLElement
    && element.isConnected
    && element.tabIndex >= 0
    && !element.hasAttribute("disabled")
    && element.getAttribute("aria-disabled") !== "true";
}

function setFeedback(message, isError = false) {
  elements.feedback.textContent = message;
  elements.feedback.classList.toggle("is-error", isError);
}

function showToast(message) {
  window.clearTimeout(toastTimer);
  elements.toast.textContent = message;
  elements.toast.classList.add("is-visible");
  toastTimer = window.setTimeout(() => elements.toast.classList.remove("is-visible"), 2800);
}

function readStoredState() {
  try {
    return window.localStorage.getItem(storageKey);
  } catch {
    return null;
  }
}

function storeState() {
  try {
    window.localStorage.setItem(storageKey, serializeGameState(state));
  } catch {
    showToast("浏览器未允许保存进度，本轮仍可继续");
  }
}

function removeStoredState() {
  try {
    window.localStorage.removeItem(storageKey);
    return true;
  } catch {
    return false;
  }
}

function createLocalDayKey(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function dateFromLocalDayKey(key) {
  const [year, month, day] = key.split("-").map(Number);
  return new Date(year, month - 1, day);
}

return () => {
  abortController.abort();
  window.clearInterval(dayCheckTimer);
  window.clearTimeout(toastTimer);
  document.body.classList.remove("dialog-open", "is-booting");
  document.body.style.removeProperty("--attempt-progress");
};
}
