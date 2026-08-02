import {
  FEATURED_ARTIST_GENDER_VALUES,
  getFeaturedArtistGender,
} from "./collaborator-genders.js";
import {
  getProjectDisplay,
  getSongProject,
  getSongProjectCategory,
} from "./project-categories.js";
import { getSongOriginType, SONG_ORIGIN_VALUES } from "./song-provenance.js";

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
    if (song.originType !== undefined && song.originType !== null
      && !SONG_ORIGIN_VALUES.includes(song.originType)) {
      throw new TypeError(`Catalog entry ${song.id} must declare a valid origin type.`);
    }
    if (
      !song.curleyCredits
      || typeof song.curleyCredits !== "object"
      || typeof song.curleyCredits.lyrics !== "boolean"
      || typeof song.curleyCredits.composition !== "boolean"
    ) {
      throw new TypeError(`Catalog entry ${song.id} must declare boolean creation credits.`);
    }
    if (
      song.hintLyrics !== undefined
      && (!Array.isArray(song.hintLyrics)
        || song.hintLyrics.length > 3
        || song.hintLyrics.some((hint) => typeof hint !== "string" || !hint.trim()))
    ) {
      throw new TypeError(`Catalog entry ${song.id} must declare up to three lyric hints.`);
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
    project: normalizeProject(song.project, song.title),
    originType: getSongOriginType(song.title) ?? song.originType ?? null,
    featuredArtistGender: song.featuredArtistGender
      ?? getFeaturedArtistGender(song.featuredArtists),
    favoriteCount: song.favoriteCount ?? null,
    favoriteCountDisplay: song.favoriteCountDisplay?.trim() || null,
    hintLyrics: [...new Set((song.hintLyrics ?? [])
      .map((hint) => hint.trim())
      .filter(Boolean))].slice(0, 3),
  }));
}

export function normalizeProject(project, songTitle = "") {
  const sourceProject = getSongProject({ title: songTitle, project });
  const type = typeof sourceProject?.type === "string"
    ? sourceProject.type.trim().toLowerCase()
    : "";
  const collectionTypes = new Set(["album", "ep", "ost", "live", "soundtrack", "soundtrack album"]);
  const rawTitle = typeof sourceProject?.title === "string" && sourceProject.title.trim()
    ? sourceProject.title.trim()
    : "单曲";
  if (!collectionTypes.has(type)) {
    const inferredCategory = getSongProjectCategory({
      title: songTitle,
      project: {
        ...sourceProject,
        title: rawTitle,
        type,
      },
    });
    const category = inferredCategory === "album" ? "single" : inferredCategory;
    return {
      title: category === "single" ? "单曲" : rawTitle,
      type: "single",
      category,
      display: getProjectDisplay({ title: rawTitle, type: "single", category }),
    };
  }
  const title = rawTitle === "单曲" ? "待核验" : rawTitle;
  const category = getSongProjectCategory({
    title: songTitle,
    project: {
      ...sourceProject,
      title,
      type,
    },
  });
  return {
    title: category === "single" ? "单曲" : title,
    type,
    category,
    display: getProjectDisplay({ title, type, category }),
  };
}
