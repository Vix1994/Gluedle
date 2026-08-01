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
const homeHtml = readFileSync(new URL("../pages/index.html", import.meta.url), "utf8");
const gameHtml = readFileSync(new URL("../pages/gluedle/index.html", import.meta.url), "utf8");
const catalogHtml = readFileSync(new URL("../pages/catalog/index.html", import.meta.url), "utf8");
const conceptHtml = readFileSync(new URL("../pages/concept/index.html", import.meta.url), "utf8");
const visualsHtml = readFileSync(new URL("../pages/visuals/index.html", import.meta.url), "utf8");
const glueHtml = readFileSync(new URL("../pages/glue/index.html", import.meta.url), "utf8");
const homeMain = readFileSync(new URL("../src/main.js", import.meta.url), "utf8");
const anchorNavigation = readFileSync(new URL("../src/anchor-wheel-navigation.js", import.meta.url), "utf8");
const gameMain = readFileSync(new URL("../src/gluedle.js", import.meta.url), "utf8");
const catalogMain = readFileSync(new URL("../src/catalog.js", import.meta.url), "utf8");
const editorialMain = readFileSync(new URL("../src/editorial.js", import.meta.url), "utf8");
const appMain = readFileSync(new URL("../src/app.js", import.meta.url), "utf8");
const appShell = readFileSync(new URL("../src/app-shell.js", import.meta.url), "utf8");
const appShellStyles = readFileSync(new URL("../src/styles/app-shell.css", import.meta.url), "utf8");
const gameStyles = gameStyleFiles.map(({ source }) => source).join("\n");
const editorialStyles = readFileSync(new URL("../src/styles/editorial.css", import.meta.url), "utf8");
const catalogStyles = readFileSync(new URL("../src/styles/catalog.css", import.meta.url), "utf8");
const transitionStyles = readFileSync(new URL("../src/styles/transitions.css", import.meta.url), "utf8");
const shareCardSource = readFileSync(new URL("../src/share/share-card.js", import.meta.url), "utf8");
const songCatalogLoader = readFileSync(new URL("../src/data/song-catalog.js", import.meta.url), "utf8");
const songCatalogJson = readFileSync(new URL("../public/data/gluedle-songs.json", import.meta.url), "utf8");
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
  assert.ok((homeHtml.match(/href="\/gluedle\/"/g) ?? []).length >= 1);
  assert.match(appShell, /PLAY GLUEDLE/);
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
  assert.match(appShell, /class="app-wordmark"[^>]*>GLUE<\/a>/);
  assert.match(homeHtml, /<h1\s+id="hero-title"><span>GLUE<\/span><\/h1>/);
  assert.match(homeHtml, /GLUE \/ ALBUM &amp; TITLE TRACK/);
  assert.match(homeHtml, /TITLE TRACK \/ 01/);
  assert.match(homeHtml, /GREEN TO BLUE \/ CONCEPT/);
  assert.doesNotMatch(homeHtml, />GREEN\s*(?:→|TO)\s*BLUE<\/a>/i);
});

test("all six routes keep a persistent tab path, including the direct catalog route", () => {
  const routes = ["/", "/concept/", "/visuals/", "/glue/", "/gluedle/", "/catalog/"];
  for (const source of [homeHtml, conceptHtml, visualsHtml, glueHtml, gameHtml, catalogHtml]) {
    assert.match(source, /data-app-header/);
    assert.match(source, /data-route-view/);
    assert.match(source, /type="module" src="\/src\/app\.js"/);
  }
  for (const route of routes) assert.match(appShell, new RegExp(`\\["${route}"`));
  assert.match(appShell, /link\.setAttribute\("aria-current", "page"\)/);
});

test("the dev and preview servers accept page routes without a trailing slash", () => {
  assert.match(viteConfig, /rewriteNoSlashRoute/);
  assert.match(viteConfig, /configureServer\(server\)/);
  assert.match(viteConfig, /configurePreviewServer\(server\)/);
  for (const route of ["concept", "visuals", "glue", "gluedle", "catalog"]) {
    assert.match(viteConfig, new RegExp(`"/${route}"`));
  }
});

