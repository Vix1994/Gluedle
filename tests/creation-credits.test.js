import test from "node:test";
import assert from "node:assert/strict";

import { extractCurleyCredits } from "../src/data/creation-credits.js";

test("extractCurleyCredits recognizes QQ Music bilingual credit labels", () => {
  assert.deepEqual(extractCurleyCredits(`
[00:02.75]词Lyrics：希林娜依高
[00:03.24]曲Composer：希林娜依高
[00:03.95]编曲Composer/Arrangement：陈雪燃
  `), { lyrics: true, composition: true });
});

test("extractCurleyCredits recognizes Chinese and English credit variants", () => {
  assert.deepEqual(extractCurleyCredits(`
作词：其他作者 / Curley G
Composer: Other Writer
  `), { lyrics: true, composition: false });
});

test("extractCurleyCredits does not mistake arrangement credits for composition", () => {
  assert.deepEqual(extractCurleyCredits(`
Lyrics by: Other Writer
Composer/Arrangement：Other Writer
编曲Composer/Arrangement：希林娜依高
制作人Producer：希林娜依高
  `), { lyrics: false, composition: false });
});
