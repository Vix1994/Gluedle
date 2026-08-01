export const SONG_CATALOG_URL = "/data/gluedle-songs.json";

export async function loadSongCatalog({ signal, fetchImpl = globalThis.fetch } = {}) {
  if (typeof fetchImpl !== "function") {
    throw new TypeError("A fetch implementation is required to load the song catalog.");
  }

  const response = await fetchImpl(SONG_CATALOG_URL, { signal });
  if (!response.ok) {
    throw new Error(`Song catalog request failed with ${response.status}.`);
  }
  return validateSongCatalog(await response.json());
}

export function validateSongCatalog(value) {
  if (!Array.isArray(value) || value.length === 0) {
    throw new TypeError("The song catalog must be a non-empty JSON array.");
  }

  const ids = new Set();
  for (const song of value) {
    if (!song || typeof song !== "object" || typeof song.id !== "string" || !song.id) {
      throw new TypeError("Every catalog entry must have a non-empty id.");
    }
    if (typeof song.title !== "string" || !song.title.trim()) {
      throw new TypeError(`Catalog entry ${song.id} must have a title.`);
    }
    if (ids.has(song.id)) {
      throw new TypeError(`Catalog song id ${song.id} is duplicated.`);
    }
    if (Object.hasOwn(song, "languages") || Object.hasOwn(song, "language")) {
      throw new TypeError(`Catalog entry ${song.id} must not declare a language.`);
    }
    ids.add(song.id);
  }

  return value.map((song) => ({
    ...song,
    project: normalizeProject(song.project),
  }));
}

export function normalizeProject(project) {
  const type = typeof project?.type === "string" ? project.type.trim().toLowerCase() : "";
  const collectionTypes = new Set(["album", "ep", "ost", "soundtrack", "soundtrack album"]);
  if (!collectionTypes.has(type)) {
    return { title: "单曲", type: "single" };
  }
  const title = typeof project?.title === "string" && project.title.trim()
    ? project.title.trim()
    : "待核验";
  return { title, type };
}
