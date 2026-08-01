import { readdirSync, readFileSync } from "node:fs";
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

const javaScriptFiles = collectJavaScript(root);

for (const file of javaScriptFiles) {
  try {
    parseAst(readFileSync(file, "utf8"));
  } catch (error) {
    errors.push(`${relative(root, file)}: JavaScript syntax check failed\n${error.message}`);
  }
}

const homeHtml = readFileSync(join(root, "index.html"), "utf8");
const gameHtml = readFileSync(join(root, "gluedle.html"), "utf8");
const homeMain = readFileSync(join(root, "src", "main.js"), "utf8");
const gameMain = readFileSync(join(root, "src", "gluedle.js"), "utf8");
const gameStyles = readFileSync(join(root, "src", "styles", "gluedle.css"), "utf8");
const viteConfig = readFileSync(join(root, "vite.config.js"), "utf8");
const requiredIds = [
  "game-date",
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
  if (!gameHtml.includes(`id="${id}"`)) errors.push(`gluedle.html: missing required #${id}`);
  if (homeHtml.includes(`id="${id}"`)) errors.push(`index.html: game-only #${id} must live on the standalone page`);
}

const releaseBoundaryMarkers = [
  [homeHtml, "index.html", "data-release-title", "published Glue track"],
  [gameHtml, "gluedle.html", "data-game-song-count", "separate game library count"],
  [gameHtml, "gluedle.html", "data-live-column", "Live comparison column"],
];

for (const [source, file, marker, label] of releaseBoundaryMarkers) {
  if (!source.includes(marker)) errors.push(`${file}: missing ${label}`);
}

for (const [source, file, pattern] of [
  [homeHtml, "index.html", /当前只|其余曲目|页面边界|项目声明|不宣称/],
  [gameHtml, "gluedle.html", /不代表《Glue》所在专辑已公布曲目|DATA BOUNDARY/],
]) {
  if (pattern.test(source)) errors.push(`${file}: explanatory disclaimer copy must stay out of the visible experience`);
}

if (homeHtml.includes("data-track-list") || homeMain.includes("function renderCatalog")) {
  errors.push("album story must not render the guessing catalog as a track list");
}

if (
  !gameMain.includes('attempt.comparison.live, "live"')
  || !readFileSync(join(root, "src", "share", "share-card.js"), "utf8")
    .includes('SHARE_FIELDS = ["year", "duration", "project", "language", "live"')
) {
  errors.push("standalone Gluedle: Live comparison must render and be included in shared results");
}

const suggestionsStart = gameMain.indexOf("function showSuggestions");
const suggestionsEnd = gameMain.indexOf("function updateActiveSuggestion");
const suggestionsSource = gameMain.slice(suggestionsStart, suggestionsEnd);
if (
  suggestionsStart < 0
  || suggestionsEnd <= suggestionsStart
  || /releaseYear|durationSec|formatDuration/.test(suggestionsSource)
) {
  errors.push("src/gluedle.js: search suggestions must reveal song titles only");
}

const htmlForbidden = [
  [/<audio\b/i, "audio elements are not allowed"],
  [/播放|试听/, "audio playback language is not allowed"],
  [/<style\b/i, "styles must live in src/styles"],
  [/<script(?![^>]*\bsrc=)[^>]*>/i, "inline scripts are not allowed"],
];

for (const [file, source] of [["index.html", homeHtml], ["gluedle.html", gameHtml]]) {
  for (const [pattern, message] of htmlForbidden) {
    if (pattern.test(source)) errors.push(`${file}: ${message}`);
  }
}

if (!homeHtml.includes('type="module" src="/src/main.js"')) {
  errors.push("index.html: missing Vite module entry");
}
if (!gameHtml.includes('type="module" src="/src/gluedle.js"')) {
  errors.push("gluedle.html: missing Vite module entry");
}
if (!homeMain.includes('import "./styles/site.css";')) {
  errors.push("src/main.js: site.css must be imported from the entry module");
}
if (!gameMain.includes('import "./styles/gluedle.css";')) {
  errors.push("src/gluedle.js: gluedle.css must be imported from the game entry");
}
if (`${homeMain}\n${gameMain}`.includes("scrollInto" + "View")) {
  errors.push("entry modules: prohibited scrolling API found");
}
if (gameMain.includes("toISOString")) {
  errors.push("src/gluedle.js: daily keys must use the visitor's local calendar date");
}
if (
  !gameMain.includes("const dayKey = createLocalDayKey(new Date());")
  || !gameMain.includes("const displayDate = dateFromLocalDayKey(dayKey);")
  || !gameMain.includes("selectDailyAnswer(guessableSongs, dayKey)")
  || !gameMain.includes('const storageKey = `gluedle:daily:${dayKey}:${answer.id}`;')
) {
  errors.push("src/gluedle.js: display, answer selection, and storage must share one local day key");
}

const standaloneLinks = homeHtml.match(/href="\/gluedle\.html"/g) ?? [];
if (
  standaloneLinks.length < 2
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

if (!viteConfig.includes('"./index.html"') || !viteConfig.includes('"./gluedle.html"')) {
  errors.push("vite.config.js: production build must include both HTML entries");
}

if (errors.length) {
  console.error(errors.join("\n\n"));
  process.exitCode = 1;
} else {
  console.log(`Lint passed: ${javaScriptFiles.length} JavaScript files and two-page HTML contracts checked.`);
}
