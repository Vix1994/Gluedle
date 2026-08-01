import assert from "node:assert/strict";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";

const projectRoot = dirname(fileURLToPath(new URL("../package.json", import.meta.url)));
const gameStyleDirectory = join(projectRoot, "src", "styles");
const gameStyleFileNames = readdirSync(gameStyleDirectory)
  .filter((name) => /^gluedle.*\.css$/.test(name))
  .sort();
const gameStyleFiles = gameStyleFileNames.map((name) => ({
  name,
  source: readFileSync(join(gameStyleDirectory, name), "utf8"),
}));
const gameStyleEntry = gameStyleFiles.find(({ name }) => name === "gluedle.css")?.source ?? "";
const homeHtml = readFileSync(new URL("../index.html", import.meta.url), "utf8");
const gameHtml = readFileSync(new URL("../gluedle/index.html", import.meta.url), "utf8");
const conceptHtml = readFileSync(new URL("../concept/index.html", import.meta.url), "utf8");
const visualsHtml = readFileSync(new URL("../visuals/index.html", import.meta.url), "utf8");
const glueHtml = readFileSync(new URL("../glue/index.html", import.meta.url), "utf8");
const homeMain = readFileSync(new URL("../src/main.js", import.meta.url), "utf8");
const gameMain = readFileSync(new URL("../src/gluedle.js", import.meta.url), "utf8");
const editorialMain = readFileSync(new URL("../src/editorial.js", import.meta.url), "utf8");
const routeTransitions = readFileSync(new URL("../src/route-transitions.js", import.meta.url), "utf8");
const gameStyles = gameStyleFiles.map(({ source }) => source).join("\n");
const editorialStyles = readFileSync(new URL("../src/styles/editorial.css", import.meta.url), "utf8");
const transitionStyles = readFileSync(new URL("../src/styles/transitions.css", import.meta.url), "utf8");
const shareCardSource = readFileSync(new URL("../src/share/share-card.js", import.meta.url), "utf8");
const viteConfig = readFileSync(new URL("../vite.config.js", import.meta.url), "utf8");

function extractFunction(source, name) {
  const signature = new RegExp(`\\b(?:async\\s+)?function\\s+${name}\\s*\\(`).exec(source);
  assert.ok(signature, `expected function ${name}`);
  const openingBrace = source.indexOf("{", signature.index);
  assert.notEqual(openingBrace, -1, `expected body for function ${name}`);

  let depth = 0;
  for (let index = openingBrace; index < source.length; index += 1) {
    if (source[index] === "{") depth += 1;
    if (source[index] !== "}") continue;
    depth -= 1;
    if (depth === 0) return source.slice(signature.index, index + 1);
  }
  assert.fail(`unterminated body for function ${name}`);
}

function elementTagById(source, tagName, id) {
  const match = new RegExp(`<${tagName}\\b[^>]*\\bid="${id}"[^>]*>`, "i").exec(source);
  assert.ok(match, `expected <${tagName}>#${id}`);
  return match[0];
}

function importedStylePaths(source) {
  return [...source.matchAll(/@import\s+(?:url\(\s*)?["']([^"']+)["']\s*\)?\s*;/g)]
    .map((match) => match[1]);
}

test("home links to the standalone game without embedding game controls", () => {
  assert.ok((homeHtml.match(/href="\/gluedle\/"/g) ?? []).length >= 2);
  assert.doesNotMatch(homeHtml, /href="[^"]*gluedle\.html/);
  assert.doesNotMatch(homeHtml, /id="(?:guess-form|song-input|guess-board|result-dialog)"/);
  assert.doesNotMatch(homeMain, /bindGameActions|submitGuess|selectDailyAnswer/);
  for (const id of ["home", "concept", "story"]) {
    assert.match(homeHtml, new RegExp(`id="${id}"`));
  }
  assert.doesNotMatch(homeHtml, /当前只|其余曲目|页面边界|项目声明|不宣称/);
  assert.doesNotMatch(gameHtml, /不代表《Glue》所在专辑已公布曲目|DATA BOUNDARY/);
});

