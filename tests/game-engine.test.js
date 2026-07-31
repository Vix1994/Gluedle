import test from "node:test";
import assert from "node:assert/strict";

import {
  COMPARISON_STATUS,
  MAX_ATTEMPTS,
  compareSongs,
  createInitialState,
  findSongMatches,
  formatDuration,
  normalizeSearchText,
  restoreGameState,
  selectDailyAnswer,
  serializeGameState,
  submitGuess,
} from "../src/game/engine.js";

function song(overrides = {}) {
  return {
    id: "target",
    title: "目标歌",
    aliases: ["Target Song"],
    releaseYear: 2024,
    durationSec: 210,
    project: { title: "Project A", type: "album" },
    languages: ["中文", "English"],
    isLive: false,
    performanceType: "solo",
    curleyCredits: { lyrics: true, composition: true },
    ...overrides,
  };
}

const catalog = [
  song(),
  song({
    id: "one",
    title: "First Light",
    aliases: ["第一束光", "Light No. 1"],
    releaseYear: 2022,
    durationSec: 195,
    project: { title: "Project B", type: "album" },
    languages: ["English"],
    curleyCredits: { lyrics: true, composition: false },
  }),
  song({
    id: "two",
    title: "Second Wind",
    aliases: ["第二阵风"],
    releaseYear: 2019,
    durationSec: 250,
    project: { title: "Single Two", type: "single" },
    languages: ["日本語"],
    performanceType: "duet",
    curleyCredits: { lyrics: false, composition: false },
  }),
  song({ id: "three", title: "Third", aliases: [] }),
  song({ id: "four", title: "Fourth", aliases: [] }),
  song({ id: "five", title: "Fifth", aliases: [] }),
  song({ id: "six", title: "Sixth", aliases: [] }),
];

test("normalizeSearchText normalizes case, width, whitespace, and Chinese/English punctuation", () => {
  assert.equal(normalizeSearchText("  Ｆｉｒｓｔ， LIGHT！ "), "firstlight");
  assert.equal(normalizeSearchText("你 好，世界！"), "你好世界");
  assert.equal(normalizeSearchText(null), "");
});

test("formatDuration renders minutes and zero-padded seconds", () => {
  assert.equal(formatDuration(125), "02:05");
  assert.equal(formatDuration(228), "03:48");
  assert.equal(formatDuration(null), "待核验");
});

test("findSongMatches searches aliases, normalizes queries, ranks title matches, and limits results", () => {
  assert.deepEqual(findSongMatches(" 第一 束光！ ", catalog).map(({ id }) => id), ["one"]);
  assert.deepEqual(findSongMatches("light", catalog).map(({ id }) => id), ["one"]);
  assert.deepEqual(findSongMatches("t", catalog, 2).map(({ id }) => id), ["three", "target"]);
  assert.deepEqual(findSongMatches("   ", catalog), []);
});

test("selectDailyAnswer is deterministic for a day and independent of catalog order", () => {
  const date = new Date("2026-08-01T18:30:00.000Z");
  const first = selectDailyAnswer(catalog, date);
  const second = selectDailyAnswer([...catalog].reverse(), date);
  assert.equal(first.id, second.id);
  assert.equal(selectDailyAnswer(catalog, date), first);
  assert.throws(() => selectDailyAnswer([], date), { code: "EMPTY_CATALOG" });
});

test("canonical metadata fields take precedence while legacy fields remain supported", () => {
  const canonicalGuess = song({
    id: "canonical-id",
    songId: "legacy-id",
    releaseYear: 2022,
    year: 1990,
    durationSec: 195,
    durationSeconds: 20,
  });
  const comparison = compareSongs(canonicalGuess, song());
  assert.deepEqual(comparison.year, { value: 2022, status: "near", direction: "up" });
  assert.deepEqual(comparison.duration, { value: "03:15", status: "near", direction: "up" });

  const submitted = submitGuess(createInitialState("target"), "canonical-id", [song(), canonicalGuess]);
  assert.equal(submitted.attempts[0].songId, "canonical-id");
  assert.throws(
    () => submitGuess(createInitialState("target"), "legacy-id", [song(), canonicalGuess]),
    { code: "UNKNOWN_SONG" },
  );

  const legacySong = song({ id: undefined, songId: "legacy-only", releaseYear: undefined, year: 2023 });
  assert.equal(selectDailyAnswer([legacySong], new Date("2026-08-01")).songId, "legacy-only");
  assert.equal(compareSongs(legacySong, song()).year.value, 2023);
});

test("compareSongs applies year and duration match/near/miss thresholds and directions", () => {
  const exact = compareSongs(song(), song());
  assert.deepEqual(exact.year, { value: 2024, status: "match", direction: null });
  assert.deepEqual(exact.duration, { value: "03:30", status: "match", direction: null });

  const nearUp = compareSongs(song({ releaseYear: 2022, durationSec: 195 }), song());
  assert.deepEqual(nearUp.year, { value: 2022, status: "near", direction: "up" });
  assert.deepEqual(nearUp.duration, { value: "03:15", status: "near", direction: "up" });

  const missDown = compareSongs(song({ releaseYear: 2027, durationSec: 226 }), song());
  assert.deepEqual(missDown.year, { value: 2027, status: "miss", direction: "down" });
  assert.deepEqual(missDown.duration, { value: "03:46", status: "miss", direction: "down" });
});

