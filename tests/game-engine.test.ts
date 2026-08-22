import test from "node:test";
import assert from "node:assert/strict";

import {
  COMPARISON_STATUS,
  HINT_UNLOCK_ATTEMPTS,
  MAX_ATTEMPTS,
  compareSongs,
  createInitialState,
  findSongMatches,
  formatDuration,
  formatFavoriteCount,
  formatReleaseDate,
  formatSongTitleLength,
  getHintStatus,
  getHintUnlockCount,
  getSongTitleLength,
  normalizeSearchText,
  restoreGameState,
  selectRandomAnswer,
  serializeGameState,
  submitGuess,
} from "../src/game/engine.ts";

function song(overrides = {}) {
  return {
    id: "target",
    title: "目标歌",
    aliases: ["Target Song"],
    releaseYear: 2024,
    durationSec: 210,
    project: { title: "Project A", type: "album" },
    language: "zh",
    performanceType: "solo",
    originType: "original",
    featuredArtistGender: "none",
    favoriteCount: 10000,
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
    curleyCredits: { lyrics: true, composition: false },
  }),
  song({
    id: "two",
    title: "Second Wind",
    aliases: ["第二阵风"],
    releaseYear: 2019,
    durationSec: 250,
    project: { title: "Single Two", type: "single" },
    performanceType: "duet",
    curleyCredits: { lyrics: false, composition: false },
  }),
  song({ id: "three", title: "Third", aliases: [] }),
  song({ id: "four", title: "Fourth", aliases: [] }),
  song({ id: "five", title: "Fifth", aliases: [] }),
  song({ id: "six", title: "Sixth", aliases: [] }),
  song({ id: "seven", title: "Seventh", aliases: [] }),
  song({ id: "eight", title: "Eighth", aliases: [] }),
];

test("normalizeSearchText normalizes case, width, whitespace, and Chinese/English punctuation", () => {
  assert.equal(normalizeSearchText("  Ｆｉｒｓｔ， LIGHT！ "), "firstlight");
  assert.equal(normalizeSearchText("你 好，世界！"), "你好世界");
  assert.equal(normalizeSearchText(null), "");
});

test("lyric hints unlock in three deliberate steps without changing game attempts", () => {
  assert.deepEqual(HINT_UNLOCK_ATTEMPTS, [3, 5, 7]);
  assert.equal(getHintUnlockCount(0), 0);
  assert.equal(getHintUnlockCount(2), 0);
  assert.equal(getHintUnlockCount(3), 1);
  assert.equal(getHintUnlockCount(5), 2);
  assert.equal(getHintUnlockCount(7), 3);

  assert.deepEqual(getHintStatus({ attemptCount: 1, hintCount: 3 }), {
    unlockedCount: 0,
    nextHintIndex: -1,
    nextUnlockAttempt: 3,
    attemptsUntilNext: 2,
    hasAvailableHint: false,
    hasMoreHints: true,
  });
  assert.deepEqual(getHintStatus({ attemptCount: 3, hintCount: 3 }), {
    unlockedCount: 1,
    nextHintIndex: 0,
    nextUnlockAttempt: 3,
    attemptsUntilNext: 0,
    hasAvailableHint: true,
    hasMoreHints: true,
  });
  assert.deepEqual(getHintStatus({ attemptCount: 7, revealedHintCount: 2, hintCount: 3 }), {
    unlockedCount: 3,
    nextHintIndex: 2,
    nextUnlockAttempt: 7,
    attemptsUntilNext: 0,
    hasAvailableHint: true,
    hasMoreHints: true,
  });
  assert.equal(getHintStatus({ attemptCount: 8, revealedHintCount: 3, hintCount: 3 }).hasMoreHints, false);
});

test("song title length uses one neutral unit and ignores trailing annotations", () => {
  assert.equal(getSongTitleLength("这，就是爱"), 4);
  assert.equal(getSongTitleLength("Don't Wanna Be Alone"), 4);
  assert.equal(getSongTitleLength("烬火 Emberfire"), 3);
  assert.equal(getSongTitleLength("04:16"), 4);
  assert.equal(getSongTitleLength("造物 (Live)"), 2);
  assert.equal(getSongTitleLength("Someone You Loved (Live)"), 3);
  assert.equal(getSongTitleLength("Shine Brighter (愈加璀璨)"), 2);
  assert.equal(getSongTitleLength("BABYDOLL (Speed) (希林娜依·高 Remix|Explicit)"), 1);
  assert.equal(formatSongTitleLength("造物 (Live)"), "歌名长度 · 02");
});

