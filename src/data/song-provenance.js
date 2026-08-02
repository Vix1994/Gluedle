export const SONG_ORIGIN_VALUES = Object.freeze(["original", "cover"]);

export const SONG_ORIGIN_LABELS = Object.freeze({
  original: "原唱",
  cover: "翻唱",
});

// 按题库中的歌曲名维护；合作演唱自己的歌仍填 original，翻唱他人歌曲填 cover。
export const SONG_ORIGIN_OVERRIDES = Object.freeze({
  // "歌曲名": "original",
  // "歌曲名 (Live)": "cover",
});

export function getSongOriginType(songTitle) {
  const title = typeof songTitle === "string" ? songTitle.trim() : "";
  return SONG_ORIGIN_OVERRIDES[title] ?? null;
}
