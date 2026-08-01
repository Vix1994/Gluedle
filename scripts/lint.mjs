import { existsSync, readdirSync, readFileSync } from "node:fs";
import { extname, join, relative } from "node:path";
import { parseAst } from "rolldown/parseAst";

const root = process.cwd();
const errors = [];
const ignoredDirectories = new Set([".git", "dist", "node_modules", "visual-previews-v2"]);

function collectJavaScript(directory) {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    if (ignoredDirectories.has(entry.name)) return [];
    const path = join(directory, entry.name);
    if (entry.isDirectory()) return collectJavaScript(path);
    return extname(entry.name) === ".js" || extname(entry.name) === ".mjs" ? [path] : [];
  });
}

function extractFunction(source, name) {
  const signature = new RegExp(`\\b(?:async\\s+)?function\\s+${name}\\s*\\(`).exec(source);
  if (!signature) return null;
  const openingBrace = source.indexOf("{", signature.index);
  if (openingBrace < 0) return null;

  let depth = 0;
  for (let index = openingBrace; index < source.length; index += 1) {
    if (source[index] === "{") depth += 1;
    if (source[index] !== "}") continue;
    depth -= 1;
    if (depth === 0) return source.slice(signature.index, index + 1);
  }
  return null;
}

const javaScriptFiles = collectJavaScript(root);
const sourceJavaScriptFiles = collectJavaScript(join(root, "src"));

for (const file of javaScriptFiles) {
  try {
    parseAst(readFileSync(file, "utf8"));
  } catch (error) {
    errors.push(`${relative(root, file)}: JavaScript syntax check failed\n${error.message}`);
  }
}

const homeHtml = readFileSync(join(root, "index.html"), "utf8");
const gameHtmlLabel = "gluedle/index.html";
const gameHtml = readFileSync(join(root, "gluedle", "index.html"), "utf8");
const editorialHtmlFiles = ["concept", "visuals", "glue"].map((route) => ({
  route,
  label: `${route}/index.html`,
  source: readFileSync(join(root, route, "index.html"), "utf8"),
}));
const homeMain = readFileSync(join(root, "src", "main.js"), "utf8");
const anchorNavigation = readFileSync(join(root, "src", "anchor-wheel-navigation.js"), "utf8");
const gameMain = readFileSync(join(root, "src", "gluedle.js"), "utf8");
const editorialMain = readFileSync(join(root, "src", "editorial.js"), "utf8");
const appMain = readFileSync(join(root, "src", "app.js"), "utf8");
const appShell = readFileSync(join(root, "src", "app-shell.js"), "utf8");
const appShellStyles = readFileSync(join(root, "src", "styles", "app-shell.css"), "utf8");
const editorialStyles = readFileSync(join(root, "src", "styles", "editorial.css"), "utf8");
const transitionStyles = readFileSync(join(root, "src", "styles", "transitions.css"), "utf8");
const gameStyleDirectory = join(root, "src", "styles");
const gameStyleFileNames = readdirSync(gameStyleDirectory)
  .filter((name) => /^gluedle.*\.css$/.test(name))
  .sort();
const gameStyleFiles = gameStyleFileNames.map((name) => ({
  name,
  source: readFileSync(join(gameStyleDirectory, name), "utf8"),
}));
const gameStyleEntry = gameStyleFiles.find(({ name }) => name === "gluedle.css")?.source ?? "";
const gameStyles = gameStyleFiles.map(({ source }) => source).join("\n");
const shareCardSource = readFileSync(join(root, "src", "share", "share-card.js"), "utf8");
const songCatalogSource = readFileSync(join(root, "src", "data", "song-catalog.js"), "utf8");
const songCatalogJson = readFileSync(join(root, "public", "data", "gluedle-songs.json"), "utf8");
const viteConfig = readFileSync(join(root, "vite.config.js"), "utf8");
const requiredIds = [
  "game-round",
  "game-status",
  "guess-form",
  "song-input",
  "song-suggestions",
  "guess-submit",
  "guess-feedback",
  "guess-board",
  "attempt-count",
  "share-button",
  "reset-button",
  "help-dialog",
  "result-dialog",
];

