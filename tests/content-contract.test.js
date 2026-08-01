import test from "node:test";
import assert from "node:assert/strict";

import { siteContent, songs } from "../src/data/catalog.js";

test("the album release surface contains only the published Glue track", () => {
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
