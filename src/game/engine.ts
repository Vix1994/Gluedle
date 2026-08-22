/**
 * Stable public surface for the game domain.
 *
 * Keep feature modules importing this barrel so the engine can evolve without
 * coupling UI code to its internal file layout.
 */
export { COMPARISON_STATUS, compareSongs } from "./comparison.ts";
export { GameEngineError } from "./errors.ts";
export {
  formatDuration,
  formatFavoriteCount,
  formatReleaseDate,
  formatSongTitleLength,
  getSongTitleLength,
  normalizeSearchText,
} from "./formatters.ts";
export { HINT_UNLOCK_ATTEMPTS, getHintStatus, getHintUnlockCount } from "./hints.ts";
export { findSongMatches, selectRandomAnswer } from "./search.ts";
export {
  MAX_ATTEMPTS,
  createInitialState,
  restoreGameState,
  serializeGameState,
  submitGuess,
} from "./state.ts";