for (const id of requiredIds) {
  if (!gameHtml.includes(`id="${id}"`)) errors.push(`${gameHtmlLabel}: missing required #${id}`);
  if (homeHtml.includes(`id="${id}"`)) errors.push(`index.html: game-only #${id} must live on the standalone page`);
}

const releaseBoundaryMarkers = [
  [homeHtml, "index.html", "data-release-title", "published Glue track"],
  [gameHtml, gameHtmlLabel, "data-game-song-count", "separate game library count"],
  [gameHtml, gameHtmlLabel, "data-live-column", "Live comparison column"],
];

for (const [source, file, marker, label] of releaseBoundaryMarkers) {
  if (!source.includes(marker)) errors.push(`${file}: missing ${label}`);
}

for (const [source, file, pattern] of [
  [homeHtml, "index.html", /当前只|其余曲目|页面边界|项目声明|不宣称/],
  [gameHtml, gameHtmlLabel, /不代表《Glue》所在专辑已公布曲目|DATA BOUNDARY/],
]) {
  if (pattern.test(source)) errors.push(`${file}: explanatory disclaimer copy must stay out of the visible experience`);
}

if (homeHtml.includes("data-track-list") || homeMain.includes("function renderCatalog")) {
  errors.push("album story must not render the guessing catalog as a track list");
}

if (
  !gameMain.includes('attempt.comparison.live, "live"')
  || !shareCardSource.includes('SHARE_FIELDS = ["year", "duration", "project", "live"')
) {
  errors.push("standalone Gluedle: Live comparison must render and be included in shared results");
}

const suggestionsSource = extractFunction(gameMain, "showSuggestions");
if (
  !suggestionsSource
  || /releaseYear|durationSec|formatDuration|\.project\b|\.languages?\b/.test(suggestionsSource)
  || !/option\.textContent\s*=\s*song\.title\s*;/.test(suggestionsSource)
  || /option\.(?:innerHTML|outerHTML|insertAdjacentHTML|append|prepend|replaceChildren)\b/
    .test(suggestionsSource)
) {
  errors.push("src/gluedle.js: search suggestions must reveal song titles only");
}

if (
  !suggestionsSource
  || !/songs\.filter\([\s\S]*?!guessedIds\.has\(song\.id\)[\s\S]*?\)/
    .test(suggestionsSource)
) {
  errors.push("src/gluedle.js: empty-query suggestions must exclude guessed songs before limiting results");
}

const htmlForbidden = [
  [/<audio\b/i, "audio elements are not allowed"],
  [/播放|试听/, "audio playback language is not allowed"],
  [/<style\b/i, "styles must live in src/styles"],
  [/<script(?![^>]*\bsrc=)[^>]*>/i, "inline scripts are not allowed"],
];

for (const [file, source] of [
  ["index.html", homeHtml],
  [gameHtmlLabel, gameHtml],
  ...editorialHtmlFiles.map(({ label, source }) => [label, source]),
]) {
  for (const [pattern, message] of htmlForbidden) {
    if (pattern.test(source)) errors.push(`${file}: ${message}`);
  }
}