test("catalog route is direct-access only and exposes its filters", () => {
  assert.match(appShell, /\["\/catalog\/", \{ label: "曲库", controller: "catalog", nav: false \}\]/);
  assert.match(appShell, /filter\(\(\[, route\]\) => route\.nav !== false\)/);
  assert.doesNotMatch(homeHtml, /href="\/catalog\/"/);
  for (const id of ["catalog-search", "catalog-project", "catalog-language", "catalog-credit", "catalog-results"]) {
    assert.match(catalogHtml, new RegExp(`id="${id}"|data-catalog-${id.replace("catalog-", "")}`));
  }
  assert.match(catalogMain, /loadSongCatalog/);
  assert.match(catalogMain, /normalizeSearchText/);
  assert.match(catalogStyles, /@media\s*\(max-width:\s*680px\)/);
});

test("home exposes three clean editorial routes drawn from the original visual directions", () => {
  for (const route of ["/concept/", "/visuals/", "/glue/"]) {
    assert.match(homeHtml, new RegExp(`href="${route}"`));
    assert.match(viteConfig, new RegExp(`\\.\\/pages${route}index\\.html`));
  }

  assert.match(conceptHtml, /<title>CONCEPT — GLUE \/ CURLEY G<\/title>/);
  assert.match(conceptHtml, /GLUE \/ CONCEPT 01/);
  assert.match(visualsHtml, /<title>VISUALS — GLUE \/ CURLEY G<\/title>/);
  assert.match(visualsHtml, /GLUE \/ VISUAL ARCHIVE/);
  assert.match(glueHtml, /<title>GLUE 01 — CURLEY G<\/title>/);
  assert.match(glueHtml, /\/ BLUE NOISE/);
});