test("formatDuration renders minutes and zero-padded seconds", () => {
  assert.equal(formatDuration(125), "02:05");
  assert.equal(formatDuration(228), "03:48");
  assert.equal(formatDuration(null), "待核验");
});

test("formatFavoriteCount renders QQ Music collection snapshots", () => {
  assert.equal(formatFavoriteCount(9999), "9,999");
  assert.equal(formatFavoriteCount(10001), "1万+");
  assert.equal(formatFavoriteCount(750000), "75万+");
  assert.equal(formatFavoriteCount(null), "待核验");
});

test("formatReleaseDate renders and validates day-precision dates", () => {
  assert.equal(formatReleaseDate("2024-03-18"), "2024-03-18");
  assert.equal(formatReleaseDate(Date.UTC(2023, 4, 31)), "2023-05-31");
  assert.equal(formatReleaseDate("2024-02-31"), "待核验");
});

test("findSongMatches searches aliases, normalizes queries, ranks title matches, and limits results", () => {
  assert.deepEqual(findSongMatches(" 第一 束光！ ", catalog).map(({ id }) => id), ["one"]);
  assert.deepEqual(findSongMatches("light", catalog).map(({ id }) => id), ["one"]);
  assert.deepEqual(findSongMatches("t", catalog, 2).map(({ id }) => id), ["three", "target"]);
  assert.deepEqual(findSongMatches("   ", catalog), []);
});

test("selectRandomAnswer maps a valid random value across the whole catalog", () => {
  assert.equal(selectRandomAnswer(catalog, () => 0).id, "target");
  assert.equal(selectRandomAnswer(catalog, () => 0.999999).id, "eight");
  assert.equal(selectRandomAnswer(catalog, () => 2 / catalog.length).id, "two");
  assert.throws(() => selectRandomAnswer([], () => 0), { code: "EMPTY_CATALOG" });
  assert.throws(() => selectRandomAnswer(catalog, () => 1), { code: "INVALID_RANDOM" });
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
  assert.deepEqual(comparison.year, { value: "2022-01-01", status: "miss", direction: "up" });
  assert.deepEqual(comparison.duration, { value: "03:15", status: "near", direction: "up" });

  const submitted = submitGuess(createInitialState("target"), "canonical-id", [song(), canonicalGuess]);
  assert.equal(submitted.attempts[0].songId, "canonical-id");
  assert.throws(
    () => submitGuess(createInitialState("target"), "legacy-id", [song(), canonicalGuess]),
    { code: "UNKNOWN_SONG" },
  );

  const legacySong = song({ id: undefined, songId: "legacy-only", releaseYear: undefined, year: 2023 });
  assert.equal(selectRandomAnswer([legacySong], () => 0).songId, "legacy-only");
  assert.equal(compareSongs(legacySong, song()).year.value, "2023-01-01");
});

test("compareSongs applies day-precision release-date and duration thresholds", () => {
  const exact = compareSongs(song(), song());
  assert.deepEqual(exact.year, { value: "2024-01-01", status: "match", direction: null });
  assert.deepEqual(exact.duration, { value: "03:30", status: "match", direction: null });

  const nearUp = compareSongs(
    song({ releaseDate: "2024-03-01", durationSec: 195 }),
    song({ releaseDate: "2024-06-15" }),
  );
  assert.deepEqual(nearUp.year, { value: "2024-03-01", status: "near", direction: "up" });
  assert.deepEqual(nearUp.duration, { value: "03:15", status: "near", direction: "up" });

  const missDown = compareSongs(
    song({ releaseDate: "2026-08-01", durationSec: 226 }),
    song({ releaseDate: "2024-06-15" }),
  );
  assert.deepEqual(missDown.year, { value: "2026-08-01", status: "miss", direction: "down" });
  assert.deepEqual(missDown.duration, { value: "03:46", status: "miss", direction: "down" });
});

