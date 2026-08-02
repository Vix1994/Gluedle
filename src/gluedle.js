import { siteContent } from "./data/catalog.js";
import { FEATURED_ARTIST_GENDER_LABELS } from "./data/collaborator-genders.js";
import { loadSongCatalog } from "./data/song-catalog.js";
import {
  MAX_ATTEMPTS,
  createInitialState,
  findSongMatches,
  formatDuration,
  formatReleaseDate,
  getHintStatus,
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
  let hintOrder = [];
  let revealedHintCount = 0;
  let selectedSong = null;
  let suggestionSongs = [];
  let activeSuggestion = -1;
  let roundNumber = 0;
  let toastTimer = 0;
  let lastDialogTrigger = null;
  let isSharing = false;
  let shareBlob = null;
  let shareFilename = "";

  void initialize();

  async function initialize() {
    try {
      const catalog = await loadSongCatalog({ signal });
      if (signal.aborted) return;
      songs = catalog.filter((song) => song.guessable !== false);
      bindSearch();
      bindMobileComposer();
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
    hintOrder = shuffleHints(answer.hintLyrics);
    revealedHintCount = 0;
    roundNumber += 1;
    selectedSong = null;
    resetSharePreview();
    elements.input.value = "";
    elements.hintStack.replaceChildren();
    elements.hintStack.hidden = true;
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
      selectSuggestion(song, { submit: true });
    }
  }

  function showSuggestions(query) {
    if (!state || state.status !== "playing" || elements.input.disabled) {
      closeSuggestions();
      return;
    }

    if (!query.trim()) {
      closeSuggestions();
      return;
    }

    const guessedIds = new Set(state.attempts.map((attempt) => attempt.songId));
    const availableSongs = songs.filter((song) => !guessedIds.has(song.id));
    suggestionSongs = findSongMatches(query, availableSongs, 6);
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

  function selectSuggestion(song, { submit = false } = {}) {
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
        resetSharePreview();
        selectedSong = null;
        elements.input.value = "";
        renderGame();
        if (state.status === "playing") {
          setFeedback(`第 ${state.attempts.length} 条推理已记录。`);
          if (!window.matchMedia("(max-width: 720px)").matches) elements.input.focus();
        } else {
          openResultDialog();
          void prepareSharePreview();
        }
      } catch (error) {
        const messages = {
          DUPLICATE_GUESS: "这首歌已经猜过了，请换一首。",
          GAME_OVER: "本轮已经结束，请换一题。",
          UNKNOWN_SONG: "这首歌不在当前曲库中。",
        };
        setFeedback(messages[error.code] ?? "提交失败，请稍后再试。", true);
      }
    }, { signal });
    elements.share.addEventListener("click", () => {
      openResultDialog();
      void prepareSharePreview();
    }, { signal });
    elements.shareConfirm.addEventListener("click", () => void sharePreparedImage(), { signal });
    elements.shareDownload.addEventListener("click", downloadPreparedImage, { signal });
    elements.hintButton.addEventListener("click", revealNextHint, { signal });
    const resetRound = () => {
      closeDialog(elements.resultDialog);
      startRound();
      elements.input.focus();
      showToast("已随机生成新答案");
    };
    elements.reset.addEventListener("click", resetRound, { signal });
    elements.resultReset.addEventListener("click", resetRound, { signal });
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
    if (finished) closeSuggestions();
    renderHintControl();

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
      appendSongComparisonCell(row, song, attempt, song.id === answer.id ? "match" : "miss");
      appendComparisonCell(row, attempt.comparison.favoriteCount, "favoriteCount", "收藏数");
      appendComparisonCell(row, attempt.comparison.language, "language", "语言");
      appendComparisonCell(row, attempt.comparison.project, "project", "专辑");
      appendComparisonCell(row, attempt.comparison.performance, "performance", "演唱");
      appendComparisonCell(row, attempt.comparison.featuredArtistGender, "featuredArtistGender", "合作对象");
      appendComparisonCell(row, attempt.comparison.credits, "credits", "创作");
      elements.board.append(row);
    });
  }

  function appendSongComparisonCell(row, song, attempt, songStatus) {
    const cell = document.createElement("td");
    const title = document.createElement("span");
    const metadata = document.createElement("div");
    const releaseDate = createSongMetaItem(attempt.comparison.year, "year", "发行日");
    const duration = createSongMetaItem(attempt.comparison.duration, "duration", "时长");
    const releaseLabel = formatSongMetaValue(attempt.comparison.year, "year");
    const durationLabel = formatSongMetaValue(attempt.comparison.duration, "duration");

    cell.className = "comparison-cell song-comparison-cell";
    cell.dataset.field = "song";
    cell.dataset.status = songStatus;
    cell.setAttribute(
      "aria-label",
      `歌曲：${song.title}，发行日：${releaseLabel}，时长：${durationLabel}`,
    );
    title.className = "cell-value song-title";
    title.textContent = song.title;
    metadata.className = "song-meta";
    metadata.append(releaseDate, duration);
    cell.append(title, metadata);
    row.append(cell);
  }

  function renderHintControl() {
    const status = getHintStatus({
      attemptCount: state?.attempts.length ?? 0,
      revealedHintCount,
      hintCount: hintOrder.length,
    });
    const unavailable = hintOrder.length === 0;
    const disabled = unavailable || state?.status !== "playing" || !status.hasAvailableHint;

    elements.hintButton.disabled = disabled;
    elements.hintButton.classList.toggle("is-available", !disabled && status.hasAvailableHint);
    if (unavailable) {
      elements.hintButton.textContent = "本题暂无歌词提示";
    } else if (status.hasAvailableHint) {
      elements.hintButton.textContent = `解锁歌词提示 ${String(status.nextHintIndex + 1).padStart(2, "0")}`;
    } else if (status.hasMoreHints) {
      const nextNumber = String(revealedHintCount + 1).padStart(2, "0");
      elements.hintButton.textContent = status.attemptsUntilNext > 0
        ? `歌词提示 ${nextNumber} · 还需 ${status.attemptsUntilNext} 次`
        : `歌词提示 ${nextNumber} · 已解锁`;
    } else {
      elements.hintButton.textContent = "歌词提示 · 已查看";
    }
  }

  function revealNextHint() {
    if (!state || state.status !== "playing") return;
    const status = getHintStatus({
      attemptCount: state.attempts.length,
      revealedHintCount,
      hintCount: hintOrder.length,
    });
    const hint = status.hasAvailableHint ? hintOrder[status.nextHintIndex] : "";
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
    revealedHintCount += 1;
    renderHintControl();
  }

  function createSongMetaItem(comparison, field, label) {
    const item = document.createElement("span");
    const formattedValue = formatSongMetaValue(comparison, field);
    const directionMark = comparison.direction === "up"
      ? "▲"
      : comparison.direction === "down" ? "▼" : "";
    item.className = "song-meta-item";
    item.dataset.field = field;
    item.dataset.status = comparison.status;
    if (comparison.direction) item.dataset.direction = comparison.direction;
    item.setAttribute(
      "aria-label",
      `${label}：${formattedValue}${directionMark ? ` ${directionMark}` : ""}，${comparisonAccessibilityHelper(comparison)}`,
    );
    item.textContent = directionMark ? `${formattedValue} ${directionMark}` : formattedValue;
    return item;
  }

  function formatSongMetaValue(comparison, field) {
    if (field === "year") return formatReleaseDate(comparison.value);
    return formatCellValue(comparison.value, field).replace(/\s+/gu, " ");
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
      ? "▲"
      : comparison.direction === "down" ? "▼" : "";
    const accessibleValue = directionMark ? `${formattedValue} ${directionMark}` : formattedValue;
    const helperText = comparisonHelper(comparison);
    cell.className = "comparison-cell";
    cell.dataset.field = field;
    cell.dataset.label = label;
    cell.dataset.status = comparison.status;
    if (comparison.direction) cell.dataset.direction = comparison.direction;
    cell.setAttribute(
      "aria-label",
      `${label}：${accessibleValue}，${comparisonAccessibilityHelper(comparison)}`,
    );
    value.className = "cell-value";
    helper.className = "cell-direction";
    value.textContent = formattedValue;
    helper.textContent = helperText;
    cell.append(value, helper);
    row.append(cell);
  }

  function openResultDialog() {
    resetSharePreview();
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
    openDialog(elements.resultDialog);
  }

  async function prepareSharePreview() {
    if (!state.attempts.length || isSharing) return;
    isSharing = true;
    setShareButtonsBusy(true);
    try {
      const model = buildShareCardModel({
        roundLabel: `ROUND ${String(roundNumber).padStart(2, "0")}`,
        state,
        answer,
        canonicalUrl: canonicalGameUrl(window.location),
      });
      renderShareCard(elements.shareCanvas, model);
      shareBlob = await canvasToBlob(elements.shareCanvas);
      shareFilename = `gluedle-round-${roundNumber}.png`;
      elements.sharePreview.hidden = false;
      showToast("结果图片已生成，可选择分享或保存");
    } catch (error) {
      setFeedback("结果图片生成失败，请稍后再试。", true);
      showToast("图片生成失败，请稍后再试");
    } finally {
      isSharing = false;
      setShareButtonsBusy(false);
    }
  }

  async function sharePreparedImage() {
    if (!shareBlob || isSharing) return;
    isSharing = true;
    setShareButtonsBusy(true);
    try {
      const file = typeof File === "function"
        ? new File([shareBlob], shareFilename, { type: "image/png" })
        : null;
      let canShareFiles = false;
      if (file && typeof navigator.share === "function") {
        try {
          canShareFiles = typeof navigator.canShare !== "function"
            || navigator.canShare({ files: [file] });
        } catch {
          canShareFiles = false;
        }
      }
      if (canShareFiles) {
        await navigator.share({ files: [file], title: "GLUEDLE 随机歌曲推理" });
        showToast("分享面板已打开");
      } else {
        downloadBlob(shareBlob, shareFilename);
        showToast("当前设备不支持直接分享，已自动保存图片");
      }
    } catch (error) {
      if (error?.name === "AbortError") return;
      downloadBlob(shareBlob, shareFilename);
      showToast("分享面板不可用，已自动保存图片");
    } finally {
      isSharing = false;
      setShareButtonsBusy(false);
    }
  }

  function downloadPreparedImage() {
    if (!shareBlob || isSharing) return;
    downloadBlob(shareBlob, shareFilename);
    showToast("结果图片已下载");
  }

  function resetSharePreview() {
    shareBlob = null;
    shareFilename = "";
    elements.sharePreview.hidden = true;
  }

  function setShareButtonsBusy(busy) {
    elements.share.disabled = busy || !state.attempts.length;
    elements.shareConfirm.disabled = busy || !shareBlob;
    elements.shareDownload.disabled = busy || !shareBlob;
    elements.reset.disabled = busy;
    elements.resultReset.disabled = busy;
    elements.share.textContent = busy ? "正在生成…" : "分享结果";
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
    hintButton: document.querySelector("#hint-button"),
    hintStack: document.querySelector("[data-hint-stack]"),
    share: document.querySelector("#share-button"),
    reset: document.querySelector("#reset-button"),
    helpDialog: document.querySelector("#help-dialog"),
    resultDialog: document.querySelector("#result-dialog"),
    resultTitle: document.querySelector("#result-title"),
    resultSummary: document.querySelector("[data-result-summary]"),
    resultReset: document.querySelector("[data-result-reset]"),
    sharePreview: document.querySelector("[data-share-preview]"),
    shareConfirm: document.querySelector("[data-share-confirm]"),
    shareDownload: document.querySelector("[data-share-download]"),
    shareCanvas: document.querySelector("[data-share-canvas]"),
    toast: document.querySelector("[data-toast]"),
    appBoot: document.querySelector("[data-app-boot]"),
  };
}

