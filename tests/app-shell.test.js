import assert from "node:assert/strict";
import test from "node:test";

import { getPopstateAction } from "../src/app-shell.js";

test("popstate action reloads whenever a route transition is active", () => {
  assert.equal(getPopstateAction({ navigating: true, destinationPath: "/", activePath: "/" }), "reload");
  assert.equal(
    getPopstateAction({ navigating: true, destinationPath: "/concept/", activePath: "/visuals/" }),
    "reload",
  );
});

test("popstate action distinguishes same-route refreshes from route swaps", () => {
  assert.equal(getPopstateAction({ navigating: false, destinationPath: "/concept/", activePath: "/concept/" }), "refresh");
  assert.equal(getPopstateAction({ navigating: false, destinationPath: "/visuals/", activePath: "/concept/" }), "swap");
});
