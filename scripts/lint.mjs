import { readdirSync, readFileSync } from "node:fs";
import { extname, join, relative } from "node:path";
import { spawnSync } from "node:child_process";

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

for (const file of collectJavaScript(root)) {
  const result = spawnSync(process.execPath, ["--check", file], { encoding: "utf8" });
  if (result.status !== 0) {
    errors.push(`${relative(root, file)}: JavaScript syntax check failed\n${result.stderr.trim()}`);
  }
}

const html = readFileSync(join(root, "index.html"), "utf8");
const main = readFileSync(join(root, "src", "main.js"), "utf8");
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
  if (!html.includes(`id="${id}"`)) errors.push(`index.html: missing required #${id}`);
}

const htmlForbidden = [
  [/<audio\b/i, "audio elements are not allowed"],
  [/播放|试听/, "audio playback language is not allowed"],
  [/<style\b/i, "styles must live in src/styles"],
  [/<script(?![^>]*\bsrc=)[^>]*>/i, "inline scripts are not allowed"],
];

for (const [pattern, message] of htmlForbidden) {
  if (pattern.test(html)) errors.push(`index.html: ${message}`);
}

if (!html.includes('type="module" src="/src/main.js"')) {
  errors.push("index.html: missing Vite module entry");
}
if (!main.includes("import './styles/site.css';")) {
  errors.push("src/main.js: site.css must be imported from the entry module");
}
if (main.includes("scrollInto" + "View")) {
  errors.push("src/main.js: prohibited scrolling API found");
}
if (main.includes("toISOString")) {
  errors.push("src/main.js: daily keys must use the visitor's local calendar date");
}
if (
  !main.includes("const dayKey = createLocalDayKey(today);")
  || !main.includes("const displayDate = dateFromLocalDayKey(dayKey);")
  || !main.includes("selectDailyAnswer(guessableSongs, dayKey)")
  || !main.includes('const storageKey = `gluedle:daily:${dayKey}:${answer.id}`;')
  || !main.includes('const lines = [`GLUEDLE ${dayKey} ${outcome}`];')
) {
  errors.push("src/main.js: display, answer selection, storage, and sharing must share one local day key");
}

if (errors.length) {
  console.error(errors.join("\n\n"));
  process.exitCode = 1;
} else {
  console.log(`Lint passed: ${collectJavaScript(root).length} JavaScript files and HTML contracts checked.`);
}
