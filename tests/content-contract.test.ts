import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

import { siteContent } from "../src/data/catalog.ts";
import { FEATURED_ARTIST_GENDER_VALUES } from "../src/data/collaborator-genders.ts";
import {
  getSongProjectCategory,
  PROJECT_CATEGORY_VALUES,
} from "../src/data/project-categories.ts";
import {
  DEFAULT_SONG_ORIGIN_TYPE,
  getSongOriginType,
  SONG_ORIGIN_LABELS,
  SONG_ORIGIN_OVERRIDES,
  SONG_ORIGIN_VALUES,
} from "../src/data/song-provenance.ts";
import {
  SONG_CATALOG_URL,
  SONG_LANGUAGES,
  normalizeProject,
  validateSongCatalog,
} from "../src/data/song-catalog.ts";

const songs = validateSongCatalog(JSON.parse(readFileSync(
  new URL("../public/data/gluedle-songs.json", import.meta.url),
  "utf8",
)));
const syncSource = readFileSync(
  new URL("../scripts/sync-song-origin-overrides.ts", import.meta.url),
  "utf8",
);

test("the album release surface contains only the published Glue track", () => {
  assert.equal(siteContent.release.countLabel, "01 / RELEASED TRACK");
  assert.deepEqual(
    siteContent.release.tracks.map((track) => track.title),
    ["Glue"],
  );
  assert.doesNotMatch(siteContent.story.intro, /当前只|尚未|不把|不代表/);
});

test("the guessing catalog remains separate without disclaimer copy", () => {
  assert.ok(songs.length > siteContent.release.tracks.length);
  assert.match(siteContent.game.libraryLabel, /过往作品题库/);
  assert.equal("libraryNotice" in siteContent.game, false);
});

test("the guessing catalog uses QQ Music sources and has resolved creation credits", () => {
  assert.ok(songs.every((song) => !("isLive" in song)));
  assert.ok(songs.every((song) => (
    typeof song.curleyCredits?.lyrics === "boolean"
    && typeof song.curleyCredits?.composition === "boolean"
  )));
  assert.ok(songs.every((song) => (
    Array.isArray(song.hintLyrics)
    && song.hintLyrics.length <= 3
    && song.hintLyrics.every((hint) => typeof hint === "string" && hint.trim())
  )));
  assert.ok(songs.some((song) => song.hintLyrics.length > 0));
  assert.ok(songs.every((song) => (
    Array.isArray(song.featuredArtists)
    && song.featuredArtists.every((artist) => typeof artist === "string" && artist.trim())
  )));
  assert.ok(songs.every((song) => FEATURED_ARTIST_GENDER_VALUES.includes(song.featuredArtistGender)));
  assert.ok(songs.some((song) => song.featuredArtistGender === "male"));
  assert.ok(songs.some((song) => song.featuredArtistGender === "female"));
  assert.ok(songs.some((song) => song.featuredArtistGender === "unknown"));
  assert.ok(songs.every((song) => song.favoriteCount === null || (
    Number.isInteger(song.favoriteCount) && song.favoriteCount >= 0
  )));
  assert.ok(songs.some((song) => song.favoriteCount !== null && song.favoriteCount > 0));
  assert.ok(songs.every((song) => song.favoriteCountDisplay === null || (
    typeof song.favoriteCountDisplay === "string" && song.favoriteCountDisplay.trim()
  )));
  assert.ok(songs.some((song) => /[wk]\+$/u.test(song.favoriteCountDisplay ?? "")));
  assert.ok(songs.every((song) => /^\d{4}-\d{2}-\d{2}$/u.test(song.releaseDate)));
  assert.ok(songs.every((song) => song.sources.every((source) => source.name.startsWith("QQ音乐"))));
  assert.ok(songs.some((song) => song.project.type === "ost"));
  assert.ok(songs.every((song) => PROJECT_CATEGORY_VALUES.includes(song.project.category)));
  assert.ok(songs.every((song) => song.originType === null || SONG_ORIGIN_VALUES.includes(song.originType)));
  assert.ok(songs.some((song) => song.project.category === "film"));
  assert.ok(songs.some((song) => song.project.category === "album"));
  assert.ok(songs.some((song) => song.project.category === "single"));
  assert.equal(
    songs.find((song) => song.title === "烬火 Emberfire")?.project.category,
    "game",
  );
  assert.equal(
    getSongProjectCategory({
      title: "烬火 Emberfire",
      project: { title: "原神-「烬火 Emberfire」游戏原声EP专辑", type: "ost" },
    }),
    "game",
  );
  assert.equal(
    getSongProjectCategory({
      title: "同项目的其他歌曲",
      project: { title: "原神-「烬火 Emberfire」游戏原声EP专辑", type: "ost" },
    }),
    "film",
  );
  assert.equal(
    songs.find((song) => song.title === "母系社会 (Live)")?.project.category,
    "live",
  );
  assert.deepEqual(
    songs.find((song) => song.title === "于是我这样生活")?.curleyCredits,
    { lyrics: false, composition: false },
  );
  assert.deepEqual(
    songs.find((song) => song.title === "Emerald City")?.curleyCredits,
    { lyrics: true, composition: true },
  );
});