test("editorial routes share navigation, motion, responsive, and content boundaries", () => {
  for (const source of [conceptHtml, visualsHtml, glueHtml]) {
    assert.match(source, /type="module" src="\/src\/app\.js"/);
    assert.match(source, /data-app-header/);
    assert.match(source, /data-route-view/);
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

test("all page styles load before JavaScript and use the persistent app router", () => {
  const contracts = [
    [homeHtml, "/src/styles/site.css"],
    [gameHtml, "/src/styles/gluedle.css"],
    [catalogHtml, "/src/styles/catalog.css"],
    [conceptHtml, "/src/styles/editorial.css"],
    [visualsHtml, "/src/styles/editorial.css"],
    [glueHtml, "/src/styles/editorial.css"],
  ];

  for (const [source, pageStyle] of contracts) {
    const styleIndex = source.indexOf(`<link rel="stylesheet" href="${pageStyle}"`);
    const shellStyleIndex = source.indexOf(
      '<link rel="stylesheet" href="/src/styles/app-shell.css"',
    );
    const transitionIndex = source.indexOf(
      '<link rel="stylesheet" href="/src/styles/transitions.css"',
    );
    const scriptIndex = source.indexOf('<script type="module"');
    assert.ok(styleIndex > -1 && styleIndex < scriptIndex);
    assert.ok(shellStyleIndex > -1 && shellStyleIndex < scriptIndex);
    assert.ok(transitionIndex > -1 && transitionIndex < scriptIndex);
    assert.match(source, /data-route-style/);
  }

  assert.doesNotMatch(
    `${homeMain}\n${gameMain}\n${editorialMain}`,
    /import\s+["']\.\/styles\/(?:site|gluedle|editorial)\.css["']/,
  );
  assert.match(transitionStyles, /@view-transition\s*\{[\s\S]*?navigation:\s*auto/);
  assert.match(transitionStyles, /prefers-reduced-motion:\s*reduce/);
  assert.match(appShell, /document\.startViewTransition/);
  assert.match(appShell, /history\.pushState/);
  assert.match(appShell, /addEventListener\("popstate"/);
  assert.match(appShell, /fetch\(destination\.href/);
  assert.match(appShell, /routeView\.replaceWith\(nextView\)/);
  assert.match(appShell, /function\s+findRouteStyle/);
  assert.match(appShell, /querySelectorAll\(['"]link\[rel=/);
  assert.match(appMain, /createAppShell/);
  assert.match(appShellStyles, /\.app-header\s*\{/);
  assert.doesNotMatch(appShellStyles, /\.site-header|\.section-header|\.game-header/);
  assert.match(appShellStyles, /@media \(max-width:\s*520px\)[\s\S]*?grid-template-columns:\s*48px minmax\(0, 1fr\)[\s\S]*?white-space:\s*nowrap/);
});

test("non-game routes share wheel navigation across explicit content anchors", () => {
  for (const id of ["home", "concept", "story", "visuals", "release", "play", "listen"]) {
    assert.match(homeHtml, new RegExp(`id="${id}"[^>]*\\bdata-scroll-anchor\\b`));
  }

  const routeAnchors = [
    [conceptHtml, ["orbit-hero", "concept-statement", "contact-field", "contact-copy", "next-page"]],
    [visualsHtml, ["visual-collage", "image-sequence", "sequence-item", "next-page"]],
    [glueHtml, ["track-hero", "track-panel", "track-image-field", "track-ripple", "game-bridge"]],
  ];
  for (const [source, classNames] of routeAnchors) {
    for (const className of classNames) {
      assert.match(source, new RegExp(`class="[^"]*${className}[^"]*"[^>]*\\bdata-scroll-anchor\\b`));
    }
  }

  assert.doesNotMatch(gameHtml, /data-scroll-anchor/);
  assert.match(homeMain, /setupAnchorWheelNavigation\(\{\s*signal:\s*abortController\.signal\s*\}\)/);
  assert.match(editorialMain, /setupAnchorWheelNavigation\(\{\s*signal:\s*abortController\.signal\s*\}\)/);

  const wheelNavigation = anchorNavigation;
  assert.match(wheelNavigation, /addEventListener\(\s*["']wheel["']/);
  assert.match(wheelNavigation, /passive:\s*false,\s*signal/);
  assert.match(wheelNavigation, /window\.scrollTo\(\{/);
  assert.match(wheelNavigation, /prefers-reduced-motion:\s*reduce/);
  assert.match(wheelNavigation, /minimumAdvance[\s\S]*window\.innerHeight\s*\*\s*0\.12/);
  assert.match(wheelNavigation, /nestedScrollerCanMove\(event\.target,\s*direction\)/);
  assert.doesNotMatch(wheelNavigation, /scrollIntoView/);
  assert.match(appShellStyles, /\[data-scroll-anchor\]\s*\{[\s\S]*?scroll-margin-top:\s*var\(--header-height\)/);
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

test("home hero links directly to the verified Glue song on QQ Music", () => {
  assert.match(
    homeHtml,
    /class="listen-link"[\s\S]*?href="https:\/\/y\.qq\.com\/n\/ryqq\/songDetail\/000Q9lzD0ag0YJ"[\s\S]*?target="_blank"[\s\S]*?rel="noopener noreferrer"/,
  );
  assert.match(homeHtml, /<span class="listen-link-label">立即收听<\/span>/);
  assert.doesNotMatch(homeHtml, /listen-link-platform|>QQ音乐<\/span>/);
  assert.match(
    appShell,
    /class="app-listen-action"[\s\S]*?href="https:\/\/y\.qq\.com\/n\/ryqq\/songDetail\/000Q9lzD0ag0YJ"[\s\S]*?target="_blank"[\s\S]*?rel="noopener noreferrer"/,
  );
  assert.match(appShell, /立即收听 <span aria-hidden="true">↗<\/span>/);
  assert.match(appShellStyles, /\.app-listen-action,\s*\.app-header-action\s*\{[\s\S]*?min-width:\s*132px[\s\S]*?border:\s*1px solid currentColor/);
  assert.match(appShellStyles, /@media \(max-width:\s*760px\)[\s\S]*?\.app-listen-action,\s*\.app-header-action\s*\{[\s\S]*?min-height:\s*44px/);
});

test("standalone game keeps title-only suggestions, metadata clues, and image sharing", () => {
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
  assert.doesNotMatch(gameMain, /attempt\.comparison\.live|data-live-column/);
  assert.match(gameMain, /renderShareCard\(elements\.shareCanvas, model\)/);
  assert.match(gameHtml, /data-share-preview/);
  assert.match(gameHtml, /data-share-confirm/);
  assert.match(gameHtml, /data-share-download/);
  assert.match(gameMain, /navigator\.canShare/);
  assert.match(gameMain, /已自动保存图片/);
  assert.match(gameHtml, /data-result-reset/);
  assert.match(gameMain, /state = submitGuess\(state, selectedSong\.id, songs\);[\s\S]*?resetSharePreview\(\);/);
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
  assert.equal((gameHtml.match(/\bdata-attempt-marker\b/g) ?? []).length, 8);
  assert.doesNotMatch(gameHtml, /data-live-column|>Live<\/th>/);
  assert.match(gameHtml, /<th\b[^>]*>发行日<\/th>/);
  assert.match(gameHtml, />收藏数<\/th>/);
  assert.match(gameHtml, />专辑<\/th>/);
  assert.doesNotMatch(gameHtml, />项目<\/th>/);
  assert.match(gameHtml, />语言<\/th>/);
});

test("game entry synchronizes progress, reloads JSON data, and randomizes each round", () => {
  assert.match(gameMain, /document\.body\.dataset\.gameState\s*=\s*state\.status/);
  assert.match(gameMain, /document\.body\.dataset\.attempts\s*=\s*String\(/);
  assert.match(
    gameMain,
    /document\.body\.style\.setProperty\(\s*["']--attempt-progress["']/,
  );
  assert.match(gameMain, /querySelectorAll\(\s*["']\[data-attempt-marker\]["']\s*\)/);

  assert.match(songCatalogLoader, /SONG_CATALOG_URL\s*=\s*["']\/data\/gluedle-songs\.json["']/);
  assert.match(gameMain, /loadSongCatalog\(\{ signal \}\)/);
  assert.match(gameMain, /selectRandomAnswer\(choices\)/);
  assert.doesNotMatch(gameMain, /selectDailyAnswer|gluedle:daily|checkForNewDay/);
  const parsedCatalog = JSON.parse(songCatalogJson);
  assert.ok(parsedCatalog.every((song) => ["zh", "en"].includes(song.language)));
  assert.ok(parsedCatalog.every((song) => song.project.type !== "single" || song.project.title === "单曲"));

  assert.match(gameMain, /activeSuggestion\s*===\s*-1/);
  assert.match(
    gameMain,
    /event\.key\s*===\s*["']ArrowDown["']\s*\?\s*0\s*:\s*suggestionSongs\.length\s*-\s*1/,
  );
  assert.match(gameMain, /activeSuggestion\s*=\s*0;[\s\S]*?updateActiveSuggestion\(\)/);
  assert.match(gameMain, /selectSuggestion\(song,\s*\{\s*submit:\s*true\s*\}\)/);
const suggestionsSource = extractFunction(gameMain, "showSuggestions");
assert.match(suggestionsSource, /if\s*\(\s*!query\.trim\(\)\s*\)\s*\{\s*closeSuggestions\(\);\s*return;\s*\}/);
assert.match(suggestionsSource, /songs\.filter\([\s\S]*?!guessedIds\.has\(song\.id\)/);

  const finishBootSource = extractFunction(gameMain, "finishBoot");
  assert.match(finishBootSource, /appBoot\?\.remove\(\)/);
});

test("responsive game ledger exposes every field without horizontal scrolling", () => {
  assert.doesNotMatch(gameStyles, /overflow-x:\s*auto/);
  assert.doesNotMatch(gameStyles, /#guess-board\s*\{[^}]*min-width:\s*8\d{2}px/s);
  assert.match(gameStyles, /#guess-board\s*\{\s*table-layout:\s*fixed;/);
  assert.match(gameStyles, /\.guess-desk\s*\{[\s\S]*?position:\s*fixed[\s\S]*?bottom:\s*var\(--mobile-keyboard-offset/);
  assert.match(gameStyles, /\.game-shell\s*\{[\s\S]*?max-width:\s*1540px/);
  assert.match(gameStyles, /@media\s*\(max-width:\s*1240px\)/);
  for (const field of ["song", "year", "duration", "favoriteCount", "language", "project", "performance", "featuredArtistGender", "credits"]) {
    assert.match(gameMain, new RegExp(`, "${field}",`));
  }
  assert.match(gameMain, /attempt\.comparison\.favoriteCount, "favoriteCount", "收藏数"/);
  assert.match(gameMain, /attempt\.comparison\.featuredArtistGender, "featuredArtistGender", "合作对象"/);
  assert.match(gameMain, /cell\.colSpan = 9/);
  assert.match(gameMain, /field === "year"[\s\S]*?match\[2\].*?match\[3\].*?match\[1\]/);
  assert.match(gameMain, /match\[2\]\}-\$\{match\[3\]\}/);
  assert.match(gameStyles, /#guess-board th:nth-child\(2\) \{ width: 8%; \}/);
  const visibleComparisonHelper = extractFunction(gameMain, "comparisonHelper");
  assert.doesNotMatch(visibleComparisonHelper, /匹配|接近/);
  assert.match(gameMain, /cell\.dataset\.direction = comparison\.direction/);
  assert.match(gameMain, /value\.textContent = formattedValue/);
  assert.match(gameStyles, /\.comparison-cell\[data-direction="up"\]::after/);
  assert.match(gameStyles, /\.comparison-cell\[data-direction="down"\]::after/);
  assert.match(gameStyles, /@media\s*\(max-width:\s*480px\)[\s\S]*?\.comparison-cell\s*\{ height: 44px; \}/);
  assert.doesNotMatch(gameMain, /, "live",/);
});

test("result states use high-contrast colors plus non-color marks", () => {
  for (const [status, mark] of [["match", "✓"], ["near", "≈"], ["miss", "×"]]) {
    assert.ok(gameStyles.includes(`.comparison-cell[data-status="${status}"]`));
    assert.ok(gameMain.includes(`${status}: "${mark}`));
  }
  assert.match(gameMain, /directionMark[\s\S]*?"▲"[\s\S]*?"▼"/);
  assert.match(gameStyles, /\.comparison-cell\[data-direction="up"\]::after[\s\S]*?top:\s*5px[\s\S]*?content:\s*"▲"/);
  assert.match(gameStyles, /\.comparison-cell\[data-direction="down"\]::after[\s\S]*?bottom:\s*5px[\s\S]*?content:\s*"▼"/);
  assert.match(gameStyles, /font:\s*700 var\(--cell-value-size\)/);
  assert.doesNotMatch(gameStyles, /\.comparison-cell\[data-field="(?:song|year|language|featuredArtistGender|credits)"\]\s*\{\s*--cell-value-size/);
  assert.match(gameMain, /attempt\.comparison\.year, "year", "发行日"/);
});

test("game visuals reuse the album image language and restrained home-page tokens", () => {
  const tokenContracts = [
    ["black", "#050505"],
    ["white", "#f4f3ed"],
    ["lake", "#87a8be"],
    ["correct", "#49e99b"],
    ["near", "#ffd75b"],
    ["wrong", "#ff5964"],
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
  assert.match(gameStyles, /\.deduction-panel\s*\{[\s\S]*?background:\s*rgb\(14 16 16 \/ 83%\)/);
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

test("share card uses the home palette and Preview 5 result colors", () => {
  for (const color of ["#050505", "#f4f3ed", "#87a8be", "#49e99b", "#ffd75b", "#ff5964"]) {
    assert.match(shareCardSource, new RegExp(color, "i"));
  }
  assert.doesNotMatch(shareCardSource, /#8e2638/i);
});

test("production build declares all six HTML entries", () => {
  for (const entry of [
    "./pages/index.html",
    "./pages/concept/index.html",
    "./pages/visuals/index.html",
    "./pages/glue/index.html",
    "./pages/gluedle/index.html",
    "./pages/catalog/index.html",
  ]) {
    assert.ok(viteConfig.includes(`"${entry}"`), `${entry} must be a Vite input`);
  }
});
