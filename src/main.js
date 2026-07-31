import './styles/site.css';

import { siteContent, songs, dataNotice } from "./data/catalog.js";
import {
  MAX_ATTEMPTS,
  formatDuration,
  findSongMatches,
  selectDailyAnswer,
  createInitialState,
  submitGuess,
  serializeGameState,
  restoreGameState,
} from "./game/engine.js";

document.documentElement.classList.add("js");

const elements = {
  header: document.querySelector("[data-header]"),
  progress: document.querySelector("[data-scroll-progress]"),
  nav: document.querySelector(".site-nav"),
  gameSongCount: document.querySelector("[data-game-song-count]"),
  notice: document.querySelector("[data-notice]"),
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
  toast: document.querySelector("[data-toast]"),
};

const guessableSongs = songs.filter((song) => song.guessable !== false);
const today = new Date();
const dayKey = createLocalDayKey(today);
const displayDate = dateFromLocalDayKey(dayKey);
const answer = selectDailyAnswer(guessableSongs, dayKey);
const storageKey = `gluedle:daily:${dayKey}:${answer.id}`;

let state = restoreGameState(readStoredState(), answer.id, guessableSongs);
let selectedSong = null;
let suggestionSongs = [];
let activeSuggestion = -1;
let toastTimer;
let lastDialogTrigger = null;

hydrateContent();
renderGame();
bindSearch();
bindGameActions();
bindDialogs();
setupPageMotion();

function hydrateContent() {
  elements.nav.replaceChildren();
  for (const item of siteContent.navigation) {
    const link = document.createElement("a");
    link.href = item.href === "#game" ? "#gluedle" : item.href;
    link.textContent = item.label;
    elements.nav.append(link);
  }

  setText("[data-content='heroIntro']", siteContent.hero.body);
  setText("[data-content='conceptLead']", siteContent.concept.paragraphs[0]);
  setText(
    "[data-content='conceptBody']",
    siteContent.concept.paragraphs.slice(1).join("\n"),
  );
  setText("[data-content='storyIntro']", siteContent.story.intro);
  const releasedTrack = siteContent.release.tracks[0];
  setText("[data-release-label]", siteContent.release.label);
  setText("[data-release-count]", siteContent.release.countLabel);
  setText("[data-release-position]", releasedTrack.position);
  setText("[data-release-title]", releasedTrack.title);
  setText("[data-release-status]", releasedTrack.status);
  setText("[data-release-note]", releasedTrack.note);
  setText("[data-release-notice]", siteContent.release.notice);
  setText("[data-content='gameLibraryLabel']", siteContent.game.libraryLabel);
  setText("[data-content='gameLibraryNotice']", siteContent.game.libraryNotice);
  elements.gameSongCount.textContent = String(guessableSongs.length).padStart(2, "0");
  setText("#game-title", siteContent.game.title);
  setText("#credits-title", siteContent.credits.title);

  elements.gameDate.textContent = new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(displayDate).toUpperCase();
  document.querySelector("[data-current-year]").textContent = dayKey.slice(0, 4);

  elements.notice.replaceChildren();
  const noticeBlocks = [
    ["游戏资料", dataNotice],
    ["声音", siteContent.game.noAudioNotice],
    ["素材", siteContent.credits.items[3]],
    ["边界", siteContent.credits.disclaimer],
  ];

  for (const [title, body] of noticeBlocks) {
    const section = document.createElement("section");
    const heading = document.createElement("h3");
    const paragraph = document.createElement("p");
    heading.textContent = title;
    paragraph.textContent = body;
    section.append(heading, paragraph);
    elements.notice.append(section);
  }
}

