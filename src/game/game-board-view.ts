import { formatReleaseDate } from "./engine.ts";
import { comparisonAccessibilityHelper, formatCellValue } from "./presentation.ts";
import type { ComparisonCell, ComparisonStatus, GameAttempt, Song } from "../types.ts";

export function renderGameBoard({
  board,
  attempts,
  songs,
  answerId,
}: {
  board: HTMLTableSectionElement;
  attempts: readonly GameAttempt[];
  songs: readonly Song[];
  answerId: string;
}): void {
  board.replaceChildren();
  if (attempts.length === 0) {
    renderEmptyRow(board);
    return;
  }

  attempts.forEach((attempt, attemptIndex) => {
    const song = songs.find((item) => item.id === attempt.songId);
    if (!song) return;
    const row = document.createElement("tr");
    row.className = "guess-row";
    row.dataset.attemptIndex = String(attemptIndex + 1);
    row.style.setProperty("--row-index", String(attemptIndex));
    if (attemptIndex === attempts.length - 1) row.classList.add("is-new");
    appendSongComparisonCell(row, song, attempt, song.id === answerId ? "match" : "miss");
    appendComparisonCell(row, attempt.comparison.favoriteCount, "favoriteCount", "收藏数");
    appendComparisonCell(row, attempt.comparison.language, "language", "语言");
    appendComparisonCell(row, attempt.comparison.project, "project", "专辑");
    appendComparisonCell(row, attempt.comparison.performance, "performance", "演唱");
    appendComparisonCell(row, attempt.comparison.originType, "originType", "原唱/翻唱");
    appendComparisonCell(row, attempt.comparison.featuredArtistGender, "featuredArtistGender", "合作对象");
    appendComparisonCell(row, attempt.comparison.credits, "credits", "创作");
    board.append(row);
  });
}

function renderEmptyRow(board: HTMLTableSectionElement): void {
  const row = document.createElement("tr");
  const cell = document.createElement("td");
  row.className = "empty-row";
  cell.colSpan = 8;
  cell.textContent = "输入歌名，第一条推理会出现在这里";
  row.append(cell);
  board.append(row);
}

function appendSongComparisonCell(
  row: HTMLTableRowElement,
  song: Song,
  attempt: GameAttempt,
  songStatus: ComparisonStatus,
): void {
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

function createSongMetaItem(
  comparison: ComparisonCell,
  field: string,
  label: string,
): HTMLElement {
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

function formatSongMetaValue(comparison: ComparisonCell, field: string): string {
  if (field === "year") return formatReleaseDate(comparison.value);
  return formatCellValue(comparison.value, field).replace(/\s+/gu, " ");
}

function appendComparisonCell(
  row: HTMLTableRowElement,
  comparison: ComparisonCell,
  field: string,
  label: string,
): void {
  const cell = document.createElement("td");
  const value = document.createElement("span");
  const helper = document.createElement("span");
  const formattedValue = formatCellValue(comparison.value, field);
  const directionMark = comparison.direction === "up"
    ? "▲"
    : comparison.direction === "down" ? "▼" : "";
  const accessibleValue = directionMark ? `${formattedValue} ${directionMark}` : formattedValue;
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
  helper.textContent = "";
  cell.append(value, helper);
  row.append(cell);
}