test("GLUE leads the album identity while Green to Blue stays a concept chapter", () => {
  assert.match(homeHtml, /<title>GLUE — CURLEY G<\/title>/);
  assert.match(homeHtml, /class="wordmark"[^>]*>GLUE<\/a>/);
  assert.match(homeHtml, /<h1\s+id="hero-title"><span>GLUE<\/span><\/h1>/);
  assert.match(homeHtml, /class="site-nav"[\s\S]*?href="\/" aria-current="page"[^>]*>GLUE<\/a>/);
  assert.match(homeHtml, /GLUE \/ ALBUM &amp; TITLE TRACK/);
  assert.match(homeHtml, /TITLE TRACK \/ 01/);
  assert.match(homeHtml, /GREEN TO BLUE \/ CONCEPT/);
  assert.doesNotMatch(homeHtml, />GREEN\s*(?:→|TO)\s*BLUE<\/a>/i);
  assert.match(gameHtml, /class="wordmark"[^>]*>GLUEDLE<\/a>/);
});

test("all five routes keep a persistent tab path, including Gluedle", () => {
  const routes = ["/", "/concept/", "/visuals/", "/glue/", "/gluedle/"];
  for (const source of [homeHtml, conceptHtml, visualsHtml, glueHtml, gameHtml]) {
    for (const route of routes) assert.match(source, new RegExp(`href="${route}"`));
  }
  assert.match(gameHtml, /class="game-nav"/);
  assert.match(gameHtml, /href="\/gluedle\/" aria-current="page"[^>]*>Gluedle<\/a>/);
});

test("home exposes three clean editorial routes drawn from the original visual directions", () => {
  for (const route of ["/concept/", "/visuals/", "/glue/"]) {
    assert.match(homeHtml, new RegExp(`href="${route}"`));
    assert.match(viteConfig, new RegExp(`\\.${route}index\\.html`));
  }

  assert.match(conceptHtml, /<title>CONCEPT — GLUE \/ CURLEY G<\/title>/);
  assert.match(conceptHtml, /01 \/ ECHO ORBIT/);
  assert.match(visualsHtml, /<title>VISUALS — GLUE \/ CURLEY G<\/title>/);
  assert.match(visualsHtml, /02 \/ CONTACT LAKE/);
  assert.match(glueHtml, /<title>GLUE 01 — CURLEY G<\/title>/);
  assert.match(glueHtml, /03 \/ BLUE NOISE/);
});

test("editorial routes share navigation, motion, responsive, and content boundaries", () => {
  for (const source of [conceptHtml, visualsHtml, glueHtml]) {
    assert.match(source, /type="module" src="\/src\/editorial\.js"/);
    for (const route of ["/", "/concept/", "/visuals/", "/glue/", "/gluedle/"]) {
      assert.match(source, new RegExp(`href="${route}"`));
    }
    assert.doesNotMatch(source, /<audio\b|播放|试听|20\d{2}[-年/]|\b\d{1,2}:\d{2}\b/i);
  }

  assert.match(editorialMain, /IntersectionObserver/);
  assert.doesNotMatch(editorialMain, /scrollIntoView/);
  assert.match(editorialStyles, /@media \(max-width: 720px\)/);
  assert.match(editorialStyles, /@media \(prefers-reduced-motion: reduce\)/);
  for (const token of ["#050505", "#f4f3ed", "#e8ebeb", "#87a8be", "#537b98"]) {
    assert.match(editorialStyles, new RegExp(token, "i"));
  }
});

