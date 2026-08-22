import {
  FEATURED_ARTIST_GENDER_VALUES,
  getFeaturedArtistGender,
} from "./collaborator-genders.ts";
import {
  getProjectDisplay,
  getSongProject,
  getSongProjectCategory,
} from "./project-categories.ts";
import { getSongOriginType, SONG_ORIGIN_VALUES } from "./song-provenance.ts";
import type {
  FeaturedArtistGender,
  PerformanceType,
  Song,
  SongCredits,
  SongLanguage,
  SongOriginType,
  SongProject,
  SongSource,
} from "../types.ts";

export const SONG_CATALOG_URL = "/data/gluedle-songs.json";
export const SONG_LANGUAGES = Object.freeze(["zh", "en"]);
const PERFORMANCE_TYPES = Object.freeze(["solo", "collaboration", "duet"]);

interface LoadSongCatalogOptions {
  signal?: AbortSignal;
  fetchImpl?: typeof globalThis.fetch;
}

interface CatalogEntry extends Record<string, unknown> {
  id: string;
  title: string;
  aliases?: string[];
  releaseDate: string;
  durationSec?: number | null;
  favoriteCount?: number | null;
  favoriteCountDisplay?: string | null;
  language: SongLanguage;
  performanceType?: PerformanceType | null;
  originType?: SongOriginType | null;
  featuredArtists: string[];
  featuredArtistGender?: FeaturedArtistGender;
  curleyCredits: SongCredits;
  hintLyrics?: string[];
  project: Record<string, unknown>;
  sources: SongSource[];
  guessable?: boolean;
}

export async function loadSongCatalog(
  { signal, fetchImpl = globalThis.fetch }: LoadSongCatalogOptions = {},
): Promise<Song[]> {
  if (typeof fetchImpl !== "function") {
    throw new TypeError("A fetch implementation is required to load the song catalog.");
  }

  const response = await fetchImpl(SONG_CATALOG_URL, { signal });
  if (!response.ok) {
    throw new Error(`Song catalog request failed with ${response.status}.`);
  }
  return validateSongCatalog(await response.json());
}

export function validateSongCatalog(value: unknown): Song[] {
  if (!Array.isArray(value) || value.length === 0) {
    throw new TypeError("The song catalog must be a non-empty JSON array.");
  }

  const entries: CatalogEntry[] = [];
  const ids = new Set<string>();
  for (const rawSong of value) {
    const song = rawSong as Record<string, unknown>;
    if (!song || typeof song !== "object" || typeof song.id !== "string" || !song.id) {
      throw new TypeError("Every catalog entry must have a non-empty id.");
    }
    if (typeof song.title !== "string" || !song.title.trim()) {
      throw new TypeError(`Catalog entry ${song.id} must have a title.`);
    }
    if (!isValidReleaseDate(song.releaseDate)) {
      throw new TypeError(`Catalog entry ${song.id} must have a release date.`);
    }
    if (ids.has(song.id)) {
      throw new TypeError(`Catalog song id ${song.id} is duplicated.`);
    }
    if (typeof song.language !== "string" || !SONG_LANGUAGES.includes(song.language)) {
      throw new TypeError(`Catalog entry ${song.id} must declare a supported language.`);
    }
    if (
      song.aliases !== undefined
      && (!Array.isArray(song.aliases)
        || song.aliases.some((alias) => typeof alias !== "string" || !alias.trim()))
    ) {
      throw new TypeError(`Catalog entry ${song.id} must declare valid aliases.`);
    }
    if (
      song.durationSec !== null
      && song.durationSec !== undefined
      && (typeof song.durationSec !== "number"
        || !Number.isFinite(song.durationSec)
        || song.durationSec < 0)
    ) {
      throw new TypeError(`Catalog entry ${song.id} must declare a valid duration.`);
    }
    if (
      song.performanceType !== null
      && song.performanceType !== undefined
      && (typeof song.performanceType !== "string"
        || !PERFORMANCE_TYPES.includes(song.performanceType))
    ) {
      throw new TypeError(`Catalog entry ${song.id} must declare a valid performance type.`);
    }
    if (!isPlainObject(song.project)) {
      throw new TypeError(`Catalog entry ${song.id} must declare a project.`);
    }
    if (
      !Array.isArray(song.sources)
      || song.sources.length === 0
      || song.sources.some((source) => (
        !source
        || typeof source !== "object"
        || typeof source.name !== "string"
        || !source.name.trim()
        || typeof source.url !== "string"
        || !source.url.trim()
      ))
    ) {
      throw new TypeError(`Catalog entry ${song.id} must declare at least one valid source.`);
    }
    if (song.originType !== undefined && song.originType !== null
      && (typeof song.originType !== "string" || !SONG_ORIGIN_VALUES.includes(song.originType))) {
      throw new TypeError(`Catalog entry ${song.id} must declare a valid origin type.`);
    }
    if (
      !song.curleyCredits
      || !isPlainObject(song.curleyCredits)
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
      && (typeof song.featuredArtistGender !== "string"
        || !FEATURED_ARTIST_GENDER_VALUES.includes(song.featuredArtistGender))
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
    if (song.guessable !== undefined && typeof song.guessable !== "boolean") {
      throw new TypeError(`Catalog entry ${song.id} must declare a boolean guessable flag.`);
    }
    ids.add(song.id);
    entries.push(song as CatalogEntry);
  }

  return entries.map((song) => ({
    ...song,
    project: normalizeProject(song.project, song.title),
    originType: getSongOriginType(song.title) ?? song.originType ?? null,
    featuredArtistGender: song.featuredArtistGender
      ?? getFeaturedArtistGender(song.featuredArtists),
    favoriteCount: song.favoriteCount ?? null,
    favoriteCountDisplay: song.favoriteCountDisplay?.trim() || null,
    hintLyrics: [...new Set((song.hintLyrics ?? [])
      .map((hint: string) => hint.trim())
      .filter(Boolean))].slice(0, 3),
  }));
}

function isValidReleaseDate(value: unknown): value is string {
  if (typeof value !== "string") return false;
  const match = /^(\d{4})-(\d{2})-(\d{2})$/u.exec(value);
  if (!match) return false;
  const [, year, month, day] = match.map(Number);
  const parsed = new Date(Date.UTC(year, month - 1, day));
  return parsed.getUTCFullYear() === year
    && parsed.getUTCMonth() === month - 1
    && parsed.getUTCDate() === day;
}

export function normalizeProject(project: unknown, songTitle = ""): SongProject {
  const sourceProject = getSongProject({
    title: songTitle,
    project: project && typeof project === "object" ? project as Record<string, unknown> : {},
  });
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

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}
