import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

import { siteContent } from "../src/data/catalog.js";
import {
  SONG_CATALOG_URL,
  normalizeProject,
  validateSongCatalog,
} from "../src/data/song-catalog.js";

const songs = validateSongCatalog(JSON.parse(readFileSync(
  new URL("../public/data/gluedle-songs.json", import.meta.url),
  "utf8",
)));

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

test("every guessing entry declares whether it is a live recording", () => {
  assert.ok(songs.every((song) => typeof song.isLive === "boolean"));
  assert.deepEqual(
    songs.filter((song) => song.isLive).map((song) => song.id),
    ["xi-huan-ni-live"],
  );
  assert.equal(
    songs.find((song) => song.id === "xi-huan-ni-live").performanceType,
    "solo",
  );
});

test("the game reads one language-free JSON catalog with normalized singles", () => {
  assert.equal(SONG_CATALOG_URL, "/data/gluedle-songs.json");
  assert.ok(songs.every((song) => !("language" in song) && !("languages" in song)));
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