function bindSearch() {
  elements.input.addEventListener("input", () => {
    selectedSong = null;
    activeSuggestion = -1;
    elements.submit.disabled = true;
    showSuggestions(elements.input.value);
  });

  elements.input.addEventListener("focus", () => {
    showSuggestions(elements.input.value);
  });

  elements.input.addEventListener("blur", () => {
    window.setTimeout(closeSuggestions, 120);
  });

  elements.input.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      closeSuggestions();
      return;
    }

    if (!suggestionSongs.length || elements.suggestions.hidden) return;

    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      event.preventDefault();
      const delta = event.key === "ArrowDown" ? 1 : -1;
      activeSuggestion = (activeSuggestion + delta + suggestionSongs.length) % suggestionSongs.length;
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
  if (state.status !== "playing") return;

  const guessedIds = new Set(state.attempts.map((attempt) => attempt.songId));
  const matches = query.trim()
    ? findSongMatches(query, guessableSongs, 8)
    : guessableSongs.slice(0, 8);
  suggestionSongs = matches.filter((song) => !guessedIds.has(song.id));
  activeSuggestion = -1;
  elements.suggestions.replaceChildren();

  if (!suggestionSongs.length) {
    closeSuggestions();
    if (query.trim()) setFeedback("没有找到可选歌曲，请换一个关键词。", true);
    return;
  }

  suggestionSongs.forEach((song, index) => {
    const option = document.createElement("li");
    const title = document.createElement("span");
    const meta = document.createElement("small");
    option.id = `song-option-${song.id}`;
    option.className = "suggestion-option";
    option.role = "option";
    option.ariaSelected = "false";
    option.dataset.index = String(index);
    title.textContent = song.title;
    meta.textContent = `${song.releaseYear ?? "待核验"} / ${formatDuration(song.durationSec)}`;
    option.append(title, meta);
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
    if (isActive) {
      elements.input.setAttribute("aria-activedescendant", option.id);
      const optionTop = option.offsetTop;
      const optionBottom = optionTop + option.offsetHeight;
      const visibleTop = elements.suggestions.scrollTop;
      const visibleBottom = visibleTop + elements.suggestions.clientHeight;
      if (optionTop < visibleTop) elements.suggestions.scrollTop = optionTop;
      else if (optionBottom > visibleBottom) {
        elements.suggestions.scrollTop = optionBottom - elements.suggestions.clientHeight;
      }
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
      } else {
        openResultDialog();
      }
    } catch (error) {
      const messages = {
        DUPLICATE_GUESS: "这首歌已经选择过了，请换一首。",
        GAME_OVER: "今日题目已经结束。",
        UNKNOWN_SONG: "这首歌不在当前曲库中。",
      };
      setFeedback(messages[error.code] ?? "提交失败，请稍后再试。", true);
    }
  });

  elements.share.addEventListener("click", copyShareResult);
  elements.resultShare.addEventListener("click", copyShareResult);

  elements.reset.addEventListener("click", () => {
    removeStoredState();
    state = createInitialState(answer.id);
    selectedSong = null;
    elements.input.value = "";
    renderGame();
    setFeedback("已清除今天这一题的进度，可以重新开始。 ");
    showToast("今日进度已清除");
  });
}

