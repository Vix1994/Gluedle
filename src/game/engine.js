export const MAX_ATTEMPTS = 6;

export const COMPARISON_STATUS = Object.freeze({
  MATCH: "match",
  NEAR: "near",
  PARTIAL: "partial",
  MISS: "miss",
  UNKNOWN: "unknown",
});

const GAME_STATE_VERSION = 1;
const PENDING_VERIFICATION = "待核验";
const VALID_GAME_STATUSES = new Set(["playing", "won", "lost"]);

export class GameEngineError extends Error {
  constructor(code, message) {
    super(message);
    this.name = "GameEngineError";
    this.code = code;
  }
}

export function normalizeSearchText(value) {
  if (value === null || value === undefined) {
    return "";
  }

  return String(value)
    .normalize("NFKC")
    .toLocaleLowerCase("und")
    .replace(/[\p{P}\p{S}\s]+/gu, "");
}

export function formatDuration(seconds) {
  const duration = toFiniteNumber(seconds);
  if (duration === null || duration < 0) {
    return PENDING_VERIFICATION;
  }

  const rounded = Math.round(duration);
  const minutes = String(Math.floor(rounded / 60)).padStart(2, "0");
  const remainder = String(rounded % 60).padStart(2, "0");
  return `${minutes}:${remainder}`;
}

export function findSongMatches(query, catalog, limit = 8) {
  const normalizedQuery = normalizeSearchText(query);
  const resultLimit = Number.isFinite(Number(limit))
    ? Math.max(0, Math.floor(Number(limit)))
    : 8;

  if (!normalizedQuery || resultLimit === 0 || !Array.isArray(catalog)) {
    return [];
  }

  return catalog
    .map((song, index) => ({ song, index, rank: searchRank(song, normalizedQuery) }))
    .filter(({ rank }) => rank !== null)
    .sort((left, right) => left.rank - right.rank || left.index - right.index)
    .slice(0, resultLimit)
    .map(({ song }) => song);
}

export function selectDailyAnswer(catalog, date = new Date()) {
  const songs = validateCatalog(catalog);
  if (songs.length === 0) {
    throw new GameEngineError("EMPTY_CATALOG", "Cannot select an answer from an empty catalog.");
  }

  const day = toDayKey(date);
  const orderedSongs = [...songs].sort((left, right) =>
    readSongId(left).localeCompare(readSongId(right), "en"),
  );
  return orderedSongs[stableHash(day) % orderedSongs.length];
}

export function compareSongs(guess, target) {
  assertSong(guess, "INVALID_GUESS");
  assertSong(target, "INVALID_TARGET");

  const guessYear = readReleaseYear(guess);
  const targetYear = readReleaseYear(target);
  const guessDuration = readDuration(guess);
  const targetDuration = readDuration(target);
  const guessProject = readProject(guess);
  const targetProject = readProject(target);
  const guessLanguages = readLanguages(guess);
  const targetLanguages = readLanguages(target);
  const guessPerformance = guess.performanceType ?? null;
  const targetPerformance = target.performanceType ?? null;

  return {
    year: numericComparison(guessYear, targetYear, 2, guessYear ?? PENDING_VERIFICATION),
    duration: numericComparison(
      guessDuration,
      targetDuration,
      15,
      formatDuration(guessDuration),
    ),
    project: projectComparison(guessProject, targetProject),
    language: languageComparison(guessLanguages, targetLanguages),
    performance: equalityComparison(guessPerformance, targetPerformance),
    credits: creditsComparison(guess.curleyCredits ?? null, target.curleyCredits ?? null),
  };
}

export function createInitialState(answerId) {
  if (typeof answerId !== "string" || answerId.trim() === "") {
    throw new GameEngineError("INVALID_ANSWER_ID", "answerId must be a non-empty string.");
  }

  return {
    version: GAME_STATE_VERSION,
    answerId,
    status: "playing",
    attempts: [],
    maxAttempts: MAX_ATTEMPTS,
  };
}

