import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

import { siteContent } from "../src/data/catalog.js";
import {
  SONG_CATALOG_URL,
  SONG_LANGUAGES,
  normalizeProject,
  validateSongCatalog,
} from "../src/data/song-catalog.js";

const songs = validateSongCatalog(JSON.parse(readFileSync(
  new URL("../public/data/gluedle-songs.json", import.meta.url),
  "utf8",
)));
const syncSource = readFileSync(new URL("../scripts/sync-curley-catalog.mjs", import.meta.url), "utf8");

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
  assert.ok(songs.every((song) => Array.isArray(song.featuredArtists) && song.featuredArtists.length <= 1));
  assert.ok(songs.every((song) => !/DJ/i.test(song.title)));
  assert.ok(songs.every((song) => song.sources.every((source) => source.name.startsWith("QQ音乐"))));
  assert.ok(songs.some((song) => song.project.type === "ost"));
  assert.deepEqual(
    songs.find((song) => song.title === "歌曲：缘分一道桥")?.curleyCredits,
    { lyrics: false, composition: false },
  );
});

test("the catalog sync starts from the QQ singer hot-song list instead of keyword search", () => {
  assert.match(syncSource, /GetSingerSongList/);
  assert.match(syncSource, /order: 1/);
  assert.match(syncSource, /singerSongLimit = 300/);
  assert.doesNotMatch(syncSource, /search_for_qq_cp|singerQueries/);
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
  });
  assert.deepEqual(normalizeProject({ title: "电影原声带", type: "ost" }), {
    title: "电影原声带",
    type: "ost",
  });
});
