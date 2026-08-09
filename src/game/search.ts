import { GameEngineError } from "./errors.ts";
import { normalizeSearchText } from "./formatters.ts";
import { validateCatalog } from "./song-compat.ts";
import type { EngineSong } from "./song-compat.ts";

export function findSongMatches(query: unknown, catalog: unknown, limit: unknown = 8): EngineSong[] {
  const normalizedQuery = normalizeSearchText(query);
  const resultLimit = Number.isFinite(Number(limit))
    ? Math.max(0, Math.floor(Number(limit)))
    : 8;

  if (!normalizedQuery || resultLimit === 0 || !Array.isArray(catalog)) {
    return [];
  }

  return catalog
    .map((song, index) => ({ song, index, rank: searchRank(song, normalizedQuery) }))
    .filter((entry): entry is typeof entry & { rank: number } => entry.rank !== null)
    .sort((left, right) => left.rank - right.rank || left.index - right.index)
    .slice(0, resultLimit)
    .map(({ song }) => song);
}

export function selectRandomAnswer(catalog: unknown, random: () => number = Math.random): EngineSong {
  const songs = validateCatalog(catalog);
  if (songs.length === 0) {
    throw new GameEngineError("EMPTY_CATALOG", "Cannot select an answer from an empty catalog.");
  }
  if (typeof random !== "function") {
    throw new GameEngineError("INVALID_RANDOM", "random must be a function.");
  }
  const value = Number(random());
  if (!Number.isFinite(value) || value < 0 || value >= 1) {
    throw new GameEngineError("INVALID_RANDOM", "random must return a number from 0 up to 1.");
  }
  return songs[Math.floor(value * songs.length)];
}

function searchRank(song: unknown, query: string): number | null {
  if (!song || typeof song !== "object") return null;

  const candidate = song as EngineSong;
  const title = normalizeSearchText(candidate.title);
  const aliases = Array.isArray(candidate.aliases)
    ? candidate.aliases.map(normalizeSearchText).filter(Boolean)
    : [];
  const candidates = [title, ...aliases].filter(Boolean);

  if (title === query) return 0;
  if (aliases.includes(query)) return 1;
  if (title.startsWith(query)) return 2;
  if (aliases.some((alias) => alias.startsWith(query))) return 3;
  if (title.includes(query)) return 4;
  if (candidates.some((candidate) => candidate.includes(query))) return 5;
  return null;
}
