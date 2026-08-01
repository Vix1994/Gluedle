import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const homeHtml = readFileSync(new URL("../index.html", import.meta.url), "utf8");
const gameHtml = readFileSync(new URL("../gluedle.html", import.meta.url), "utf8");
const homeMain = readFileSync(new URL("../src/main.js", import.meta.url), "utf8");
const gameMain = readFileSync(new URL("../src/gluedle.js", import.meta.url), "utf8");
const gameStyles = readFileSync(new URL("../src/styles/gluedle.css", import.meta.url), "utf8");
const viteConfig = readFileSync(new URL("../vite.config.js", import.meta.url), "utf8");

test("home links to the standalone game without embedding game controls", () => {
  assert.ok((homeHtml.match(/href="\/gluedle\.html"/g) ?? []).length >= 2);
  assert.doesNotMatch(homeHtml, /id="(?:guess-form|song-input|guess-board|result-dialog)"/);
  assert.doesNotMatch(homeMain, /bindGameActions|submitGuess|selectDailyAnswer/);
  for (const id of ["home", "concept", "story"]) {
    assert.match(homeHtml, new RegExp(`id="${id}"`));
  }
  assert.doesNotMatch(homeHtml, /当前只|其余曲目|页面边界|项目声明|不宣称/);
  assert.doesNotMatch(gameHtml, /不代表《Glue》所在专辑已公布曲目|DATA BOUNDARY/);
});

test("home exposes the verified artist destinations safely", () => {
  for (const url of [
    "https://weibo.com/u/5948723938",
    "https://y.qq.com/n/ryqq/singer/000PJRig3WnHYX",
    "https://music.163.com/#/artist?id=12664439",
  ]) {
    const escaped = url.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    assert.match(homeHtml, new RegExp(`href="${escaped}"[^>]+rel="noopener noreferrer"`));
  }
});

test("standalone game keeps title-only suggestions, Live clues, and image sharing", () => {
  for (const id of [
    "guess-form",
    "song-input",
    "song-suggestions",
    "guess-board",
    "share-button",
    "result-dialog",
  ]) assert.match(gameHtml, new RegExp(`id="${id}"`));

  const suggestionSource = gameMain.slice(
    gameMain.indexOf("function showSuggestions"),
    gameMain.indexOf("function updateActiveSuggestion"),
  );
  assert.doesNotMatch(suggestionSource, /releaseYear|durationSec|formatDuration/);
  assert.match(gameMain, /attempt\.comparison\.live, "live"/);
  assert.match(gameMain, /renderShareCard\(elements\.shareCanvas, model\)/);
  assert.match(gameMain, /navigator\.canShare\(\{ files: \[file\] \}\)/);
  assert.match(gameMain, /downloadBlob\(blob, filename\)/);
});

test("result states use high-contrast colors plus non-color marks", () => {
  for (const [status, mark] of [["match", "✓"], ["near", "≈"], ["miss", "×"]]) {
    assert.ok(gameStyles.includes(`.comparison-cell[data-status="${status}"]`));
    assert.ok(gameStyles.includes(`content: "${mark}"`));
  }
});

test("production build declares both HTML entries", () => {
  assert.match(viteConfig, /\.\/index\.html/);
  assert.match(viteConfig, /\.\/gluedle\.html/);
});
