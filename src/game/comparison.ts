import {
  getProjectCategory,
  getProjectDisplay,
} from "../data/project-categories.ts";
import type {
  ComparisonCell,
  ComparisonDirection,
  ComparisonStatus,
  ProjectCategory,
  SongComparison,
} from "../types.ts";
import {
  PENDING_VERIFICATION,
  formatDuration,
  formatFavoriteCount,
  formatReleaseDate,
  normalizedMetadataValue,
  parseFavoriteCountDisplay,
  toFiniteNumber,
  toReleaseTimestamp,
} from "./formatters.ts";
import { assertSong } from "./song-compat.ts";
import type { EngineSong } from "./song-compat.ts";

interface ComparableProject {
  title: string | null;
  type: string | null;
  category: ProjectCategory | null;
  display: string;
}

export const COMPARISON_STATUS = Object.freeze({
  MATCH: "match",
  NEAR: "near",
  PARTIAL: "partial",
  MISS: "miss",
  UNKNOWN: "unknown",
});

export function compareSongs(guess: unknown, target: unknown): SongComparison {
  assertSong(guess, "INVALID_GUESS");
  assertSong(target, "INVALID_TARGET");

  const guessReleaseDate = readReleaseDate(guess);
  const targetReleaseDate = readReleaseDate(target);
  const guessDuration = readDuration(guess);
  const targetDuration = readDuration(target);
  const guessFavoriteCount = readFavoriteCount(guess);
  const targetFavoriteCount = readFavoriteCount(target);
  const guessProject = readProject(guess);
  const targetProject = readProject(target);

  return {
    year: numericComparison(
      guessReleaseDate,
      targetReleaseDate,
      365 * 24 * 60 * 60 * 1000,
      formatReleaseDate(guessReleaseDate),
    ),
    duration: numericComparison(
      guessDuration,
      targetDuration,
      15,
      formatDuration(guessDuration),
    ),
    favoriteCount: favoriteCountComparison(
      guessFavoriteCount,
      targetFavoriteCount,
      readFavoriteCountDisplay(guess),
      readFavoriteCountDisplay(target),
    ),
    project: projectComparison(guessProject, targetProject),
    performance: equalityComparison(guess.performanceType ?? null, target.performanceType ?? null),
    originType: equalityComparison(readSongOriginType(guess), readSongOriginType(target)),
    featuredArtistGender: equalityComparison(
      readFeaturedArtistGender(guess),
      readFeaturedArtistGender(target),
    ),
    language: equalityComparison(readLanguage(guess), readLanguage(target)),
    credits: creditsComparison(guess.curleyCredits ?? null, target.curleyCredits ?? null),
  };
}

function numericComparison(
  guess: number | null,
  target: number | null,
  nearThreshold: number,
  value: unknown,
): ComparisonCell {
  if (guess === null || target === null) {
    return cell(value, COMPARISON_STATUS.UNKNOWN, null);
  }

  const difference = target - guess;
  const status = difference === 0
    ? COMPARISON_STATUS.MATCH
    : Math.abs(difference) <= nearThreshold
      ? COMPARISON_STATUS.NEAR
      : COMPARISON_STATUS.MISS;

  return cell(value, status, directionFor(difference));
}

function favoriteCountComparison(
  guess: number | null,
  target: number | null,
  displayValue: string | null,
  targetDisplayValue: string | null,
): ComparisonCell {
  const value = guess === null ? PENDING_VERIFICATION : displayValue ?? formatFavoriteCount(guess);
  const guessComparable = parseFavoriteCountDisplay(displayValue) ?? guess;
  const targetComparable = parseFavoriteCountDisplay(targetDisplayValue) ?? target;
  if (guessComparable === null || targetComparable === null) {
    return cell(value, COMPARISON_STATUS.UNKNOWN, null);
  }

  const difference = targetComparable - guessComparable;
  const scale = Math.max(Math.abs(targetComparable), Math.abs(guessComparable), 1);
  const status = difference === 0
    ? COMPARISON_STATUS.MATCH
    : Math.abs(difference) / scale <= 0.2
      ? COMPARISON_STATUS.NEAR
      : COMPARISON_STATUS.MISS;
  return cell(value, status, directionFor(difference));
}

function projectComparison(guess: ComparableProject, target: ComparableProject): ComparisonCell {
  const value = guess.display ?? guess.title ?? PENDING_VERIFICATION;
  if (guess.title === null || target.title === null || guess.category === null || target.category === null) {
    return cell(value, COMPARISON_STATUS.UNKNOWN, null);
  }
  if (isAlbumFamily(guess) && isAlbumFamily(target) && guess.type !== target.type) {
    return cell(value, COMPARISON_STATUS.PARTIAL, null);
  }
  if (guess.category === "album" && target.category === "album") {
    return cell(
      value,
      normalizedMetadataValue(guess.title) === normalizedMetadataValue(target.title)
        ? COMPARISON_STATUS.MATCH
        : COMPARISON_STATUS.MISS,
      null,
    );
  }
  if (guess.category === target.category) {
    return cell(value, COMPARISON_STATUS.MATCH, null);
  }
  if (isOstCategory(guess.category) && isOstCategory(target.category)) {
    return cell(value, COMPARISON_STATUS.PARTIAL, null);
  }
  return cell(value, COMPARISON_STATUS.MISS, null);
}

