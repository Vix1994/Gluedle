import assert from "node:assert/strict";
import test from "node:test";

import {
  SHARE_CARD_HEIGHT,
  SHARE_CARD_WIDTH,
  SHARE_FIELDS,
  buildShareCardModel,
  shareCardLayout,
} from "../src/share/share-card.js";

const comparison = Object.fromEntries(
  SHARE_FIELDS.map((field, index) => [field, { status: ["match", "near", "miss"][index % 3] }]),
);

test("share-card model keeps guesses private while adding finished song info", () => {
  const model = buildShareCardModel({
    roundLabel: "ROUND 01",
    canonicalUrl: "https://example.com/gluedle/",
    answer: { id: "secret-answer", title: "secret-title" },
    state: {
      status: "playing",
      answerId: "secret-answer",
      attempts: [{ songId: "secret-guess", comparison }],
    },
  });
  assert.equal(model.outcome, "1 / …");
  assert.equal(model.song, null);
  assert.deepEqual(model.rows[0], ["match", "near", "miss", "match", "near", "miss", "match", "near"]);
  const serialized = JSON.stringify(model);
  assert.doesNotMatch(serialized, /secret-answer|secret-title|secret-guess/);
});

test("finished share cards include the answer song metadata", () => {
  const model = buildShareCardModel({
    roundLabel: "ROUND 03",
    canonicalUrl: "https://example.com/gluedle/",
    answer: {
      id: "answer-secret",
      title: "答案歌曲",
      project: { title: "专辑 A", type: "album" },
      releaseDate: "2024-03-18",
      durationSec: 198,
      favoriteCount: 10001,
      favoriteCountDisplay: "5w+",
      language: "zh",
      performanceType: "collaboration",
      featuredArtists: ["合作歌手"],
      curleyCredits: { lyrics: true, composition: false },
    },
    state: { status: "won", attempts: [{ comparison }] },
  });
  assert.deepEqual(model.song, {
    title: "答案歌曲",
    project: "专辑 A",
    releaseDate: "2024-03-18",
    duration: "03:18",
    favoriteCount: "5w+",
    language: "中文",
    performance: "合作",
    featuredArtists: "合作：合作歌手",
    credits: "词参与",
  });
});

test("won and lost outcomes use stable eight-attempt notation", () => {
  const base = { roundLabel: "ROUND 01", canonicalUrl: "https://example.com/gluedle/" };
  assert.equal(buildShareCardModel({
    ...base,
    state: { status: "won", attempts: [{ comparison }] },
  }).outcome, "1 / 8");
  assert.equal(buildShareCardModel({
    ...base,
    state: { status: "lost", attempts: Array.from({ length: 8 }, () => ({ comparison })) },
  }).outcome, "X / 8");
});

test("eight result rows stay clear of the legend and QR region", () => {
  const layout = shareCardLayout(8);
  assert.equal(SHARE_CARD_WIDTH, 1080);
  assert.equal(SHARE_CARD_HEIGHT, 1350);
  assert.equal(layout.answerX, 450);
  assert.equal(layout.answerWidth, 558);
  assert.ok(layout.gridBottom <= layout.legendY - 20);
  assert.ok(layout.legendY < layout.qrY);
  assert.ok(layout.qrY + layout.qrOuterSize <= SHARE_CARD_HEIGHT - 24);
});