test("compareSongs applies project, language, live, performance, and credits rules", () => {
  const comparison = compareSongs(
    song({
      project: { title: "Other Album", type: "album" },
      languages: ["English", "Français"],
      isLive: true,
      performanceType: "duet",
      curleyCredits: { lyrics: true, composition: false },
    }),
    song(),
  );

  assert.deepEqual(comparison.project, {
    value: "Other Album",
    status: COMPARISON_STATUS.PARTIAL,
    direction: null,
  });
  assert.deepEqual(comparison.language, {
    value: ["English", "Français"],
    status: COMPARISON_STATUS.PARTIAL,
    direction: null,
  });
  assert.deepEqual(comparison.live, {
    value: true,
    status: COMPARISON_STATUS.MISS,
    direction: null,
  });
  assert.equal(comparison.performance.status, COMPARISON_STATUS.MISS);
  assert.equal(comparison.credits.status, COMPARISON_STATUS.PARTIAL);

  const misses = compareSongs(
    song({
      project: { title: "Single", type: "single" },
      languages: ["日本語"],
      curleyCredits: { lyrics: false, composition: false },
    }),
    song(),
  );
  assert.equal(misses.project.status, COMPARISON_STATUS.MISS);
  assert.equal(misses.language.status, COMPARISON_STATUS.MISS);
  assert.equal(misses.credits.status, COMPARISON_STATUS.MISS);

  const reorderedLanguages = compareSongs(song({ languages: ["English", "中文"] }), song());
  assert.equal(reorderedLanguages.language.status, COMPARISON_STATUS.MATCH);

  const unknownLive = compareSongs(song({ isLive: null }), song());
  assert.deepEqual(unknownLive.live, {
    value: "待核验",
    status: COMPARISON_STATUS.UNKNOWN,
    direction: null,
  });
});

test("null credits remain unknown and display pending verification instead of false", () => {
  const oneUnknown = compareSongs(
    song({ curleyCredits: { lyrics: null, composition: false } }),
    song({ curleyCredits: { lyrics: false, composition: false } }),
  );
  assert.equal(oneUnknown.credits.status, COMPARISON_STATUS.UNKNOWN);
  assert.deepEqual(oneUnknown.credits.value, { lyrics: "待核验", composition: false });

  const allUnknown = compareSongs(song({ curleyCredits: null }), song());
  assert.deepEqual(allUnknown.credits, {
    value: "待核验",
    status: COMPARISON_STATUS.UNKNOWN,
    direction: null,
  });
});

test("submitGuess updates state immutably and wins immediately", () => {
  const initial = createInitialState("target");
  const originalSnapshot = structuredClone(initial);
  const afterMiss = submitGuess(initial, "one", catalog);
  const won = submitGuess(afterMiss, "target", catalog);

  assert.deepEqual(initial, originalSnapshot);
  assert.notEqual(afterMiss, initial);
  assert.notEqual(afterMiss.attempts, initial.attempts);
  assert.equal(afterMiss.status, "playing");
  assert.equal(afterMiss.attempts[0].songId, "one");
  assert.equal(won.status, "won");
  assert.equal(won.attempts.length, 2);
  assert.equal(won.maxAttempts, MAX_ATTEMPTS);
});

test("the sixth incorrect guess loses", () => {
  let state = createInitialState("target");
  for (const guessId of ["one", "two", "three", "four", "five", "six"]) {
    state = submitGuess(state, guessId, catalog);
  }
  assert.equal(state.status, "lost");
  assert.equal(state.attempts.length, 6);
});

test("invalid, duplicate, and post-game submissions throw stable errors without mutation", () => {
  const initial = createInitialState("target");
  assert.throws(() => submitGuess(initial, "missing", catalog), { code: "UNKNOWN_SONG" });
  assert.deepEqual(initial, createInitialState("target"));

  const once = submitGuess(initial, "one", catalog);
  const onceSnapshot = structuredClone(once);
  assert.throws(() => submitGuess(once, "one", catalog), { code: "DUPLICATE_GUESS" });
  assert.deepEqual(once, onceSnapshot);

  const won = submitGuess(once, "target", catalog);
  const wonSnapshot = structuredClone(won);
  assert.throws(() => submitGuess(won, "two", catalog), { code: "GAME_OVER" });
  assert.deepEqual(won, wonSnapshot);
});

test("serializeGameState and restoreGameState rebuild valid immutable progress", () => {
  const state = submitGuess(createInitialState("target"), "one", catalog);
  const raw = serializeGameState(state);
  const restored = restoreGameState(raw, "target", catalog);

  assert.deepEqual(restored, state);
  assert.notEqual(restored, state);
  assert.notEqual(restored.attempts, state.attempts);
});

test("restoreGameState falls back for malformed, stale, unknown, or inconsistent data", () => {
  const fallback = createInitialState("target");
  assert.deepEqual(restoreGameState("not json", "target", catalog), fallback);
  assert.deepEqual(
    restoreGameState(JSON.stringify({ ...fallback, answerId: "old-answer" }), "target", catalog),
    fallback,
  );
  assert.deepEqual(
    restoreGameState(
      JSON.stringify({
        ...fallback,
        attempts: [{ songId: "missing", comparison: {} }],
      }),
      "target",
      catalog,
    ),
    fallback,
  );
  assert.deepEqual(
    restoreGameState(
      JSON.stringify({
        ...fallback,
        status: "won",
        attempts: [{ songId: "one", comparison: {} }],
      }),
      "target",
      catalog,
    ),
    fallback,
  );
});
