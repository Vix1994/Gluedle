import {
  FEATURED_ARTIST_GENDER_VALUES,
  getFeaturedArtistGender,
} from "./collaborator-genders.js";

export const SONG_CATALOG_URL = "/data/gluedle-songs.json";
export const SONG_LANGUAGES = Object.freeze(["zh", "en"]);

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
    if (typeof song.releaseDate !== "string" || !/^\d{4}-\d{2}-\d{2}$/u.test(song.releaseDate)) {
      throw new TypeError(`Catalog entry ${song.id} must have a release date.`);
    }
    if (ids.has(song.id)) {
      throw new TypeError(`Catalog song id ${song.id} is duplicated.`);
    }
    if (!SONG_LANGUAGES.includes(song.language)) {
      throw new TypeError(`Catalog entry ${song.id} must declare a supported language.`);
    }
    if (
      !song.curleyCredits
      || typeof song.curleyCredits !== "object"
      || typeof song.curleyCredits.lyrics !== "boolean"
      || typeof song.curleyCredits.composition !== "boolean"
    ) {
      throw new TypeError(`Catalog entry ${song.id} must declare boolean creation credits.`);
    }
    if (!Array.isArray(song.featuredArtists) || song.featuredArtists.some((artist) => (
      typeof artist !== "string" || !artist.trim()
    ))) {
      throw new TypeError(`Catalog entry ${song.id} must declare featured artist names.`);
    }
    if (
      song.featuredArtistGender !== undefined
      && !FEATURED_ARTIST_GENDER_VALUES.includes(song.featuredArtistGender)
    ) {
      throw new TypeError(`Catalog entry ${song.id} must declare a valid featured artist gender.`);
    }
    if (
      song.favoriteCount !== null
      && song.favoriteCount !== undefined
      && (typeof song.favoriteCount !== "number"
        || !Number.isFinite(song.favoriteCount)
        || song.favoriteCount < 0)
    ) {
      throw new TypeError(`Catalog entry ${song.id} must declare a valid favorite count.`);
    }
    if (
      song.favoriteCountDisplay !== null
      && song.favoriteCountDisplay !== undefined
      && (typeof song.favoriteCountDisplay !== "string" || !song.favoriteCountDisplay.trim())
    ) {
      throw new TypeError(`Catalog entry ${song.id} must declare a valid favorite count display.`);
    }
    ids.add(song.id);
  }

  return value.map((song) => ({
    ...song,
    project: normalizeProject(song.project),
    featuredArtistGender: song.featuredArtistGender
      ?? getFeaturedArtistGender(song.featuredArtists),
    favoriteCount: song.favoriteCount ?? null,
    favoriteCountDisplay: song.favoriteCountDisplay?.trim() || null,
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