if (!homeHtml.includes('type="module" src="/src/app.js"')) {
  errors.push("index.html: missing Vite module entry");
}
if (!gameHtml.includes('type="module" src="/src/app.js"')) {
  errors.push(`${gameHtmlLabel}: missing Vite module entry`);
}
const htmlStyleContracts = [
  [homeHtml, "index.html", "/src/styles/site.css"],
  [gameHtml, gameHtmlLabel, "/src/styles/gluedle.css"],
  ...editorialHtmlFiles.map(({ label, source }) => [source, label, "/src/styles/editorial.css"]),
];
for (const [source, label, pageStyle] of htmlStyleContracts) {
  if (
    !source.includes(`<link rel="stylesheet" href="${pageStyle}"`)
    || !source.includes('<link rel="stylesheet" href="/src/styles/app-shell.css"')
    || !source.includes('<link rel="stylesheet" href="/src/styles/transitions.css"')
    || !source.includes("data-route-style")
  ) {
    errors.push(`${label}: page and transition styles must load directly in <head>`);
  }
}
if (
  /import\s+["']\.\/styles\/(?:site|gluedle|editorial)\.css["']/.test(
    `${homeMain}\n${gameMain}\n${editorialMain}`,
  )
) {
  errors.push("page styles must not wait for JavaScript module imports");
}
if (
  !/@view-transition\s*\{[\s\S]*?navigation:\s*auto/.test(transitionStyles)
  || !/prefers-reduced-motion:\s*reduce/.test(transitionStyles)
  || !/document\.startViewTransition/.test(appShell)
  || !/history\.pushState/.test(appShell)
  || !/addEventListener\("popstate"/.test(appShell)
  || !/fetch\(destination\.href/.test(appShell)
  || !/routeView\.replaceWith\(nextView\)/.test(appShell)
  || !/function\s+findRouteStyle/.test(appShell)
  || !/querySelectorAll\(['"]link\[rel=/.test(appShell)
) {
  errors.push("shared app shell must provide client-side History routing and reduced-motion-safe transitions");
}

for (const { label, source } of editorialHtmlFiles) {
  if (
    !source.includes('type="module" src="/src/app.js"')
    || !source.includes("data-app-header")
    || !source.includes("data-route-view")
  ) {
    errors.push(`${label}: missing the shared app shell or clean-route content entry`);
  }

  if (/<audio\b|播放|试听|20\d{2}[-年/]|\b\d{1,2}:\d{2}\b/i.test(source)) {
    errors.push(`${label}: must not fabricate or expose audio, dates, years, or duration metadata`);
  }
}

if (
  !/@media\s*\(max-width:\s*720px\)/.test(editorialStyles)
  || !/@media\s*\(prefers-reduced-motion:\s*reduce\)/.test(editorialStyles)
  || /scrollIntoView/.test(editorialMain)
) {
  errors.push("editorial pages: shared motion must remain responsive, reduced-motion safe, and iframe safe");
}

const homeAnchorIds = ["home", "concept", "story", "visuals", "release", "play", "listen"];
const editorialAnchorClasses = [
  [editorialHtmlFiles[0].source, ["orbit-hero", "concept-statement", "contact-field", "contact-copy", "next-page"]],
  [editorialHtmlFiles[1].source, ["visual-collage", "image-sequence", "sequence-item", "next-page"]],
  [editorialHtmlFiles[2].source, ["track-hero", "track-panel", "track-image-field", "track-ripple", "game-bridge"]],
];
if (
  homeAnchorIds.some((id) => !new RegExp(`id="${id}"[^>]*\\bdata-scroll-anchor\\b`).test(homeHtml))
  || editorialAnchorClasses.some(([source, classNames]) => classNames.some(
    (className) => !new RegExp(`class="[^"]*${className}[^"]*"[^>]*\\bdata-scroll-anchor\\b`).test(source),
  ))
  || /data-scroll-anchor/.test(gameHtml)
  || !/setupAnchorWheelNavigation\(\{\s*signal:\s*abortController\.signal\s*\}\)/.test(homeMain)
  || !/setupAnchorWheelNavigation\(\{\s*signal:\s*abortController\.signal\s*\}\)/.test(editorialMain)
  || !/addEventListener\(\s*["']wheel["']/.test(anchorNavigation)
  || !/passive:\s*false,\s*signal/.test(anchorNavigation)
  || !/window\.scrollTo\(\{/.test(anchorNavigation)
  || !/prefers-reduced-motion:\s*reduce/.test(anchorNavigation)
  || !/minimumAdvance[\s\S]*window\.innerHeight\s*\*\s*0\.12/.test(anchorNavigation)
  || !/nestedScrollerCanMove\(event\.target,\s*direction\)/.test(anchorNavigation)
  || !/\[data-scroll-anchor\]\s*\{[\s\S]*?scroll-margin-top:\s*var\(--header-height\)/.test(appShellStyles)
) {
  errors.push("non-game routes: shared wheel navigation must advance through explicit anchors without trapping nested scrollers");
}

if (
  !/<title>GLUE — CURLEY G<\/title>/.test(homeHtml)
  || !/class="app-wordmark"[^>]*>GLUE<\/a>/.test(appShell)
  || !/<h1\s+id="hero-title"><span>GLUE<\/span><\/h1>/.test(homeHtml)
  || !/GLUE \/ ALBUM &amp; TITLE TRACK/.test(homeHtml)
  || !/TITLE TRACK \/ 01/.test(homeHtml)
  || !/GREEN TO BLUE \/ CONCEPT/.test(homeHtml)
  || />GREEN\s*(?:→|TO)\s*BLUE<\/a>/i.test(homeHtml)
) {
  errors.push("site identity: GLUE must lead the album site and Green to Blue must remain a concept chapter");
}

const sharedRoutes = ["/", "/concept/", "/visuals/", "/glue/", "/gluedle/"];
if (
  sharedRoutes.some((href) => !appShell.includes(`["${href}"`))
  || !appShell.includes('link.setAttribute("aria-current", "page")')
  || !gameHtml.includes("data-app-header")
) {
  errors.push("shared app shell: persistent five-route navigation and current tab are required");
}

if (
  !appMain.includes("createAppShell")
  || !/\.app-header\s*\{/.test(appShellStyles)
  || !/@media\s*\(max-width:\s*760px\)/.test(appShellStyles)
  || /\.site-header|\.section-header|\.game-header/.test(appShellStyles)
) {
  errors.push("the single shared header must own its desktop and mobile structure");
}

for (const { name, source } of gameStyleFiles) {
  if (source.split(/\r?\n/).length > 1000) {
    errors.push(`src/styles/${name}: game stylesheet parts must not exceed 1000 lines`);
  }
}

const importedGameStyles = [...gameStyleEntry
  .matchAll(/@import\s+(?:url\(\s*)?["']([^"']+)["']\s*\)?\s*;/g)]
  .map((match) => match[1]);
const importedGameStyleNames = importedGameStyles.map((path) => path.slice(2)).sort();
const expectedGameStyleNames = gameStyleFileNames.filter((name) => name !== "gluedle.css");
const entryWithoutImports = gameStyleEntry
  .replace(/\/\*[\s\S]*?\*\//g, "")
  .replace(/@import\s+(?:url\(\s*)?["'][^"']+["']\s*\)?\s*;/g, "")
  .trim();
if (
  gameStyleFiles.length < 2
  || importedGameStyles.length === 0
  || importedGameStyles.some((path) =>
    !/^\.\/gluedle[^/]*\.css$/.test(path)
    || !existsSync(join(gameStyleDirectory, path)))
  || JSON.stringify(importedGameStyleNames) !== JSON.stringify(expectedGameStyleNames)
  || entryWithoutImports !== ""
) {
  errors.push(
    "src/styles/gluedle.css: entry must contain only imports for every existing local gluedle*.css part",
  );
}
const prohibitedScrollingApi = "scrollInto" + "View";
for (const file of sourceJavaScriptFiles) {
  if (readFileSync(file, "utf8").includes(prohibitedScrollingApi)) {
    errors.push(`${relative(root, file)}: prohibited scrolling API found`);
  }
}
const parsedSongCatalog = JSON.parse(songCatalogJson);
if (
  !songCatalogSource.includes('SONG_CATALOG_URL = "/data/gluedle-songs.json"')
  || !gameMain.includes("loadSongCatalog({ signal })")
  || !Array.isArray(parsedSongCatalog)
  || parsedSongCatalog.some((song) => "language" in song || "languages" in song)
  || parsedSongCatalog.some((song) => song.project?.type === "single" && song.project?.title !== "单曲")
) {
  errors.push("Gluedle must load the language-free JSON catalog and normalize independent releases to 单曲");
}

const inputTag = /<input\b[^>]*\bid="song-input"[^>]*>/i.exec(gameHtml)?.[0] ?? "";
const listboxTag = /<ul\b[^>]*\bid="song-suggestions"[^>]*>/i.exec(gameHtml)?.[0] ?? "";
if (
  !/\brole="combobox"/.test(inputTag)
  || !/\baria-autocomplete="list"/.test(inputTag)
  || !/\baria-controls="song-suggestions"/.test(inputTag)
  || !/\baria-expanded="false"/.test(inputTag)
  || !/\brole="listbox"/.test(listboxTag)
) {
  errors.push(`${gameHtmlLabel}: song search must expose an associated combobox and listbox`);
}

if (
  !/<body\b[^>]*\bdata-game-state="loading"[^>]*\bdata-attempts="0"/.test(gameHtml)
  || !/\bdata-app-boot\b[^>]*\brole="status"/.test(gameHtml)
  || !gameHtml.includes("<noscript>")
) {
  errors.push(`${gameHtmlLabel}: game shell must expose boot fallback and initial state hooks`);
}

if (
  (gameHtml.match(/\bdata-attempt-marker\b/g) ?? []).length !== 6
) {
  errors.push(`${gameHtmlLabel}: game must expose six attempt markers`);
}

if (
  !gameMain.includes("selectRandomAnswer(choices)")
  || /selectDailyAnswer|gluedle:daily|checkForNewDay/.test(gameMain)
) {
  errors.push("src/gluedle.js: each new round must select a random answer without daily state");
}

if (/overflow-x:\s*auto|min-width:\s*8\d{2}px/.test(gameStyles)) {
  errors.push("src/styles/gluedle.css: the deduction ledger must not require horizontal scrolling");
}

if (
  !/document\.body\.dataset\.gameState\s*=\s*state\.status/.test(gameMain)
  || !/document\.body\.dataset\.attempts\s*=\s*String\(/.test(gameMain)
  || !/document\.body\.style\.setProperty\(\s*["']--attempt-progress["']/.test(gameMain)
  || !/querySelectorAll\(\s*["']\[data-attempt-marker\]["']\s*\)/.test(gameMain)
) {
  errors.push("src/gluedle.js: rendered progress must synchronize data attributes, CSS progress, and markers");
}

if (
  !/activeSuggestion\s*===\s*-1/.test(gameMain)
  || !/event\.key\s*===\s*["']ArrowDown["']\s*\?\s*0\s*:\s*suggestionSongs\.length\s*-\s*1/
    .test(gameMain)
) {
  errors.push("src/gluedle.js: ArrowUp from an unselected combobox must activate the last suggestion");
}

const standaloneLinks = homeHtml.match(/href="\/gluedle\/"/g) ?? [];
if (
  standaloneLinks.length < 1
  || !/PLAY GLUEDLE/.test(appShell)
  || /href="[^"]*gluedle\.html/.test(homeHtml)
  || homeHtml.includes('href="#gluedle"')
  || homeMain.includes("bindGameActions")
  || homeHtml.includes('id="guess-form"')
) {
  errors.push("index.html: Gluedle must use a prominent standalone entry without embedding the game");
}

const socialContracts = [
  "https://weibo.com/u/5948723938",
  "https://y.qq.com/n/ryqq/singer/000PJRig3WnHYX",
  "https://music.163.com/#/artist?id=12664439",
];
if (
  socialContracts.some((url) => !homeHtml.includes(url))
  || (homeHtml.match(/rel="noopener noreferrer"/g) ?? []).length < socialContracts.length
) {
  errors.push("index.html: verified Weibo, QQ Music, and NetEase artist links must be present and safe");
}

if (
  !/class="listen-link"[\s\S]*?href="https:\/\/y\.qq\.com\/n\/ryqq\/songDetail\/000Q9lzD0ag0YJ"[\s\S]*?target="_blank"[\s\S]*?rel="noopener noreferrer"/.test(homeHtml)
  || !/<span class="listen-link-label">立即收听<\/span>/.test(homeHtml)
  || /listen-link-platform|>QQ音乐<\/span>/.test(homeHtml)
  || !/class="app-listen-action"[\s\S]*?href="https:\/\/y\.qq\.com\/n\/ryqq\/songDetail\/000Q9lzD0ag0YJ"[\s\S]*?target="_blank"[\s\S]*?rel="noopener noreferrer"/.test(appShell)
  || !/立即收听 <span aria-hidden="true">↗<\/span>/.test(appShell)
  || !/\.app-listen-action,\s*\.app-header-action\s*\{[\s\S]*?min-width:\s*132px[\s\S]*?border:\s*1px solid currentColor/.test(appShellStyles)
  || !/@media \(max-width:\s*760px\)[\s\S]*?\.app-listen-action,\s*\.app-header-action\s*\{[\s\S]*?min-height:\s*44px/.test(appShellStyles)
) {
  errors.push("site shell and home hero must expose the verified Glue QQ Music song link safely");
}

if (
  !gameMain.includes("renderShareCard(elements.shareCanvas, model)")
  || !gameMain.includes("navigator.canShare({ files: [file] })")
  || !gameMain.includes("downloadBlob(blob, filename)")
  || !gameHtml.includes("data-share-canvas")
) {
  errors.push("standalone Gluedle: share-image flow must support native file sharing and PNG download");
}

for (const [status, mark] of [["match", "✓"], ["near", "≈"], ["miss", "×"]]) {
  if (
    !gameStyles.includes(`.comparison-cell[data-status="${status}"]`)
    || !gameStyles.includes(`content: "${mark}"`)
  ) {
    errors.push(`src/styles/gluedle.css: ${status} results need a strong color and non-color mark`);
  }
}

const visualTokens = [
  ["black", "#050505"],
  ["white", "#f4f3ed"],
  ["lake", "#87a8be"],
  ["correct", "#a6c7a2"],
  ["near", "#d5d0ad"],
  ["wrong", "#626a70"],
];
if (visualTokens.some(([name, value]) =>
  !new RegExp(`--${name}:\\s*${value}`, "i").test(gameStyles))) {
  errors.push("src/styles/gluedle.css: game must reuse the home black/paper/lake and muted state tokens");
}

const albumAssets = [...gameStyles.matchAll(/url\(["']?(\/assets\/glue\/[^"')]+)["']?\)/g)]
  .map((match) => match[1]);
if (
  albumAssets.length === 0
  || albumAssets.some((asset) => !existsSync(join(root, "public", asset.slice(1))))
) {
  errors.push("src/styles/gluedle.css: album image references must resolve under public/assets/glue");
}

if (
  !/<meta\s+name="theme-color"\s+content="#050505"\s*\/>/i.test(gameHtml)
  || !/@media\s*\([^)]*(?:min|max)-width[^)]*\)/.test(gameStyles)
  || !/@media\s*\(prefers-reduced-motion:\s*reduce\)/.test(gameStyles)
) {
  errors.push("standalone Gluedle: theme color, responsive layout, and reduced motion are required");
}

const retiredNeonColors = /#22e6a7|#ffd166|#ff8ca1/i;
if (retiredNeonColors.test(`${gameStyles}\n${shareCardSource}`)) {
  errors.push("standalone Gluedle: retired neon state colors must not return");
}

for (const color of ["#050505", "#f4f3ed", "#87a8be", "#a6c7a2", "#d5d0ad", "#626a70"]) {
  if (!shareCardSource.toLowerCase().includes(color)) {
    errors.push(`src/share/share-card.js: missing restrained share-card color ${color}`);
  }
}
if (/#8e2638/i.test(shareCardSource)) {
  errors.push("src/share/share-card.js: saturated legacy miss color must not return");
}

const viteInputs = [
  "./index.html",
  "./concept/index.html",
  "./visuals/index.html",
  "./glue/index.html",
  "./gluedle/index.html",
];
if (viteInputs.some((input) => !viteConfig.includes(`"${input}"`))) {
  errors.push("vite.config.js: production build must include all five HTML entries");
}

if (errors.length) {
  console.error(errors.join("\n\n"));
  process.exitCode = 1;
} else {
  console.log(`Lint passed: ${javaScriptFiles.length} JavaScript files and five-page HTML contracts checked.`);
}