function equalityComparison(guess: unknown, target: unknown): ComparisonCell {
  const value = guess ?? PENDING_VERIFICATION;
  if (guess === null || target === null) {
    return cell(value, COMPARISON_STATUS.UNKNOWN, null);
  }
  const status = normalizedMetadataValue(guess) === normalizedMetadataValue(target)
    ? COMPARISON_STATUS.MATCH
    : COMPARISON_STATUS.MISS;
  return cell(value, status, null);
}

function creditsComparison(guess: unknown, target: unknown): ComparisonCell {
  const value = displayCredits(guess);
  if (!isPlainObject(guess) || !isPlainObject(target)) {
    return cell(value, COMPARISON_STATUS.UNKNOWN, null);
  }

  const keys = ["lyrics", "composition"];
  const hasExpectedShape = (credits: Record<string, unknown>) => (
    Object.keys(credits).length === keys.length
    && keys.every((key) => typeof credits[key] === "boolean")
  );
  if (!hasExpectedShape(guess) || !hasExpectedShape(target)) {
    return cell(value, COMPARISON_STATUS.UNKNOWN, null);
  }

  const exactMatch = keys.every((key) => guess[key] === target[key]);
  const bothParticipate = (
    (guess.lyrics || guess.composition)
    && (target.lyrics || target.composition)
  );
  const guessIsSubset = (
    (!guess.lyrics || target.lyrics)
    && (!guess.composition || target.composition)
  );
  const targetIsSubset = (
    (!target.lyrics || guess.lyrics)
    && (!target.composition || guess.composition)
  );
  const status = exactMatch
    ? COMPARISON_STATUS.MATCH
    : bothParticipate && (guessIsSubset || targetIsSubset)
      ? COMPARISON_STATUS.PARTIAL
      : COMPARISON_STATUS.MISS;
  return cell(value, status, null);
}

function displayCredits(credits: unknown): string | Record<string, unknown> {
  if (!isPlainObject(credits)) return PENDING_VERIFICATION;
  return Object.fromEntries(
    Object.entries(credits).map(([key, value]) => [key, value ?? PENDING_VERIFICATION]),
  );
}

function readDuration(song: EngineSong): number | null {
  return toFiniteNumber(song.durationSec ?? song.durationSeconds ?? song.duration);
}

function readFavoriteCount(song: EngineSong): number | null {
  return toFiniteNumber(song.favoriteCount);
}

function readFavoriteCountDisplay(song: EngineSong): string | null {
  return typeof song.favoriteCountDisplay === "string" && song.favoriteCountDisplay.trim()
    ? song.favoriteCountDisplay.trim()
    : null;
}

function readReleaseDate(song: EngineSong): number | null {
  const exactDate = toReleaseTimestamp(song.releaseDate);
  if (exactDate !== null) return exactDate;
  const year = toFiniteNumber(song.releaseYear ?? song.year);
  return year === null ? null : Date.UTC(Math.trunc(year), 0, 1);
}

function readProject(song: EngineSong): ComparableProject {
  if (typeof song.project === "string") {
    const project = {
      title: song.project,
      type: typeof song.projectType === "string" ? song.projectType : null,
    };
    return {
      ...project,
      category: getProjectCategory(project),
      display: getProjectDisplay(project),
    };
  }
  if (!isPlainObject(song.project)) {
    return {
      title: null,
      type: typeof song.projectType === "string" ? song.projectType : null,
      category: null,
      display: PENDING_VERIFICATION,
    };
  }
  const rawTitle = song.project.title ?? song.project.name;
  const project = {
    title: typeof rawTitle === "string" ? rawTitle : null,
    type: typeof song.project.type === "string"
      ? song.project.type
      : typeof song.projectType === "string" ? song.projectType : null,
    category: song.project.category ?? null,
  };
  return {
    ...project,
    category: project.title === null ? null : getProjectCategory(project),
    display: project.title === null ? PENDING_VERIFICATION : getProjectDisplay(project),
  };
}

function isOstCategory(category: ProjectCategory | null): boolean {
  return category === "film" || category === "game";
}

function isAlbumFamily(project: ComparableProject): boolean {
  return project.category === "album"
    && project.type !== null
    && ["album", "ep"].includes(project.type);
}

function readLanguage(song: EngineSong): string | null {
  return readNormalizedString(song.language);
}

function readFeaturedArtistGender(song: EngineSong): string | null {
  return readNormalizedString(song.featuredArtistGender);
}

function readSongOriginType(song: EngineSong): string | null {
  return readNormalizedString(song.originType);
}

function readNormalizedString(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim().toLowerCase() : null;
}

function cell<T>(value: T, status: ComparisonStatus, direction: ComparisonDirection): ComparisonCell<T> {
  return { value, status, direction };
}

function directionFor(difference: number): ComparisonDirection {
  if (difference > 0) return "up";
  if (difference < 0) return "down";
  return null;
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}