test("all page styles load before JavaScript and share native route transitions", () => {
  const contracts = [
    [homeHtml, "/src/styles/site.css"],
    [gameHtml, "/src/styles/gluedle.css"],
    [conceptHtml, "/src/styles/editorial.css"],
    [visualsHtml, "/src/styles/editorial.css"],
    [glueHtml, "/src/styles/editorial.css"],
  ];

  for (const [source, pageStyle] of contracts) {
    const styleIndex = source.indexOf(`<link rel="stylesheet" href="${pageStyle}"`);
    const transitionIndex = source.indexOf(
      '<link rel="stylesheet" href="/src/styles/transitions.css"',
    );
    const scriptIndex = source.indexOf('<script type="module"');
    assert.ok(styleIndex > -1 && styleIndex < scriptIndex);
    assert.ok(transitionIndex > -1 && transitionIndex < scriptIndex);
  }

  assert.doesNotMatch(
    `${homeMain}\n${gameMain}\n${editorialMain}`,
    /import\s+["']\.\/styles\/(?:site|gluedle|editorial)\.css["']/,
  );
  assert.match(transitionStyles, /@view-transition\s*\{[\s\S]*?navigation:\s*auto/);
  assert.match(transitionStyles, /prefers-reduced-motion:\s*reduce/);
  assert.match(transitionStyles, /route-transition-fallback/);
  assert.match(routeTransitions, /document\.startViewTransition/);
  assert.match(routeTransitions, /window\.location\.assign/);
  assert.match(routeTransitions, /prefers-reduced-motion:\s*reduce/);
  for (const source of [homeMain, editorialMain, gameMain]) {
    assert.match(source, /import "\.\/route-transitions\.js"/);
  }
});

test("home wheel navigation advances through explicit content anchors", () => {
  for (const id of ["home", "concept", "story", "visuals", "release", "play", "listen"]) {
    assert.match(homeHtml, new RegExp(`id="${id}"[^>]*\\bdata-scroll-anchor\\b`));
  }

  const wheelNavigation = extractFunction(homeMain, "setupAnchorWheelNavigation");
  assert.match(wheelNavigation, /addEventListener\(\s*["']wheel["']/);
  assert.match(wheelNavigation, /\{\s*passive:\s*false\s*\}/);
  assert.match(wheelNavigation, /window\.scrollTo\(\{/);
  assert.match(wheelNavigation, /prefers-reduced-motion:\s*reduce/);
  assert.match(wheelNavigation, /nestedScrollerCanMove\(event\.target,\s*direction\)/);
  assert.doesNotMatch(wheelNavigation, /scrollIntoView/);
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

  const suggestionSource = extractFunction(gameMain, "showSuggestions");
  assert.doesNotMatch(
    suggestionSource,
    /releaseYear|durationSec|formatDuration|\.project\b|\.languages?\b/,
  );
  assert.match(suggestionSource, /option\.textContent\s*=\s*song\.title\s*;/);
  assert.doesNotMatch(
    suggestionSource,
    /option\.(?:innerHTML|outerHTML|insertAdjacentHTML|append|prepend|replaceChildren)\b/,
  );
  assert.match(gameMain, /attempt\.comparison\.live, "live"/);
  assert.match(gameMain, /renderShareCard\(elements\.shareCanvas, model\)/);
  assert.match(gameMain, /navigator\.canShare\(\{ files: \[file\] \}\)/);
  assert.match(gameMain, /downloadBlob\(blob, filename\)/);
});

test("the standalone shell exposes accessible dynamic-game integration points", () => {
  const input = elementTagById(gameHtml, "input", "song-input");
  const listbox = elementTagById(gameHtml, "ul", "song-suggestions");
  assert.match(input, /\brole="combobox"/);
  assert.match(input, /\baria-autocomplete="list"/);
  assert.match(input, /\baria-controls="song-suggestions"/);
  assert.match(input, /\baria-expanded="false"/);
  assert.match(listbox, /\brole="listbox"/);

  assert.match(gameHtml, /<body\b[^>]*\bdata-game-state="loading"[^>]*\bdata-attempts="0"/);
  assert.match(gameHtml, /\bdata-app-boot\b[^>]*\brole="status"/);
  assert.match(gameHtml, /<noscript>/);
  assert.equal((gameHtml.match(/\bdata-attempt-marker\b/g) ?? []).length, 6);
  assert.match(gameHtml, /class="game-signal"[^>]*\baria-hidden="true"/);
  assert.equal((gameHtml.match(/class="signal-ring"/g) ?? []).length, 6);
  assert.match(gameHtml, /<th\b[^>]*\bdata-live-column[^>]*>Live<\/th>/);
});

test("game entry synchronizes visible progress, day rollover, reset failure, and boot state", () => {
  assert.match(gameMain, /document\.body\.dataset\.gameState\s*=\s*state\.status/);
  assert.match(gameMain, /document\.body\.dataset\.attempts\s*=\s*String\(/);
  assert.match(
    gameMain,
    /document\.body\.style\.setProperty\(\s*["']--attempt-progress["']/,
  );
  assert.match(gameMain, /querySelectorAll\(\s*["']\[data-attempt-marker\]["']\s*\)/);

  assert.match(gameMain, /addEventListener\(\s*["']visibilitychange["']/);
  const dayCheckSource = extractFunction(gameMain, "checkForNewDay");
  assert.match(dayCheckSource, /createLocalDayKey\(new Date\(/);
  assert.match(dayCheckSource, /dayKey/);
  assert.match(dayCheckSource, /location\.reload\(\)/);

  const resetResult = /const\s+([A-Za-z_$][\w$]*)\s*=\s*removeStoredState\(\)/.exec(gameMain);
  assert.ok(resetResult, "reset must retain the storage removal result");
  assert.match(gameMain, new RegExp(`if\\s*\\(\\s*${resetResult[1]}\\s*\\)`));
  const removeStoredStateSource = extractFunction(gameMain, "removeStoredState");
  assert.match(removeStoredStateSource, /return\s+true\s*;/);
  assert.match(removeStoredStateSource, /return\s+false\s*;/);

  assert.match(gameMain, /activeSuggestion\s*===\s*-1/);
  assert.match(
    gameMain,
    /event\.key\s*===\s*["']ArrowDown["']\s*\?\s*0\s*:\s*suggestionSongs\.length\s*-\s*1/,
  );
  const suggestionsSource = extractFunction(gameMain, "showSuggestions");
  assert.match(
    suggestionsSource,
    /guessableSongs\.filter\([\s\S]*?!guessedIds\.has\(song\.id\)[\s\S]*?\)\.slice\(0,\s*8\)/,
  );

  const finishBootSource = extractFunction(gameMain, "finishBoot");
  assert.match(finishBootSource, /appBoot\?\.remove\(\)/);
});

test("result states use high-contrast colors plus non-color marks", () => {
  for (const [status, mark] of [["match", "✓"], ["near", "≈"], ["miss", "×"]]) {
    assert.ok(gameStyles.includes(`.comparison-cell[data-status="${status}"]`));
    assert.ok(gameStyles.includes(`content: "${mark}"`));
  }
});

test("game visuals reuse the album image language and restrained home-page tokens", () => {
  const tokenContracts = [
    ["black", "#050505"],
    ["white", "#f4f3ed"],
    ["lake", "#87a8be"],
    ["correct", "#a6c7a2"],
    ["near", "#d5d0ad"],
    ["wrong", "#626a70"],
  ];
  for (const [name, value] of tokenContracts) {
    assert.match(gameStyles, new RegExp(`--${name}:\\s*${value}`, "i"));
  }

  const albumAssets = [...gameStyles.matchAll(/url\(["']?(\/assets\/glue\/[^"')]+)["']?\)/g)]
    .map((match) => match[1]);
  assert.ok(albumAssets.length >= 1, "game CSS must reuse at least one /assets/glue/ image");
  for (const asset of new Set(albumAssets)) {
    assert.ok(existsSync(join(projectRoot, "public", asset.slice(1))), `${asset} must exist`);
  }

  assert.match(gameHtml, /<meta\s+name="theme-color"\s+content="#050505"\s*\/>/i);
  assert.match(gameStyles, /@media\s*\([^)]*(?:min|max)-width[^)]*\)/);
  assert.match(gameStyles, /@media\s*\(prefers-reduced-motion:\s*reduce\)/);
  assert.doesNotMatch(`${gameStyles}\n${shareCardSource}`, /#22e6a7|#ffd166|#ff8ca1/i);
});

test("the game stylesheet entry imports every bounded local style part", () => {
  assert.ok(gameStyleEntry, "src/styles/gluedle.css must remain the stylesheet entry");
  assert.ok(gameStyleFiles.length > 1, "game styles must be split across multiple gluedle*.css files");

  for (const { name, source } of gameStyleFiles) {
    assert.ok(source.split(/\r?\n/).length <= 1000, `${name} must not exceed 1000 lines`);
  }

  const imports = importedStylePaths(gameStyleEntry);
  assert.ok(imports.length > 0, "gluedle.css must import its style parts");
  for (const importedPath of imports) {
    assert.match(importedPath, /^\.\/gluedle[^/]*\.css$/);
    assert.ok(
      existsSync(join(gameStyleDirectory, importedPath)),
      `${importedPath} must resolve beside gluedle.css`,
    );
  }

  assert.deepEqual(
    imports.map((path) => path.slice(2)).sort(),
    gameStyleFileNames.filter((name) => name !== "gluedle.css"),
    "the entry must import every gluedle*.css part exactly once",
  );
  const entryWithoutImports = gameStyleEntry
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/@import\s+(?:url\(\s*)?["'][^"']+["']\s*\)?\s*;/g, "")
    .trim();
  assert.equal(entryWithoutImports, "", "gluedle.css may contain only local imports and comments");
});

test("share card uses the home black, paper, lake, and muted result palette", () => {
  for (const color of ["#050505", "#f4f3ed", "#87a8be", "#a6c7a2", "#d5d0ad", "#626a70"]) {
    assert.match(shareCardSource, new RegExp(color, "i"));
  }
  assert.doesNotMatch(shareCardSource, /#22e6a7|#ffd166|#ff8ca1|#8e2638/i);
});

test("production build declares all five HTML entries", () => {
  for (const entry of [
    "./index.html",
    "./concept/index.html",
    "./visuals/index.html",
    "./glue/index.html",
    "./gluedle/index.html",
  ]) {
    assert.ok(viteConfig.includes(`"${entry}"`), `${entry} must be a Vite input`);
  }
});