export function submitGuess(state, guessId, catalog) {
  assertStateShape(state);

  if (state.status !== "playing") {
    throw new GameEngineError("GAME_OVER", "No guesses can be submitted after the game ends.");
  }
  if (typeof guessId !== "string" || guessId.trim() === "") {
    throw new GameEngineError("UNKNOWN_SONG", "The guessed song is not in the catalog.");
  }
  if (state.attempts.some((attempt) => attempt.songId === guessId)) {
    throw new GameEngineError("DUPLICATE_GUESS", "That song has already been guessed.");
  }

  const songs = validateCatalog(catalog);
  const guess = songs.find((song) => readSongId(song) === guessId);
  if (!guess) {
    throw new GameEngineError("UNKNOWN_SONG", "The guessed song is not in the catalog.");
  }

  const target = songs.find((song) => readSongId(song) === state.answerId);
  if (!target) {
    throw new GameEngineError("ANSWER_NOT_FOUND", "The answer is not in the catalog.");
  }

  const attempts = [
    ...state.attempts,
    {
      songId: readSongId(guess),
      comparison: compareSongs(guess, target),
    },
  ];
  const status = guessId === state.answerId
    ? "won"
    : attempts.length >= MAX_ATTEMPTS
      ? "lost"
      : "playing";

  return {
    version: GAME_STATE_VERSION,
    answerId: state.answerId,
    status,
    attempts,
    maxAttempts: MAX_ATTEMPTS,
  };
}

export function serializeGameState(state) {
  assertStateShape(state);
  return JSON.stringify(state);
}

export function restoreGameState(raw, answerId, catalog) {
  const fallback = createInitialState(answerId);

  try {
    const parsed = typeof raw === "string" ? JSON.parse(raw) : raw;
    if (!isRestorableState(parsed, answerId)) {
      return fallback;
    }

    let restored = fallback;
    for (const attempt of parsed.attempts) {
      restored = submitGuess(restored, attempt.songId, catalog);
    }

    return restored.status === parsed.status ? restored : fallback;
  } catch {
    return fallback;
  }
}

function searchRank(song, query) {
  if (!song || typeof song !== "object") {
    return null;
  }

  const title = normalizeSearchText(song.title);
  const aliases = Array.isArray(song.aliases)
    ? song.aliases.map(normalizeSearchText).filter(Boolean)
    : [];
  const candidates = [title, ...aliases].filter(Boolean);

  if (title === query) return 0;
  if (aliases.includes(query)) return 1;
  if (title.startsWith(query)) return 2;
  if (aliases.some((alias) => alias.startsWith(query))) return 3;
  if (title.includes(query)) return 4;
  if (candidates.some((candidate) => candidate.includes(query))) return 5;
  return null;
}

