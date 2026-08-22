import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath, pathToFileURL } from "node:url";
import { dirname, join, resolve } from "node:path";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const catalogPath = join(root, "public", "data", "gluedle-songs.json");
const overridesPath = join(root, "src", "data", "song-origin-overrides.ts");
const originTypeAliases = Object.freeze({
  original: "original",
  cover: "cover",
  原唱: "original",
  翻唱: "cover",
});

type CatalogEntry = { title?: unknown; originType?: unknown };
type OriginTypeAlias = keyof typeof originTypeAliases;

function normalizeOriginType(value: unknown): "original" | "cover" | null {
  return typeof value === "string"
    ? originTypeAliases[value as OriginTypeAlias] ?? null
    : null;
}

const catalog = JSON.parse(readFileSync(catalogPath, "utf8")) as CatalogEntry[];
const currentOverrides = existsSync(overridesPath)
  ? (await import(`${pathToFileURL(overridesPath).href}?updated=${Date.now()}`))
    .SONG_ORIGIN_OVERRIDES as Record<string, unknown>
  : {} as Record<string, unknown>;
const catalogTitles = [...new Set<string>(catalog
  .map((song) => typeof song?.title === "string" ? song.title.trim() : "")
  .filter(Boolean))];
const catalogOriginTypes = new Map<string, "original" | "cover">(catalog
  .filter((song) => typeof song?.title === "string" && normalizeOriginType(song.originType))
  .map((song) => [String(song.title).trim(), normalizeOriginType(song.originType)!]));

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