test("the song origin config is initialized for every catalog title", () => {
  assert.deepEqual(
    Object.keys(SONG_ORIGIN_OVERRIDES),
    songs.map((song) => song.title),
  );
  const acceptedOriginValues = new Set([
    null,
    ...SONG_ORIGIN_VALUES,
    ...Object.values(SONG_ORIGIN_LABELS),
  ]);
  assert.ok(Object.values(SONG_ORIGIN_OVERRIDES)
    .every((originType) => acceptedOriginValues.has(originType)));
  assert.equal(DEFAULT_SONG_ORIGIN_TYPE, "original");
  assert.equal(getSongOriginType("尚未配置的歌曲"), DEFAULT_SONG_ORIGIN_TYPE);
});

test("the origin config sync reads the checked-in catalog and preserves configured values", () => {
  assert.match(syncSource, /public", "data", "gluedle-songs\.json"/);
  assert.match(syncSource, /SONG_ORIGIN_OVERRIDES/);
  assert.match(syncSource, /normalizeOriginType/);
  assert.match(syncSource, /currentOverrides\?\.\[title\]/);
  assert.match(syncSource, /writeFileSync\(overridesPath/);
});

test("the game reads one lyric-classified JSON catalog with normalized singles", () => {
  assert.equal(SONG_CATALOG_URL, "/data/gluedle-songs.json");
  assert.ok(songs.every((song) => SONG_LANGUAGES.includes(song.language)));
  const languageCounts = Object.fromEntries(SONG_LANGUAGES.map((language) => [
    language,
    songs.filter((song) => song.language === language).length,
  ]));
  assert.equal(Object.values(languageCounts).reduce((sum, count) => sum + count, 0), songs.length);
  assert.ok(languageCounts.zh > 0);
  assert.ok(languageCounts.en > 0);
  assert.ok(songs.every((song) => song.project.type !== "single" || song.project.title === "单曲"));
  assert.deepEqual(normalizeProject({ title: "独立发行名", type: "soundtrack single" }), {
    title: "单曲",
    type: "single",
    category: "single",
    display: "单曲",
  });
  assert.deepEqual(normalizeProject({ title: "电影原声带", type: "ost" }), {
    title: "电影原声带",
    type: "ost",
    category: "film",
    display: "影视",
  });
  assert.deepEqual(normalizeProject({
    title: "原神-「烬火 Emberfire」游戏原声EP专辑",
    type: "ost",
  }, "烬火 Emberfire"), {
    title: "原神-「烬火 Emberfire」游戏原声EP专辑",
    type: "ost",
    category: "game",
    display: "游戏",
  });
  assert.deepEqual(normalizeProject({ title: "某某 Live Sessions", type: "album" }), {
    title: "某某 Live Sessions",
    type: "album",
    category: "live",
    display: "Live",
  });
});

test("catalog validation rejects impossible dates and malformed source metadata", () => {
  const validSong = songs[0];
  assert.throws(
    () => validateSongCatalog([{ ...validSong, releaseDate: "2025-02-31" }]),
    /release date/,
  );
  assert.throws(
    () => validateSongCatalog([{ ...validSong, sources: [] }]),
    /valid source/,
  );
});