function numericComparison(guess, target, nearThreshold, value) {
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

function projectComparison(guess, target) {
  const value = guess.title ?? PENDING_VERIFICATION;
  if (guess.title === null || target.title === null) {
    return cell(value, COMPARISON_STATUS.UNKNOWN, null);
  }
  if (normalizedMetadataValue(guess.title) === normalizedMetadataValue(target.title)) {
    return cell(value, COMPARISON_STATUS.MATCH, null);
  }
  if (
    guess.type !== null
    && target.type !== null
    && normalizedMetadataValue(guess.type) === normalizedMetadataValue(target.type)
  ) {
    return cell(value, COMPARISON_STATUS.PARTIAL, null);
  }
  return cell(value, COMPARISON_STATUS.MISS, null);
}

function languageComparison(guess, target) {
  const value = guess === null ? PENDING_VERIFICATION : [...guess];
  if (guess === null || target === null) {
    return cell(value, COMPARISON_STATUS.UNKNOWN, null);
  }

  const guessSet = normalizedSet(guess);
  const targetSet = normalizedSet(target);
  const same = guessSet.size === targetSet.size
    && [...guessSet].every((language) => targetSet.has(language));
  if (same) {
    return cell(value, COMPARISON_STATUS.MATCH, null);
  }
  if ([...guessSet].some((language) => targetSet.has(language))) {
    return cell(value, COMPARISON_STATUS.PARTIAL, null);
  }
  return cell(value, COMPARISON_STATUS.MISS, null);
}

function equalityComparison(guess, target) {
  const value = guess ?? PENDING_VERIFICATION;
  if (guess === null || target === null) {
    return cell(value, COMPARISON_STATUS.UNKNOWN, null);
  }
  const status = normalizedMetadataValue(guess) === normalizedMetadataValue(target)
    ? COMPARISON_STATUS.MATCH
    : COMPARISON_STATUS.MISS;
  return cell(value, status, null);
}

function creditsComparison(guess, target) {
  const value = displayCredits(guess);
  if (!isPlainObject(guess) || !isPlainObject(target)) {
    return cell(value, COMPARISON_STATUS.UNKNOWN, null);
  }

  const keys = [...new Set([...Object.keys(guess), ...Object.keys(target)])].sort();
  if (
    keys.length !== 2
    || keys.some((key) => guess[key] === null || guess[key] === undefined)
    || keys.some((key) => target[key] === null || target[key] === undefined)
  ) {
    return cell(value, COMPARISON_STATUS.UNKNOWN, null);
  }

  const matchingFields = keys.filter((key) => Object.is(guess[key], target[key])).length;
  const status = matchingFields === 2
    ? COMPARISON_STATUS.MATCH
    : matchingFields === 1
      ? COMPARISON_STATUS.PARTIAL
      : COMPARISON_STATUS.MISS;
  return cell(value, status, null);
}

function displayCredits(credits) {
  if (!isPlainObject(credits)) {
    return PENDING_VERIFICATION;
  }

  return Object.fromEntries(
    Object.entries(credits).map(([key, value]) => [key, value ?? PENDING_VERIFICATION]),
  );
}

function readDuration(song) {
  return toFiniteNumber(song.durationSec ?? song.durationSeconds ?? song.duration);
}

function readReleaseYear(song) {
  return toFiniteNumber(song.releaseYear ?? song.year);
}

function readSongId(song) {
  return song.id ?? song.songId;
}

function readProject(song) {
  if (typeof song.project === "string") {
    return { title: song.project, type: song.projectType ?? null };
  }
  if (!isPlainObject(song.project)) {
    return { title: null, type: song.projectType ?? null };
  }
  return {
    title: song.project.title ?? song.project.name ?? null,
    type: song.project.type ?? song.projectType ?? null,
  };
}

function readLanguages(song) {
  if (!Array.isArray(song.languages)) {
    return null;
  }
  return song.languages.filter((language) => language !== null && language !== undefined);
}

function normalizedSet(values) {
  return new Set(values.map(normalizedMetadataValue));
}

function normalizedMetadataValue(value) {
  return String(value).normalize("NFKC").trim().toLocaleLowerCase("und");
}

function cell(value, status, direction) {
  return { value, status, direction };
}

function directionFor(difference) {
  if (difference > 0) return "up";
  if (difference < 0) return "down";
  return null;
}

function toFiniteNumber(value) {
  if (value === null || value === undefined || value === "") {
    return null;
  }
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

function toDayKey(value) {
  const date = value instanceof Date ? new Date(value.getTime()) : new Date(value);
  if (Number.isNaN(date.getTime())) {
    throw new GameEngineError("INVALID_DATE", "A valid date is required.");
  }
  return date.toISOString().slice(0, 10);
}

function stableHash(value) {
  let hash = 0x811c9dc5;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193);
  }
  return hash >>> 0;
}

function validateCatalog(catalog) {
  if (!Array.isArray(catalog)) {
    throw new GameEngineError("INVALID_CATALOG", "catalog must be an array.");
  }

  const seen = new Set();
  for (const song of catalog) {
    assertSong(song, "INVALID_CATALOG");
    const songId = readSongId(song);
    if (seen.has(songId)) {
      throw new GameEngineError("INVALID_CATALOG", "catalog song IDs must be unique.");
    }
    seen.add(songId);
  }
  return catalog;
}

function assertSong(song, code) {
  const songId = song && typeof song === "object" ? readSongId(song) : null;
  if (typeof songId !== "string" || !songId) {
    throw new GameEngineError(code, "A song must have a non-empty id.");
  }
}

function assertStateShape(state) {
  if (
    !state
    || typeof state !== "object"
    || state.version !== GAME_STATE_VERSION
    || typeof state.answerId !== "string"
    || !VALID_GAME_STATUSES.has(state.status)
    || !Array.isArray(state.attempts)
    || state.maxAttempts !== MAX_ATTEMPTS
    || state.attempts.length > MAX_ATTEMPTS
    || state.attempts.some(
      (attempt) => !attempt || typeof attempt !== "object" || typeof attempt.songId !== "string",
    )
  ) {
    throw new GameEngineError("INVALID_STATE", "The game state is invalid.");
  }
}

function isRestorableState(state, answerId) {
  try {
    assertStateShape(state);
  } catch {
    return false;
  }

  return state.answerId === answerId
    && state.attempts.every((attempt) => attempt.comparison && typeof attempt.comparison === "object");
}

function isPlainObject(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}
