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

test("share-card model contains only result statuses, not answer or song IDs", () => {
  const model = buildShareCardModel({
    roundLabel: "ROUND 01",
    canonicalUrl: "https://example.com/gluedle/",
    state: {
      status: "playing",
      answerId: "secret-answer",
      attempts: [{ songId: "secret-guess", comparison }],
    },
  });
  assert.equal(model.outcome, "1 / …");
  assert.deepEqual(model.rows[0], ["match", "near", "miss", "match", "near", "miss"]);
  const serialized = JSON.stringify(model);
  assert.doesNotMatch(serialized, /secret-answer|secret-guess/);
});

test("won and lost outcomes use stable six-attempt notation", () => {
  const base = { roundLabel: "ROUND 01", canonicalUrl: "https://example.com/gluedle/" };
  assert.equal(buildShareCardModel({
    ...base,
    state: { status: "won", attempts: [{ comparison }] },
  }).outcome, "1 / 6");
  assert.equal(buildShareCardModel({
    ...base,
    state: { status: "lost", attempts: Array.from({ length: 6 }, () => ({ comparison })) },
  }).outcome, "X / 6");
});

test("six result rows stay clear of the legend and QR region", () => {
  const layout = shareCardLayout(6);
  assert.equal(SHARE_CARD_WIDTH, 1080);
  assert.equal(SHARE_CARD_HEIGHT, 1350);
  assert.ok(layout.gridBottom <= layout.legendY - 32);
  assert.ok(layout.legendY < layout.qrY);
  assert.ok(layout.qrY + layout.qrOuterSize <= SHARE_CARD_HEIGHT - 72);
});
