import { GameEngineError } from "./errors.ts";

export type EngineSong = Record<string, unknown>;

export function readSongId(song: EngineSong): string | undefined {
  const value = song.id ?? song.songId;
  return typeof value === "string" ? value : undefined;
}

export function assertSong(song: unknown, code: string): asserts song is EngineSong {
  const songId = song && typeof song === "object" ? readSongId(song as EngineSong) : null;
  if (typeof songId !== "string" || !songId) {
    throw new GameEngineError(code, "A song must have a non-empty id.");
  }
}

export function validateCatalog(catalog: unknown): EngineSong[] {
  if (!Array.isArray(catalog)) {
    throw new GameEngineError("INVALID_CATALOG", "catalog must be an array.");
  }

  const seen = new Set<unknown>();
  const songs: EngineSong[] = [];
  for (const song of catalog) {
    assertSong(song, "INVALID_CATALOG");
    const songId = readSongId(song);
    if (seen.has(songId)) {
      throw new GameEngineError("INVALID_CATALOG", "catalog song IDs must be unique.");
    }
    seen.add(songId);
    songs.push(song);
  }
  return songs;
}