test("compareSongs compares favorite counts by relative distance", () => {
  const near = compareSongs(
    song({ favoriteCount: 100000 }),
    song({ favoriteCount: 110000 }),
  );
  assert.deepEqual(near.favoriteCount, {
    value: "10万+",
    status: COMPARISON_STATUS.NEAR,
    direction: "up",
  });

  const shown = compareSongs(
    song({ favoriteCount: 100000, favoriteCountDisplay: "7.5w+" }),
    song({ favoriteCount: 110000 }),
  );
  assert.equal(shown.favoriteCount.value, "7.5w+");

  const parsedDisplays = compareSongs(
    song({ favoriteCount: 10001, favoriteCountDisplay: "5w+" }),
    song({ favoriteCount: 10001, favoriteCountDisplay: "2w+" }),
  );
  assert.deepEqual(parsedDisplays.favoriteCount, {
    value: "5w+",
    status: COMPARISON_STATUS.MISS,
    direction: "down",
  });

  const miss = compareSongs(
    song({ favoriteCount: 100000 }),
    song({ favoriteCount: 200000 }),
  );
  assert.deepEqual(miss.favoriteCount, {
    value: "10万+",
    status: COMPARISON_STATUS.MISS,
    direction: "up",
  });

  const unknown = compareSongs(
    song({ favoriteCount: null }),
    song({ favoriteCount: 200000 }),
  );
  assert.deepEqual(unknown.favoriteCount, {
    value: "待核验",
    status: COMPARISON_STATUS.UNKNOWN,
    direction: null,
  });
});

test("compareSongs applies project, performance, and credits rules", () => {
  const comparison = compareSongs(
    song({
      project: { title: "Other Album", type: "album" },
      performanceType: "duet",
      curleyCredits: { lyrics: true, composition: false },
    }),
    song(),
  );

  assert.deepEqual(comparison.project, {
    value: "Other Album",
    status: COMPARISON_STATUS.MISS,
    direction: null,
  });
  assert.equal(comparison.performance.status, COMPARISON_STATUS.MISS);
  assert.equal(comparison.language.status, COMPARISON_STATUS.MATCH);
  assert.equal(comparison.credits.status, COMPARISON_STATUS.PARTIAL);

  const noParticipation = compareSongs(
    song({ curleyCredits: { lyrics: false, composition: false } }),
    song({ curleyCredits: { lyrics: true, composition: false } }),
  );
  assert.equal(noParticipation.credits.status, COMPARISON_STATUS.MISS);

  const differentParticipation = compareSongs(
    song({ curleyCredits: { lyrics: true, composition: false } }),
    song({ curleyCredits: { lyrics: false, composition: true } }),
  );
  assert.equal(differentParticipation.credits.status, COMPARISON_STATUS.MISS);

  const ostNear = compareSongs(
    song({ project: { title: "游戏原声", type: "ost", category: "game" } }),
    song({ project: { title: "影视原声", type: "ost", category: "film" } }),
  );
  assert.deepEqual(ostNear.project, {
    value: "游戏",
    status: COMPARISON_STATUS.PARTIAL,
    direction: null,
  });

  const misses = compareSongs(
    song({
      project: { title: "Single", type: "single" },
      curleyCredits: { lyrics: false, composition: false },
    }),
    song(),
  );
  assert.equal(misses.project.status, COMPARISON_STATUS.MISS);
  assert.equal(misses.credits.status, COMPARISON_STATUS.MISS);

});

test("compareSongs compares manually maintained song origin", () => {
  const match = compareSongs(
    song({ originType: "original" }),
    song({ originType: "original" }),
  );
  assert.deepEqual(match.originType, {
    value: "original",
    status: COMPARISON_STATUS.MATCH,
    direction: null,
  });

  const miss = compareSongs(
    song({ originType: "cover" }),
    song({ originType: "original" }),
  );
  assert.deepEqual(miss.originType, {
    value: "cover",
    status: COMPARISON_STATUS.MISS,
    direction: null,
  });

  const unknown = compareSongs(
    song({ originType: undefined }),
    song({ originType: "original" }),
  );
  assert.deepEqual(unknown.originType, {
    value: "待核验",
    status: COMPARISON_STATUS.UNKNOWN,
    direction: null,
  });
});