function shuffleHints(hints) {
  const values = Array.isArray(hints) ? hints.filter(Boolean) : [];
  for (let index = values.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1));
    [values[index], values[swapIndex]] = [values[swapIndex], values[index]];
  }
  return values;
}

function formatCellValue(value, field) {
  if (field === "year" && typeof value === "string") {
    const match = /^(\d{4})-(\d{2})-(\d{2})$/u.exec(value);
    if (match) return `${match[2]}-${match[3]}\n${match[1]}`;
  }
  if (field === "language") {
    return {
      zh: "中文",
      en: "英文",
    }[value] ?? value ?? "待核验";
  }
  if (field === "performance") {
    return { solo: "独唱", collaboration: "合作", duet: "合唱" }[value] ?? value ?? "待核验";
  }
  if (field === "featuredArtistGender") {
    return FEATURED_ARTIST_GENDER_LABELS[value] ?? value ?? "待核验";
  }
  if (field === "credits" && value && typeof value === "object") {
    const participation = [
      value.lyrics === true ? "词参与" : null,
      value.composition === true ? "曲参与" : null,
    ].filter(Boolean);
    if (participation.length === 2) return "词·曲参与";
    if (participation.length > 0) return participation.join(" · ");
    if ([value.lyrics, value.composition].every((credit) => credit === false)) return "未参与";
    return "待核验";
  }
  return String(value ?? "待核验");
}

function comparisonHelper() {
  return "";
}

function comparisonAccessibilityHelper(comparison) {
  const statusLabel = {
    match: "✓ 匹配",
    near: "≈ 接近",
    partial: "≈ 部分匹配",
    miss: "× 不匹配",
    unknown: "— 待核验",
  }[comparison.status] ?? "";
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
