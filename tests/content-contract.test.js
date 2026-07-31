import test from "node:test";
import assert from "node:assert/strict";

import { siteContent, songs } from "../src/data/catalog.js";

test("the album release surface contains only the published Glue track", () => {
  assert.deepEqual(
    siteContent.release.tracks.map((track) => track.title),
    ["Glue"],
  );
  assert.equal(siteContent.release.tracks[0].status, "已公开");
  assert.match(siteContent.release.notice, /其余曲目.*正式公布/);
});

test("the guessing catalog is explicitly described as a separate game library", () => {
  assert.ok(songs.length > siteContent.release.tracks.length);
  assert.match(siteContent.game.libraryLabel, /过往作品题库/);
  assert.match(siteContent.game.libraryNotice, /不代表本专辑已公布曲目/);
});

test("every guessing entry declares whether it is a live recording", () => {
  assert.ok(songs.every((song) => typeof song.isLive === "boolean"));
  assert.deepEqual(
    songs.filter((song) => song.isLive).map((song) => song.id),
    ["xi-huan-ni-live"],
  );
});
