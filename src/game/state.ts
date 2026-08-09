import type { GameAttempt, GameState, SongComparison } from "../types.ts";
import { compareSongs } from "./comparison.ts";
import { GameEngineError } from "./errors.ts";
import { readSongId, validateCatalog } from "./song-compat.ts";

export const MAX_ATTEMPTS = 8;

const GAME_STATE_VERSION = 1;
const VALID_GAME_STATUSES: ReadonlySet<unknown> = new Set(["playing", "won", "lost"]);
const VALID_COMPARISON_STATUSES: ReadonlySet<unknown> = new Set([
  "match",
  "near",
  "partial",
  "miss",
  "unknown",
]);
const VALID_COMPARISON_DIRECTIONS: ReadonlySet<unknown> = new Set(["up", "down", null]);
const COMPARISON_FIELDS = [
  "year",
  "duration",
  "favoriteCount",
  "project",
  "performance",
  "originType",
  "featuredArtistGender",
  "language",
  "credits",
] as const satisfies readonly (keyof SongComparison)[];

export function createInitialState(answerId: unknown): GameState {
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

export function submitGuess(state: unknown, guessId: unknown, catalog: unknown): GameState {
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
      songId: readSongId(guess)!,
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

export function serializeGameState(state: unknown): string {
  assertStateShape(state);
  return JSON.stringify(state);
}

export function restoreGameState(raw: unknown, answerId: string, catalog: unknown): GameState {
  const fallback = createInitialState(answerId);

  try {
    const parsed = typeof raw === "string" ? JSON.parse(raw) : raw;
    if (!isRestorableState(parsed, answerId)) return fallback;

    let restored = fallback;
    for (const attempt of parsed.attempts) {
      restored = submitGuess(restored, attempt.songId, catalog);
    }

    return restored.status === parsed.status ? restored : fallback;
  } catch {
    return fallback;
  }
}

function assertStateShape(state: unknown): asserts state is GameState {
  if (
    !isRecord(state)
    || state.version !== GAME_STATE_VERSION
    || typeof state.answerId !== "string"
    || typeof state.status !== "string"
    || !VALID_GAME_STATUSES.has(state.status)
    || !Array.isArray(state.attempts)
    || state.maxAttempts !== MAX_ATTEMPTS
    || state.attempts.length > MAX_ATTEMPTS
    || state.attempts.some((attempt) => !isGameAttempt(attempt))
  ) {
    throw new GameEngineError("INVALID_STATE", "The game state is invalid.");
  }
}

function isGameAttempt(value: unknown): value is GameAttempt {
  return isRecord(value)
    && typeof value.songId === "string"
    && value.songId.trim() !== ""
    && isSongComparison(value.comparison);
}

function isSongComparison(value: unknown): value is SongComparison {
  return isRecord(value)
    && COMPARISON_FIELDS.every((field) => isComparisonCell(value[field]));
}

function isComparisonCell(value: unknown): boolean {
  return isRecord(value)
    && Object.hasOwn(value, "value")
    && VALID_COMPARISON_STATUSES.has(value.status)
    && VALID_COMPARISON_DIRECTIONS.has(value.direction);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function isRestorableState(state: unknown, answerId: string): state is GameState {
  try {
    assertStateShape(state);
  } catch {
    return false;
  }

  return state.answerId === answerId;
}
