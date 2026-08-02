import { SONG_ORIGIN_OVERRIDES } from "./song-origin-overrides.js";

export const SONG_ORIGIN_VALUES = Object.freeze(["original", "cover"]);

export const SONG_ORIGIN_LABELS = Object.freeze({
  original: "原唱",
  cover: "翻唱",
});

export const DEFAULT_SONG_ORIGIN_TYPE = "original";

const SONG_ORIGIN_ALIASES = Object.freeze({
  original: "original",
  cover: "cover",
  原唱: "original",
  翻唱: "cover",
});

export { SONG_ORIGIN_OVERRIDES };

export function getSongOriginType(songTitle) {
  const title = typeof songTitle === "string" ? songTitle.trim() : "";
  const configuredOriginType = SONG_ORIGIN_ALIASES[SONG_ORIGIN_OVERRIDES[title]];
  return SONG_ORIGIN_VALUES.includes(configuredOriginType)
    ? configuredOriginType
    : DEFAULT_SONG_ORIGIN_TYPE;
}
