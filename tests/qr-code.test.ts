import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import test from "node:test";

import {
  QR_MAX_BYTES,
  QR_SIZE,
  canonicalGameUrl,
  createQrMatrix,
} from "../src/share/qr-code.ts";

test("QR encoder returns a deterministic Version 5 boolean matrix", () => {
  const matrix = createQrMatrix("https://example.com/gluedle/");
  assert.equal(matrix.length, QR_SIZE);
  matrix.forEach((row) => {
    assert.equal(row.length, QR_SIZE);
    row.forEach((module) => assert.equal(typeof module, "boolean"));
  });
  const digest = createHash("sha256")
    .update(matrix.flat().map(Number).join(""))
    .digest("hex");
  assert.equal(digest, "11bba46fd078ebfdb1c52261c154d153570fd5b3dda0aab6b609b5fd08ec99f4");
});

test("QR matrix contains the three standard finder patterns", () => {
  const matrix = createQrMatrix("https://example.com/gluedle/");
  for (const [left, top] of [[0, 0], [QR_SIZE - 7, 0], [0, QR_SIZE - 7]]) {
    for (let y = 0; y < 7; y += 1) {
      for (let x = 0; x < 7; x += 1) {
        const expected = x === 0 || x === 6 || y === 0 || y === 6
          || (x >= 2 && x <= 4 && y >= 2 && y <= 4);
        assert.equal(matrix[top + y][left + x], expected);
      }
    }
  }
});

test("canonical game URL removes query/hash and pins the clean standalone route", () => {
  assert.equal(
    canonicalGameUrl("https://gluedle.test/releases/?debug=1#board"),
    "https://gluedle.test/releases/gluedle/",
  );
  assert.equal(
    canonicalGameUrl("http://127.0.0.1:4173/gluedle/?day=1"),
    "http://127.0.0.1:4173/gluedle/",
  );
  assert.equal(
    canonicalGameUrl("http://127.0.0.1:4173/gluedle.html?legacy=1"),
    "http://127.0.0.1:4173/gluedle/",
  );
});

test("QR encoder enforces the Version 5-L byte capacity", () => {
  assert.doesNotThrow(() => createQrMatrix("a".repeat(QR_MAX_BYTES)));
  assert.throws(() => createQrMatrix("a".repeat(QR_MAX_BYTES + 1)), RangeError);
});