test("compareSongs compares lyric language as an exact metadata field", () => {
  const nonEnglish = compareSongs(
    song({ language: "zh" }),
    song({ language: "en" }),
  );
  assert.deepEqual(nonEnglish.language, {
    value: "zh",
    status: COMPARISON_STATUS.MISS,
    direction: null,
  });

  const missing = compareSongs(
    song({ language: undefined }),
    song({ language: "zh" }),
  );
  assert.deepEqual(missing.language, {
    value: "待核验",
    status: COMPARISON_STATUS.UNKNOWN,
    direction: null,
  });
});

test("compareSongs compares manually maintained featured artist gender", () => {
  const match = compareSongs(
    song({ featuredArtistGender: "female" }),
    song({ featuredArtistGender: "female" }),
  );
  assert.deepEqual(match.featuredArtistGender, {
    value: "female",
    status: COMPARISON_STATUS.MATCH,
    direction: null,
  });

  const miss = compareSongs(
    song({ featuredArtistGender: "male" }),
    song({ featuredArtistGender: "female" }),
  );
  assert.deepEqual(miss.featuredArtistGender, {
    value: "male",
    status: COMPARISON_STATUS.MISS,
    direction: null,
  });

  const unknown = compareSongs(
    song({ featuredArtistGender: undefined }),
    song({ featuredArtistGender: "female" }),
  );
  assert.deepEqual(unknown.featuredArtistGender, {
    value: "待核验",
    status: COMPARISON_STATUS.UNKNOWN,
    direction: null,
  });
});

test("independent singles share the same project value and match", () => {
  const target = song({ project: { title: "单曲", type: "single" } });
  const guess = song({ id: "another-single", project: { title: "单曲", type: "single" } });
  assert.deepEqual(compareSongs(guess, target).project, {
    value: "单曲",
    status: COMPARISON_STATUS.MATCH,
    direction: null,
  });
});

test("album names match exactly while shared project categories match", () => {
  const sameAlbum = compareSongs(
    song({ project: { title: "同一张专辑", type: "album" } }),
    song({ project: { title: "同一张专辑", type: "album" } }),
  );
  assert.deepEqual(sameAlbum.project, {
    value: "同一张专辑",
    status: COMPARISON_STATUS.MATCH,
    direction: null,
  });

  const differentAlbum = compareSongs(
    song({ project: { title: "专辑 A", type: "album" } }),
    song({ project: { title: "专辑 B", type: "album" } }),
  );
  assert.equal(differentAlbum.project.status, COMPARISON_STATUS.MISS);
});

test("EP and album projects are near", () => {
  const comparison = compareSongs(
    song({ project: { title: "某张 EP", type: "ep" } }),
    song({ project: { title: "另一张专辑", type: "album" } }),
  );
  assert.deepEqual(comparison.project, {
    value: "某张 EP",
    status: COMPARISON_STATUS.PARTIAL,
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
  assert.equal(afterMiss.attempts[0].comparison.performance.status, COMPARISON_STATUS.MATCH);
  assert.equal(won.status, "won");
  assert.equal(won.attempts.length, 2);
  assert.equal(won.attempts[1].songId, "target");
  assert.ok(Object.values(won.attempts[1].comparison).every(({ status }) => status === COMPARISON_STATUS.MATCH));
  assert.equal(won.maxAttempts, MAX_ATTEMPTS);
});

test("the eighth incorrect guess loses", () => {
  let state = createInitialState("target");
  for (const guessId of ["one", "two", "three", "four", "five", "six", "seven", "eight"]) {
    state = submitGuess(state, guessId, catalog);
  }
  assert.equal(state.status, "lost");
  assert.equal(state.attempts.length, 8);
});

test("invalid, duplicate, and post-game submissions throw stable errors without mutation", () => {
  const initial = createInitialState("target");
  assert.throws(() => submitGuess(initial, "missing", catalog), { code: "UNKNOWN_SONG" });
  assert.deepEqual(initial, createInitialState("target"));

  const invalidAttempt = { ...initial, attempts: [{ songId: "one" }] };
  assert.throws(() => submitGuess(invalidAttempt, "two", catalog), { code: "INVALID_STATE" });
  assert.throws(() => serializeGameState(invalidAttempt), { code: "INVALID_STATE" });

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
