import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath, pathToFileURL } from "node:url";
import { dirname, join, resolve } from "node:path";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const catalogPath = join(root, "public", "data", "gluedle-songs.json");
const overridesPath = join(root, "src", "data", "song-origin-overrides.js");
const originTypeAliases = Object.freeze({
  original: "original",
  cover: "cover",
  原唱: "original",
  翻唱: "cover",
});

function normalizeOriginType(value) {
  return originTypeAliases[value] ?? null;
}

const catalog = JSON.parse(readFileSync(catalogPath, "utf8"));
const currentOverrides = existsSync(overridesPath)
  ? (await import(`${pathToFileURL(overridesPath).href}?updated=${Date.now()}`))
    .SONG_ORIGIN_OVERRIDES
  : {};
const catalogTitles = [...new Set(catalog
  .map((song) => typeof song?.title === "string" ? song.title.trim() : "")
  .filter(Boolean))];
const catalogOriginTypes = new Map(catalog
  .filter((song) => typeof song?.title === "string" && normalizeOriginType(song.originType))
  .map((song) => [song.title.trim(), normalizeOriginType(song.originType)]));

const entries = catalogTitles.map((title) => {
  const currentValue = currentOverrides?.[title];
  const value = normalizeOriginType(currentValue)
    ? currentValue
    : catalogOriginTypes.get(title) ?? null;
  return `  ${JSON.stringify(title)}: ${JSON.stringify(value)},`;
});

const source = [
  "/**",
  " * Initialized from public/data/gluedle-songs.json.",
  " * Manually set each value to \"original\"/\"原唱\" or \"cover\"/\"翻唱\"; null defaults to \"original\".",
  " * Re-run npm run sync:origin-config after the catalog changes to add new titles.",
  " */",
  "export const SONG_ORIGIN_OVERRIDES = Object.freeze({",
  ...entries,
  "});",
  "",
].join("\n");

writeFileSync(overridesPath, source, "utf8");
const configuredCount = catalogTitles.filter((title) => (
  normalizeOriginType(currentOverrides?.[title]) || normalizeOriginType(catalogOriginTypes.get(title))
)).length;
console.log(`Initialized ${catalogTitles.length} song origin entries; preserved ${configuredCount} configured values.`);