function renderGame() {
  const finished = state.status !== "playing";
  elements.attemptCount.textContent = String(state.attempts.length);
  elements.input.disabled = finished;
  elements.submit.disabled = finished || !selectedSong;
  elements.share.disabled = state.attempts.length === 0;
  elements.reset.disabled = state.attempts.length === 0;

  if (state.status === "won") {
    elements.gameStatus.textContent = `连接成功 · ${answer.title}`;
    setFeedback("今日连接完成，可以复制结果或重新开始。");
  } else if (state.status === "lost") {
    elements.gameStatus.textContent = `本轮结束 · ${answer.title}`;
    setFeedback(`今日答案是「${answer.title}」，可以复制结果或重新开始。`);
  } else if (state.attempts.length) {
    elements.gameStatus.textContent = `已连接 ${state.attempts.length} 次，继续推理`;
  } else {
    elements.gameStatus.textContent = `等待第一条选择 · 最多 ${MAX_ATTEMPTS} 次`;
  }

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

  state.attempts.forEach((attempt) => {
    const song = guessableSongs.find((item) => item.id === attempt.songId);
    if (!song) return;

    const row = document.createElement("tr");
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

function appendComparisonCell(row, comparison, field) {
  const cell = document.createElement("td");
  const value = document.createElement("span");
  const helper = document.createElement("span");
  cell.className = "comparison-cell";
  cell.dataset.status = comparison.status;
  value.className = "cell-value";
  helper.className = "cell-direction";
  value.textContent = formatCellValue(comparison.value, field);
  helper.textContent = comparisonHelper(comparison, field);
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
    const labels = {
      solo: "独唱",
      collaboration: "合作",
      "live solo": "现场独唱",
    };
    return labels[value] ?? value ?? "待核验";
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
  const statusLabels = {
    match: "匹配",
    near: "接近",
    partial: "部分匹配",
    miss: "不匹配",
    unknown: "待核验",
  };

  if (comparison.direction === "up") {
    return field === "year" ? "↑ 答案年份更晚" : "↑ 答案时长更长";
  }
  if (comparison.direction === "down") {
    return field === "year" ? "↓ 答案年份更早" : "↓ 答案时长更短";
  }
  return statusLabels[comparison.status] ?? "";
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

async function copyShareResult() {
  const text = buildShareText();
  try {
    if (!navigator.clipboard?.writeText) throw new Error("Clipboard unavailable");
    await navigator.clipboard.writeText(text);
    showToast("结果已复制到剪贴板");
  } catch {
    showToast("复制失败，请检查浏览器的剪贴板权限");
  }
}

function buildShareText() {
  const outcome = state.status === "won"
    ? `${state.attempts.length}/${MAX_ATTEMPTS}`
    : state.status === "lost" ? `X/${MAX_ATTEMPTS}` : `${state.attempts.length}/…`;
  const lines = [`GLUEDLE ${dayKey} ${outcome}`];
  const fields = ["year", "duration", "project", "language", "live", "performance", "credits"];
  const marks = { match: "●", near: "◐", partial: "◐", miss: "○", unknown: "·" };
  for (const attempt of state.attempts) {
    lines.push(fields.map((field) => marks[attempt.comparison[field].status] ?? "·").join(" "));
  }
  lines.push("无音频 · 只用歌曲资料推理");
  return lines.join("\n");
}

function bindDialogs() {
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
    const openDialogElement = document.querySelector("dialog[open]");
    if (!openDialogElement) return;
    event.preventDefault();
    closeDialog(openDialogElement);
  });
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
  const previousTrigger = lastDialogTrigger;
  lastDialogTrigger = null;
  if (typeof dialog.close === "function") dialog.close();
  else dialog.removeAttribute("open");
  document.body.classList.remove("dialog-open");
  const focusTarget = canReceiveFocus(previousTrigger)
    ? previousTrigger
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

function setupPageMotion() {
  const reveals = document.querySelectorAll(".reveal");
  if ("IntersectionObserver" in window) {
    const revealObserver = new IntersectionObserver((entries, observer) => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue;
        entry.target.classList.add("is-visible");
        observer.unobserve(entry.target);
      }
    }, { threshold: 0.12 });
    reveals.forEach((element) => revealObserver.observe(element));
  } else {
    reveals.forEach((element) => element.classList.add("is-visible"));
  }

  const sections = [...document.querySelectorAll("main > section[id]")];
  const navLinks = [...elements.nav.querySelectorAll("a")];
  if ("IntersectionObserver" in window) {
    const sectionObserver = new IntersectionObserver((entries) => {
      const active = entries.find((entry) => entry.isIntersecting);
      if (!active) return;
      const id = `#${active.target.id}`;
      elements.header.classList.toggle("is-light", active.target.classList.contains("chapter--paper"));
      navLinks.forEach((link) => {
        if (link.getAttribute("href") === id) link.setAttribute("aria-current", "true");
        else link.removeAttribute("aria-current");
      });
    }, { rootMargin: "-35% 0px -55%", threshold: 0 });
    sections.forEach((section) => sectionObserver.observe(section));
  }

  let ticking = false;
  const updateProgress = () => {
    const scrollable = document.documentElement.scrollHeight - window.innerHeight;
    const ratio = scrollable > 0 ? Math.min(1, Math.max(0, window.scrollY / scrollable)) : 0;
    elements.progress.style.transform = `scaleX(${ratio})`;
    ticking = false;
  };
  window.addEventListener("scroll", () => {
    if (ticking) return;
    ticking = true;
    window.requestAnimationFrame(updateProgress);
  }, { passive: true });
  updateProgress();
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
  } catch {
    showToast("无法清除浏览器存储，但本页进度已重置");
  }
}

function setText(selector, value) {
  const element = document.querySelector(selector);
  if (element && value) element.textContent = value;
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
